import { getDbPool } from "./pool.js";
export async function createDriver(input) {
    const pool = getDbPool();
    const result = await pool.query(`
      INSERT INTO drivers (
        name,
        target_rate_per_hour,
        vehicle_type,
        fuel_cost_per_unit,
        maintenance_per_mile
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        name,
        target_rate_per_hour AS "targetRatePerHour",
        vehicle_type AS "vehicleType",
        fuel_cost_per_unit AS "fuelCostPerUnit",
        maintenance_per_mile AS "maintenanceCostPerMile",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `, [
        input.name,
        input.targetRatePerHour,
        input.vehicleType,
        input.fuelCostPerUnit ?? null,
        input.maintenanceCostPerMile ?? null,
    ]);
    return result.rows[0];
}
export async function getDriverById(id) {
    const pool = getDbPool();
    const result = await pool.query(`
      SELECT
        id,
        name,
        target_rate_per_hour AS "targetRatePerHour",
        vehicle_type AS "vehicleType",
        fuel_cost_per_unit AS "fuelCostPerUnit",
        maintenance_per_mile AS "maintenanceCostPerMile",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM drivers
      WHERE id = $1
    `, [id]);
    return result.rows[0] ?? null;
}
export async function updateDriver(input) {
    const pool = getDbPool();
    const result = await pool.query(`
      UPDATE drivers
      SET
        name = $2,
        target_rate_per_hour = $3,
        vehicle_type = $4,
        fuel_cost_per_unit = $5,
        maintenance_per_mile = $6,
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        name,
        target_rate_per_hour AS "targetRatePerHour",
        vehicle_type AS "vehicleType",
        fuel_cost_per_unit AS "fuelCostPerUnit",
        maintenance_per_mile AS "maintenanceCostPerMile",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `, [
        input.id,
        input.name,
        input.targetRatePerHour,
        input.vehicleType,
        input.fuelCostPerUnit,
        input.maintenanceCostPerMile,
    ]);
    return result.rows[0] ?? null;
}
