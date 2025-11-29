// server/services/decisions.ts

import { randomUUID } from "node:crypto";
import {
  insertFactDecision,
  insertFactOrder,
} from "../db/analytics.js";
import type {
  DecisionId,
  Driver,
  DriverId,
  OrderId,
} from "../domain/model.js";

/**
 * Lightweight snapshot of an order at the time the model is run.
 * The caller is responsible for actually persisting the order row
 * and passing its ID here.
 */
export type Order = {
  id: OrderId;
  /**
   * Total payout in cents (base + tip if known at decision time).
   */
  payoutCents: number;
  /**
   * Estimated total distance in miles. Optional if you don't have it.
   */
  distanceMiles?: number | null;
  /**
   * Estimated time to complete in minutes. Optional if you don't have it.
   */
  estimatedTimeMinutes?: number | null;
  createdAt: Date;
};

export type EvalContext = {
  /**
   * Platform label, e.g. "doordash". Optional for analytics.
   */
  platform?: string | null;
  /**
   * Zone code + name if you have it (for dim_zones).
   */
  zoneCode?: string | null;
  zoneName?: string | null;
  /**
   * Optional additional categorisation for analytics.
   */
  pickupStoreType?: string | null;
  pickupLocation?: string | null;
  dropoffZone?: string | null;
};

/**
 * Minimal decision record that the service returns.
 * The richer decision shape lives in the domain + DB layer;
 * this is just what the model service needs to know.
 */
export type Decision = {
  id: DecisionId;
  orderId: OrderId;
  driverId: DriverId;
  accept: boolean;
  effectiveHourlyRate?: number | null;
  reasonCodes?: string[] | null;
};

/**
 * Very small heuristic "model" so this module stays self-contained.
 * In a real system you'd call your ML / rules engine here instead.
 */
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

/**
 * Core orchestration:
 *  - run the model
 *  - return the decision
 *  - record analytics facts in fact_orders + fact_decisions
 *
 * This function does *not* write to your transactional tables (orders,
 * decisions, decision_events). Those are handled elsewhere in the codebase.
 */
export async function evaluateOrder(
  order: Order,
  driver: Driver,
  context: EvalContext = {},
): Promise<Decision> {
  const decision = await runModel(order, driver, context);
  const ts = order.createdAt ?? new Date();

  // Phase 2: analytics facts
  // fact_orders: one row per order
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
      context.zoneCode != null
        ? {
            code: context.zoneCode,
            name: context.zoneName ?? null,
          }
        : undefined,
    pickupStoreType: context.pickupStoreType ?? null,
    pickupLocation: context.pickupLocation ?? null,
    dropoffZone: context.dropoffZone ?? null,
  });

  // fact_decisions: one row per model decision
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
