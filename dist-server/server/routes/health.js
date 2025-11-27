import pkg from "../../package.json" with { type: "json" };
import { getDbPool } from "../db/pool.js";
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
