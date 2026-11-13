import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { hashPassword } from "./auth";
import type { Db } from "./db";
import type { Mailer } from "./mailer";
import type { Storage, StoredFile } from "./storage";
import { createTestDb } from "./test-db";

const JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
let db: Db;
let app: ReturnType<typeof createApp>;

// Fake Cloudinary: signing an upload simulates the phone uploading a valid file.
const files = new Map<string, StoredFile>();
const removed: string[] = [];
// Fake mailer: remembers the last code sent to each address.
const sentCodes = new Map<string, string>();
const mailer: Mailer = {
  sendResetCode: async (to, code) => {
    sentCodes.set(to.email, code);
  },
};
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
  app = createApp({ db, storage, mailer, jwtSecret: JWT_SECRET, authRateLimit: 1000 });
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
  patch: (url: string, body: object) => request(app).patch(url).set("Authorization", `Bearer ${token}`).send(body),
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

type Document = "licence" | "roc" | "training_certificate";
async function attachDocument(token: string, kind: Document) {
  await as(token).post("/api/v1/operators/me/licence/consent", { accept: true });
  const signed = await as(token).post(`/api/v1/operators/me/${kind}/upload-signature`);
  return as(token).post(`/api/v1/operators/me/${kind}`, { publicId: signed.body.fields.public_id });
}
const attachLicence = (token: string) => attachDocument(token, "licence");

/** A date `days` from today (UTC, like the test database's CURRENT_DATE). */
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const PROFILE = {
  base: "Test Town",
  radiusKm: 50,
  services: ["Mapping"],
  province: "Western Cape",
  rplNumber: "RPL-12345",
  rplExpiresOn: inDays(365),
  rocHolderName: "Test Drones (Pty) Ltd",
  rocNumber: "ROC-678",
  rocExpiresOn: inDays(300),
  trainingProvider: "Test Flight School",
  trainingProgramme: "RPL multirotor course",
  trainingCompletedOn: inDays(-60),
};

/** Fills in every detail and document verification needs. */
async function completeProfile(token: string) {
  await as(token).put("/api/v1/operators/me", PROFILE);
  for (const kind of ["licence", "roc", "training_certificate"] as const) await attachDocument(token, kind);
}

async function approvedOperator(adminToken: string) {
  const operator = await register("operator");
  await completeProfile(operator.token);
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

  it("returns the signed-in user's own details from /me", async () => {
    const { token, id } = await register("farm_owner");
    const me = await as(token).get("/api/v1/me");
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ id, role: "farm_owner", fullName: `Test farm_owner ${n}`, email: `user${n}@example.test`, phone: "+27 00 000 0000", avatarUrl: null });
    expect((await request(app).get("/api/v1/me")).status).toBe(401);
  });

  it("rejects missing and forged tokens", async () => {
    expect((await request(app).get("/api/v1/jobs")).status).toBe(401);
    expect((await as("not-a-real-token").get("/api/v1/jobs")).status).toBe(401);
  });
});

describe("editing your own account", () => {
  it("updates name and phone without a password", async () => {
    const { token } = await register("operator");
    const email = `user${n}@example.test`;
    const response = await as(token).patch("/api/v1/me", { fullName: "New Name", phone: "+27 82 123 4567", email });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ fullName: "New Name", phone: "+27 82 123 4567", email });
  });

  it("needs the current password to change email, and keeps emails unique", async () => {
    const { token: other } = await register("farm_owner");
    const takenEmail = `user${n}@example.test`;
    expect(other).toBeTruthy();
    const { token, id } = await register("farm_owner");
    const base = { fullName: "Owner", phone: "+27 00 000 0000" };

    expect((await as(token).patch("/api/v1/me", { ...base, email: "new@example.test" })).body.error.code).toBe("WRONG_PASSWORD");
    expect((await as(token).patch("/api/v1/me", { ...base, email: "new@example.test", currentPassword: "wrong-pass" })).status).toBe(400);
    expect((await as(token).patch("/api/v1/me", { ...base, email: takenEmail, currentPassword: "password123" })).status).toBe(409);

    const ok = await as(token).patch("/api/v1/me", { ...base, email: "New@Example.test", currentPassword: "password123" });
    expect(ok.status).toBe(200);
    expect(ok.body.email).toBe("new@example.test");
    expect((await request(app).post("/api/v1/auth/login").send({ email: "new@example.test", password: "password123" })).status).toBe(200);
    const { rows } = await db.query("SELECT 1 FROM audit_log WHERE actor_id = $1 AND action = 'email_changed'", [id]);
    expect(rows).toHaveLength(1);
  });

  it("changes the password only with the current one", async () => {
    const { token } = await register("operator");
    const email = `user${n}@example.test`;
    expect((await as(token).post("/api/v1/me/password", { currentPassword: "nope-nope", newPassword: "brand-new-pass" })).status).toBe(400);
    expect((await as(token).post("/api/v1/me/password", { currentPassword: "password123", newPassword: "short" })).status).toBe(400);
    expect((await as(token).post("/api/v1/me/password", { currentPassword: "password123", newPassword: "brand-new-pass" })).status).toBe(204);
    expect((await request(app).post("/api/v1/auth/login").send({ email, password: "password123" })).status).toBe(401);
    expect((await request(app).post("/api/v1/auth/login").send({ email, password: "brand-new-pass" })).status).toBe(200);
  });

  it("sets, replaces and removes a profile picture", async () => {
    const { token, id } = await register("farm_owner");
    const sign = async () => (await as(token).post("/api/v1/me/avatar/upload-signature")).body.fields.public_id as string;

    const first = await sign();
    expect(first.startsWith(`agridrone/avatars/${id}/`)).toBe(true);
    expect((await as(token).put("/api/v1/me/avatar", { publicId: first })).status).toBe(200);
    expect((await as(token).get("/api/v1/me")).body.avatarUrl).toBe(`https://cdn.test/${first}.jpg`);

    const second = await sign();
    await as(token).put("/api/v1/me/avatar", { publicId: second });
    expect(removed).toContain(first);
    expect((await as(token).get("/api/v1/me")).body.avatarUrl).toBe(`https://cdn.test/${second}.jpg`);

    const other = await register("operator");
    expect((await as(other.token).put("/api/v1/me/avatar", { publicId: second })).status).toBe(403);

    expect((await request(app).delete("/api/v1/me/avatar").set("Authorization", `Bearer ${token}`)).status).toBe(204);
    expect((await as(token).get("/api/v1/me")).body.avatarUrl).toBeNull();
  });

  it("does not let admins edit through the app", async () => {
    const admin = await createAdmin();
    expect((await as(admin).patch("/api/v1/me", { fullName: "Admin", phone: "+27 00 000 0000", email: "a@example.test" })).status).toBe(403);
  });
});

describe("operator verification", () => {
  it("blocks submit until the profile and documents are complete, then locks it in review", async () => {
    const operator = await register("operator");
    expect((await as(operator.token).post("/api/v1/operators/me/submit")).status).toBe(409);

    // An older app version sends only the first three fields: saved, but not enough to submit.
    const put = await as(operator.token).put("/api/v1/operators/me", { base: "Test Town", radiusKm: 50, services: ["Mapping"] });
    expect(put.status).toBe(200);
    expect((await attachLicence(operator.token)).status).toBe(201);
    const early = await as(operator.token).post("/api/v1/operators/me/submit");
    expect(early.status).toBe(409);
    expect(early.body.error.message).toContain("ROC proof");
    expect(early.body.error.message).toContain("training certificate");
    expect(early.body.error.message).toContain("province");
    expect(early.body.error.message).not.toContain("licence document");

    await completeProfile(operator.token);
    expect((await as(operator.token).post("/api/v1/operators/me/submit")).body.verificationStatus).toBe("in_review");
    expect((await as(operator.token).put("/api/v1/operators/me", { ...PROFILE, base: "Elsewhere" })).status).toBe(409);
    expect((await attachDocument(operator.token, "roc")).status).toBe(409);
  });

  it("does not let operators offer restricted services", async () => {
    const operator = await register("operator");
    const response = await as(operator.token).put("/api/v1/operators/me", { base: "Test Town", radiusKm: 50, services: ["Spraying"] });
    expect(response.status).toBe(400);
  });

  it("requires a reason to reject, and only admins can decide", async () => {
    const admin = await createAdmin();
    const operator = await register("operator");
    await completeProfile(operator.token);
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
    expect(selected.body).toMatchObject({ status: "assigned", assignedOperatorId: pilot.id, bidCount: 2, reviewed: false });
    expect(selected.body.assignedOperatorName).toMatch(/^Test operator/);
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

describe("password reset", () => {
  async function account() {
    const email = `reset${++n}@example.test`;
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password: "old-password-1", fullName: "Reset Tester", phone: "+27 00 000 0000", role: "farm_owner", acceptTerms: true });
    return { email, id: res.body.user.id as string };
  }
  const forgot = (email: string) => request(app).post("/api/v1/auth/password/forgot").send({ email });
  const reset = (email: string, code: string, newPassword = "new-password-1") =>
    request(app).post("/api/v1/auth/password/reset").send({ email, code, newPassword });

  it("emails a code, resets once, signs in, and retires the old password", async () => {
    const { email } = await account();
    const res = await forgot(email.toUpperCase());
    expect(res.status).toBe(200);
    const code = sentCodes.get(email)!;
    expect(code).toMatch(/^\d{6}$/);

    const ok = await reset(email, code);
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    expect((await reset(email, code)).status).toBe(400);

    expect((await request(app).post("/api/v1/auth/login").send({ email, password: "old-password-1" })).status).toBe(401);
    expect((await request(app).post("/api/v1/auth/login").send({ email, password: "new-password-1" })).status).toBe(200);
  });

  it("answers identically for unknown emails and sends nothing", async () => {
    const known = await account();
    const a = await forgot(known.email);
    const b = await forgot("nobody-here@example.test");
    expect(b.status).toBe(a.status);
    expect(b.body).toEqual(a.body);
    expect(sentCodes.has("nobody-here@example.test")).toBe(false);
  });

  it("locks the code after 5 wrong tries", async () => {
    const { email } = await account();
    await forgot(email);
    const code = sentCodes.get(email)!;
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect((await reset(email, wrong)).status).toBe(400);
    expect((await reset(email, code)).status).toBe(400);
  });

  it("rejects expired codes and only accepts the newest code", async () => {
    const { email, id } = await account();
    await forgot(email);
    const first = sentCodes.get(email)!;
    await forgot(email);
    const second = sentCodes.get(email)!;
    if (first !== second) expect((await reset(email, first)).status).toBe(400);

    await db.query("UPDATE password_resets SET expires_at = now() - interval '1 minute' WHERE user_id = $1", [id]);
    expect((await reset(email, second)).status).toBe(400);
  });

  it("is switched off cleanly when email isn't configured", async () => {
    const noMail = createApp({ db, storage, jwtSecret: JWT_SECRET, authRateLimit: 1000 });
    expect((await request(noMail).post("/api/v1/auth/password/forgot").send({ email: "x@example.test" })).status).toBe(503);
  });
});

describe("notifications", () => {
  const unread = async (token: string) => (await as(token).get("/api/v1/notifications/unread-count")).body.count as number;

  it("lets only admins broadcast, and everyone sees it until they read it", async () => {
    const admin = await createAdmin();
    const owner = await register("farm_owner");
    const before = await unread(owner.token);

    expect((await as(owner.token).post("/api/v1/admin/notifications", { kind: "update", title: "Hi", body: "Not allowed" })).status).toBe(403);
    const sent = await as(admin).post("/api/v1/admin/notifications", { kind: "update", title: "New version", body: "Uploads are faster now." });
    expect(sent.status).toBe(201);

    expect(await unread(owner.token)).toBe(before + 1);
    const list = await as(owner.token).get("/api/v1/notifications");
    expect(list.body[0]).toMatchObject({ kind: "update", title: "New version", read: false });
    expect((await as(owner.token).post("/api/v1/notifications/read-all")).status).toBe(204);
    expect(await unread(owner.token)).toBe(0);
  });

  it("tells people about job activity and verification results", async () => {
    const admin = await createAdmin();
    const operator = await approvedOperator(admin);
    const owner = await register("farm_owner");
    await as(operator.token).post("/api/v1/notifications/read-all");
    await as(owner.token).post("/api/v1/notifications/read-all");

    const job = await as(owner.token).post("/api/v1/jobs", JOB);
    const bid = await as(operator.token).post(`/api/v1/jobs/${job.body.id}/bids`, BID);
    expect((await as(owner.token).get("/api/v1/notifications")).body[0]).toMatchObject({ kind: "job", title: "New bid on your job", jobId: job.body.id });

    await as(owner.token).post(`/api/v1/jobs/${job.body.id}/select`, { bidId: bid.body.id });
    expect((await as(operator.token).get("/api/v1/notifications")).body[0].title).toBe("You've been selected");

    const rejected = await register("operator");
    await completeProfile(rejected.token);
    await as(rejected.token).post("/api/v1/operators/me/submit");
    await as(admin).post(`/api/v1/admin/operators/${rejected.id}/decision`, { decision: "rejected", reason: "Licence photo is blurry" });
    const notes = (await as(rejected.token).get("/api/v1/notifications")).body;
    expect(notes[0]).toMatchObject({ kind: "verification", title: "Verification not approved" });
    expect(notes[0].body).toContain("Licence photo is blurry");
  });
});

describe("job violation reports", () => {
  it("lets others report a job once, never the owner", async () => {
    const owner = await register("farm_owner");
    const job = await as(owner.token).post("/api/v1/jobs", JOB);
    const reporter = await register("operator");
    const report = { category: "fraud", note: "Asks pilots to pay a deposit first." };

    expect((await as(owner.token).post(`/api/v1/jobs/${job.body.id}/reports`, report)).status).toBe(403);
    expect((await as(reporter.token).post(`/api/v1/jobs/${job.body.id}/reports`, { category: "spam", note: "Not a real category" })).status).toBe(400);
    expect((await as(reporter.token).post(`/api/v1/jobs/${job.body.id}/reports`, report)).status).toBe(201);
    expect((await as(reporter.token).post(`/api/v1/jobs/${job.body.id}/reports`, report)).status).toBe(409);
  });

  it("removes a reported job, tells the owner why, and updates every reporter", async () => {
    const admin = await createAdmin();
    const owner = await register("farm_owner");
    const job = await as(owner.token).post("/api/v1/jobs", JOB);
    const first = await register("operator");
    const second = await register("operator");
    await as(first.token).post(`/api/v1/jobs/${job.body.id}/reports`, { category: "fake_listing", note: "This farm does not exist." });
    await as(second.token).post(`/api/v1/jobs/${job.body.id}/reports`, { category: "fraud", note: "Same post seen as a scam elsewhere." });

    const open = (await as(admin).get("/api/v1/admin/job-reports")).body.filter((r: { jobId: string }) => r.jobId === job.body.id);
    expect(open).toHaveLength(2);
    expect((await as(admin).post(`/api/v1/admin/job-reports/${open[0].id}/decision`, { action: "remove_job" })).status).toBe(400);
    expect((await as(admin).post(`/api/v1/admin/job-reports/${open[0].id}/decision`, { action: "remove_job", note: "Fake listing" })).status).toBe(200);

    const removed = await as(owner.token).get(`/api/v1/jobs/${job.body.id}`);
    expect(removed.body).toMatchObject({ status: "removed", removedReason: "Fake listing" });
    expect((await as(first.token).get(`/api/v1/jobs/${job.body.id}`)).status).toBe(404);
    expect((await as(owner.token).get("/api/v1/notifications")).body[0].title).toBe("Job post removed");
    for (const reporter of [first, second]) {
      expect((await as(reporter.token).get("/api/v1/notifications")).body[0]).toMatchObject({ kind: "report", title: "Update on your report" });
    }
    const left = (await as(admin).get("/api/v1/admin/job-reports")).body.filter((r: { jobId: string }) => r.jobId === job.body.id);
    expect(left).toHaveLength(0);
  });

  it("suspends the owner: no sign-in, open jobs hidden, then restores on unsuspend", async () => {
    const admin = await createAdmin();
    const owner = await register("farm_owner");
    const ownerEmail = `user${n}@example.test`;
    const job = await as(owner.token).post("/api/v1/jobs", JOB);
    const reporter = await register("operator");
    await as(reporter.token).post(`/api/v1/jobs/${job.body.id}/reports`, { category: "harassment", note: "Abusive messages to pilots." });
    const report = (await as(admin).get("/api/v1/admin/job-reports")).body.find((r: { jobId: string }) => r.jobId === job.body.id);

    await as(admin).post(`/api/v1/admin/job-reports/${report.id}/decision`, { action: "suspend_owner", note: "Harassment" });

    const login = await request(app).post("/api/v1/auth/login").send({ email: ownerEmail, password: "password123" });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe("ACCOUNT_SUSPENDED");
    expect((await as(owner.token).get("/api/v1/jobs/mine")).status).toBe(401);
    const market = (await as(reporter.token).get("/api/v1/jobs")).body as { id: string }[];
    expect(market.some((j) => j.id === job.body.id)).toBe(false);

    const suspended = (await as(admin).get("/api/v1/admin/users/suspended")).body as { id: string; reason: string }[];
    expect(suspended.find((u) => u.id === owner.id)?.reason).toBe("Harassment");
    expect((await as(admin).post(`/api/v1/admin/users/${owner.id}/unsuspend`)).status).toBe(204);
    expect((await request(app).post("/api/v1/auth/login").send({ email: ownerEmail, password: "password123" })).status).toBe(200);
    expect(((await as(reporter.token).get("/api/v1/jobs")).body as { id: string }[]).some((j) => j.id === job.body.id)).toBe(true);
  });
});

describe("credentials, expiry and training (stage 5)", () => {
  const status = async (token: string) => (await as(token).get("/api/v1/operators/me")).body;
  const titles = async (token: string) => ((await as(token).get("/api/v1/notifications")).body as { title: string }[]).map((n) => n.title);

  it("refuses expiry dates that have passed and training dates in the future", async () => {
    const operator = await register("operator");
    await completeProfile(operator.token);
    await as(operator.token).put("/api/v1/operators/me", { ...PROFILE, rocExpiresOn: inDays(-1), trainingCompletedOn: inDays(5) });
    const submit = await as(operator.token).post("/api/v1/operators/me/submit");
    expect(submit.status).toBe(409);
    expect(submit.body.error.message).toContain("an ROC expiry date in the future");
    expect(submit.body.error.message).toContain("training completion date");
    expect((await as(operator.token).put("/api/v1/operators/me", { ...PROFILE, province: "Atlantis" })).status).toBe(400);
  });

  it("keeps ROC proof and training certificates private: consent first, admin-only links, audited", async () => {
    const admin = await createAdmin();
    const operator = await register("operator");
    // A consent to the previous notice version doesn't count.
    await db.query("INSERT INTO consents (user_id, kind, version) VALUES ($1, 'licence_upload', '2026-11-03')", [operator.id]);
    expect((await as(operator.token).post("/api/v1/operators/me/roc/upload-signature")).status).toBe(403);

    expect((await attachDocument(operator.token, "roc")).status).toBe(201);
    expect((await attachDocument(operator.token, "training_certificate")).status).toBe(201);
    expect(await status(operator.token)).toMatchObject({ rocAttached: true, trainingCertificateAttached: true, licenceAttached: false });
    const { rows } = await db.query("SELECT 1 FROM uploads WHERE user_id = $1 AND kind IN ('roc', 'training_certificate') AND url IS NULL", [operator.id]);
    expect(rows).toHaveLength(2);

    expect((await as(operator.token).get(`/api/v1/admin/operators/${operator.id}/documents/roc`)).status).toBe(403);
    for (const kind of ["roc", "training_certificate"]) {
      const link = await as(admin).get(`/api/v1/admin/operators/${operator.id}/documents/${kind}`);
      expect(link.status).toBe(200);
      expect(link.headers["cache-control"]).toBe("no-store");
      const audit = await db.query("SELECT 1 FROM audit_log WHERE target_id = $1 AND action = $2", [operator.id, `${kind}_viewed`]);
      expect(audit.rows).toHaveLength(1);
    }
    expect((await as(admin).get(`/api/v1/admin/operators/${operator.id}/documents/passport`)).status).toBe(400);
  });

  it("sets eligibility to the earlier expiry on approval, and won't approve expired documents", async () => {
    const admin = await createAdmin();
    const pilot = await approvedOperator(admin);
    expect(await status(pilot.token)).toMatchObject({ verificationStatus: "approved", canBid: true, eligibleUntil: PROFILE.rocExpiresOn });

    const late = await register("operator");
    await completeProfile(late.token);
    await as(late.token).post("/api/v1/operators/me/submit");
    await db.query("UPDATE operator_profiles SET rpl_expires_on = CURRENT_DATE - 1 WHERE user_id = $1", [late.id]);
    expect((await as(admin).post(`/api/v1/admin/operators/${late.id}/decision`, { decision: "approved" })).status).toBe(409);
    expect((await as(admin).post(`/api/v1/admin/operators/${late.id}/decision`, { decision: "rejected", reason: "Licence has expired." })).status).toBe(200);
  });

  it("stops pilots with expired credentials from bidding or being selected", async () => {
    const admin = await createAdmin();
    const owner = await register("farm_owner");
    const pilot = await approvedOperator(admin);
    const first = await as(owner.token).post("/api/v1/jobs", JOB);
    const bid = await as(pilot.token).post(`/api/v1/jobs/${first.body.id}/bids`, BID);
    expect(bid.status).toBe(201);

    await db.query("UPDATE operator_profiles SET eligible_until = CURRENT_DATE - 1 WHERE user_id = $1", [pilot.id]);
    expect((await status(pilot.token)).canBid).toBe(false);
    const second = await as(owner.token).post("/api/v1/jobs", JOB);
    const refused = await as(pilot.token).post(`/api/v1/jobs/${second.body.id}/bids`, BID);
    expect(refused.status).toBe(403);
    expect(refused.body.error.message).toContain("expired");
    expect((await as(owner.token).post(`/api/v1/jobs/${first.body.id}/select`, { bidId: bid.body.id })).status).toBe(409);
  });

  it("lets an approved pilot update their details and keep bidding until re-approved", async () => {
    const admin = await createAdmin();
    const owner = await register("farm_owner");
    const pilot = await approvedOperator(admin);
    expect((await as(pilot.token).put("/api/v1/operators/me", PROFILE)).status).toBe(409);

    const updating = await as(pilot.token).post("/api/v1/operators/me/update");
    expect(updating.body).toMatchObject({ verificationStatus: "updating", canBid: true });
    expect((await attachDocument(pilot.token, "roc")).status).toBe(201);
    const renewed = inDays(200);
    expect((await as(pilot.token).put("/api/v1/operators/me", { ...PROFILE, rocExpiresOn: renewed })).status).toBe(200);
    expect((await as(pilot.token).post("/api/v1/operators/me/submit")).body.verificationStatus).toBe("in_review");

    // Still eligible on the previously verified dates while the admin reviews.
    const job = await as(owner.token).post("/api/v1/jobs", JOB);
    expect((await as(pilot.token).post(`/api/v1/jobs/${job.body.id}/bids`, BID)).status).toBe(201);
    const approved = await as(admin).post(`/api/v1/admin/operators/${pilot.id}/decision`, { decision: "approved" });
    expect(approved.body).toMatchObject({ verificationStatus: "approved", eligibleUntil: renewed });
  });

  it("sends each expiry reminder once", async () => {
    const admin = await createAdmin();
    const pilot = await approvedOperator(admin);
    await db.query("UPDATE operator_profiles SET rpl_expires_on = CURRENT_DATE + 5, eligible_until = CURRENT_DATE + 5 WHERE user_id = $1", [pilot.id]);
    await status(pilot.token);
    await status(pilot.token);
    await as(pilot.token).get("/api/v1/jobs");
    expect((await titles(pilot.token)).filter((t) => t === "Licence expiring soon")).toHaveLength(1);

    await db.query("UPDATE operator_profiles SET rpl_expires_on = CURRENT_DATE - 1, eligible_until = CURRENT_DATE - 1 WHERE user_id = $1", [pilot.id]);
    await as(pilot.token).get("/api/v1/jobs");
    await as(pilot.token).get("/api/v1/jobs");
    expect((await titles(pilot.token)).filter((t) => t === "Licence expired")).toHaveLength(1);
  });

  it("gives pilots approved before the new rules a deadline, then blocks them", async () => {
    const owner = await register("farm_owner");
    const pilot = await register("operator");
    // What migration 007 does for pilots who were already approved.
    await db.query(
      "UPDATE operator_profiles SET base = 'Old Town', services = '{Mapping}', verification_status = 'approved', eligible_until = CURRENT_DATE + 30 WHERE user_id = $1",
      [pilot.id],
    );
    const job = await as(owner.token).post("/api/v1/jobs", JOB);
    expect((await as(pilot.token).post(`/api/v1/jobs/${job.body.id}/bids`, BID)).status).toBe(201);
    await status(pilot.token);
    expect(await titles(pilot.token)).toContain("Update your pilot details");

    await db.query("UPDATE operator_profiles SET eligible_until = CURRENT_DATE - 1 WHERE user_id = $1", [pilot.id]);
    const next = await as(owner.token).post("/api/v1/jobs", JOB);
    expect((await as(pilot.token).post(`/api/v1/jobs/${next.body.id}/bids`, BID)).status).toBe(403);
    await status(pilot.token);
    expect(await titles(pilot.token)).toContain("Pilot details overdue");
  });

  it("lists expiring pilots for admins and stores the job's province", async () => {
    const admin = await createAdmin();
    const owner = await register("farm_owner");
    const pilot = await approvedOperator(admin);
    await db.query("UPDATE operator_profiles SET eligible_until = CURRENT_DATE + 10 WHERE user_id = $1", [pilot.id]);
    const expiring = (await as(admin).get("/api/v1/admin/operators?status=expiring")).body as { id: string }[];
    expect(expiring.map((p) => p.id)).toContain(pilot.id);

    expect((await as(owner.token).post("/api/v1/jobs", { ...JOB, province: "Free State" })).body.province).toBe("Free State");
    expect((await as(owner.token).post("/api/v1/jobs", JOB)).body.province).toBeNull();
    expect((await as(owner.token).post("/api/v1/jobs", { ...JOB, province: "Nowhere" })).status).toBe(400);
  });
});
