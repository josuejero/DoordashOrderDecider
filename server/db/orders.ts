import type { DriverId, OrderId } from "../domain/model.js";
import { getDbPool } from "./pool.js";
export async function createOrder(params: {
  driverId: DriverId;
  platform?: "doordash";
  payout: number;
  miles?: number | null;
  estimatedMinutes?: number | null;
}): Promise<OrderId> {
  const pool = getDbPool();
  const result = await pool.query(
    `
      INSERT INTO orders (driver_id, platform, payout, miles, estimated_minutes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [
      params.driverId,
      params.platform ?? "doordash",
      params.payout,
      params.miles ?? null,
      params.estimatedMinutes ?? null,
    ],
  );
  return result.rows[0].id as OrderId;
}
