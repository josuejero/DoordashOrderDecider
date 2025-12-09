import { randomUUID } from "node:crypto";
import { insertFactDecision, insertFactOrder } from "../db/analytics.js";
import type { DecisionId, Driver, DriverId, OrderId } from "../domain/model.js";
export type Order = {
  id: OrderId;
  payoutCents: number;
  distanceMiles?: number | null;
  estimatedTimeMinutes?: number | null;
  createdAt: Date;
};
export type EvalContext = {
  platform?: "doordash" | null;
  zoneCode?: string | null;
  zoneName?: string | null;
  pickupStoreType?: string | null;
  pickupLocation?: string | null;
  dropoffZone?: string | null;
};
export type Decision = {
  id: DecisionId;
  orderId: OrderId;
  driverId: DriverId;
  accept: boolean;
  effectiveHourlyRate?: number | null;
  reasonCodes?: string[] | null;
};
async function runModel(
  order: Order,
  driver: Driver,
  _context: EvalContext,
): Promise<Decision> {
  const effectiveHourlyRate = estimateHourlyRate(order);
  const payoutDollars = order.payoutCents / 100;
  const accept =
    effectiveHourlyRate == null
      ? payoutDollars >= driver.targetRatePerHour
      : effectiveHourlyRate >= driver.targetRatePerHour;
  const decision: Decision = {
    id: randomUUID() as DecisionId,
    orderId: order.id,
    driverId: driver.id,
    accept,
    effectiveHourlyRate,
    reasonCodes: [accept ? "HEURISTIC_ACCEPT" : "HEURISTIC_REJECT"],
  };
  return decision;
}
function estimateHourlyRate(order: Order): number | null {
  const payoutDollars = order.payoutCents / 100;
  const minutes = order.estimatedTimeMinutes ?? null;
  if (!minutes || minutes <= 0) {
    return null;
  }
  const hours = minutes / 60;
  if (hours <= 0) {
    return null;
  }
  return payoutDollars / hours;
}
export async function evaluateOrder(
  order: Order,
  driver: Driver,
  context: EvalContext = {},
): Promise<Decision> {
  const decision = await runModel(order, driver, context);
  const ts = order.createdAt ?? new Date();
  await insertFactOrder({
    orderId: order.id,
    driver,
    ts,
    platform: context.platform ?? "doordash",
    basePayout: order.payoutCents / 100,
    tip: null,
    estimatedDistanceMiles: order.distanceMiles ?? null,
    estimatedTimeMinutes: order.estimatedTimeMinutes ?? null,
    zone:
      context.zoneName || context.zoneCode
        ? {
            zoneName: (context.zoneName ?? context.zoneCode) as string,
            region: context.zoneCode ?? null,
          }
        : undefined,
    pickupStoreType: context.pickupStoreType ?? null,
    pickupLocation: context.pickupLocation ?? null,
    dropoffZone: context.dropoffZone ?? null,
  });
  await insertFactDecision({
    decisionId: decision.id,
    driver,
    orderId: order.id,
    activeMode: "heuristic",
    recommendedDecision: decision.accept ? "ACCEPT" : "REJECT",
    finalDecision: decision.accept ? "ACCEPT" : "REJECT",
    effectiveHourlyRate: decision.effectiveHourlyRate ?? null,
    reasonCodes: decision.reasonCodes ?? null,
  });
  return decision;
}
