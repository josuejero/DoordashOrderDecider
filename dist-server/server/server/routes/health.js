import { createRequire } from "node:module";
import { getDbPool } from "../db/pool.js";
const require = createRequire(import.meta.url);
const pkg = require("../../package.json");
export function registerHealthRoutes(app) {
    app.get("/health", async () => {
        return { status: "ok" };
    });
    app.get("/version", async () => {
        return { version: pkg.version ?? "dev" };
    });
    app.get("/health/db", async (request, reply) => {
        try {
            const pool = getDbPool();
            await pool.query("SELECT 1");
            return { status: "ok" };
        }
        catch (err) {
            request.log.error({ err }, "DB health check failed");
            reply.code(500);
            return { status: "error" };
        }
    });
}
