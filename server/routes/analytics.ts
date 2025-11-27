// server/routes/analytics.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDbPool } from "../db/pool.js";

const AnalyticsDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Expected YYYY-MM-DD" });

const SummaryQuery = z.object({
  driverId: z.string().min(1),
  startDate: AnalyticsDate.optional(),
  endDate: AnalyticsDate.optional(),
});

export async function registerAnalyticsRoutes(app: FastifyInstance) {
  const pool = getDbPool();

  // GET /api/analytics/summary
  app.get("/api/analytics/summary", async (request, reply) => {
    const parsed = SummaryQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const { driverId, startDate, endDate } = parsed.data;

    const { rows } = await pool.query(
      `
        SELECT
          driver_id,
          COALESCE(SUM(total_orders), 0) AS total_orders,
          COALESCE(SUM(accepted_orders), 0) AS accepted_orders,
          COALESCE(SUM(rejected_orders), 0) AS rejected_orders,
          COALESCE(SUM(total_payout), 0) AS total_payout,
          COALESCE(SUM(estimated_minutes), 0) AS total_estimated_minutes
        FROM analytics_driver_daily_summary
        WHERE driver_id = $1
          AND ($2::date IS NULL OR day >= $2)
          AND ($3::date IS NULL OR day <= $3)
        GROUP BY driver_id
      `,
      [driverId, startDate ?? null, endDate ?? null],
    );

    if (rows.length === 0) {
      return {
        driverId,
        totalOrders: 0,
        acceptedOrders: 0,
        rejectedOrders: 0,
        totalPayout: 0,
        totalEstimatedMinutes: 0,
        acceptanceRate: 0,
      };
    }

    const row = rows[0];

    const totalOrders = Number(row.total_orders);
    const acceptedOrders = Number(row.accepted_orders);
    const rejectedOrders = Number(row.rejected_orders);
    const totalPayout = Number(row.total_payout);
    const totalEstimatedMinutes = Number(row.total_estimated_minutes);
    const acceptanceRate =
      totalOrders > 0 ? acceptedOrders / totalOrders : 0;

    return {
      driverId: row.driver_id,
      totalOrders,
      acceptedOrders,
      rejectedOrders,
      totalPayout,
      totalEstimatedMinutes,
      acceptanceRate,
    };
  });

  // GET /api/analytics/zone-time
  app.get("/api/analytics/zone-time", async (request, reply) => {
    const parsed = SummaryQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query parameters" });
    }

    const { driverId, startDate, endDate } = parsed.data;

    const { rows } = await pool.query(
      `
        SELECT
          date,
          time_of_day_bucket,
          zone_name,
          total_orders,
          accepted_orders,
          rejected_orders,
          total_payout,
          estimated_minutes
        FROM analytics_driver_zone_time
        WHERE driver_id = $1
          AND ($2::date IS NULL OR date >= $2)
          AND ($3::date IS NULL OR date <= $3)
        ORDER BY date, time_of_day_bucket, zone_name
      `,
      [driverId, startDate ?? null, endDate ?? null],
    );

    return rows.map((r) => ({
      date: r.date,
      timeOfDayBucket: r.time_of_day_bucket,
      zoneName: r.zone_name,
      totalOrders: Number(r.total_orders),
      acceptedOrders: Number(r.accepted_orders),
      rejectedOrders: Number(r.rejected_orders),
      totalPayout: Number(r.total_payout),
      totalEstimatedMinutes: Number(r.estimated_minutes),
    }));
  });
}
