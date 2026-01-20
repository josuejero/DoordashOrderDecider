import type { Pool } from "pg";

declare global {
  var __TEST_DB_POOL__: Pool | undefined;
}

export {};
