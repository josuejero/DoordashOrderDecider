// server/clients/mlClient.ts
import { z } from "zod";
import { loadEnv } from "../config/env.js";

const env = loadEnv();

const PredictResponse = z.object({
  predictedEffectiveHourlyRate: z.number(),
  confidence: z.number(),
  modelVersion: z.string().optional(),
});

export type MlPrediction = z.infer<typeof PredictResponse>;

export type MlPredictRequest = {
  driverId: string;
  targetRatePerHour: number;
  vehicleType?: string | null;
  payout: number;
  miles?: number | null;
  estimatedMinutes?: number | null;
};

export async function callMlPredict(
  body: MlPredictRequest,
): Promise<MlPrediction | null> {
  if (!env.ENABLE_HYBRID_ML) return null;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    env.ML_SERVICE_TIMEOUT_MS,
  );

  try {
    const res = await fetch(`${env.ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        driverId: body.driverId,
        targetRatePerHour: body.targetRatePerHour,
        vehicleType: body.vehicleType,
        payout: body.payout,
        miles: body.miles,
        estimatedMinutes: body.estimatedMinutes,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    const parsed = PredictResponse.safeParse(json);
    if (!parsed.success) {
      return null;
    }

    return parsed.data;
  } catch {
    // Swallow ML failures; caller will fall back to heuristics.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
