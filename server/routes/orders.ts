// server/routes/orders.ts
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { computeDecision, explainDecision } from "../../src/lib/decision.js";
import { callMlPredict } from "../clients/mlClient.js";
import {
  insertFactDecision,
  insertFactOrder,
  type DimZoneAttrs
} from "../db/analytics.js";
import { insertDecision, listDecisionsForDriver } from "../db/decisions.js";
import { getDriverById } from "../db/drivers.js";
import { createOrder } from "../db/orders.js";
import type { Decision } from "../domain/model.js";



type CombinedDecisionInput = {
  netHourly: number;
  targetRatePerHour: number;
  threshold: number;
  mlPrediction?: {
    predictedEffectiveHourlyRate: number;
    confidence: number;
    modelVersion?: string;
  };
};

function computeCombinedAccept({
  netHourly,
  targetRatePerHour,
  threshold,
  mlPrediction,
}: CombinedDecisionInput): {
  accept: boolean;
  mode: "heuristic" | "hybrid_ml";
  usedMl: boolean;
  combinedScore: number;
} {
  if (!mlPrediction) {
    const cutoff = targetRatePerHour * threshold;
    return {
      accept: netHourly >= cutoff,
      mode: "heuristic",
      usedMl: false,
      combinedScore: netHourly,
    };
  }

  const cutoff = targetRatePerHour * threshold;
  const clampedConfidence = Math.min(Math.max(mlPrediction.confidence, 0), 1);
  const wMl = 0.3 + 0.5 * clampedConfidence; // 0.3–0.8
  const wH = 1 - wMl;

  const combinedScore =
    wH * netHourly + wMl * mlPrediction.predictedEffectiveHourlyRate;

  return {
    accept: combinedScore >= cutoff,
    mode: "hybrid_ml",
    usedMl: true,
    combinedScore,
  };
}




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
  pickupStoreType: z.string().min(1).optional(),
  pickupLocation: z.string().min(1).optional(),
  dropoffZone: z.string().min(1).optional(),
  finalDecision: z.enum(["ACCEPT", "REJECT"]).optional(),

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

    const zone: DimZoneAttrs | null = body.zoneName
  ? {
      zoneName: body.zoneName,
      city: body.zoneCity ?? null,
      region: body.zoneRegion ?? null,
    }
  : null;

    const driver = await getDriverById(body.driverId);
    if (!driver) {
      reply.code(404);
      return { error: "Driver not found" };
    }

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

    const threshold = 1.0; // TODO: plug in aggressiveness from profile
    let mlPrediction = null;

    if (driver.decisionMode === "hybrid_ml") {
      mlPrediction = await callMlPredict({
        driverId: driver.id,
        targetRatePerHour: driver.targetRatePerHour,
        vehicleType: driver.vehicleType,
        payout: body.offerPayout,
        miles: body.miles ?? null,
        estimatedMinutes: null,
      });
    }

    const combined = computeCombinedAccept({
      netHourly: decisionResult.projectedNetPerHour,
      targetRatePerHour: body.targetRatePerHour,
      threshold,
      mlPrediction: mlPrediction ?? undefined,
    });
    const recommendedDecision = combined.accept ? "ACCEPT" : "REJECT";
    const finalDecision = body.finalDecision ?? recommendedDecision;
    const finalAccept = finalDecision === "ACCEPT";

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
      driverId: driver.id,
      accept: finalAccept,
      netPayout: decisionResult.netPayout,
      requiredDollars: decisionResult.requiredDollars,
      projectedGrossPerHour: decisionResult.projectedGrossPerHour,
      projectedNetPerHour: combined.combinedScore,
      finishISO: decisionResult.finishIso ?? null,
      createdAt: new Date(),
    };

    // Persist decision in main decisions table (existing logic)
    await insertDecision(decision);

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
      {
        ...decisionResult,
        // override accept to reflect the hybrid/combined decision
        accept: combined.accept,
      },
    );

    // Analytics insert with mode - sequential to avoid foreign key violation
    try {
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
        pickupStoreType: body.pickupStoreType ?? null,
        pickupLocation: body.pickupLocation ?? null,
        dropoffZone: body.dropoffZone ?? null,
      });
    } catch (err) {
      request.log.error(
        { err },
        "Failed to insert analytics fact_order",
      );
    }

    try {
      await insertFactDecision({
        decisionId: decision.id,
        driver,
        orderId,
        activeMode: combined.mode,
        recommendedDecision,
        finalDecision,
        effectiveHourlyRate: decision.projectedNetPerHour,
        reasonCodes: [explanation.code],
      });
    } catch (err) {
      request.log.error(
        { err },
        "Failed to insert analytics fact_decision",
      );
    }

    reply.code(201);
    return {
      orderId,
      decisionId: decision.id,
      recommendedDecision,
      finalDecision,
      mode: combined.mode,
      usedMl: combined.mode === "hybrid_ml",
      modelVersion: mlPrediction?.modelVersion ?? null,
      decision,
      explanation,
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
