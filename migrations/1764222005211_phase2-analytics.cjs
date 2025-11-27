'use strict';

/**
 * Phase 2 analytics schema migration (UUID star schema).
 *
 * This aligns with:
 * - db/migrations/2025_11_27_phase2_analytics.sql
 * - backend/src/routes/analytics.ts
 * - backend/test/analytics.spec.ts
 *
 * Star-ish schema:
 *   - dim_driver (uuid)
 *   - dim_zone (serial)
 *   - dim_time (ts + derived date/hour/dow/bucket)
 *   - fact_orders (uuid, per offer)
 *   - fact_decisions (uuid, per decision)
 *   - fact_shifts (uuid, per shift)
 *   - analytics_* views
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  //
  // 0. Extension for UUID generation
  //
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `);

  //
  // 1. Dimension tables
  //

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS dim_driver (
      driver_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      alias TEXT NOT NULL,
      vehicle_type TEXT,
      target_hourly_rate NUMERIC(10,2),
      fuel_cost_per_unit NUMERIC(10,4),
      maintenance_cost_per_mile NUMERIC(10,4),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS dim_zone (
      zone_id SERIAL PRIMARY KEY,
      zone_name TEXT NOT NULL,
      city TEXT,
      region TEXT
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS dim_time (
      time_id SERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL,
      date DATE NOT NULL,
      hour SMALLINT NOT NULL,
      day_of_week SMALLINT NOT NULL,
      time_of_day_bucket TEXT NOT NULL
    );
  `);

  // Helper to auto-populate derived fields when only ts is provided
  pgm.sql(`
    CREATE OR REPLACE FUNCTION populate_dim_time_derived_fields()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
      dow INT;
      hr  INT;
    BEGIN
      IF NEW.ts IS NULL THEN
        RAISE EXCEPTION 'dim_time.ts cannot be null';
      END IF;

      NEW.date := (NEW.ts AT TIME ZONE 'UTC')::DATE;
      NEW.hour := EXTRACT(HOUR FROM NEW.ts AT TIME ZONE 'UTC');

      -- PostgreSQL EXTRACT(DOW): 0 = Sunday .. 6 = Saturday
      dow := EXTRACT(DOW FROM NEW.ts AT TIME ZONE 'UTC');
      NEW.day_of_week := dow;

      IF NEW.hour BETWEEN 5 AND 11 THEN
        NEW.time_of_day_bucket := 'morning';
      ELSIF NEW.hour BETWEEN 12 AND 16 THEN
        NEW.time_of_day_bucket := 'afternoon';
      ELSIF NEW.hour BETWEEN 17 AND 21 THEN
        NEW.time_of_day_bucket := 'evening';
      ELSE
        NEW.time_of_day_bucket := 'night';
      END IF;

      RETURN NEW;
    END;
    $$;
  `);

  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_dim_time_derive ON dim_time;

    CREATE TRIGGER trg_dim_time_derive
    BEFORE INSERT ON dim_time
    FOR EACH ROW
    WHEN (NEW.date IS NULL OR NEW.hour IS NULL OR NEW.day_of_week IS NULL OR NEW.time_of_day_bucket IS NULL)
    EXECUTE FUNCTION populate_dim_time_derived_fields();
  `);

  //
  // 2. Fact tables (UUID grain)
  //

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS fact_orders (
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
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS fact_decisions (
      decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES fact_orders(order_id),
      driver_id UUID NOT NULL REFERENCES dim_driver(driver_id),
      active_mode TEXT NOT NULL,           -- 'heuristic' or 'hybrid_ml'
      recommended_decision TEXT NOT NULL,  -- 'ACCEPT' or 'REJECT'
      final_decision TEXT NOT NULL,        -- 'ACCEPT' or 'REJECT'
      effective_hourly_rate NUMERIC(10,2),
      reason_codes TEXT[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS fact_shifts (
      shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID NOT NULL REFERENCES dim_driver(driver_id),
      started_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ,
      total_miles NUMERIC(10,2),
      dead_miles NUMERIC(10,2),
      total_earnings NUMERIC(10,2)
    );
  `);

  //
  // 3. Helpful indexes
  //

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_fact_orders_driver_id
      ON fact_orders (driver_id);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_fact_orders_time_id
      ON fact_orders (time_id);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_fact_decisions_order_id
      ON fact_decisions (order_id);
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_fact_decisions_driver_id
      ON fact_decisions (driver_id);
  `);

  //
  // 4. Analytics views
  //

  pgm.sql(`
    CREATE OR REPLACE VIEW analytics_driver_daily_summary AS
    SELECT
      fd.driver_id,
      dt.date AS day,
      COUNT(*) AS total_orders,
      SUM(CASE WHEN fd.final_decision = 'ACCEPT' THEN 1 ELSE 0 END) AS accepted_orders,
      SUM(CASE WHEN fd.final_decision = 'ACCEPT'
               THEN fo.base_payout + COALESCE(fo.tip, 0)
               ELSE 0 END) AS total_earnings,
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
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW analytics_driver_zone_time AS
    SELECT
      fd.driver_id,
      dt.date,
      dt.time_of_day_bucket,
      z.zone_name,
      COUNT(*) AS total_orders,
      SUM(CASE WHEN fd.final_decision = 'ACCEPT' THEN 1 ELSE 0 END) AS accepted_orders,
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
  `);

  pgm.sql(`
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
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  // Drop views first
  pgm.sql(`
    DROP VIEW IF EXISTS analytics_accept_all_baseline;
    DROP VIEW IF EXISTS analytics_driver_zone_time;
    DROP VIEW IF EXISTS analytics_driver_daily_summary;
  `);

  // Drop fact tables
  pgm.sql(`
    DROP TABLE IF EXISTS fact_shifts;
  `);
  pgm.sql(`
    DROP TABLE IF EXISTS fact_decisions;
  `);
  pgm.sql(`
    DROP TABLE IF EXISTS fact_orders;
  `);

  // Drop trigger & function on dim_time
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_dim_time_derive ON dim_time;
  `);
  pgm.sql(`
    DROP FUNCTION IF EXISTS populate_dim_time_derived_fields();
  `);

  // Drop dimensions
  pgm.sql(`
    DROP TABLE IF EXISTS dim_time;
  `);
  pgm.sql(`
    DROP TABLE IF EXISTS dim_zone;
  `);
  pgm.sql(`
    DROP TABLE IF EXISTS dim_driver;
  `);
};
