import { ensureDimDriver } from "../db/analytics.js";
import {
  createDriver as createDriverInDb,
  type DbDriver,
  type DecisionMode,
} from "../db/drivers.js";
export type CreateDriverInput = {
  name: string;
  targetRatePerHour: number;
  vehicleType: DbDriver["vehicleType"];
  fuelCostPerUnit?: number | null;
  maintenanceCostPerMile?: number | null;
  decisionMode?: DecisionMode;
  preferredZones?: string[];
  preferredTimeBuckets?: string[];
};
export async function createDriver(
  input: CreateDriverInput,
): Promise<DbDriver> {
  const driver = await createDriverInDb({
    name: input.name,
    targetRatePerHour: input.targetRatePerHour,
    vehicleType: input.vehicleType,
    fuelCostPerUnit: input.fuelCostPerUnit ?? null,
    maintenanceCostPerMile: input.maintenanceCostPerMile ?? null,
    decisionMode: input.decisionMode ?? "heuristic",
    preferredZones: input.preferredZones ?? [],
    preferredTimeBuckets: input.preferredTimeBuckets ?? [],
  });
  await ensureDimDriver(driver.id, {
    alias: driver.name,
    vehicleType: driver.vehicleType,
    targetHourlyRate: driver.targetRatePerHour,
    fuelCostPerUnit: driver.fuelCostPerUnit ?? null,
    maintenanceCostPerMile: driver.maintenanceCostPerMile ?? null,
  });
  return driver;
}
