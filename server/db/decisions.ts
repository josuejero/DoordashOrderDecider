import type { Decision, DriverId } from "../domain/model.js";
import { getDbPool } from "./pool.js";
export async function insertDecision(decision: Decision): Promise<void> {
  const pool = getDbPool();
  await pool.query(
    `
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
    `,
    [
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
    ],
  );
}
export type DecisionWithOrder = Decision & {
  payout: number;
  miles: number | null;
  estimatedMinutes: number | null;
};
export type DecisionHistoryRow = DecisionWithOrder & {
  recommendedDecision: "ACCEPT" | "REJECT" | null;
  finalDecision: "ACCEPT" | "REJECT" | null;
  zoneName: string | null;
};
export async function listDecisionsForDriver(
  driverId: DriverId,
  options: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    zone?: string;
    decision?: "accept" | "reject" | "accepted" | "rejected";
  } = {},
): Promise<{
  rows: DecisionHistoryRow[];
  totalCount: number;
}> {
  const pool = getDbPool();
  const {
    limit = 50,
    offset = 0,
    startDate,
    endDate,
    zone,
    decision,
  } = options;
  const decisionBool =
    decision === "accepted" || decision === "accept"
      ? true
      : decision === "rejected" || decision === "reject"
        ? false
        : null;
  const result = await pool.query(
    `
      SELECT
        d.id,
        d.order_id AS "orderId",
        d.driver_id AS "driverId",
        d.accept,
        d.net_payout AS "netPayout",
        d.required_dollars AS "requiredDollars",
        d.projected_gross_per_hour AS "projectedGrossPerHour",
        d.projected_net_per_hour AS "projectedNetPerHour",
        d.finish_iso AS "finishISO",
        d.created_at AS "createdAt",
        o.payout,
        o.miles,
        o.estimated_minutes AS "estimatedMinutes",
        z.zone_name AS "zoneName",
        fd.recommended_decision AS "recommendedDecision",
        fd.final_decision AS "finalDecision",
        COUNT(*) OVER() AS total_count
      FROM decisions d
      JOIN orders o ON o.id = d.order_id
      LEFT JOIN fact_orders fo ON fo.order_id = d.order_id
      LEFT JOIN dim_zone z ON z.zone_id = fo.zone_id
      LEFT JOIN fact_decisions fd ON fd.order_id = d.order_id
      WHERE d.driver_id = $1
        AND ($2::date IS NULL OR d.created_at >= $2::date)
        AND (
          $3::date IS NULL
          OR d.created_at < ($3::date + INTERVAL '1 day')
        )
        AND ($4::text IS NULL OR z.zone_name = $4)
        AND ($5::boolean IS NULL OR d.accept = $5)
      ORDER BY d.created_at DESC
      LIMIT $6 OFFSET $7
    `,
    [
      driverId,
      startDate ?? null,
      endDate ?? null,
      zone ?? null,
      decisionBool,
      limit,
      offset,
    ],
  );
  const rows = result.rows as Array<
    DecisionHistoryRow & {
      total_count: number;
    }
  >;
  const totalCount = rows.length ? Number(rows[0].total_count ?? 0) : 0;
  return { rows, totalCount };
}
