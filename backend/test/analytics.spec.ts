import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { buildFastifyApp } from "../src/server";
const connectionString =
  process.env.DD_DECIDER_TEST_DB_URL ??
  process.env.DD_DECIDER_DATABASE_URL ??
  process.env.DD_DECIDER_DEV_DB_URL ??
  process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Missing DB URL env var. Set one of DD_DECIDER_TEST_DB_URL, DD_DECIDER_DATABASE_URL, DD_DECIDER_DEV_DB_URL, or DATABASE_URL in your .env.",
  );
}
const pool = new Pool({
  connectionString,
});
async function seedTestData(): Promise<string> {
  const driverId = randomUUID();
  const { rows: driverRows } = await pool.query(
    `
      INSERT INTO dim_driver (driver_id, alias)
      VALUES ($1, 'Test Driver')
      RETURNING driver_id
    `,
    [driverId],
  );
  const ts = new Date();
  const derived = deriveTimeFields(ts);
  const { rows: timeRows } = await pool.query(
    `
      INSERT INTO dim_time (
        ts,
        date,
        hour,
        day_of_week,
        time_of_day_bucket
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING time_id, date
    `,
    [ts, derived.date, derived.hour, derived.dayOfWeek, derived.timeOfDayBucket],
  );
  const timeId = timeRows[0].time_id;
  const { rows: zoneRows } = await pool.query(`
      INSERT INTO dim_zone (zone_name)
      VALUES ('Downtown')
      RETURNING zone_id
    `);
  const zoneId = zoneRows[0].zone_id;
  const { rows: orderRows } = await pool.query(
    `
      INSERT INTO fact_orders (
        driver_id,
        zone_id,
        time_id,
        base_payout,
        tip,
        estimated_distance_miles,
        estimated_time_minutes
      )
      VALUES ($1, $2, $3, 10, 3, 5, 30)
      RETURNING order_id
    `,
    [driverRows[0].driver_id, zoneId, timeId],
  );
  const orderId = orderRows[0].order_id;
  await pool.query(
    `
      INSERT INTO fact_decisions (
        order_id,
        driver_id,
        active_mode,
        recommended_decision,
        final_decision,
        effective_hourly_rate
      )
      VALUES ($1, $2, 'heuristic', 'ACCEPT', 'ACCEPT', 26)
    `,
    [orderId, driverRows[0].driver_id],
  );
  return driverRows[0].driver_id as string;
}

function deriveTimeFields(ts: Date) {
  const utcTs = new Date(ts);
  const date = utcTs.toISOString().slice(0, 10);
  const hour = utcTs.getUTCHours();
  const dayOfWeek = utcTs.getUTCDay();
  let timeOfDayBucket: string;
  if (hour >= 5 && hour <= 11) {
    timeOfDayBucket = "morning";
  } else if (hour >= 12 && hour <= 16) {
    timeOfDayBucket = "afternoon";
  } else if (hour >= 17 && hour <= 21) {
    timeOfDayBucket = "evening";
  } else {
    timeOfDayBucket = "night";
  }
  return { date, hour, dayOfWeek, timeOfDayBucket };
}
describe("Analytics endpoints", () => {
  const app = buildFastifyApp();
  afterAll(async () => {
    await app.close();
    await pool.end();
  });
  it("returns summary stats for a driver", async () => {
    const driverId = await seedTestData();
    const res = await app.inject({
      method: "GET",
      url: `/analytics/summary?driverId=${driverId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      totalOrders: number;
      acceptedOrders: number;
      effectiveHourlyRate: number;
    };
    expect(body.totalOrders).toBeGreaterThan(0);
    expect(body.acceptedOrders).toBeGreaterThan(0);
    expect(body.effectiveHourlyRate).toBeGreaterThan(0);
  });
});
