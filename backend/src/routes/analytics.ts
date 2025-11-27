// backend/src/routes/analytics.ts
import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { z } from 'zod';

const pool = new Pool({
  connectionString: process.env.DD_DECIDER_DATABASE_URL,
});

const summaryQuerySchema = z.object({
  driverId: z.string(),
  startDate: z.string().optional(), // ISO date
  endDate: z.string().optional(),   // ISO date
});

export async function registerAnalyticsRoutes(app: FastifyInstance) {
  app.get('/analytics/summary', async (request, reply) => {
    const parsed = summaryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query parameters' });
    }

    const { driverId, startDate, endDate } = parsed.data;

    const { rows } = await pool.query(
      `SELECT
         SUM(total_orders) AS total_orders,
         SUM(accepted_orders) AS accepted_orders,
         SUM(total_earnings) AS total_earnings,
         SUM(total_miles) AS total_miles,
         SUM(total_minutes) AS total_minutes,
         SUM(dead_miles_estimate) AS dead_miles
       FROM analytics_driver_daily_summary
       WHERE driver_id = $1
         AND ($2::date IS NULL OR day >= $2)
         AND ($3::date IS NULL OR day <= $3)`,
      [driverId, startDate ?? null, endDate ?? null]
    );

    const row = rows[0];

    if (!row || Number(row.total_orders) === 0) {
      return {
        driverId,
        totalOrders: 0,
        acceptedOrders: 0,
        acceptanceRate: 0,
        totalEarnings: 0,
        totalMiles: 0,
        deadMiles: 0,
        effectiveHourlyRate: 0,
      };
    }

    const totalOrders = Number(row.total_orders);
    const acceptedOrders = Number(row.accepted_orders);
    const totalEarnings = Number(row.total_earnings ?? 0);
    const totalMiles = Number(row.total_miles ?? 0);
    const totalMinutes = Number(row.total_minutes ?? 0);
    const deadMiles = Number(row.dead_miles ?? 0);

    const acceptanceRate = acceptedOrders / totalOrders;
    const hours = totalMinutes / 60;
    const effectiveHourlyRate = hours > 0 ? totalEarnings / hours : 0;

    return {
      driverId,
      totalOrders,
      acceptedOrders,
      acceptanceRate,
      totalEarnings,
      totalMiles,
      deadMiles,
      effectiveHourlyRate,
    };
  });

  app.get('/analytics/zone-time', async (request, reply) => {
    const parsed = summaryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid query parameters' });
    }

    const { driverId, startDate, endDate } = parsed.data;

    const { rows } = await pool.query(
      `SELECT
         date,
         time_of_day_bucket,
         COALESCE(zone_name, 'Unknown') AS zone_name,
         total_orders,
         accepted_orders,
         total_earnings,
         effective_hourly_rate
       FROM analytics_driver_zone_time
       WHERE driver_id = $1
         AND ($2::date IS NULL OR date >= $2)
         AND ($3::date IS NULL OR date <= $3)
       ORDER BY date DESC, time_of_day_bucket, zone_name`,
      [driverId, startDate ?? null, endDate ?? null]
    );

    return rows.map((r) => ({
      date: r.date,
      timeOfDayBucket: r.time_of_day_bucket,
      zoneName: r.zone_name,
      totalOrders: Number(r.total_orders),
      acceptedOrders: Number(r.accepted_orders),
      totalEarnings: Number(r.total_earnings ?? 0),
      effectiveHourlyRate: Number(r.effective_hourly_rate ?? 0),
    }));
  });
}
