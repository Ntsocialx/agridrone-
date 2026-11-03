import { Pool } from "pg";

export type Queryable = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

// One interface for Neon (pg Pool) in production and PGlite in tests.
export type Db = Queryable & {
  exec(sql: string): Promise<void>;
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};

export function createPgDb(connectionString: string): Db {
  const pool = new Pool({ connectionString, max: 10 });

  return {
    query: async <T>(sql: string, params?: unknown[]) => {
      const result = await pool.query(sql, params);
      return { rows: result.rows as T[] };
    },
    exec: async (sql) => {
      await pool.query(sql);
    },
    transaction: async (work) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work({
          query: async <T>(sql: string, params?: unknown[]) => {
            const r = await client.query(sql, params);
            return { rows: r.rows as T[] };
          },
        });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
