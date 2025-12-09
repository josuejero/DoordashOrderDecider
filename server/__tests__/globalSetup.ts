import "dotenv/config";
import { runner } from "node-pg-migrate";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default async function globalSetup() {
  process.env.NODE_ENV ??= "test";

  const testDbUrl =
    process.env.DD_DECIDER_TEST_DB_URL ??
    process.env.DD_DECIDER_DEV_DB_URL ??
    "postgres://localhost:5432/doordash_decider_test";

  if (process.env.NODE_ENV === "test") {
    process.env.DATABASE_URL = process.env.DD_DECIDER_TEST_DB_URL
      ? testDbUrl
      : process.env.DATABASE_URL ?? testDbUrl;
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.resolve(__dirname, "..", "..", "migrations");

  // Ensure we always pass a concrete string, not string | undefined
  const databaseUrl = process.env.DATABASE_URL ?? testDbUrl;

  await runner({
    databaseUrl,
    dir: migrationsDir,
    direction: "up",
    migrationsTable: "pgmigrations",
    log: () => {},
  });
}
