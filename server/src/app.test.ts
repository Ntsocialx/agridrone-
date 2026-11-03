import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { hashPassword } from "./auth";
import type { Db } from "./db";
import type { Storage, StoredFile } from "./storage";
import { createTestDb } from "./test-db";

const JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
let db: Db;
let app: ReturnType<typeof createApp>;

// Fake Cloudinary: signing an upload simulates the phone uploading a valid file.
const files = new Map<string, StoredFile>();
const removed: string[] = [];
const storage: Storage = {
  signUpload: ({ publicId, type }) => {
    files.set(publicId, { format: type === "authenticated" ? "pdf" : "jpg", bytes: 1000, secureUrl: `https://cdn.test/${publicId}.jpg` });
    return { uploadUrl: "https://upload.test", fields: { public_id: publicId, signature: "sig" } };
  },
  find: async (publicId) => files.get(publicId) ?? null,
  remove: async (publicId) => {
    files.delete(publicId);
    removed.push(publicId);
  },
  privateUrl: (publicId, _format, expiresAt) => `https://private.test/${publicId}?expires=${expiresAt}`,
};

beforeAll(async () => {
  db = await createTestDb();
  app = createApp({ db, storage, jwtSecret: JWT_SECRET, authRateLimit: 1000 });
});
afterAll(() => db.close());

let n = 0;
async function register(role: "operator" | "farm_owner") {
  const response = await request(app)
    .post("/api/v1/auth/register")
    .send({ email: `user${++n}@example.test`, password: "password123", fullName: `Test ${role} ${n}`, phone: "+27 00 000 0000", role, acceptTerms: true });
  expect(response.status).toBe(201);
  return { token: response.body.token as string, id: response.body.user.id as string };
}

async function createAdmin() {
  const email = `admin${++n}@example.test`;
  await db.query("INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ($1, $2, 'Admin', '', 'admin')", [
    email,
    await hashPassword("admin-password-123"),
  ]);
  const response = await request(app).post("/api/v1/auth/login").send({ email, password: "admin-password-123" });
  return response.body.token as string;
}

const as = (token: string) => ({
  get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
  post: (url: string, body: object = {}) => request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
  put: (url: string, body: object) => request(app).put(url).set("Authorization", `Bearer ${token}`).send(body),
});

const JOB = {
  title: "Test maize mapping",
  service: "Mapping",
  location: "Test Farm, Western Cape",
  areaHa: 120.5,
  preferredDate: "2026-12-01",
  budgetZar: 4500,
  brief: "Multispectral survey of maize blocks.",
};
const BID = { amountZar: 4200, days: 3, message: "Can fly early next week." };

async function attachLicence(token: string) {
  await as(token).post("/api/v1/operators/me/licence/consent", { accept: true });
  const signed = await as(token).post("/api/v1/operators/me/licence/upload-signature");
  return as(token).post("/api/v1/operators/me/licence", { publicId: signed.body.fields.public_id });
}

async function approvedOperator(adminToken: string) {
  const operator = await register("operator");
  await as(operator.token).put("/api/v1/operators/me", { base: "Test Town", radiusKm: 50, services: ["Mapping"] });
  await attachLicence(operator.token);
  await as(operator.token).post("/api/v1/operators/me/submit");
  await as(adminToken).post(`/api/v1/admin/operators/${operator.id}/decision`, { decision: "approved" });
  return operator;
}

describe("system routes", () => {
  it("reports process liveness", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("reports readiness once the database answers", async () => {
    const response = await request(app).get("/api/v1/ready");
    expect(response.status).toBe(200);
  });

  it("returns a safe not-found response", async () => {
    const response = await request(app).get("/missing");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: "NOT_FOUND", message: "Route not found." } });
  });
});

describe("auth", () => {
  it("requires terms acceptance and records consent", async () => {
    const base = { email: "consent@example.test", password: "password123", fullName: "Consent Test", phone: "+27 00 000 0000", role: "farm_owner" };
    expect((await request(app).post("/api/v1/auth/register").send({ ...base, acceptTerms: false })).status).toBe(400);

    const ok = await request(app).post("/api/v1/auth/register").send({ ...base, acceptTerms: true });
    expect(ok.status).toBe(201);
    const { rows } = await db.query("SELECT version FROM consents WHERE user_id = $1 AND kind = 'terms_privacy'", [ok.body.user.id]);
    expect(rows).toHaveLength(1);
  });

  it("never lets the public register an admin", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "sneaky@example.test", password: "password123", fullName: "Sneaky", phone: "+27 00 000 0000", role: "admin", acceptTerms: true });
    expect(response.status).toBe(400);
  });

  it("gives the same error for unknown email and wrong password", async () => {
    const { token } = await register("farm_owner");
    expect(token).toBeTruthy();
    const unknown = await request(app).post("/api/v1/auth/login").send({ email: "nobody@example.test", password: "password123" });
    const wrong = await request(app).post("/api/v1/auth/login").send({ email: `user${n}@example.test`, password: "wrong-password" });
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("rejects missing and forged tokens", async () => {
    expect((await request(app).get("/api/v1/jobs")).status).toBe(401);
    expect((await as("not-a-real-token").get("/api/v1/jobs")).status).toBe(401);
  });
});

describe("operator verification", () => {
  it("blocks submit until the profile and licence are complete, then locks it in review", async () => {
    const operator = await register("operator");
    expect((await as(operator.token).post("/api/v1/operators/me/submit")).status).toBe(409);

    const put = await as(operator.token).put("/api/v1/operators/me", { base: "Test Town", radiusKm: 50, services: ["Mapping"] });
    expect(put.status).toBe(200);
    expect((await as(operator.token).post("/api/v1/operators/me/submit")).status).toBe(409);
    expect((await attachLicence(operator.token)).status).toBe(201);
    expect((await as(operator.token).post("/api/v1/operators/me/submit")).body.verificationStatus).toBe("in_review");
    expect((await as(operator.token).put("/api/v1/operators/me", { base: "Elsewhere", radiusKm: 10, services: ["Mapping"] })).status).toBe(409);
  });

  it("does not let operators offer restricted services", async () => {
    const operator = await register("operator");
    const response = await as(operator.token).put("/api/v1/operators/me", { base: "Test Town", radiusKm: 50, services: ["Spraying"] });
    expect(response.status).toBe(400);
  });

  it("requires a reason to reject, and only admins can decide", async () => {
    const admin = await createAdmin();
    const operator = await register("operator");
    await as(operator.token).put("/api/v1/operators/me", { base: "Test Town", radiusKm: 50, services: ["Mapping"] });
    await attachLicence(operator.token);
    await as(operator.token).post("/api/v1/operators/me/submit");

    expect((await as(operator.token).post(`/api/v1/admin/operators/${operator.id}/decision`, { decision: "approved" })).status).toBe(403);
    expect((await as(admin).post(`/api/v1/admin/operators/${operator.id}/decision`, { decision: "rejected" })).status).toBe(400);

    const rejected = await as(admin).post(`/api/v1/admin/operators/${operator.id}/decision`, { decision: "rejected", reason: "Licence photo is blurry." });
    expect(rejected.body.verificationStatus).toBe("rejected");
    const { rows } = await db.query("SELECT 1 FROM audit_log WHERE target_id = $1 AND action = 'verification_rejected'", [operator.id]);
    expect(rows).toHaveLength(1);
  });

  it("returns 404, not a crash, for a malformed id", async () => {
    const admin = await createAdmin();
    expect((await as(admin).post("/api/v1/admin/operators/not-a-uuid/decision", { decision: "approved" })).status).toBe(404);
  });
});

describe("job flow", () => {
  it("runs post → bid → select → complete → confirm", async () => {
    const admin = await createAdmin();
    const owner = await register("farm_owner");
    const pilot = await approvedOperator(admin);
    const rival = await approvedOperator(admin);

    const job = await as(owner.token).post("/api/v1/jobs", JOB);
    expect(job.status).toBe(201);
    expect(job.body).toMatchObject({ status: "open", areaHa: 120.5, preferredDate: "2026-12-01" });
    const jobUrl = `/api/v1/jobs/${job.body.id}`;

    const bid = await as(pilot.token).post(`${jobUrl}/bids`, BID);
    expect(bid.status).toBe(201);
    expect((await as(pilot.token).post(`${jobUrl}/bids`, BID)).status).toBe(409);
    await as(rival.token).post(`${jobUrl}/bids`, { ...BID, amountZar: 4600 });

    // Operators only ever see their own bid.
    expect((await as(rival.token).get(jobUrl)).body.bids).toHaveLength(1);
    expect((await as(owner.token).get(jobUrl)).body.bids).toHaveLength(2);

    expect((await as(rival.token).post(`${jobUrl}/select`, { bidId: bid.body.id })).status).toBe(403);
    const selected = await as(owner.token).post(`${jobUrl}/select`, { bidId: bid.body.id });
    expect(selected.body).toMatchObject({ status: "assigned", assignedOperatorId: pilot.id });
    expect((await as(owner.token).post(`${jobUrl}/select`, { bidId: bid.body.id })).status).toBe(404);

    // Gone from the marketplace and hidden from non-participants.
    expect((await as(rival.token).get("/api/v1/jobs")).body.some((j: { id: string }) => j.id === job.body.id)).toBe(false);
    expect((await as(rival.token).get(jobUrl)).status).toBe(404);

    // Owner can't confirm before the pilot marks complete; rival can't complete.
    expect((await as(owner.token).post(`${jobUrl}/confirm`)).status).toBe(409);
    expect((await as(rival.token).post(`${jobUrl}/complete`)).status).toBe(409);
    expect((await as(pilot.token).post(`${jobUrl}/complete`)).body.status).toBe("pending_confirmation");
    const done = await as(owner.token).post(`${jobUrl}/confirm`);
    expect(done.body.status).toBe("completed");
    expect(done.body.completedAt).toBeTruthy();

    expect((await as(pilot.token).get("/api/v1/jobs/mine")).body.map((j: { id: string }) => j.id)).toContain(job.body.id);
  });

  it("puts spraying on compliance hold and refuses bids", async () => {
    const admin = await createAdmin();
    const owner = await register("farm_owner");
    const pilot = await approvedOperator(admin);

    const job = await as(owner.token).post("/api/v1/jobs", { ...JOB, service: "Spraying" });
    expect(job.body.status).toBe("on_hold");
    expect((await as(pilot.token).post(`/api/v1/jobs/${job.body.id}/bids`, BID)).status).toBe(403);
  });

  it("refuses bids from operators who aren't approved", async () => {
    const owner = await register("farm_owner");
    const unverified = await register("operator");
    const job = await as(owner.token).post("/api/v1/jobs", JOB);
    expect((await as(unverified.token).post(`/api/v1/jobs/${job.body.id}/bids`, BID)).status).toBe(403);
  });

  it("only lets owners post jobs, and filters the marketplace", async () => {
    const owner = await register("farm_owner");
    const operator = await register("operator");
    expect((await as(operator.token).post("/api/v1/jobs", JOB)).status).toBe(403);

    await as(owner.token).post("/api/v1/jobs", { ...JOB, title: "Unique citrus survey", service: "Surveying" });
    const found = await as(operator.token).get("/api/v1/jobs?service=Surveying&q=citrus");
    expect(found.body.every((j: { service: string }) => j.service === "Surveying")).toBe(true);
    expect(found.body.some((j: { title: string }) => j.title === "Unique citrus survey")).toBe(true);
  });
});

describe("ratings and reviews", () => {
  /** Runs a job through to the given stage and returns everyone involved. */
  async function jobAt(stage: "assigned" | "completed") {
    const admin = await createAdmin();
    const owner = await register("farm_owner");
    const pilot = await approvedOperator(admin);
    const job = await as(owner.token).post("/api/v1/jobs", JOB);
    const bid = await as(pilot.token).post(`/api/v1/jobs/${job.body.id}/bids`, BID);
    await as(owner.token).post(`/api/v1/jobs/${job.body.id}/select`, { bidId: bid.body.id });
    if (stage === "completed") {
      await as(pilot.token).post(`/api/v1/jobs/${job.body.id}/complete`);
      await as(owner.token).post(`/api/v1/jobs/${job.body.id}/confirm`);
    }
    return { admin, owner, pilot, jobId: job.body.id as string };
  }
  const REVIEW = { rating: 4, comment: "Great maps, delivered on time." };

  it("lets the owner review a confirmed job once, and shows it on the pilot profile", async () => {
    const { owner, pilot, jobId } = await jobAt("completed");
    expect((await as(owner.token).post("/api/v1/reviews", { ...REVIEW, jobId })).status).toBe(201);
    expect((await as(owner.token).post("/api/v1/reviews", { ...REVIEW, jobId })).status).toBe(409);

    const profile = await as(owner.token).get(`/api/v1/pilots/${pilot.id}`);
    expect(profile.body).toMatchObject({ averageRating: 4, reviewCount: 1, completedJobs: 1 });
    expect(profile.body.completed[0].id).toBe(jobId);
    // Reviewer shown by first name only.
    expect(profile.body.reviews[0].reviewerFirstName).toBe("Test");
  });

  it("refuses reviews before completion, from other owners, and from pilots", async () => {
    const { owner, pilot, jobId } = await jobAt("assigned");
    expect((await as(owner.token).post("/api/v1/reviews", { ...REVIEW, jobId })).status).toBe(409);

    const done = await jobAt("completed");
    expect((await as(owner.token).post("/api/v1/reviews", { ...REVIEW, jobId: done.jobId })).status).toBe(403);
    expect((await as(pilot.token).post("/api/v1/reviews", { ...REVIEW, jobId: done.jobId })).status).toBe(403);
    expect((await as(done.owner.token).post("/api/v1/reviews", { ...REVIEW, rating: 6, jobId: done.jobId })).status).toBe(400);
  });

  it("lets only the reviewed pilot report, and an admin hide it", async () => {
    const { admin, owner, pilot, jobId } = await jobAt("completed");
    const review = await as(owner.token).post("/api/v1/reviews", { rating: 1, comment: "Rude and unprofessional pilot.", jobId });
    const otherPilot = await register("operator");

    expect((await as(otherPilot.token).post(`/api/v1/reviews/${review.body.id}/report`, { reason: "Not fair" })).status).toBe(403);
    expect((await as(pilot.token).post(`/api/v1/reviews/${review.body.id}/report`, { reason: "This is untrue." })).status).toBe(201);
    expect((await as(pilot.token).post(`/api/v1/reviews/${review.body.id}/report`, { reason: "Again please." })).status).toBe(409);

    expect((await as(owner.token).get("/api/v1/admin/reviews/reports")).status).toBe(403);
    const reports = await as(admin).get("/api/v1/admin/reviews/reports");
    expect(reports.body.some((r: { id: string }) => r.id === review.body.id)).toBe(true);

    expect((await as(admin).post(`/api/v1/admin/reviews/${review.body.id}/moderation`, { action: "hide" })).status).toBe(200);
    const profile = await as(owner.token).get(`/api/v1/pilots/${pilot.id}`);
    expect(profile.body).toMatchObject({ reviewCount: 0, averageRating: null, completedJobs: 1 });
    const { rows } = await db.query("SELECT 1 FROM audit_log WHERE target_id = $1 AND action = 'review_hidden'", [review.body.id]);
    expect(rows).toHaveLength(1);
  });
});

describe("uploads", () => {
  it("requires separate consent before signing a licence upload, and records it", async () => {
    const operator = await register("operator");
    expect((await as(operator.token).post("/api/v1/operators/me/licence/upload-signature")).status).toBe(403);
    expect((await as(operator.token).post("/api/v1/operators/me/licence/consent", { accept: false })).status).toBe(400);
    expect((await as(operator.token).post("/api/v1/operators/me/licence/consent", { accept: true })).status).toBe(201);

    const signed = await as(operator.token).post("/api/v1/operators/me/licence/upload-signature");
    expect(signed.status).toBe(200);
    expect(signed.body.fields.public_id).toMatch(new RegExp(`^agridrone/licences/${operator.id}/`));
    const { rows } = await db.query("SELECT 1 FROM consents WHERE user_id = $1 AND kind = 'licence_upload'", [operator.id]);
    expect(rows).toHaveLength(1);
  });

  it("refuses to attach someone else's file or a file that was never uploaded", async () => {
    const victim = await register("operator");
    const attacker = await register("operator");
    await as(victim.token).post("/api/v1/operators/me/licence/consent", { accept: true });
    const signed = await as(victim.token).post("/api/v1/operators/me/licence/upload-signature");

    expect((await as(attacker.token).post("/api/v1/operators/me/licence", { publicId: signed.body.fields.public_id })).status).toBe(403);
    expect((await as(victim.token).post("/api/v1/operators/me/licence", { publicId: `agridrone/licences/${victim.id}/missing` })).status).toBe(404);
  });

  it("deletes oversized files instead of attaching them", async () => {
    const operator = await register("operator");
    await as(operator.token).post("/api/v1/operators/me/licence/consent", { accept: true });
    const signed = await as(operator.token).post("/api/v1/operators/me/licence/upload-signature");
    const publicId: string = signed.body.fields.public_id;
    files.set(publicId, { format: "pdf", bytes: 6 * 1024 * 1024, secureUrl: "" });

    expect((await as(operator.token).post("/api/v1/operators/me/licence", { publicId })).status).toBe(400);
    expect(removed).toContain(publicId);
  });

  it("replaces the old licence on re-upload and never exposes its id", async () => {
    const operator = await register("operator");
    const first = await attachLicence(operator.token);
    expect(first.body).toEqual({ attached: true, format: "pdf", bytes: 1000 });
    const { rows: before } = await db.query<{ publicId: string }>(`SELECT public_id AS "publicId" FROM uploads WHERE user_id = $1`, [operator.id]);

    await attachLicence(operator.token);
    expect(removed).toContain(before[0].publicId);
    const { rows: after } = await db.query("SELECT 1 FROM uploads WHERE user_id = $1 AND kind = 'licence'", [operator.id]);
    expect(after).toHaveLength(1);
  });

  it("gives only admins a short-lived licence link, and audits the view", async () => {
    const admin = await createAdmin();
    const operator = await register("operator");
    await attachLicence(operator.token);

    expect((await as(operator.token).get(`/api/v1/admin/operators/${operator.id}/licence`)).status).toBe(403);
    const link = await as(admin).get(`/api/v1/admin/operators/${operator.id}/licence`);
    expect(link.status).toBe(200);
    expect(link.headers["cache-control"]).toBe("no-store");
    expect(link.body.expiresAt - Date.now() / 1000).toBeLessThanOrEqual(300);
    const { rows } = await db.query("SELECT 1 FROM audit_log WHERE target_id = $1 AND action = 'licence_viewed'", [operator.id]);
    expect(rows).toHaveLength(1);
  });

  it("adds portfolio photos to the public pilot profile and deletes them from Cloudinary", async () => {
    const operator = await register("operator");
    const owner = await register("farm_owner");
    const signed = await as(operator.token).post("/api/v1/operators/me/portfolio/upload-signature");
    const photo = await as(operator.token).post("/api/v1/operators/me/portfolio", { publicId: signed.body.fields.public_id, caption: "NDVI map" });
    expect(photo.status).toBe(201);

    const profile = await as(owner.token).get(`/api/v1/pilots/${operator.id}`);
    expect(profile.body.portfolio).toEqual([expect.objectContaining({ caption: "NDVI map", url: expect.stringContaining("https://") })]);

    const del = await request(app).delete(`/api/v1/operators/me/portfolio/${photo.body.id}`).set("Authorization", `Bearer ${operator.token}`);
    expect(del.status).toBe(204);
    expect(removed).toContain(signed.body.fields.public_id);
  });
});
