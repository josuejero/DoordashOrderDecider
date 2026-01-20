import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { loadEnv } from "./config/env.js";
import { CORRELATION_HEADER, resolveCorrelationId } from "./correlation.js";
import { createDbPool } from "./db/pool.js";
import { installMetricsRoute, wrapWithMetrics } from "./metrics.js";
import { registerAnalyticsRoutes } from "./routes/analytics.js";
import { registerDriverRoutes } from "./routes/drivers.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerModelRoutes } from "./routes/model.js";
import { registerOrderRoutes } from "./routes/orders.js";
import { registerQuoteRoutes } from "./routes/quote.js";
export function buildApp() {
  const env = loadEnv();
  const app = Fastify({
    logger: true,
  });
  app.decorateRequest("correlationId", "");
  app.addHook("onRequest", async (request, reply) => {
    const correlationId = resolveCorrelationId(request.headers[CORRELATION_HEADER]);
    request.correlationId = correlationId;
    request.log = request.log.child({ correlationId });
    reply.header(CORRELATION_HEADER, correlationId);
  });
  wrapWithMetrics(app);
  app.register(cors, { origin: true });
  app.register(helmet, { contentSecurityPolicy: false });
  const pool = createDbPool();
  app.decorate("db", pool);
  registerHealthRoutes(app);
  registerDriverRoutes(app);
  registerOrderRoutes(app);
  registerQuoteRoutes(app);
  registerModelRoutes(app);
  if (env.ENABLE_ANALYTICS_API) {
    registerAnalyticsRoutes(app);
  }
  installMetricsRoute(app);
  return app;
}
