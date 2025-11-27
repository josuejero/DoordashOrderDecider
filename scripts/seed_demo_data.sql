BEGIN;

-- ⚠️ Dev/test only: wipe existing analytics dims/facts so IDs are deterministic.
TRUNCATE
  fact_decisions,
  fact_orders,
  dim_time,
  dim_zone,
  dim_driver
RESTART IDENTITY CASCADE;

-- 1) Deterministic driver
INSERT INTO dim_driver (
  driver_id,
  alias,
  vehicle_type,
  target_hourly_rate,
  fuel_cost_per_unit,
  maintenance_cost_per_mile
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Driver',
  'car',
  25.00,
  0.40,
  0.10
);

-- 2) Two zones (IDs will be 1 and 2 after RESTART IDENTITY)
INSERT INTO dim_zone (zone_name, city, region)
VALUES
  ('Zone A', 'Demo City', 'Demo Region'),
  ('Zone B', 'Demo City', 'Demo Region');

-- 3) Three timestamps over two days.
--    The dim_time BEFORE INSERT trigger will fill date/hour/day_of_week/time_of_day_bucket.
INSERT INTO dim_time (ts)
VALUES
  ('2025-01-01T10:00:00Z'),  -- day 1, morning
  ('2025-01-01T19:00:00Z'),  -- day 1, evening
  ('2025-01-02T12:00:00Z');  -- day 2, afternoon

-- 4) Fact orders (3 orders: 2 on day 1 in Zone A, 1 on day 2 in Zone B)
INSERT INTO fact_orders (
  order_id,
  driver_id,
  zone_id,
  time_id,
  platform,
  base_payout,
  tip,
  estimated_distance_miles,
  estimated_time_minutes
) VALUES
  -- Day 1, Zone A, ACCEPT
  ('00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000001',
   1,
   1,
   'DoorDash',
   10.00,
   2.00,
   5.0,
   30.0
  ),
  -- Day 1, Zone A, REJECT
  ('00000000-0000-0000-0000-000000000102',
   '00000000-0000-0000-0000-000000000001',
   1,
   2,
   'DoorDash',
   8.00,
   0.00,
   3.0,
   20.0
  ),
  -- Day 2, Zone B, ACCEPT
  ('00000000-0000-0000-0000-000000000103',
   '00000000-0000-0000-0000-000000000001',
   2,
   3,
   'DoorDash',
   15.00,
   5.00,
   10.0,
   40.0
  );

-- 5) Fact decisions (two accepts, one reject)
INSERT INTO fact_decisions (
  decision_id,
  order_id,
  driver_id,
  active_mode,
  recommended_decision,
  final_decision,
  effective_hourly_rate,
  reason_codes
) VALUES
  -- Order 101: ACCEPT (Day 1)
  ('00000000-0000-0000-0000-000000000201',
   '00000000-0000-0000-0000-000000000101',
   '00000000-0000-0000-0000-000000000001',
   'heuristic',
   'ACCEPT',
   'ACCEPT',
   24.0,
   ARRAY['DEMO_ACCEPT']
  ),
  -- Order 102: REJECT (Day 1)
  ('00000000-0000-0000-0000-000000000202',
   '00000000-0000-0000-0000-000000000102',
   '00000000-0000-0000-0000-000000000001',
   'heuristic',
   'REJECT',
   'REJECT',
   NULL,
   ARRAY['DEMO_REJECT']
  ),
  -- Order 103: ACCEPT (Day 2)
  ('00000000-0000-0000-0000-000000000203',
   '00000000-0000-0000-0000-000000000103',
   '00000000-0000-0000-0000-000000000001',
   'heuristic',
   'ACCEPT',
   'ACCEPT',
   30.0,
   ARRAY['DEMO_ACCEPT']
  );

COMMIT;
