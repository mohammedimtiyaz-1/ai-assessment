import { Pool, type QueryResultRow } from "pg";
import { env } from "./env";

const globalForDb = globalThis as unknown as {
  __dbPool?: Pool;
};

export const pool =
  globalForDb.__dbPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.__dbPool = pool;
}

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    client.release();
  }
}
