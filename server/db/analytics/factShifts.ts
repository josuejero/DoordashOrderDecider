import type { Driver } from "../../domain/model.js";
import { getDbPool } from "../pool.js";
import { ensureDimDriverWithClient } from "./dimensions.js";
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
