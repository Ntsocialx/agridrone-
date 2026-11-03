import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { checkPassword, hashPassword, signToken } from "../auth";
import type { Db } from "../db";
import { HttpError, parse } from "../http";
import type { Mailer } from "../mailer";

// Bump when the Terms/Privacy Notice text changes; the accepted version is stored.
export const TERMS_VERSION = "2026-11-03";

const registerSchema = z.object({
  email: z.email().max(254).transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?\d[\d ]{8,14}$/),
  // Admins are provisioned by script, never through public registration.
  role: z.enum(["operator", "farm_owner"]),
  acceptTerms: z.literal(true),
});

const loginSchema = z.object({
  email: z.string().transform((e) => e.trim().toLowerCase()),
  password: z.string(),
});

// Same message for unknown email and wrong password, so accounts can't be probed.
const badLogin = () => new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");

/** `mailer` is null until email is configured; password reset then answers 503. */
export function authRouter(db: Db, jwtSecret: string, mailer: Mailer | null, rateLimitMax = 20) {
  const router = Router();
  router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: rateLimitMax, standardHeaders: "draft-8", legacyHeaders: false }));

  router.post("/register", async (request, response) => {
    const input = parse(registerSchema, request.body);
    const passwordHash = await hashPassword(input.password);

    const user = await db.transaction(async (tx) => {
      const existing = await tx.query("SELECT 1 FROM users WHERE email = $1", [input.email]);
      if (existing.rows.length) throw new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists.");

      const { rows } = await tx.query<{ id: string }>(
        "INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [input.email, passwordHash, input.fullName, input.phone, input.role],
      );
      const id = rows[0].id;
      await tx.query("INSERT INTO consents (user_id, kind, version) VALUES ($1, 'terms_privacy', $2)", [id, TERMS_VERSION]);
      if (input.role === "operator") await tx.query("INSERT INTO operator_profiles (user_id) VALUES ($1)", [id]);
      return { id, role: input.role, fullName: input.fullName };
    });

    response.status(201).json({ token: signToken(user.id, jwtSecret), user });
  });

  router.post("/login", async (request, response) => {
    const input = parse(loginSchema, request.body);
    const { rows } = await db.query<{ id: string; role: string; fullName: string; passwordHash: string }>(
      'SELECT id, role, full_name AS "fullName", password_hash AS "passwordHash" FROM users WHERE email = $1',
      [input.email],
    );
    const user = rows[0];
    if (!user || !(await checkPassword(input.password, user.passwordHash))) throw badLogin();

    response.json({ token: signToken(user.id, jwtSecret), user: { id: user.id, role: user.role, fullName: user.fullName } });
  });

  // Always the same answer, so this can't be used to find out who has an account.
  router.post("/password/forgot", async (request, response) => {
    if (!mailer) throw new HttpError(503, "EMAIL_NOT_CONFIGURED", "Password reset isn't available yet. Please contact support.");
    const { email } = parse(z.object({ email: z.string().transform((e) => e.trim().toLowerCase()) }), request.body);

    const { rows } = await db.query<{ id: string; fullName: string }>('SELECT id, full_name AS "fullName" FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (user) {
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      await db.transaction(async (tx) => {
        // Only the newest code is valid.
        await tx.query("UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL", [user.id]);
        await tx.query(
          "INSERT INTO password_resets (user_id, code_hash, expires_at) VALUES ($1, $2, now() + make_interval(mins => $3))",
          [user.id, hashCode(code), RESET_MINUTES],
        );
      });
      // Not awaited: response time shouldn't reveal whether the account exists.
      mailer.sendResetCode({ email, name: user.fullName }, code).catch((error: unknown) => {
        console.error(JSON.stringify({ event: "reset_email_failed", errorType: error instanceof Error ? error.message : "unknown" }));
      });
    }
    response.json({ message: "If that email has an account, we've sent it a 6-digit code." });
  });

  router.post("/password/reset", async (request, response) => {
    const input = parse(resetSchema, request.body);
    const badCode = () => new HttpError(400, "INVALID_CODE", "That code is wrong or has expired. Request a new one.");

    const result = await db.transaction(async (tx) => {
      const { rows } = await tx.query<{ resetId: string; userId: string; codeHash: string; attempts: number; role: string; fullName: string }>(
        `SELECT r.id AS "resetId", u.id AS "userId", r.code_hash AS "codeHash", r.attempts, u.role, u.full_name AS "fullName"
         FROM password_resets r JOIN users u ON u.id = r.user_id
         WHERE u.email = $1 AND r.used_at IS NULL AND r.expires_at > now()
         ORDER BY r.created_at DESC LIMIT 1 FOR UPDATE OF r`,
        [input.email],
      );
      const reset = rows[0];
      if (!reset || reset.attempts >= MAX_ATTEMPTS) return null;

      if (!sameCode(hashCode(input.code), reset.codeHash)) {
        await tx.query("UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1", [reset.resetId]);
        return null;
      }
      await tx.query("UPDATE users SET password_hash = $2 WHERE id = $1", [reset.userId, await hashPassword(input.newPassword)]);
      await tx.query("UPDATE password_resets SET used_at = now() WHERE id = $1", [reset.resetId]);
      await tx.query("INSERT INTO audit_log (actor_id, action, target_type, target_id) VALUES ($1, 'password_reset', 'user', $1)", [reset.userId]);
      return reset;
    });
    if (!result) throw badCode();

    // Sign straight in with the new password.
    response.json({ token: signToken(result.userId, jwtSecret), user: { id: result.userId, role: result.role, fullName: result.fullName } });
  });

  return router;
}

const RESET_MINUTES = 15;
const MAX_ATTEMPTS = 5;

const resetSchema = z.object({
  email: z.string().transform((e) => e.trim().toLowerCase()),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(128),
});

// A 6-digit code has little entropy, so the attempt limit is what protects it;
// hashing just keeps live codes out of the database.
const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");
const sameCode = (a: string, b: string) => timingSafeEqual(Buffer.from(a), Buffer.from(b));
