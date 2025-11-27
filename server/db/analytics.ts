// server/db/analytics.ts
import type { PoolClient } from "pg";
import type { DecisionId, Driver, DriverId, OrderId } from "../domain/model.js";
import { getDbPool } from "./pool.js";

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

async function ensureDimDriverWithClient(
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
        alias                   = EXCLUDED.alias,
        vehicle_type            = EXCLUDED.vehicle_type,
        target_hourly_rate      = EXCLUDED.target_hourly_rate,
        fuel_cost_per_unit      = EXCLUDED.fuel_cost_per_unit,
        maintenance_cost_per_mile = EXCLUDED.maintenance_cost_per_mile,
        updated_at              = now()
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

async function ensureDimZoneWithClient(
  client: PoolClient,
  attrs: DimZoneAttrs,
): Promise<number> {
  // We don't have a UNIQUE constraint, so we emulate an upsert by lookup + insert.
  const existing = await client.query(
    `
      SELECT zone_id
      FROM dim_zone
      WHERE
        zone_name = $1
        AND city   IS NOT DISTINCT FROM $2
        AND region IS NOT DISTINCT FROM $3
      LIMIT 1
    `,
    [attrs.zoneName, attrs.city ?? null, attrs.region ?? null],
  );

  if (existing.rowCount > 0) {
    return existing.rows[0].zone_id as number;
  }

  const inserted = await client.query(
    `
      INSERT INTO dim_zone (zone_name, city, region)
      VALUES ($1, $2, $3)
      RETURNING zone_id
    `,
    [attrs.zoneName, attrs.city ?? null, attrs.region ?? null],
  );

  return inserted.rows[0].zone_id as number;
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

async function ensureDimTimeWithClient(
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

  if (existing.rowCount > 0) {
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

/**
 * Fact: fact_orders
 */

export type InsertFactOrderArgs = {
  orderId: OrderId;
  driver: Driver;
  ts: Date;
  platform?: "doordash";
  basePayout: number;
  tip?: number | null;
  estimatedDistanceMiles?: number | null;
  estimatedTimeMinutes?: number | null;
  zone?: DimZoneAttrs | null;
  pickupStoreType?: string | null;
  pickupLocation?: string | null;
  dropoffZone?: string | null;
};

export async function insertFactOrder(
  args: InsertFactOrderArgs,
): Promise<void> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // dim_driver
    await ensureDimDriverWithClient(client, args.driver.id, {
      alias: args.driver.name,
      vehicleType: args.driver.vehicleType,
      targetHourlyRate: args.driver.targetRatePerHour,
      fuelCostPerUnit: args.driver.fuelCostPerUnit ?? null,
      maintenanceCostPerMile: args.driver.maintenanceCostPerMile ?? null,
    });

    // dim_zone (optional)
    let zoneId: number | null = null;
    if (args.zone) {
      zoneId = await ensureDimZoneWithClient(client, args.zone);
    }

    // dim_time
    const timeId = await ensureDimTimeWithClient(client, args.ts);

    // fact_orders
    const platform = args.platform ?? "doordash";
    const basePayout = Number(args.basePayout) || 0;
    const tip = args.tip ?? null;
    const estimatedDistanceMiles = Number(args.estimatedDistanceMiles ?? 0);
    const estimatedTimeMinutes = Number(args.estimatedTimeMinutes ?? 0);

    await client.query(
      `
        INSERT INTO fact_orders (
          order_id,
          driver_id,
          zone_id,
          time_id,
          platform,
          base_payout,
          tip,
          estimated_distance_miles,
          estimated_time_minutes,
          pickup_store_type,
          pickup_location,
          dropoff_zone,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now()
        )
        ON CONFLICT (order_id) DO NOTHING
      `,
      [
        args.orderId,
        args.driver.id,
        zoneId,
        timeId,
        platform,
        basePayout,
        tip,
        estimatedDistanceMiles,
        estimatedTimeMinutes,
        args.pickupStoreType ?? null,
        args.pickupLocation ?? null,
        args.dropoffZone ?? null,
      ],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fact: fact_decisions
 */

export type InsertFactDecisionArgs = {
  decisionId: DecisionId;
  driver: Driver;
  orderId: OrderId;
  activeMode: "heuristic" | "hybrid_ml";
  recommendedDecision: "ACCEPT" | "REJECT";
  finalDecision: "ACCEPT" | "REJECT";
  effectiveHourlyRate?: number | null;
  reasonCodes?: string[] | null;
};

export async function insertFactDecision(
  args: InsertFactDecisionArgs,
): Promise<void> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await ensureDimDriverWithClient(client, args.driver.id, {
      alias: args.driver.name,
      vehicleType: args.driver.vehicleType,
      targetHourlyRate: args.driver.targetRatePerHour,
      fuelCostPerUnit: args.driver.fuelCostPerUnit ?? null,
      maintenanceCostPerMile: args.driver.maintenanceCostPerMile ?? null,
    });

    await client.query(
      `
        INSERT INTO fact_decisions (
          decision_id,
          order_id,
          driver_id,
          active_mode,
          recommended_decision,
          final_decision,
          effective_hourly_rate,
          reason_codes,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8, now()
        )
        ON CONFLICT (decision_id) DO NOTHING
      `,
      [
        args.decisionId,
        args.orderId,
        args.driver.id,
        args.activeMode,
        args.recommendedDecision,
        args.finalDecision,
        args.effectiveHourlyRate ?? null,
        args.reasonCodes ?? null,
      ],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Fact: fact_shifts (not yet wired to routes, but helper ready)
 */

export type InsertFactShiftArgs = {
  shiftId: string;
  driver: Driver;
  startedAt: Date;
  endedAt?: Date | null;
  totalMiles?: number | null;
  deadMiles?: number | null;
  totalEarnings?: number | null;
};

export async function insertFactShift(
  args: InsertFactShiftArgs,
): Promise<void> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await ensureDimDriverWithClient(client, args.driver.id, {
      alias: args.driver.name,
      vehicleType: args.driver.vehicleType,
      targetHourlyRate: args.driver.targetRatePerHour,
      fuelCostPerUnit: args.driver.fuelCostPerUnit ?? null,
      maintenanceCostPerMile: args.driver.maintenanceCostPerMile ?? null,
    });

    await client.query(
      `
        INSERT INTO fact_shifts (
          shift_id,
          driver_id,
          started_at,
          ended_at,
          total_miles,
          dead_miles,
          total_earnings
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7
        )
        ON CONFLICT (shift_id) DO NOTHING
      `,
      [
        args.shiftId,
        args.driver.id,
        args.startedAt,
        args.endedAt ?? null,
        Number(args.totalMiles ?? 0),
        Number(args.deadMiles ?? 0),
        Number(args.totalEarnings ?? 0),
      ],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
