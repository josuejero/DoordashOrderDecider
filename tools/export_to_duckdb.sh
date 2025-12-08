#!/usr/bin/env bash

# Export the transactional + analytics tables into a DuckDB file for BI/OLAP.
# Usage:
#   PG_URL=postgres://postgres:postgres@localhost:5432/doordash_decider_dev ./tools/export_to_duckdb.sh
# Optional: set DUCKDB_PATH=/path/to/file.duckdb (default: analytics.duckdb)

set -euo pipefail

PG_URL="${PG_URL:-${DATABASE_URL:-}}"
DUCKDB_PATH="${DUCKDB_PATH:-analytics.duckdb}"

if [[ -z "${PG_URL}" ]]; then
  echo "PG_URL (or DATABASE_URL) must be set so the export can connect to Postgres." >&2
  exit 1
fi

if ! command -v duckdb >/dev/null 2>&1; then
  echo "duckdb CLI is required. Install from https://duckdb.org/docs/installation/" >&2
  exit 1
fi

duckdb "${DUCKDB_PATH}" <<SQL
INSTALL postgres;
LOAD postgres;

-- Attach Postgres as a virtual database
CALL postgres_attach('pgdb', '${PG_URL}');

-- Core OLTP tables
CREATE OR REPLACE TABLE drivers AS SELECT * FROM pgdb.public.drivers;
CREATE OR REPLACE TABLE orders AS SELECT * FROM pgdb.public.orders;
CREATE OR REPLACE TABLE decisions AS SELECT * FROM pgdb.public.decisions;
CREATE OR REPLACE TABLE decision_events AS SELECT * FROM pgdb.public.decision_events;

-- Analytics warehouse tables + views
CREATE OR REPLACE TABLE dim_driver AS SELECT * FROM pgdb.public.dim_driver;
CREATE OR REPLACE TABLE dim_zone AS SELECT * FROM pgdb.public.dim_zone;
CREATE OR REPLACE TABLE dim_time AS SELECT * FROM pgdb.public.dim_time;
CREATE OR REPLACE TABLE fact_orders AS SELECT * FROM pgdb.public.fact_orders;
CREATE OR REPLACE TABLE fact_decisions AS SELECT * FROM pgdb.public.fact_decisions;
CREATE OR REPLACE TABLE fact_shifts AS SELECT * FROM pgdb.public.fact_shifts;
CREATE OR REPLACE TABLE analytics_driver_daily_summary AS SELECT * FROM pgdb.public.analytics_driver_daily_summary;
CREATE OR REPLACE TABLE analytics_driver_zone_time AS SELECT * FROM pgdb.public.analytics_driver_zone_time;
SQL

echo "✅ Exported to ${DUCKDB_PATH}"
