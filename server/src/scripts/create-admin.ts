import "dotenv/config";
import { z } from "zod";
import { hashPassword } from "../auth";
import { env } from "../config/env";
import { createPgDb } from "../db";

// Controlled admin provisioning (docs/AGENTS.md §6). Read from env vars rather
// than CLI args so the password doesn't land in shell history.
const input = z
  .object({
    ADMIN_EMAIL: z.email().transform((e) => e.toLowerCase()),
    ADMIN_NAME: z.string().trim().min(2),
    ADMIN_PASSWORD: z.string().min(12),
  })
  .parse(process.env);

if (!env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");
const db = createPgDb(env.DATABASE_URL);

async function main() {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, full_name, phone, role) VALUES ($1, $2, $3, '', 'admin')
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [input.ADMIN_EMAIL, await hashPassword(input.ADMIN_PASSWORD), input.ADMIN_NAME],
  );
  if (!rows[0]) throw new Error("A user with that email already exists.");
  await db.query(
    "INSERT INTO audit_log (actor_id, action, target_type, target_id) VALUES (NULL, 'admin_provisioned', 'user', $1)",
    [rows[0].id],
  );
  console.info(JSON.stringify({ event: "admin_created", id: rows[0].id }));
}

main().finally(() => db.close());
