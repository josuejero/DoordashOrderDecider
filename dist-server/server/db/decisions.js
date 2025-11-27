import { getDbPool } from "./pool.js";
export async function insertDecision(decision) {
    const pool = getDbPool();
    await pool.query(`
      INSERT INTO decisions (
        id,
        order_id,
        driver_id,
        accept,
        net_payout,
        required_dollars,
        projected_gross_per_hour,
        projected_net_per_hour,
        finish_iso,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )
    `, [
        decision.id,
        decision.orderId,
        decision.driverId,
        decision.accept,
        decision.netPayout,
        decision.requiredDollars,
        decision.projectedGrossPerHour,
        decision.projectedNetPerHour,
        decision.finishISO,
        decision.createdAt,
    ]);
}
