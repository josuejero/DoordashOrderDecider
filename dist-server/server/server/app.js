// server/app.ts
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { createDbPool } from "./db/pool.js";
import { registerAnalyticsRoutes } from "./routes/analytics.js";
import { registerDriverRoutes } from "./routes/drivers.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerOrderRoutes } from "./routes/orders.js";
export function buildApp() {
    const app = Fastify({
        logger: true,
    });
    app.register(cors, { origin: true });
    app.register(helmet, { contentSecurityPolicy: false });
    const pool = createDbPool();
    app.decorate("db", pool);
    registerHealthRoutes(app);
    registerDriverRoutes(app);
    registerOrderRoutes(app);
    registerAnalyticsRoutes(app);
    return app;
}
