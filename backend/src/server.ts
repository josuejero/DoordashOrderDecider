// backend/src/server.ts
import Fastify from 'fastify';
import { registerAnalyticsRoutes } from './routes/analytics';

export function buildFastifyApp() {
  const app = Fastify({
    logger: true,
  });

  // Only analytics endpoints for this mini-backend
  registerAnalyticsRoutes(app);

  return app;
}

// Only start the HTTP server when run directly (not in Vitest)
if (typeof require !== 'undefined' && require.main === module) {
  const app = buildFastifyApp();
  app
    .listen({ port: Number(process.env.PORT ?? 4001), host: '0.0.0.0' })
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
}
