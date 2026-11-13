import { Router } from "express";
import { z } from "zod";
import { currentUser, requireRole, type AuthUser } from "../auth";
import type { Db, Queryable } from "../db";
import { conflict, forbidden, idParam, notFound, parse } from "../http";
import { isEligible, PROVINCES, sendExpiryReminders } from "../credentials";
import { notify, quote } from "../notify";

export const SERVICES = ["Mapping", "Monitoring", "Surveying", "Spraying"] as const;
// Restricted/high-risk services stay on compliance hold: visible, never biddable
// or assignable until an approved policy and evidence review exist (docs/AGENTS.md).
export const RESTRICTED_SERVICES: readonly string[] = ["Spraying"];
export const BIDDABLE_SERVICES = ["Mapping", "Monitoring", "Surveying"] as const;

const JOB_FIELDS = `
  j.id, j.title, j.service, j.location, j.area_ha::float8 AS "areaHa",
  to_char(j.preferred_date, 'YYYY-MM-DD') AS "preferredDate", j.budget_zar AS "budgetZar",
  j.brief, j.status, j.province, j.owner_id AS "ownerId", o.full_name AS "postedBy",
  j.assigned_operator_id AS "assignedOperatorId", a.full_name AS "assignedOperatorName",
  j.created_at AS "createdAt", j.completed_at AS "completedAt", j.removed_reason AS "removedReason",
  (SELECT count(*)::int FROM bids b WHERE b.job_id = j.id) AS "bidCount",
  EXISTS (SELECT 1 FROM reviews r WHERE r.job_id = j.id) AS "reviewed"`;
const JOB_FROM = "FROM jobs j JOIN users o ON o.id = j.owner_id LEFT JOIN users a ON a.id = j.assigned_operator_id";

type JobRow = { id: string; title: string; status: string; ownerId: string; postedBy: string; assignedOperatorId: string | null; assignedOperatorName: string | null };

const jobSchema = z.object({
  title: z.string().trim().min(4).max(120),
  service: z.enum(SERVICES),
  location: z.string().trim().min(2).max(120),
  areaHa: z.number().positive().max(100_000),
  preferredDate: z.iso.date(),
  budgetZar: z.number().int().positive().max(10_000_000),
  brief: z.string().trim().min(10).max(2000),
  // Optional so older app versions (before v3) can still post; the app asks for it.
  province: z.enum(PROVINCES).optional(),
});

const bidSchema = z.object({
  amountZar: z.number().int().positive().max(10_000_000),
  days: z.number().int().min(1).max(60),
  message: z.string().trim().min(10).max(1000),
});

const listSchema = z.object({
  service: z.enum(SERVICES).optional(),
  q: z.string().trim().max(100).optional(),
});

async function loadJob(db: Queryable, id: unknown): Promise<JobRow & Record<string, unknown>> {
  const { rows } = await db.query<JobRow & Record<string, unknown>>(`SELECT ${JOB_FIELDS} ${JOB_FROM} WHERE j.id = $1`, [
    idParam(id, "Job"),
  ]);
  if (!rows[0]) throw notFound("Job");
  return rows[0];
}

// A suspended owner's open jobs drop out of the marketplace until the suspension is lifted.
async function ownerSuspended(db: Queryable, ownerId: string) {
  const { rows } = await db.query<{ suspended: boolean }>("SELECT suspended_at IS NOT NULL AS suspended FROM users WHERE id = $1", [ownerId]);
  return rows[0]?.suspended ?? false;
}

const isParticipant = (job: JobRow, user: AuthUser) =>
  user.role === "admin" || job.ownerId === user.id || job.assignedOperatorId === user.id;

export function jobsRouter(db: Db) {
  const router = Router();

  // Marketplace: everything still taking (or held from) bids.
  router.get("/", async (request, response) => {
    const { service, q } = parse(listSchema, request.query);
    const viewer = currentUser(request);
    // Pilots open the marketplace often, so expiry reminders are checked here too.
    if (viewer.role === "operator") await sendExpiryReminders(db, viewer.id);
    const { rows } = await db.query(
      `SELECT ${JOB_FIELDS} ${JOB_FROM}
       WHERE j.status IN ('open', 'on_hold') AND o.suspended_at IS NULL
         AND ($1::text IS NULL OR j.service = $1)
         AND ($2::text IS NULL OR j.title ILIKE '%' || $2 || '%' OR j.location ILIKE '%' || $2 || '%')
       ORDER BY j.created_at DESC LIMIT 100`,
      [service ?? null, q || null],
    );
    response.json(rows);
  });

  // Owner: jobs they posted. Operator: jobs assigned to them.
  router.get("/mine", requireRole("farm_owner", "operator"), async (request, response) => {
    const user = currentUser(request);
    const column = user.role === "farm_owner" ? "j.owner_id" : "j.assigned_operator_id";
    const { rows } = await db.query(`SELECT ${JOB_FIELDS} ${JOB_FROM} WHERE ${column} = $1 ORDER BY j.created_at DESC`, [
      user.id,
    ]);
    response.json(rows);
  });

  router.post("/", requireRole("farm_owner"), async (request, response) => {
    const input = parse(jobSchema, request.body);
    const status = RESTRICTED_SERVICES.includes(input.service) ? "on_hold" : "open";
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO jobs (owner_id, title, service, location, area_ha, preferred_date, budget_zar, brief, status, province)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [currentUser(request).id, input.title, input.service, input.location, input.areaHa, input.preferredDate, input.budgetZar, input.brief, status, input.province ?? null],
    );
    response.status(201).json(await loadJob(db, rows[0].id));
  });

  router.get("/:id", async (request, response) => {
    const user = currentUser(request);
    const job = await loadJob(db, request.params.id);
    const isPublic = (job.status === "open" || job.status === "on_hold") && !(await ownerSuspended(db, job.ownerId));
    if (!isPublic && !isParticipant(job, user)) throw notFound("Job");

    // Owners/admins see every bid; an operator sees only their own.
    const seeAll = user.role === "admin" || job.ownerId === user.id;
    const { rows: bids } = await db.query(
      `SELECT b.id, b.operator_id AS "operatorId", u.full_name AS "operatorName", b.amount_zar AS "amountZar",
         b.days, b.message, b.status, b.created_at AS "createdAt"
       FROM bids b JOIN users u ON u.id = b.operator_id
       WHERE b.job_id = $1 AND ($2 OR b.operator_id = $3)
       ORDER BY b.amount_zar`,
      [job.id, seeAll, user.id],
    );
    response.json({ ...job, bids });
  });

  router.post("/:id/bids", requireRole("operator"), async (request, response) => {
    const input = parse(bidSchema, request.body);
    const user = currentUser(request);
    const job = await loadJob(db, request.params.id);

    if (job.status === "on_hold") throw forbidden("This job is on compliance hold and is not accepting bids.");
    if (job.status !== "open" || (await ownerSuspended(db, job.ownerId))) throw conflict("This job is no longer accepting bids.");
    if (!(await isEligible(db, user.id))) {
      const { rows: profile } = await db.query<{ verified: boolean }>(
        "SELECT eligible_until IS NOT NULL AS verified FROM operator_profiles WHERE user_id = $1",
        [user.id],
      );
      throw forbidden(
        profile[0]?.verified
          ? "Your licence or ROC has expired, or your update deadline has passed. Update your details in Profile; you can bid again once an admin approves them."
          : "Your verification must be approved before you can bid.",
      );
    }

    const { rows } = await db.query(
      `INSERT INTO bids (job_id, operator_id, amount_zar, days, message) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (job_id, operator_id) DO NOTHING
       RETURNING id, amount_zar AS "amountZar", days, message, status`,
      [job.id, user.id, input.amountZar, input.days, input.message],
    );
    if (!rows[0]) throw conflict("You have already bid on this job.");
    await notify(db, job.ownerId, "job", "New bid on your job", `${user.fullName} bid R ${input.amountZar} on ${quote(job.title)}.`, job.id);
    response.status(201).json(rows[0]);
  });

  router.post("/:id/select", requireRole("farm_owner"), async (request, response) => {
    const { bidId } = parse(z.object({ bidId: z.uuid() }), request.body);
    const user = currentUser(request);
    const jobId = idParam(request.params.id, "Job");

    await db.transaction(async (tx) => {
      const { rows: bid } = await tx.query<{ operatorId: string }>(
        `SELECT operator_id AS "operatorId" FROM bids WHERE id = $1 AND job_id = $2 AND status = 'pending'`,
        [bidId, jobId],
      );
      if (!bid[0]) throw notFound("Bid");
      // A pilot whose licence or ROC lapsed after bidding can't be chosen.
      if (!(await isEligible(tx, bid[0].operatorId))) {
        throw conflict("This pilot's licence or ROC isn't current, so they can't be selected right now. Choose another bid or try again later.");
      }

      // The status guard makes a second, concurrent selection a no-op.
      const { rows: job } = await tx.query<{ title: string }>(
        `UPDATE jobs SET status = 'assigned', assigned_operator_id = $3
         WHERE id = $1 AND owner_id = $2 AND status = 'open' RETURNING title`,
        [jobId, user.id, bid[0].operatorId],
      );
      if (!job[0]) throw conflict("This job is not open for selection.");

      await tx.query(
        "UPDATE bids SET status = CASE WHEN id = $2 THEN 'accepted' ELSE 'declined' END WHERE job_id = $1",
        [jobId, bidId],
      );
      await tx.query(
        "INSERT INTO audit_log (actor_id, action, target_type, target_id, detail) VALUES ($1, 'operator_selected', 'job', $2, $3)",
        [user.id, jobId, bidId],
      );
      await notify(tx, bid[0].operatorId, "job", "You've been selected", `${user.fullName} chose you for ${quote(job[0].title)}.`, jobId);
    });
    response.json(await loadJob(db, jobId));
  });

  // Two-step completion: the pilot says the work is done, the owner confirms.
  const transition = (role: "operator" | "farm_owner", from: string, to: string, actorColumn: string) =>
    router.post(
      `/:id/${role === "operator" ? "complete" : "confirm"}`,
      requireRole(role),
      async (request, response) => {
        const jobId = idParam(request.params.id, "Job");
        const { rows } = await db.query(
          `UPDATE jobs SET status = $3, completed_at = CASE WHEN $3 = 'completed' THEN now() ELSE completed_at END
           WHERE id = $1 AND ${actorColumn} = $2 AND status = $4 RETURNING id`,
          [jobId, currentUser(request).id, to, from],
        );
        if (!rows[0]) throw conflict(`Only jobs that are '${from}' can be moved to '${to}'.`);
        const job = await loadJob(db, jobId);
        if (role === "operator") {
          await notify(db, job.ownerId, "job", "Job marked complete", `${job.assignedOperatorName} says ${quote(job.title)} is done. Confirm it to close the job.`, jobId);
        } else if (job.assignedOperatorId) {
          await notify(db, job.assignedOperatorId, "job", "Job confirmed complete", `${job.postedBy} confirmed ${quote(job.title)}. It now shows on your profile.`, jobId);
        }
        response.json(job);
      },
    );
  transition("operator", "assigned", "pending_confirmation", "assigned_operator_id");
  transition("farm_owner", "pending_confirmation", "completed", "owner_id");

  router.post("/:id/cancel", requireRole("farm_owner"), async (request, response) => {
    const jobId = idParam(request.params.id, "Job");
    const { rows } = await db.query(
      `UPDATE jobs SET status = 'cancelled' WHERE id = $1 AND owner_id = $2 AND status IN ('open', 'on_hold') RETURNING id`,
      [jobId, currentUser(request).id],
    );
    if (!rows[0]) throw conflict("Only open or held jobs can be cancelled.");
    response.json(await loadJob(db, jobId));
  });

  return router;
}
