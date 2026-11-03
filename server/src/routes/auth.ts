import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { checkPassword, hashPassword, signToken } from "../auth";
import type { Db } from "../db";
import { HttpError, parse } from "../http";

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

export function authRouter(db: Db, jwtSecret: string, rateLimitMax = 20) {
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

  return router;
}
