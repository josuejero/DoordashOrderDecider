import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import client from "prom-client";
const register = new client.Registry();
client.collectDefaultMetrics({ register });
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
register.registerMetric(httpRequestDuration);
export function installMetricsRoute(app: FastifyInstance) {
  app.get("/metrics", async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.header("Content-Type", register.contentType);
    return register.metrics();
  });
}
export function wrapWithMetrics(app: FastifyInstance) {
  app.addHook("onResponse", async (req, reply) => {
    const route = req.routeOptions.url ?? req.url;
    httpRequestDuration
      .labels(req.method, route, String(reply.statusCode))
      .observe(reply.elapsedTime / 1000);
  });
}
