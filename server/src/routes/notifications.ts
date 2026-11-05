import { Router } from "express";
import { z } from "zod";
import { currentUser, requireRole } from "../auth";
import type { Db } from "../db";
import { parse } from "../http";

// Personal notices plus every admin broadcast (user_id NULL).
const VISIBLE = "(n.user_id = $1 OR n.user_id IS NULL)";

const broadcastSchema = z.object({
  kind: z.enum(["announcement", "update"]),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(5).max(1000),
});

export function notificationsRouter(db: Db) {
  const router = Router();

  router.get("/", async (request, response) => {
    const { rows } = await db.query(
      `SELECT n.id, n.kind, n.title, n.body, n.job_id AS "jobId", n.created_at AS "createdAt",
         (r.user_id IS NOT NULL) AS "read"
       FROM notifications n
       LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = $1
       WHERE ${VISIBLE} ORDER BY n.created_at DESC LIMIT 50`,
      [currentUser(request).id],
    );
    response.json(rows);
  });

  router.get("/unread-count", async (request, response) => {
    const { rows } = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM notifications n
       WHERE ${VISIBLE} AND NOT EXISTS (SELECT 1 FROM notification_reads r WHERE r.notification_id = n.id AND r.user_id = $1)`,
      [currentUser(request).id],
    );
    response.json(rows[0]);
  });

  router.post("/read-all", async (request, response) => {
    await db.query(
      `INSERT INTO notification_reads (notification_id, user_id)
       SELECT n.id, $1 FROM notifications n WHERE ${VISIBLE}
       ON CONFLICT DO NOTHING`,
      [currentUser(request).id],
    );
    response.status(204).end();
  });

  return router;
}

export function notificationsAdminRouter(db: Db) {
  const router = Router();
  router.use(requireRole("admin"));

  router.get("/notifications", async (_request, response) => {
    const { rows } = await db.query(
      `SELECT id, kind, title, body, created_at AS "createdAt" FROM notifications
       WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50`,
    );
    response.json(rows);
  });

  router.post("/notifications", async (request, response) => {
    const input = parse(broadcastSchema, request.body);
    const admin = currentUser(request);
    const sent = await db.transaction(async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO notifications (user_id, kind, title, body, created_by) VALUES (NULL, $1, $2, $3, $4)
         RETURNING id, kind, title, body, created_at AS "createdAt"`,
        [input.kind, input.title, input.body, admin.id],
      );
      await tx.query(
        "INSERT INTO audit_log (actor_id, action, target_type, target_id) VALUES ($1, 'broadcast_sent', 'notification', $2)",
        [admin.id, rows[0].id],
      );
      return rows[0];
    });
    response.status(201).json(sent);
  });

  return router;
}
