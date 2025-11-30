// server/db/drivers.ts
import type { Driver, DriverId } from "../domain/model.js";
import { getDbPool } from "./pool.js";

export async function createDriver(input: {
  name: string;
  targetRatePerHour: number;
  vehicleType: Driver["vehicleType"];
  fuelCostPerUnit?: number | null;
  maintenanceCostPerMile?: number | null;
  decisionMode?: Driver["decisionMode"];
}): Promise<Driver> {
  const pool = getDbPool();
  const result = await pool.query(
    `
      INSERT INTO drivers (
        name,
        target_rate_per_hour,
        vehicle_type,
        fuel_cost_per_unit,
        maintenance_per_mile,
        decision_mode
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        name,
        target_rate_per_hour AS "targetRatePerHour",
        vehicle_type AS "vehicleType",
        fuel_cost_per_unit AS "fuelCostPerUnit",
        maintenance_per_mile AS "maintenanceCostPerMile",
        decision_mode AS "decisionMode",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.name,
      input.targetRatePerHour,
      input.vehicleType,
      input.fuelCostPerUnit ?? null,
      input.maintenanceCostPerMile ?? null,
      input.decisionMode ?? "heuristic",
    ],
  );
  return result.rows[0] as Driver;
}

export async function getDriverById(id: DriverId): Promise<Driver | null> {
  const pool = getDbPool();
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        target_rate_per_hour AS "targetRatePerHour",
        vehicle_type AS "vehicleType",
        fuel_cost_per_unit AS "fuelCostPerUnit",
        maintenance_per_mile AS "maintenanceCostPerMile",
        decision_mode AS "decisionMode",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM drivers
      WHERE id = $1
    `,
    [id],
  );
  return (result.rows[0] as Driver | undefined) ?? null;
}

export async function updateDriver(input: Driver): Promise<Driver | null> {
  const pool = getDbPool();
  const result = await pool.query(
    `
      UPDATE drivers
      SET
        name = $2,
        target_rate_per_hour = $3,
        vehicle_type = $4,
        fuel_cost_per_unit = $5,
        maintenance_per_mile = $6,
        decision_mode = $7,
        updated_at = now()
      WHERE id = $1
      RETURNING
        id,
        name,
        target_rate_per_hour AS "targetRatePerHour",
        vehicle_type AS "vehicleType",
        fuel_cost_per_unit AS "fuelCostPerUnit",
        maintenance_per_mile AS "maintenanceCostPerMile",
        decision_mode AS "decisionMode",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.name,
      input.targetRatePerHour,
      input.vehicleType,
      input.fuelCostPerUnit,
      input.maintenanceCostPerMile,
      input.decisionMode,
    ],
  );
  return (result.rows[0] as Driver | undefined) ?? null;
}
