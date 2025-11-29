-- Enable UUID generation extension (safe to run more than once)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Dimensions
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

CREATE TABLE IF NOT EXISTS dim_zone (
  zone_id SERIAL PRIMARY KEY,
  zone_name TEXT NOT NULL,
  city TEXT,
  region TEXT
);

CREATE TABLE IF NOT EXISTS dim_time (
  time_id SERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL,
  -- Derived attributes are now plain columns; you populate them at insert time
  date DATE NOT NULL,
  hour SMALLINT NOT NULL,
  day_of_week SMALLINT NOT NULL,
  time_of_day_bucket TEXT NOT NULL
);

-- Facts
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

CREATE TABLE IF NOT EXISTS fact_decisions (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES fact_orders(order_id),
  driver_id UUID NOT NULL REFERENCES dim_driver(driver_id),
  active_mode TEXT NOT NULL, -- 'heuristic' or 'hybrid_ml'
  recommended_decision TEXT NOT NULL, -- 'ACCEPT' or 'REJECT'
  final_decision TEXT NOT NULL,       -- 'ACCEPT' or 'REJECT'
  effective_hourly_rate NUMERIC(10,2),
  reason_codes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fact_shifts (
  shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES dim_driver(driver_id),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  total_miles NUMERIC(10,2),
  dead_miles NUMERIC(10,2),
  total_earnings NUMERIC(10,2)
);

-- Daily summary view per driver
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
  -- crude dead-miles estimate placeholder; refine later
  GREATEST(SUM(fo.estimated_distance_miles) -
           SUM(CASE WHEN fd.final_decision = 'ACCEPT'
                    THEN fo.estimated_distance_miles * 0.8
                    ELSE 0 END), 0) AS dead_miles_estimate,
  (SUM(CASE WHEN fd.final_decision = 'ACCEPT'
            THEN fo.base_payout + COALESCE(fo.tip, 0)
            ELSE 0 END)
   / NULLIF(SUM(fo.estimated_time_minutes) / 60.0, 0)) AS effective_hourly_rate
FROM fact_orders fo
JOIN fact_decisions fd ON fd.order_id = fo.order_id
JOIN dim_time dt ON dt.time_id = fo.time_id
GROUP BY fd.driver_id, dt.date;

-- Zone/time-of-day breakdown view
CREATE OR REPLACE VIEW analytics_driver_zone_time AS
SELECT
  fd.driver_id,
  dt.date,
  dt.time_of_day_bucket,
  z.zone_name,
  COUNT(*) AS total_orders,
  SUM(CASE WHEN fd.final_decision = 'ACCEPT' THEN 1 ELSE 0 END) AS accepted_orders,
  SUM(CASE WHEN fd.final_decision = 'ACCEPT'
           THEN fo.base_payout + COALESCE(fo.tip, 0)
           ELSE 0 END) AS total_earnings,
  (SUM(CASE WHEN fd.final_decision = 'ACCEPT'
            THEN fo.base_payout + COALESCE(fo.tip, 0)
            ELSE 0 END)
   / NULLIF(SUM(fo.estimated_time_minutes) / 60.0, 0)) AS effective_hourly_rate
FROM fact_orders fo
JOIN fact_decisions fd ON fd.order_id = fo.order_id
JOIN dim_time dt ON dt.time_id = fo.time_id
LEFT JOIN dim_zone z ON z.zone_id = fo.zone_id
GROUP BY fd.driver_id, dt.date, dt.time_of_day_bucket, z.zone_name;

-- Accept-everything baseline view (for comparison)
CREATE OR REPLACE VIEW analytics_accept_all_baseline AS
SELECT
  fd.driver_id,
  dt.date AS day,
  COUNT(*) AS total_orders,
  SUM(fo.base_payout + COALESCE(fo.tip, 0)) AS total_earnings,
  (SUM(fo.base_payout + COALESCE(fo.tip, 0))
   / NULLIF(SUM(fo.estimated_time_minutes) / 60.0, 0)) AS effective_hourly_rate
FROM fact_orders fo
JOIN fact_decisions fd ON fd.order_id = fo.order_id
JOIN dim_time dt ON dt.time_id = fo.time_id
GROUP BY fd.driver_id, dt.date;
