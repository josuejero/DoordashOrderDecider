"use strict";
exports.up = (pgm) => {
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
};
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_fact_decisions_driver_id;
  `);
  pgm.sql(`
    DROP INDEX IF EXISTS idx_fact_decisions_order_id;
  `);
  pgm.sql(`
    DROP INDEX IF EXISTS idx_fact_orders_time_id;
  `);
  pgm.sql(`
    DROP INDEX IF EXISTS idx_fact_orders_driver_id;
  `);
  pgm.sql(`
    DROP TABLE IF EXISTS fact_shifts;
  `);
  pgm.sql(`
    DROP TABLE IF EXISTS fact_decisions;
  `);
  pgm.sql(`
    DROP TABLE IF EXISTS fact_orders;
  `);
};
