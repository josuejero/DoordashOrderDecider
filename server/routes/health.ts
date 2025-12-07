// server/routes/health.ts
import type { FastifyInstance } from "fastify";
import { createRequire } from "node:module";
import path from "node:path";
import { getDbPool } from "../db/pool.js";

const require = createRequire(import.meta.url);
const pkgVersion = (() => {
  const fallback = process.env.APP_VERSION ?? "dev";
  const pkgPath = path.resolve(process.cwd(), "package.json");

  try {
    const pkg = require(pkgPath) as { version?: string };
    return pkg.version ?? fallback;
  } catch (err) {
    // Avoid crashing the server when package.json is not present in the image.
    console.warn(
      `Health routes: unable to read ${pkgPath}; falling back to version "${fallback}"`,
    );
    return fallback;
  }
})();

export function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/version", async () => {
    return { version: pkgVersion };
  });

  app.get("/health/db", async (request, reply) => {
    try {
      const pool = getDbPool();
      await pool.query("SELECT 1");
      return { status: "ok" };
    } catch (err) {
      request.log.error({ err }, "DB health check failed");
      reply.code(500);
      return { status: "error" };
    }
  });
}
