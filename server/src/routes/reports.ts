import { Router } from "express";
import { z } from "zod";
import { currentUser, requireRole } from "../auth";
import type { Db } from "../db";
import { conflict, forbidden, idParam, notFound, parse } from "../http";
import { notify, quote } from "../notify";

const CATEGORIES = ["fraud", "fake_listing", "unsafe_flying", "harassment", "other"] as const;

const reportSchema = z.object({
  category: z.enum(CATEGORIES),
  note: z.string().trim().min(10).max(1000),
});

const decisionSchema = z
  .object({
    action: z.enum(["dismiss", "resolve", "remove_job", "suspend_owner"]),
    note: z.string().trim().max(500).default(""),
  })
  // Removal and suspension reasons are shown to the job owner, so they're required.
  .refine((d) => (d.action !== "remove_job" && d.action !== "suspend_owner") || d.note.length >= 5, { path: ["note"] });

const OUTCOME = {
  dismiss: { status: "dismissed", audit: "job_report_dismissed", message: "We reviewed it and found no violation." },
  resolve: { status: "resolved", audit: "job_report_resolved", message: "We reviewed it and dealt with the issue." },
  remove_job: { status: "job_removed", audit: "job_removed", message: "We reviewed it and removed the job post." },
  suspend_owner: { status: "owner_suspended", audit: "user_suspended", message: "We reviewed it and suspended the account that posted it." },
} as const;

/** Anyone signed in, except the job's owner, can report a job post once. */
export function jobReportsRouter(db: Db) {
  const router = Router();

  router.post("/:id/reports", requireRole("operator", "farm_owner"), async (request, response) => {
    const input = parse(reportSchema, request.body);
    const jobId = idParam(request.params.id, "Job");
    const user = currentUser(request);

    const { rows: jobs } = await db.query<{ ownerId: string }>('SELECT owner_id AS "ownerId" FROM jobs WHERE id = $1', [jobId]);
    if (!jobs[0]) throw notFound("Job");
    if (jobs[0].ownerId === user.id) throw forbidden("You can't report your own job post.");

    const { rows } = await db.query(
      `INSERT INTO job_reports (job_id, reporter_id, category, note) VALUES ($1, $2, $3, $4)
       ON CONFLICT (job_id, reporter_id) DO NOTHING RETURNING id, status`,
      [jobId, user.id, input.category, input.note],
    );
    if (!rows[0]) throw conflict("You've already reported this job post.");
    response.status(201).json(rows[0]);
  });

  return router;
}

export function reportsAdminRouter(db: Db) {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/job-reports", async (_request, response) => {
    const { rows } = await db.query(
      `SELECT jr.id, jr.category, jr.note, jr.created_at AS "createdAt",
         j.id AS "jobId", j.title AS "jobTitle", j.status AS "jobStatus",
         o.id AS "ownerId", o.full_name AS "ownerName", (o.suspended_at IS NOT NULL) AS "ownerSuspended",
         rp.full_name AS "reporterName"
       FROM job_reports jr JOIN jobs j ON j.id = jr.job_id
       JOIN users o ON o.id = j.owner_id JOIN users rp ON rp.id = jr.reporter_id
       WHERE jr.status = 'open' ORDER BY jr.created_at`,
    );
    response.json(rows);
  });

  router.post("/job-reports/:id/decision", async (request, response) => {
    const input = parse(decisionSchema, request.body);
    const reportId = idParam(request.params.id, "Open report");
    const admin = currentUser(request);
    const outcome = OUTCOME[input.action];

    await db.transaction(async (tx) => {
      const { rows: reports } = await tx.query<{ jobId: string; title: string; ownerId: string; ownerRole: string }>(
        `SELECT jr.job_id AS "jobId", j.title, j.owner_id AS "ownerId", o.role AS "ownerRole"
         FROM job_reports jr JOIN jobs j ON j.id = jr.job_id JOIN users o ON o.id = j.owner_id
         WHERE jr.id = $1 AND jr.status = 'open' FOR UPDATE OF jr`,
        [reportId],
      );
      const report = reports[0];
      if (!report) throw notFound("Open report");

      if (input.action === "remove_job") {
        const { rows } = await tx.query(
          `UPDATE jobs SET status = 'removed', removed_reason = $2 WHERE id = $1 AND status IN ('open', 'on_hold') RETURNING id`,
          [report.jobId, input.note],
        );
        if (!rows[0]) throw conflict("Only open or held job posts can be removed.");
        await tx.query("UPDATE bids SET status = 'declined' WHERE job_id = $1 AND status = 'pending'", [report.jobId]);
        await notify(tx, report.ownerId, "job", "Job post removed", `${quote(report.title)} was removed by AgricDrone Hub: ${input.note}`, report.jobId);
      }
      if (input.action === "suspend_owner") {
        if (report.ownerRole === "admin") throw forbidden("Admin accounts can't be suspended.");
        await tx.query(
          "UPDATE users SET suspended_at = now(), suspension_reason = $2 WHERE id = $1 AND suspended_at IS NULL",
          [report.ownerId, input.note],
        );
      }

      // Removal and suspension settle every open report on that job; dismiss/resolve only this one.
      const settlesAll = input.action === "remove_job" || input.action === "suspend_owner";
      const { rows: settled } = await tx.query<{ reporterId: string }>(
        `UPDATE job_reports SET status = $2, admin_note = $3, resolved_by = $4, resolved_at = now()
         WHERE status = 'open' AND ${settlesAll ? "job_id" : "id"} = $1
         RETURNING reporter_id AS "reporterId"`,
        [settlesAll ? report.jobId : reportId, outcome.status, input.note || null, admin.id],
      );
      for (const { reporterId } of settled) {
        await notify(tx, reporterId, "report", "Update on your report", `About ${quote(report.title)}: ${outcome.message}`, report.jobId);
      }

      const target = input.action === "suspend_owner" ? ["user", report.ownerId] : ["job_report", reportId];
      await tx.query(
        "INSERT INTO audit_log (actor_id, action, target_type, target_id, detail) VALUES ($1, $2, $3, $4, $5)",
        [admin.id, outcome.audit, target[0], target[1], input.note || null],
      );
    });
    response.json({ id: reportId, action: input.action });
  });

  router.get("/users/suspended", async (_request, response) => {
    const { rows } = await db.query(
      `SELECT id, full_name AS "fullName", email, role, suspended_at AS "suspendedAt", suspension_reason AS "reason"
       FROM users WHERE suspended_at IS NOT NULL ORDER BY suspended_at DESC`,
    );
    response.json(rows);
  });

  router.post("/users/:id/unsuspend", async (request, response) => {
    const userId = idParam(request.params.id, "Suspended account");
    const admin = currentUser(request);
    await db.transaction(async (tx) => {
      const { rows } = await tx.query(
        "UPDATE users SET suspended_at = NULL, suspension_reason = NULL WHERE id = $1 AND suspended_at IS NOT NULL RETURNING id",
        [userId],
      );
      if (!rows[0]) throw notFound("Suspended account");
      await tx.query("INSERT INTO audit_log (actor_id, action, target_type, target_id) VALUES ($1, 'user_unsuspended', 'user', $2)", [
        admin.id,
        userId,
      ]);
    });
    response.status(204).end();
  });

  return router;
}

