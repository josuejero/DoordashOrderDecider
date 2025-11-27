// server/routes/orders.ts
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { computeDecision } from "../..//src/lib/decision.js";
import { insertDecision, listDecisionsForDriver } from "../db/decisions.js";
import { createOrder } from "../db/orders.js";
import type { Decision } from "../domain/model.js";

const EvaluateBody = z.object({
  driverId: z.string().uuid(),
  platform: z.enum(["doordash"]).default("doordash"),
  targetRatePerHour: z.number().positive(),
  shiftStartHHMM: z.string(),
  earnedSoFar: z.number().nonnegative(),
  offerPayout: z.number().nonnegative(),
  finishHHMM: z.string(),
  miles: z.number().nonnegative().optional(),
  costPerMile: z.number().nonnegative().optional(),
  bufferMinutes: z.number().nonnegative().optional(),
});

const HistoryQuery = z.object({
  driverId: z.string().uuid(),
  limit: z
    .string()
    .transform((v) => Number(v))
    .optional(),
});

export function registerOrderRoutes(app: FastifyInstance) {
  app.post("/api/orders/evaluate", async (request, reply) => {
    const body = EvaluateBody.parse(request.body);

    const decisionResult = computeDecision({
      targetRatePerHour: body.targetRatePerHour,
      shiftStartHHMM: body.shiftStartHHMM,
      earnedSoFar: body.earnedSoFar,
      offerPayout: body.offerPayout,
      finishHHMM: body.finishHHMM,
      miles: body.miles,
      costPerMile: body.costPerMile,
      bufferMinutes: body.bufferMinutes,
    });

    const orderId = await createOrder({
      driverId: body.driverId,
      platform: body.platform,
      payout: body.offerPayout,
      miles: body.miles ?? null,
      estimatedMinutes: null,
    });

    const decision: Decision = {
      id: randomUUID(),
      orderId,
      driverId: body.driverId,
      accept: decisionResult.accept,
      netPayout: decisionResult.netPayout,
      requiredDollars: decisionResult.requiredDollars,
      projectedGrossPerHour: decisionResult.projectedGrossPerHour,
      projectedNetPerHour: decisionResult.projectedNetPerHour,
      finishISO: decisionResult.finishIso ?? null,
      createdAt: new Date(),
    };

    await insertDecision(decision);

    reply.code(201);
    return {
      orderId,
      decision,
    };
  });

  app.get("/api/orders/history", async (request) => {
    const { driverId, limit } = HistoryQuery.parse(request.query ?? {});
    const rows = await listDecisionsForDriver(driverId, limit ?? 50);
    return { records: rows };
  });
}
