import { getDbPool } from "../pool.js";
export async function ensureDimDriverWithClient(client, driverId, attrs) {
    await client.query(`
      INSERT INTO dim_driver (
        driver_id,
        alias,
        vehicle_type,
        target_hourly_rate,
        fuel_cost_per_unit,
        maintenance_cost_per_mile
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (driver_id) DO UPDATE
      SET
        alias                     = EXCLUDED.alias,
        vehicle_type              = EXCLUDED.vehicle_type,
        target_hourly_rate        = EXCLUDED.target_hourly_rate,
        fuel_cost_per_unit        = EXCLUDED.fuel_cost_per_unit,
        maintenance_cost_per_mile = EXCLUDED.maintenance_cost_per_mile,
        updated_at                = now()
    `, [
        driverId,
        attrs.alias,
        attrs.vehicleType ?? null,
        attrs.targetHourlyRate ?? null,
        attrs.fuelCostPerUnit ?? null,
        attrs.maintenanceCostPerMile ?? null,
    ]);
}
export async function ensureDimDriver(driverId, attrs) {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await ensureDimDriverWithClient(client, driverId, attrs);
        await client.query("COMMIT");
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
}
export async function ensureDimZoneWithClient(client, attrs) {
    // We don't have a UNIQUE constraint, so we emulate an upsert by lookup + insert.
    const existing = await client.query(`
      SELECT zone_id
      FROM dim_zone
      WHERE
        zone_name = $1
        AND city   IS NOT DISTINCT FROM $2
        AND region IS NOT DISTINCT FROM $3
      LIMIT 1
    `, [attrs.zoneName, attrs.city ?? null, attrs.region ?? null]);
    if ((existing.rowCount ?? 0) > 0) {
        return existing.rows[0].zone_id;
    }
    const inserted = await client.query(`
      INSERT INTO dim_zone (zone_name, city, region)
      VALUES ($1, $2, $3)
      RETURNING zone_id
    `, [attrs.zoneName, attrs.city ?? null, attrs.region ?? null]);
    return inserted.rows[0].zone_id;
}
export async function ensureDimZone(attrs) {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const zoneId = await ensureDimZoneWithClient(client, attrs);
        await client.query("COMMIT");
        return zoneId;
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
}
/**
 * Dimension: dim_time
 *
 * We rely on the BEFORE INSERT trigger (or generated columns) to populate
 * date, hour, day_of_week, time_of_day_bucket.
 */
export async function ensureDimTimeWithClient(client, ts) {
    // Optional dedupe: reuse existing row for the same timestamp if present.
    const existing = await client.query(`
      SELECT time_id
      FROM dim_time
      WHERE ts = $1
      LIMIT 1
    `, [ts]);
    if ((existing.rowCount ?? 0) > 0) {
        return existing.rows[0].time_id;
    }
    const inserted = await client.query(`
      INSERT INTO dim_time (ts)
      VALUES ($1)
      RETURNING time_id
    `, [ts]);
    return inserted.rows[0].time_id;
}
export async function ensureDimTime(ts) {
    const pool = getDbPool();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const timeId = await ensureDimTimeWithClient(client, ts);
        await client.query("COMMIT");
        return timeId;
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
}
