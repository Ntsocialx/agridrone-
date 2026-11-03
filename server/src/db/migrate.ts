import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Db } from "./index";

// Same relative path from src/db and dist/db.
const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

/** Applies new .sql files in name order. Applied files must never be edited. */
export async function migrate(db: Db): Promise<string[]> {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const { rows } = await db.query<{ name: string }>("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && !applied.has(f))
    .sort();

  for (const file of pending) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    await db.exec(`BEGIN;\n${sql}\nINSERT INTO schema_migrations (name) VALUES ('${file}');\nCOMMIT;`);
  }
  return pending;
}
