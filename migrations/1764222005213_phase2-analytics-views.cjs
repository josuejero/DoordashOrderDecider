"use strict";
exports.up = (pgm) => {
  pgm.sql(`
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
  `);
  pgm.sql(`
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
exports.down = (pgm) => {
  pgm.sql(`
    DROP VIEW IF EXISTS analytics_accept_all_baseline;
    DROP VIEW IF EXISTS analytics_driver_zone_time;
    DROP VIEW IF EXISTS analytics_driver_daily_summary;
  `);
};
