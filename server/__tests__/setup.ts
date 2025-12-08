import "dotenv/config";

process.env.NODE_ENV ??= "test";
const testDbUrl =
  process.env.DD_DECIDER_TEST_DB_URL ??
  process.env.DD_DECIDER_DEV_DB_URL ??
  "postgres://localhost:5432/doordash_decider_test";

// Force Vitest to use the test database when a dedicated URL is provided so we
// don't pollute dev data or miss migrations.
if (process.env.NODE_ENV === "test") {
  process.env.DATABASE_URL = process.env.DD_DECIDER_TEST_DB_URL
    ? testDbUrl
    : process.env.DATABASE_URL ?? testDbUrl;
}
