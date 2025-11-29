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
          day,
          total_orders,
          accepted_orders,
          total_earnings,
          total_miles,
          total_minutes,
          dead_miles_estimate,
          effective_hourly_rate
        FROM analytics_driver_daily_summary
        WHERE driver_id = $1
          AND ($2::date IS NULL OR day >= $2)
          AND ($3::date IS NULL OR day <= $3)
        ORDER BY day ASC
      `,
      [driverId, startDate ?? null, endDate ?? null],
    );

    if (rows.length === 0) {
      return reply.status(200).send({
        driverId,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        totalOrders: 0,
        acceptedOrders: 0,
        rejectedOrders: 0,
        acceptanceRate: 0,
        totalEarnings: 0,
        totalMiles: 0,
        totalMinutes: 0,
        deadMilesEstimate: 0,
        effectiveHourlyRate: 0,
        days: [],
      });
    }

    let totalOrders = 0;
    let acceptedOrders = 0;
    let totalEarnings = 0;
    let totalMiles = 0;
    let totalMinutes = 0;
    let deadMilesEstimate = 0;

    for (const row of rows) {
      totalOrders += Number(row.total_orders ?? 0);
      acceptedOrders += Number(row.accepted_orders ?? 0);
      totalEarnings += Number(row.total_earnings ?? 0);
      totalMiles += Number(row.total_miles ?? 0);
      totalMinutes += Number(row.total_minutes ?? 0);
      deadMilesEstimate += Number(row.dead_miles_estimate ?? 0);
    }

    const rejectedOrders = totalOrders - acceptedOrders;
    const acceptanceRate =
      totalOrders > 0 ? acceptedOrders / totalOrders : 0;
    const effectiveHourlyRate =
      totalMinutes > 0 ? totalEarnings / (totalMinutes / 60) : 0;

    const days = rows.map((row) => {
      const dayTotalOrders = Number(row.total_orders ?? 0);
      const dayAcceptedOrders = Number(row.accepted_orders ?? 0);
      const dayRejectedOrders = dayTotalOrders - dayAcceptedOrders;

      return {
        day: row.day,
        totalOrders: dayTotalOrders,
        acceptedOrders: dayAcceptedOrders,
        rejectedOrders: dayRejectedOrders,
        totalEarnings: Number(row.total_earnings ?? 0),
        totalMiles: Number(row.total_miles ?? 0),
        totalMinutes: Number(row.total_minutes ?? 0),
        deadMilesEstimate: Number(row.dead_miles_estimate ?? 0),
        effectiveHourlyRate: Number(row.effective_hourly_rate ?? 0),
      };
    });

    return reply.status(200).send({
      driverId,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      totalOrders,
      acceptedOrders,
      rejectedOrders,
      acceptanceRate,
      totalEarnings,
      totalMiles,
      totalMinutes,
      deadMilesEstimate,
      effectiveHourlyRate,
      days,
    });
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
          driver_id,
          date,
          time_of_day_bucket,
          zone_name,
          total_orders,
          accepted_orders,
          total_earnings,
          effective_hourly_rate
        FROM analytics_driver_zone_time
        WHERE driver_id = $1
          AND ($2::date IS NULL OR date >= $2)
          AND ($3::date IS NULL OR date <= $3)
        ORDER BY date ASC, time_of_day_bucket ASC, zone_name ASC
      `,
      [driverId, startDate ?? null, endDate ?? null],
    );

    const response = rows.map((row) => {
      const totalOrders = Number(row.total_orders ?? 0);
      const acceptedOrders = Number(row.accepted_orders ?? 0);
      const rejectedOrders = totalOrders - acceptedOrders;
      const acceptanceRate =
        totalOrders > 0 ? acceptedOrders / totalOrders : 0;

      return {
        driverId: row.driver_id,
        date: row.date,
        timeOfDayBucket: row.time_of_day_bucket,
        zoneName: row.zone_name ?? "Unknown",
        totalOrders,
        acceptedOrders,
        rejectedOrders,
        acceptanceRate,
        totalEarnings: Number(row.total_earnings ?? 0),
        effectiveHourlyRate: Number(row.effective_hourly_rate ?? 0),
      };
    });

    return reply.status(200).send(response);
  });
}
