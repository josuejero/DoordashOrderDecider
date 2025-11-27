// backend/test/analytics.spec.ts
import { Pool } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { buildFastifyApp } from '../src/server';

const pool = new Pool({
  connectionString: process.env.DD_DECIDER_DATABASE_URL,
});

async function seedTestData(driverId: string) {
  await pool.query(
    'TRUNCATE fact_decisions, fact_orders, dim_time, dim_zone, dim_driver RESTART IDENTITY CASCADE',
  );

  const { rows: driverRows } = await pool.query(
    `INSERT INTO dim_driver (driver_id, alias)
     VALUES ($1, 'Test Driver')
     RETURNING driver_id`,
    [driverId],
  );

  const { rows: timeRows } = await pool.query(
    `INSERT INTO dim_time (ts)
     VALUES (NOW())
     RETURNING time_id, date`,
  );
  const timeId = timeRows[0].time_id;

  const { rows: zoneRows } = await pool.query(
    `INSERT INTO dim_zone (zone_name)
     VALUES ('Downtown')
     RETURNING zone_id`,
  );
  const zoneId = zoneRows[0].zone_id;

  const { rows: orderRows } = await pool.query(
    `INSERT INTO fact_orders (
       driver_id,
       zone_id,
       time_id,
       base_payout,
       tip,
       estimated_distance_miles,
       estimated_time_minutes
     )
     VALUES ($1, $2, $3, 10, 3, 5, 30)
     RETURNING order_id`,
    [driverRows[0].driver_id, zoneId, timeId],
  );
  const orderId = orderRows[0].order_id;

  await pool.query(
    `INSERT INTO fact_decisions (
       order_id,
       driver_id,
       active_mode,
       recommended_decision,
       final_decision,
       effective_hourly_rate
     )
     VALUES ($1, $2, 'heuristic', 'ACCEPT', 'ACCEPT', 26)`,
    [orderId, driverRows[0].driver_id],
  );
}

describe('Analytics endpoints', () => {
  const driverId = '00000000-0000-0000-0000-000000000001';
  const app = buildFastifyApp();

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('returns summary stats for a driver', async () => {
    await seedTestData(driverId);

    const res = await app.inject({
      method: 'GET',
      url: `/analytics/summary?driverId=${driverId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.totalOrders).toBeGreaterThan(0);
    expect(body.acceptedOrders).toBeGreaterThan(0);
    expect(body.effectiveHourlyRate).toBeGreaterThan(0);
  });
});
