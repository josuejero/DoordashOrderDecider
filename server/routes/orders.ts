// server/routes/orders.ts
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { computeDecision, explainDecision } from "../..//src/lib/decision.js";
import {
  insertFactDecision,
  insertFactOrder,
  type DimZoneAttrs,
} from "../db/analytics.js";
import { insertDecision, listDecisionsForDriver } from "../db/decisions.js";
import { getDriverById } from "../db/drivers.js";
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

  // Optional analytics-only metadata (you can start passing later)
  zoneName: z.string().min(1).optional(),
  zoneCity: z.string().min(1).optional(),
  zoneRegion: z.string().min(1).optional(),
});

const HistoryQuery = z.object({
  driverId: z.string().uuid(),
  limit: z
    .string()
    .transform((v) => Number(v))
    .optional(),
  startDate: z.string().optional(), // YYYY-MM-DD
  endDate: z.string().optional(),   // YYYY-MM-DD
  zone: z.string().optional(),
  decision: z
    .enum(["accept", "reject", "accepted", "rejected"])
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
      estimatedMinutes: null, // legacy; analytics uses its own estimate
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

    // ---- Phase 2 analytics wiring ----
    try {
      const driver = await getDriverById(body.driverId);
      if (driver) {
        const zone: DimZoneAttrs | null = body.zoneName
          ? {
              zoneName: body.zoneName,
              city: body.zoneCity ?? null,
              region: body.zoneRegion ?? null,
            }
          : null;

        // For now, estimated_time_minutes is 0 (we don't capture it separately yet)
        await insertFactOrder({
          orderId,
          driver,
          ts: decision.createdAt,
          platform: body.platform,
          basePayout: body.offerPayout,
          tip: null,
          estimatedDistanceMiles: body.miles ?? null,
          estimatedTimeMinutes: null,
          zone,
          pickupStoreType: null,
          pickupLocation: null,
          dropoffZone: null,
        });

        const explanation = explainDecision(
          {
            targetRatePerHour: body.targetRatePerHour,
            shiftStartHHMM: body.shiftStartHHMM,
            earnedSoFar: body.earnedSoFar,
            offerPayout: body.offerPayout,
            finishHHMM: body.finishHHMM,
            miles: body.miles,
            costPerMile: body.costPerMile,
            bufferMinutes: body.bufferMinutes,
          },
          decisionResult,
        );

        await insertFactDecision({
          decisionId: decision.id,
          driver,
          orderId,
          activeMode: "heuristic",
          recommendedDecision: decision.accept ? "ACCEPT" : "REJECT",
          finalDecision: decision.accept ? "ACCEPT" : "REJECT",
          effectiveHourlyRate: decision.projectedNetPerHour,
          reasonCodes: [explanation.code],
        });
      } else {
        request.log.warn(
          { driverId: body.driverId },
          "Driver not found while writing analytics facts",
        );
      }
    } catch (err) {
      request.log.error({ err }, "Failed to write analytics facts");
      // Do NOT fail the main request – analytics is best-effort.
    }
    // ---- end analytics wiring ----

    reply.code(201);
    return {
      orderId,
      decision,
    };
  });

  app.get("/api/orders/history", async (request) => {
    const { driverId, limit, startDate, endDate, zone, decision } =
      HistoryQuery.parse(request.query ?? {});

    const rows = await listDecisionsForDriver(driverId, {
      limit: limit ?? 50,
      startDate,
      endDate,
      zone,
      decision,
    });

    return { records: rows };
  });
}
