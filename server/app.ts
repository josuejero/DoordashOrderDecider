// server/app.ts
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { loadEnv } from "./config/env.js";
import { createDbPool } from "./db/pool.js";
import { registerAnalyticsRoutes } from "./routes/analytics.js";
import { registerDriverRoutes } from "./routes/drivers.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerOrderRoutes } from "./routes/orders.js";

export function buildApp() {
  const env = loadEnv();

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

  if (env.ENABLE_ANALYTICS_API) {
    registerAnalyticsRoutes(app);
  }

  return app;
}
