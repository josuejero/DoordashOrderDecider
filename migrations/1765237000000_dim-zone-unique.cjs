'use strict';

/**
 * Ensure dim_zone only stores one row per unique (zone_name, city, region).
 * Uses NULLS NOT DISTINCT so null city/region values are considered equal.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  // Drop any duplicates that may have been created by earlier concurrent inserts,
  // first rewiring fact_orders references to the canonical zone_id.
  pgm.sql(`
    WITH dupes AS (
      SELECT
        zone_id,
        zone_name,
        city,
        region,
        MIN(zone_id) OVER (PARTITION BY zone_name, city, region) AS keep_id,
        ROW_NUMBER() OVER (
          PARTITION BY zone_name, city, region
          ORDER BY zone_id
        ) AS rn
      FROM dim_zone
    )
    UPDATE fact_orders fo
    SET zone_id = d.keep_id
    FROM dupes d
    WHERE fo.zone_id = d.zone_id
      AND d.keep_id <> d.zone_id;

    WITH dupes AS (
      SELECT
        zone_id,
        zone_name,
        city,
        region,
        MIN(zone_id) OVER (PARTITION BY zone_name, city, region) AS keep_id,
        ROW_NUMBER() OVER (
          PARTITION BY zone_name, city, region
          ORDER BY zone_id
        ) AS rn
      FROM dim_zone
    )
    DELETE FROM dim_zone dz
    USING dupes dup
    WHERE dz.zone_id = dup.zone_id
      AND dup.rn > 1;
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS dim_zone_unique
    ON dim_zone (zone_name, city, region) NULLS NOT DISTINCT;
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS dim_zone_unique;`);
};
