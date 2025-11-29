import { z } from "zod";
// server/__tests__/analytics.test.ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
describe("analytics routes", () => {
    it("GET /api/analytics/summary responds with a summary shape", async () => {
        const app = buildApp();
        const driverId = "00000000-0000-0000-0000-000000000001";
        const res = await app.inject({
            method: "GET",
            url: `/api/analytics/summary?driverId=${driverId}`,
        });
        // Depending on data you might get 0 orders, but it should not throw.
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("driverId");
        expect(body).toHaveProperty("totalOrders");
        expect(body).toHaveProperty("acceptedOrders");
        expect(body).toHaveProperty("acceptanceRate");
        await app.close();
    });
    it("GET /api/analytics/zone-time responds with an array", async () => {
        const app = buildApp();
        const driverId = "00000000-0000-0000-0000-000000000001";
        const res = await app.inject({
            method: "GET",
            url: `/api/analytics/zone-time?driverId=${driverId}`,
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(Array.isArray(body)).toBe(true);
        await app.close();
    });
});
// assumes you pass app.db: Pool from server/app.ts
export async function registerAnalyticsRoutes(app, db) {
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
        const { rows } = await db.query(`
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
      `, [driverId, startDate, endDate]);
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
        const acceptanceRate = totalOrders > 0 ? acceptedOrders / totalOrders : 0;
        const effectiveHourlyRate = totalMinutes > 0 ? totalEarnings / (totalMinutes / 60) : 0;
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
        const { rows } = await db.query(`
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
      `, [driverId]);
        const response = rows.map((row) => {
            const totalOrders = Number(row.total_orders ?? 0);
            const acceptedOrders = Number(row.accepted_orders ?? 0);
            const rejectedOrders = totalOrders - acceptedOrders;
            const acceptanceRate = totalOrders > 0 ? acceptedOrders / totalOrders : 0;
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
