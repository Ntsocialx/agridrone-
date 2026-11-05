import type { Queryable } from "./db";

export type NotificationKind = "announcement" | "update" | "job" | "verification" | "review" | "report";

/** Adds a personal in-app notification. Call inside the same transaction as the change it describes. */
export async function notify(
  db: Queryable,
  userId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  jobId: string | null = null,
) {
  await db.query("INSERT INTO notifications (user_id, kind, title, body, job_id) VALUES ($1, $2, $3, $4, $5)", [
    userId,
    kind,
    title,
    body,
    jobId,
  ]);
}

export const quote = (title: unknown) => `“${String(title)}”`;
