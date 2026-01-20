import { afterEach, vi } from "vitest";
import { DataType, newDb } from "pg-mem";
import { randomUUID } from "node:crypto";

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

const SCHEMA_STATEMENTS = [
  `
    CREATE TABLE drivers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      target_rate_per_hour NUMERIC(10,2) NOT NULL,
      vehicle_type TEXT NOT NULL,
      fuel_cost_per_unit NUMERIC(10,3),
      maintenance_per_mile NUMERIC(10,3),
      decision_mode TEXT NOT NULL DEFAULT 'heuristic',
      preferred_zones TEXT[] NOT NULL DEFAULT '{}',
      preferred_time_buckets TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
  `
    CREATE TABLE orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID REFERENCES drivers(id),
      platform TEXT NOT NULL DEFAULT 'doordash',
      payout NUMERIC(10,2) NOT NULL,
      miles NUMERIC(10,2),
      estimated_minutes INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
  `
    CREATE TABLE decisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id),
      driver_id UUID REFERENCES drivers(id),
      accept BOOLEAN NOT NULL,
      net_payout NUMERIC(10,2) NOT NULL,
      required_dollars NUMERIC(10,2) NOT NULL,
      projected_gross_per_hour NUMERIC(10,2) NOT NULL,
      projected_net_per_hour NUMERIC(10,2) NOT NULL,
      finish_iso TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
  `
    CREATE TABLE decision_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      decision_id UUID NOT NULL REFERENCES decisions(id),
      event_type TEXT NOT NULL,
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
  `
    CREATE TABLE dim_driver (
      driver_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      alias TEXT NOT NULL,
      vehicle_type TEXT,
      target_hourly_rate NUMERIC(10,2),
      fuel_cost_per_unit NUMERIC(10,4),
      maintenance_cost_per_mile NUMERIC(10,4),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
  `
    CREATE TABLE dim_zone (
      zone_id SERIAL PRIMARY KEY,
      zone_name TEXT NOT NULL,
      city TEXT,
      region TEXT
    );
  `,
  `
    CREATE TABLE dim_time (
      time_id SERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL,
      date DATE NOT NULL,
      hour SMALLINT NOT NULL,
      day_of_week SMALLINT NOT NULL,
      time_of_day_bucket TEXT NOT NULL
    );
  `,
  `
    CREATE TABLE fact_orders (
      order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID NOT NULL REFERENCES dim_driver(driver_id),
      zone_id INT REFERENCES dim_zone(zone_id),
      time_id INT NOT NULL REFERENCES dim_time(time_id),
      platform TEXT NOT NULL DEFAULT 'DoorDash',
      base_payout NUMERIC(10,2) NOT NULL,
      tip NUMERIC(10,2),
      estimated_distance_miles NUMERIC(10,2) NOT NULL,
      estimated_time_minutes NUMERIC(10,1) NOT NULL,
      pickup_store_type TEXT,
      pickup_location TEXT,
      dropoff_zone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
  `
    CREATE TABLE fact_decisions (
      decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES fact_orders(order_id),
      driver_id UUID NOT NULL REFERENCES dim_driver(driver_id),
      active_mode TEXT NOT NULL,
      recommended_decision TEXT NOT NULL,
      final_decision TEXT NOT NULL,
      effective_hourly_rate NUMERIC(10,2),
      reason_codes TEXT[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `,
  `
    CREATE TABLE fact_shifts (
      shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID NOT NULL REFERENCES dim_driver(driver_id),
      started_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ,
      total_miles NUMERIC(10,2),
      dead_miles NUMERIC(10,2),
      total_earnings NUMERIC(10,2)
    );
  `,
  "CREATE INDEX idx_fact_orders_driver_id ON fact_orders (driver_id);",
  "CREATE INDEX idx_fact_orders_time_id ON fact_orders (time_id);",
  "CREATE INDEX idx_fact_decisions_order_id ON fact_decisions (order_id);",
  "CREATE INDEX idx_fact_decisions_driver_id ON fact_decisions (driver_id);",
  "CREATE UNIQUE INDEX dim_zone_unique ON dim_zone (zone_name, city, region);",
  `
    CREATE OR REPLACE VIEW analytics_driver_daily_summary AS
    SELECT
      fd.driver_id,
      dt.date AS day,
      COUNT(*) AS total_orders,
      SUM(
        CASE
          WHEN fd.final_decision = 'ACCEPT' THEN 1
          ELSE 0
        END
      ) AS accepted_orders,
      SUM(
        CASE
          WHEN fd.final_decision = 'ACCEPT'
          THEN fo.base_payout + COALESCE(fo.tip, 0)
          ELSE 0
        END
      ) AS total_earnings,
      SUM(fo.estimated_distance_miles) AS total_miles,
      SUM(fo.estimated_time_minutes) AS total_minutes,
      GREATEST(
        SUM(fo.estimated_distance_miles) -
        SUM(
          CASE
            WHEN fd.final_decision = 'ACCEPT'
            THEN fo.estimated_distance_miles * 0.8
            ELSE 0
          END
        ),
        0
      ) AS dead_miles_estimate,
      (
        SUM(
          CASE
            WHEN fd.final_decision = 'ACCEPT'
            THEN fo.base_payout + COALESCE(fo.tip, 0)
            ELSE 0
          END
        )
        / NULLIF(SUM(fo.estimated_time_minutes) / 60.0, 0)
      ) AS effective_hourly_rate
    FROM fact_orders fo
    JOIN fact_decisions fd ON fd.order_id = fo.order_id
    JOIN dim_time dt ON dt.time_id = fo.time_id
    GROUP BY fd.driver_id, dt.date;
  `,
  `
    CREATE OR REPLACE VIEW analytics_driver_zone_time AS
    SELECT
      fd.driver_id,
      dt.date,
      dt.time_of_day_bucket,
      z.zone_name,
      COUNT(*) AS total_orders,
      SUM(
        CASE
          WHEN fd.final_decision = 'ACCEPT' THEN 1
          ELSE 0
        END
      ) AS accepted_orders,
      SUM(
        CASE
          WHEN fd.final_decision = 'ACCEPT'
          THEN fo.base_payout + COALESCE(fo.tip, 0)
          ELSE 0
        END
      ) AS total_earnings,
      (
        SUM(
          CASE
            WHEN fd.final_decision = 'ACCEPT'
            THEN fo.base_payout + COALESCE(fo.tip, 0)
            ELSE 0
          END
        )
        / NULLIF(SUM(fo.estimated_time_minutes) / 60.0, 0)
      ) AS effective_hourly_rate
    FROM fact_orders fo
    JOIN fact_decisions fd ON fd.order_id = fo.order_id
    JOIN dim_time dt ON dt.time_id = fo.time_id
    LEFT JOIN dim_zone z ON z.zone_id = fo.zone_id
    GROUP BY fd.driver_id, dt.date, dt.time_of_day_bucket, z.zone_name;
  `,
  `
    CREATE OR REPLACE VIEW analytics_accept_all_baseline AS
    SELECT
      fd.driver_id,
      dt.date AS day,
      COUNT(*) AS total_orders,
      SUM(fo.base_payout + COALESCE(fo.tip, 0)) AS total_earnings,
      (
        SUM(fo.base_payout + COALESCE(fo.tip, 0))
        / NULLIF(SUM(fo.estimated_time_minutes) / 60.0, 0)
      ) AS effective_hourly_rate
    FROM fact_orders fo
    JOIN fact_decisions fd ON fd.order_id = fo.order_id
    JOIN dim_time dt ON dt.time_id = fo.time_id
    GROUP BY fd.driver_id, dt.date;
  `,
];

const db = newDb({ autoCreateForeignKeyIndices: true });
db.public.registerFunction({
  name: "gen_random_uuid",
  returns: "uuid",
  implementation: () => randomUUID(),
});
db.public.registerFunction({
  name: "nullif",
  args: [DataType.decimal, DataType.decimal],
  returns: DataType.decimal,
  allowNullArguments: true,
  implementation: (value, compare) => {
    if (value === null) {
      return null;
    }
    if (compare === null) {
      return value;
    }
    const equal =
      value === compare ||
      (value !== null &&
        compare !== null &&
        String(value) === String(compare));
    return equal ? null : value;
  },
});

const adapter = db.adapters.createPg();
const pool = new adapter.Pool({ max: 1 });
globalThis.__TEST_DB_POOL__ = pool;
vi.mock("pg", () => adapter);

for (const statement of SCHEMA_STATEMENTS) {
  await pool.query(statement);
}

const initialBackup = db.backup();
afterEach(() => {
  initialBackup.restore();
});
