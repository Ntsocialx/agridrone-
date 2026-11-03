import "dotenv/config";
import { env } from "../config/env";
import { createPgDb } from "../db";
import { migrate } from "../db/migrate";

if (!env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");
const db = createPgDb(env.DATABASE_URL);

migrate(db)
  .then((applied) => console.info(JSON.stringify({ event: "migrations_applied", applied })))
  .finally(() => db.close());
