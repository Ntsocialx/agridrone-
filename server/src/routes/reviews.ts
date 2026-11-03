import { Router } from "express";
import { z } from "zod";
import { currentUser, requireRole } from "../auth";
import type { Db } from "../db";
import { conflict, forbidden, idParam, notFound, parse } from "../http";

const reviewSchema = z.object({
  jobId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1000),
});

// Reviewers are shown by first name only (data minimisation).
const REVIEW_FIELDS = `
  r.id, r.rating, r.comment, r.created_at AS "createdAt",
  split_part(o.full_name, ' ', 1) AS "reviewerFirstName", j.title AS "jobTitle", j.service`;

export function reviewsRouter(db: Db) {
  const router = Router();

  router.post("/reviews", requireRole("farm_owner"), async (request, response) => {
    const input = parse(reviewSchema, request.body);
    const user = currentUser(request);

    const { rows: jobs } = await db.query<{ status: string; ownerId: string; operatorId: string }>(
      `SELECT status, owner_id AS "ownerId", assigned_operator_id AS "operatorId" FROM jobs WHERE id = $1`,
      [input.jobId],
    );
    const job = jobs[0];
    if (!job) throw notFound("Job");
    if (job.ownerId !== user.id) throw forbidden("Only the farm owner who posted this job can review it.");
    if (job.status !== "completed") throw conflict("You can review a pilot once you've confirmed the job is complete.");

    const { rows } = await db.query(
      `INSERT INTO reviews (job_id, operator_id, owner_id, rating, comment) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (job_id) DO NOTHING RETURNING id, rating, comment, created_at AS "createdAt"`,
      [input.jobId, job.operatorId, user.id, input.rating, input.comment],
    );
    if (!rows[0]) throw conflict("You have already reviewed this job.");
    response.status(201).json(rows[0]);
  });

  // The reviewed pilot can report a review; there are no public replies.
  router.post("/reviews/:id/report", requireRole("operator"), async (request, response) => {
    const { reason } = parse(z.object({ reason: z.string().trim().min(5).max(500) }), request.body);
    const reviewId = idParam(request.params.id, "Review");
    const user = currentUser(request);

    const { rows: reviews } = await db.query<{ operatorId: string }>(
      'SELECT operator_id AS "operatorId" FROM reviews WHERE id = $1',
      [reviewId],
    );
    if (!reviews[0]) throw notFound("Review");
    if (reviews[0].operatorId !== user.id) throw forbidden("You can only report reviews about you.");

    const { rows } = await db.query(
      `INSERT INTO review_reports (review_id, reporter_id, reason) VALUES ($1, $2, $3)
       ON CONFLICT (review_id) DO NOTHING RETURNING id, status`,
      [reviewId, user.id, reason],
    );
    if (!rows[0]) throw conflict("This review has already been reported.");
    response.status(201).json(rows[0]);
  });

  // Public pilot profile: completed work, average rating and visible reviews.
  router.get("/pilots/:id", async (request, response) => {
    const pilotId = idParam(request.params.id, "Pilot");
    const { rows: pilots } = await db.query(
      `SELECT u.id, u.full_name AS "fullName", p.base, p.services, p.verification_status AS "verificationStatus",
         (SELECT round(avg(rating)::numeric, 1)::float8 FROM reviews WHERE operator_id = u.id AND NOT hidden) AS "averageRating",
         (SELECT count(*)::int FROM reviews WHERE operator_id = u.id AND NOT hidden) AS "reviewCount",
         (SELECT count(*)::int FROM jobs WHERE assigned_operator_id = u.id AND status = 'completed') AS "completedJobs"
       FROM users u JOIN operator_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [pilotId],
    );
    if (!pilots[0]) throw notFound("Pilot");

    const [{ rows: completed }, { rows: reviews }, { rows: portfolio }] = await Promise.all([
      db.query(
        `SELECT id, title, service, area_ha::float8 AS "areaHa", completed_at AS "completedAt"
         FROM jobs WHERE assigned_operator_id = $1 AND status = 'completed'
         ORDER BY completed_at DESC LIMIT 50`,
        [pilotId],
      ),
      db.query(
        `SELECT ${REVIEW_FIELDS} FROM reviews r JOIN users o ON o.id = r.owner_id JOIN jobs j ON j.id = r.job_id
         WHERE r.operator_id = $1 AND NOT r.hidden ORDER BY r.created_at DESC LIMIT 50`,
        [pilotId],
      ),
      db.query(
        `SELECT id, url, caption, created_at AS "createdAt" FROM uploads
         WHERE user_id = $1 AND kind = 'portfolio' ORDER BY created_at DESC LIMIT 50`,
        [pilotId],
      ),
    ]);
    response.json({ ...pilots[0], completed, reviews, portfolio });
  });

  return router;
}

const moderationSchema = z.object({ action: z.enum(["hide", "keep"]) });

export function reviewsAdminRouter(db: Db) {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/reports", async (_request, response) => {
    const { rows } = await db.query(
      `SELECT rr.id AS "reportId", rr.reason, rr.created_at AS "reportedAt", ${REVIEW_FIELDS},
         op.full_name AS "operatorName"
       FROM review_reports rr JOIN reviews r ON r.id = rr.review_id
       JOIN users o ON o.id = r.owner_id JOIN users op ON op.id = r.operator_id JOIN jobs j ON j.id = r.job_id
       WHERE rr.status = 'open' ORDER BY rr.created_at`,
    );
    response.json(rows);
  });

  router.post("/:id/moderation", async (request, response) => {
    const { action } = parse(moderationSchema, request.body);
    const reviewId = idParam(request.params.id, "Reported review");
    const admin = currentUser(request);

    await db.transaction(async (tx) => {
      const { rows } = await tx.query(
        `UPDATE review_reports SET status = $2, resolved_at = now()
         WHERE review_id = $1 AND status = 'open' RETURNING id`,
        [reviewId, action === "hide" ? "hidden" : "kept"],
      );
      if (!rows[0]) throw notFound("Reported review");
      if (action === "hide") await tx.query("UPDATE reviews SET hidden = true WHERE id = $1", [reviewId]);
      await tx.query(
        "INSERT INTO audit_log (actor_id, action, target_type, target_id) VALUES ($1, $2, 'review', $3)",
        [admin.id, `review_${action === "hide" ? "hidden" : "kept"}`, reviewId],
      );
    });
    response.json({ id: reviewId, action });
  });

  return router;
}
