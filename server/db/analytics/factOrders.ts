// server/db/analytics/factOrders.ts
import type { Driver, OrderId } from "../../domain/model.js";
import { getDbPool } from "../pool.js";
import {
  ensureDimDriverWithClient,
  ensureDimTimeWithClient,
  ensureDimZoneWithClient,
  type DimZoneAttrs,
} from "./dimensions.js";

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
