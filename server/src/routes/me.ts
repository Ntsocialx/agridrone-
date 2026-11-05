import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { checkPassword, currentUser, hashPassword, requireRole } from "../auth";
import type { Db, Queryable } from "../db";
import { HttpError, parse } from "../http";
import { registerSchema } from "./auth";

const ME_FIELDS = 'id, role, full_name AS "fullName", email, phone';

const detailsSchema = z.object({
  fullName: registerSchema.shape.fullName,
  phone: registerSchema.shape.phone,
  email: registerSchema.shape.email,
  // Only needed when the email changes.
  currentPassword: z.string().max(128).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().max(128),
  newPassword: registerSchema.shape.password,
});

// 400, not 401: the app treats 401 as "session expired" and signs out.
const wrongPassword = () => new HttpError(400, "WRONG_PASSWORD", "Your current password is incorrect.");

/** The signed-in user's own account. Admins can read theirs but are managed by the system owner. */
export function meRouter(db: Db, rateLimitMax = 20) {
  const router = Router();
  // Both write routes can check a password, so they share the auth rate limit.
  const limited = rateLimit({ windowMs: 15 * 60 * 1000, limit: rateLimitMax, standardHeaders: "draft-8", legacyHeaders: false });

  const passwordMatches = async (q: Queryable, userId: string, password: string | undefined) => {
    const { rows } = await q.query<{ hash: string }>('SELECT password_hash AS "hash" FROM users WHERE id = $1', [userId]);
    return password !== undefined && checkPassword(password, rows[0].hash);
  };

  router.get("/", async (request, response) => {
    const { rows } = await db.query(`SELECT ${ME_FIELDS} FROM users WHERE id = $1`, [currentUser(request).id]);
    response.json(rows[0]);
  });

  router.patch("/", limited, requireRole("operator", "farm_owner"), async (request, response) => {
    const input = parse(detailsSchema, request.body);
    const user = currentUser(request);

    const updated = await db.transaction(async (tx) => {
      const { rows: current } = await tx.query<{ email: string }>("SELECT email FROM users WHERE id = $1 FOR UPDATE", [user.id]);
      const emailChanged = current[0].email !== input.email;
      if (emailChanged) {
        // Stops someone holding an unlocked phone from taking over the account.
        if (!(await passwordMatches(tx, user.id, input.currentPassword))) throw wrongPassword();
        const taken = await tx.query("SELECT 1 FROM users WHERE email = $1", [input.email]);
        if (taken.rows.length) throw new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists.");
      }
      const { rows } = await tx.query(
        `UPDATE users SET full_name = $2, phone = $3, email = $4 WHERE id = $1 RETURNING ${ME_FIELDS}`,
        [user.id, input.fullName, input.phone, input.email],
      );
      if (emailChanged) {
        await tx.query("INSERT INTO audit_log (actor_id, action, target_type, target_id) VALUES ($1, 'email_changed', 'user', $1)", [user.id]);
      }
      return rows[0];
    });
    response.json(updated);
  });

  router.post("/password", limited, requireRole("operator", "farm_owner"), async (request, response) => {
    const input = parse(passwordSchema, request.body);
    const user = currentUser(request);
    if (!(await passwordMatches(db, user.id, input.currentPassword))) throw wrongPassword();

    await db.transaction(async (tx) => {
      await tx.query("UPDATE users SET password_hash = $2 WHERE id = $1", [user.id, await hashPassword(input.newPassword)]);
      await tx.query("INSERT INTO audit_log (actor_id, action, target_type, target_id) VALUES ($1, 'password_changed', 'user', $1)", [user.id]);
    });
    response.status(204).end();
  });

  return router;
}
