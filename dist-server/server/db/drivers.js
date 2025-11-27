import { getDbPool } from "./pool.js";
export async function createDriver(input) {
    const pool = getDbPool();
    const result = await pool.query(`
      INSERT INTO drivers (name, target_rate_per_hour, vehicle_type)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        name,
        target_rate_per_hour AS "targetRatePerHour",
        vehicle_type AS "vehicleType",
        fuel_cost_per_unit AS "fuelCostPerUnit",
        maintenance_per_mile AS "maintenancePerMile",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `, [input.name, input.targetRatePerHour, input.vehicleType]);
    return result.rows[0];
}
