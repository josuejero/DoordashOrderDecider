import { FastifyInstance } from "fastify";
import { Pool } from "pg";
import { z } from "zod";

// assumes you pass app.db: Pool from server/app.ts
export async function registerAnalyticsRoutes(app: FastifyInstance, db: Pool) {
  const summaryQuerySchema = z.object({
    driverId: z.string().uuid(),
    startDate: z.string().date(),
    endDate: z.string().date(),
  });

  app.get("/api/analytics/summary", async (request, reply) => {
    const parsed = summaryQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid query parameters",
        details: parsed.error.flatten(),
      });
    }

    const { driverId, startDate, endDate } = parsed.data;

    const { rows } = await db.query(
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
        AND day >= $2::date
        AND day <= $3::date
      ORDER BY day ASC
      `,
      [driverId, startDate, endDate]
    );

    // Aggregate across the range for the summary response
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

    return reply.status(200).send({
      driverId,
      startDate,
      endDate,
      totalOrders,
      acceptedOrders,
      rejectedOrders,
      acceptanceRate,
      totalEarnings,
      totalMiles,
      totalMinutes,
      deadMilesEstimate,
      effectiveHourlyRate,
      // optionally expose the per-day rows if tests expect it:
      days: rows.map((row) => {
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
      }),
    });
  });

  const zoneTimeSchema = z.object({
    driverId: z.string().uuid(),
  });

  app.get("/api/analytics/zone-time", async (request, reply) => {
    const parsed = zoneTimeSchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid query parameters",
        details: parsed.error.flatten(),
      });
    }

    const { driverId } = parsed.data;

    const { rows } = await db.query(
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
      ORDER BY date ASC, time_of_day_bucket ASC, zone_name ASC
      `,
      [driverId]
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
        zoneName: row.zone_name,
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
