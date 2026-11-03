import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import type { Db } from "./db";
import { HttpError, forbidden } from "./http";

export type Role = "operator" | "farm_owner" | "admin";
export type AuthUser = { id: string; role: Role; fullName: string };

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

const TOKEN_TTL = "1h";
const BCRYPT_ROUNDS = 12;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export const signToken = (userId: string, secret: string) =>
  jwt.sign({}, secret, { subject: userId, expiresIn: TOKEN_TTL, algorithm: "HS256" });

const unauthorized = () => new HttpError(401, "UNAUTHORIZED", "Please sign in again.");

/**
 * Verifies the bearer token, then loads the user from the database so the role
 * comes from the server, never from anything the client sent.
 */
export function requireAuth(db: Db, secret: string): RequestHandler {
  return async (request, _response, next) => {
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw unauthorized();

    let userId: string | undefined;
    try {
      userId = jwt.verify(token, secret, { algorithms: ["HS256"] }).sub as string | undefined;
    } catch {
      throw unauthorized();
    }
    if (!userId) throw unauthorized();

    const { rows } = await db.query<AuthUser>(
      'SELECT id, role, full_name AS "fullName" FROM users WHERE id = $1',
      [userId],
    );
    if (!rows[0]) throw unauthorized();
    request.user = rows[0];
    next();
  };
}

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.user || !roles.includes(request.user.role)) throw forbidden();
    next();
  };

/** Only call after requireAuth. */
export const currentUser = (request: { user?: AuthUser }) => {
  if (!request.user) throw unauthorized();
  return request.user;
};
