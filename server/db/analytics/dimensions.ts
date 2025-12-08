// server/db/analytics/dimensions.ts
import type { PoolClient } from "pg";
import type { DriverId } from "../../domain/model.js";
import { getDbPool } from "../pool.js";

/**
 * Dimension: dim_driver
 */

export type DimDriverAttrs = {
  alias: string;
  vehicleType?: string | null;
  targetHourlyRate?: number | null;
  fuelCostPerUnit?: number | null;
  maintenanceCostPerMile?: number | null;
};

export async function ensureDimDriverWithClient(
  client: PoolClient,
  driverId: DriverId,
  attrs: DimDriverAttrs,
): Promise<void> {
  await client.query(
    `
      INSERT INTO dim_driver (
        driver_id,
        alias,
        vehicle_type,
        target_hourly_rate,
        fuel_cost_per_unit,
        maintenance_cost_per_mile
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (driver_id) DO UPDATE
      SET
        alias                     = EXCLUDED.alias,
        vehicle_type              = EXCLUDED.vehicle_type,
        target_hourly_rate        = EXCLUDED.target_hourly_rate,
        fuel_cost_per_unit        = EXCLUDED.fuel_cost_per_unit,
        maintenance_cost_per_mile = EXCLUDED.maintenance_cost_per_mile,
        updated_at                = now()
    `,
    [
      driverId,
      attrs.alias,
      attrs.vehicleType ?? null,
      attrs.targetHourlyRate ?? null,
      attrs.fuelCostPerUnit ?? null,
      attrs.maintenanceCostPerMile ?? null,
    ],
  );
}

export async function ensureDimDriver(
  driverId: DriverId,
  attrs: DimDriverAttrs,
): Promise<void> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureDimDriverWithClient(client, driverId, attrs);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Dimension: dim_zone
 */

export type DimZoneAttrs = {
  zoneName: string;
  city?: string | null;
  region?: string | null;
};

export async function ensureDimZoneWithClient(
  client: PoolClient,
  attrs: DimZoneAttrs,
): Promise<number> {
  // Use a UNIQUE index with NULLS NOT DISTINCT to avoid race conditions and
  // guarantee one row per zone attributes.
  const result = await client.query(
    `
      INSERT INTO dim_zone (zone_name, city, region)
      VALUES ($1, $2, $3)
      ON CONFLICT (zone_name, city, region)
      DO UPDATE SET zone_name = EXCLUDED.zone_name
      RETURNING zone_id
    `,
    [attrs.zoneName, attrs.city ?? null, attrs.region ?? null],
  );

  return result.rows[0].zone_id as number;
}

export async function ensureDimZone(attrs: DimZoneAttrs): Promise<number> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const zoneId = await ensureDimZoneWithClient(client, attrs);
    await client.query("COMMIT");
    return zoneId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Dimension: dim_time
 *
 * We rely on the BEFORE INSERT trigger (or generated columns) to populate
 * date, hour, day_of_week, time_of_day_bucket.
 */

export async function ensureDimTimeWithClient(
  client: PoolClient,
  ts: Date,
): Promise<number> {
  // Optional dedupe: reuse existing row for the same timestamp if present.
  const existing = await client.query(
    `
      SELECT time_id
      FROM dim_time
      WHERE ts = $1
      LIMIT 1
    `,
    [ts],
  );

  if ((existing.rowCount ?? 0) > 0) {
    return existing.rows[0].time_id as number;
  }

  const inserted = await client.query(
    `
      INSERT INTO dim_time (ts)
      VALUES ($1)
      RETURNING time_id
    `,
    [ts],
  );

  return inserted.rows[0].time_id as number;
}

export async function ensureDimTime(ts: Date): Promise<number> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const timeId = await ensureDimTimeWithClient(client, ts);
    await client.query("COMMIT");
    return timeId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
