export type DriverId = string;
export type OrderId = string;
export type DecisionId = string;
export type DecisionMode = "heuristic" | "hybrid_ml";
export type Driver = {
  id: DriverId;
  name: string;
  targetRatePerHour: number;
  vehicleType: "car" | "bike" | "scooter" | "other";
  fuelCostPerUnit: number | null;
  maintenanceCostPerMile: number | null;
  decisionMode: DecisionMode;
  createdAt: Date;
  updatedAt: Date;
};
export type Order = {
  id: OrderId;
  driverId: DriverId | null;
  platform: "doordash";
  payout: number;
  miles: number | null;
  estimatedMinutes: number | null;
  createdAt: Date;
};
export type Decision = {
  id: DecisionId;
  orderId: OrderId;
  driverId: DriverId;
  accept: boolean;
  netPayout: number;
  requiredDollars: number;
  projectedGrossPerHour: number;
  projectedNetPerHour: number;
  finishISO: string | null;
  createdAt: Date;
};
