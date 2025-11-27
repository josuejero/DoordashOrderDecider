// server/app.ts
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { createDbPool } from "./db/pool.js";
import { registerHealthRoutes } from "./routes/health.js";
export function buildApp() {
    const app = Fastify({
        logger: true,
    });
    app.register(cors, { origin: true });
    app.register(helmet, { contentSecurityPolicy: false });
    const pool = createDbPool();
    app.decorate("db", pool);
    registerHealthRoutes(app);
    return app;
}
