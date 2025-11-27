// server/db/pool.ts
import { Pool } from "pg";
import { loadEnv } from "../config/env.js";
let pool;
export function createDbPool() {
    if (!pool) {
        const env = loadEnv();
        pool = new Pool({
            connectionString: env.DATABASE_URL,
        });
    }
    return pool;
}
export function getDbPool() {
    if (!pool) {
        throw new Error("DB pool not initialized. Call createDbPool() first.");
    }
    return pool;
}
