import { Pool } from "pg";
import { loadEnv } from "../config/env.js";

let pool: Pool | undefined;
export function createDbPool(): Pool {
  if (!pool) {
    if (globalThis.__TEST_DB_POOL__) {
      pool = globalThis.__TEST_DB_POOL__;
    } else {
      const env = loadEnv();
      pool = new Pool({
        connectionString: env.DATABASE_URL,
      });
    }
  }
  return pool;
}
export function getDbPool(): Pool {
  if (!pool) {
    throw new Error("DB pool not initialized. Call createDbPool() first.");
  }
  return pool;
}
