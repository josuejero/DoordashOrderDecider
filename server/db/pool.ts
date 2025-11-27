// server/db/pool.ts
import { Pool } from "pg";
import { loadEnv } from "../config/env.js";


let pool: Pool | undefined;

export function createDbPool(): Pool {
  if (!pool) {
    const env = loadEnv();
    pool = new Pool({
      connectionString: env.DATABASE_URL,
    });
  }
  return pool;
}

export function getDbPool(): Pool {
  if (!pool) {
    throw new Error("DB pool not initialized. Call createDbPool() first.");
  }
  return pool;
}
