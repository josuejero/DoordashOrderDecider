import "dotenv/config";
process.env.NODE_ENV ??= "test";
const testDbUrl =
  process.env.DD_DECIDER_TEST_DB_URL ??
  process.env.DD_DECIDER_DEV_DB_URL ??
  "postgres://localhost:5432/doordash_decider_test";
if (process.env.NODE_ENV === "test") {
  process.env.DATABASE_URL = process.env.DD_DECIDER_TEST_DB_URL
    ? testDbUrl
    : (process.env.DATABASE_URL ?? testDbUrl);
}
