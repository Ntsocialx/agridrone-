import type { Db } from "./db";
import { migrate } from "./db/migrate";

/** A fresh, migrated in-memory Postgres (PGlite) for each test file. */
export async function createTestDb(): Promise<Db> {
  // Dynamic import: PGlite is ESM-only and the server compiles to CommonJS.
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();

  const db: Db = {
    query: async <T>(sql: string, params?: unknown[]) => ({ rows: (await pg.query<T>(sql, params)).rows }),
    exec: async (sql) => {
      await pg.exec(sql);
    },
    transaction: (work) =>
      pg.transaction((tx) => work({ query: async <T>(sql: string, params?: unknown[]) => ({ rows: (await tx.query<T>(sql, params)).rows }) })),
    close: () => pg.close(),
  };
  await migrate(db);
  return db;
}
