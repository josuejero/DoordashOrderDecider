// server/db/drivers.ts
import type { DriverId } from "../domain/model.js";
import { getDbPool } from "./pool.js";

// DB-level view of a driver row, including preferences.
export type DecisionMode = "heuristic" | "hybrid_ml";

export type DbDriver = {
  id: DriverId;
  name: string;
  targetRatePerHour: number;
  vehicleType: "car" | "bike" | "scooter" | "other";
  fuelCostPerUnit: number | null;
  maintenanceCostPerMile: number | null;
  decisionMode: DecisionMode;
  preferredZones: string[];
  preferredTimeBuckets: string[];
  createdAt: Date;
  updatedAt: Date;
};

type CreateDriverInput = {
  name: string;
  targetRatePerHour: number;
  vehicleType: DbDriver["vehicleType"];
  fuelCostPerUnit?: number | null;
  maintenanceCostPerMile?: number | null;
  decisionMode?: DecisionMode;
  preferredZones?: string[];
  preferredTimeBuckets?: string[];
};

export async function createDriver(input: CreateDriverInput): Promise<DbDriver> {
  const pool = getDbPool();

  const result = await pool.query(
    `
      INSERT INTO drivers (
        name,
        target_rate_per_hour,
        vehicle_type,
        fuel_cost_per_unit,
        maintenance_per_mile,
        decision_mode,
        preferred_zones,
        preferred_time_buckets
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        name,
        target_rate_per_hour AS "targetRatePerHour",
        vehicle_type AS "vehicleType",
        fuel_cost_per_unit AS "fuelCostPerUnit",
        maintenance_per_mile AS "maintenanceCostPerMile",
        decision_mode AS "decisionMode",
        preferred_zones AS "preferredZones",
        preferred_time_buckets AS "preferredTimeBuckets",
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
      input.preferredZones ?? [],
      input.preferredTimeBuckets ?? [],
    ],
  );

  return result.rows[0] as DbDriver;
}

export async function getDriverById(id: DriverId): Promise<DbDriver | null> {
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
        preferred_zones AS "preferredZones",
        preferred_time_buckets AS "preferredTimeBuckets",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM drivers
      WHERE id = $1
    `,
    [id],
  );

  return (result.rows[0] as DbDriver | undefined) ?? null;
}

export type DriverUpdateInput = DbDriver & {
  // If you ever want to support partial updates at the DB layer
  // you can make fields optional here and coalesce in the query.
};

export async function updateDriver(
  input: DriverUpdateInput,
): Promise<DbDriver | null> {
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
        preferred_zones = $8,
        preferred_time_buckets = $9,
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
        preferred_zones AS "preferredZones",
        preferred_time_buckets AS "preferredTimeBuckets",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      input.id,
      input.name,
      input.targetRatePerHour,
      input.vehicleType,
      input.fuelCostPerUnit ?? null,
      input.maintenanceCostPerMile ?? null,
      input.decisionMode ?? "heuristic",
      input.preferredZones ?? [],
      input.preferredTimeBuckets ?? [],
    ],
  );

  return (result.rows[0] as DbDriver | undefined) ?? null;
}
