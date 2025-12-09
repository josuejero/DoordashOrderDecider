"use strict";
exports.up = (pgm) => {
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `);
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
    WHEN (
      NEW.date IS NULL
      OR NEW.hour IS NULL
      OR NEW.day_of_week IS NULL
      OR NEW.time_of_day_bucket IS NULL
    )
    EXECUTE FUNCTION populate_dim_time_derived_fields();
  `);
};
exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_dim_time_derive ON dim_time;
  `);
  pgm.sql(`
    DROP FUNCTION IF EXISTS populate_dim_time_derived_fields();
  `);
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
