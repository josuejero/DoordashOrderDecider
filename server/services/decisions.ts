// server/services/decisions.ts
import {
  insertFactDecision,
  insertFactOrder,
} from "../db/analytics";

// Put your real types here
type Order = {
  id: number;
  payoutCents: number;
  distanceKm: number | null;
  createdAt: Date;
};

type Driver = {
  id: number;
  name: string;
  city: string | null;
};

type EvalContext = {
  zoneCode: string;
  zoneName?: string | null;
};

type Decision = {
  id: number;
  accepted: boolean;
};

async function runModel(
  order: Order,
  driver: Driver,
  context: EvalContext
): Promise<Decision> {
  // your ML / rules engine
  return {
    id: 1,
    accepted: true,
  };
}

export async function evaluateOrder(
  order: Order,
  driver: Driver,
  context: EvalContext
): Promise<Decision> {
  const decision = await runModel(order, driver, context);

  // Phase 1: existing persistence
  await saveOrder(order);
  await saveDecision(decision, order, driver, context);
  await saveDecisionEvents(order, driver, decision, context);

  // Phase 2: analytics facts
  const ts = order.createdAt ?? new Date();

  await insertFactOrder({
    orderId: order.id,
    driverId: driver.id,
    ts,
    zoneCode: context.zoneCode,
    zoneName: context.zoneName ?? null,
    payoutCents: order.payoutCents,
    distanceKm: order.distanceKm,
    accepted: decision.accepted,
  });

  await insertFactDecision({
    decisionId: decision.id,
    orderId: order.id,
    driverId: driver.id,
    ts,
    zoneCode: context.zoneCode,
    zoneName: context.zoneName ?? null,
    accepted: decision.accepted,
  });

  return decision;
}
