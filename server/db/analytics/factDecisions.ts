import type { DecisionId, Driver, OrderId } from "../../domain/model.js";
import { getDbPool } from "../pool.js";
import { ensureDimDriverWithClient } from "./dimensions.js";
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
