import Fastify from "fastify";
import { registerAnalyticsRoutes } from "./routes/analytics";
export function buildFastifyApp() {
  const app = Fastify({
    logger: true,
  });
  registerAnalyticsRoutes(app);
  return app;
}
if (typeof require !== "undefined" && require.main === module) {
  const app = buildFastifyApp();
  app
    .listen({ port: Number(process.env.PORT ?? 4001), host: "0.0.0.0" })
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
