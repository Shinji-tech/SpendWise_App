import { Pool } from "pg";

const globalForPg = globalThis as typeof globalThis & { spendWisePool?: Pool };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalForPg.spendWisePool) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    pool.on("error", (error) => console.error("Unexpected PostgreSQL pool error:", error));
    globalForPg.spendWisePool = pool;
  }

  return globalForPg.spendWisePool;
}
