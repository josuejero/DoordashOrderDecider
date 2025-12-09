import { z } from "zod";
import { loadEnv } from "../config/env.js";
const PredictResponse = z.object({
  predictedEffectiveHourlyRate: z.number(),
  confidence: z.number(),
  modelVersion: z.string().optional(),
});
const ModelMetadata = z.object({
  modelVersion: z.string().nullable().optional(),
  trainedAt: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  rmse: z.number().nullable().optional(),
  trackingUri: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});
export type MlPrediction = z.infer<typeof PredictResponse>;
export type MlMetadata = z.infer<typeof ModelMetadata>;
export type MlPredictRequest = {
  driverId: string;
  targetRatePerHour: number;
  vehicleType?: string | null;
  payout: number;
  miles?: number | null;
  estimatedMinutes?: number | null;
};
function getEnv() {
  return loadEnv();
}
export async function fetchMlMetadata(): Promise<MlMetadata | null> {
  const env = getEnv();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    env.ML_SERVICE_TIMEOUT_MS,
  );
  try {
    const res = await fetch(`${env.ML_SERVICE_URL}/metadata`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = ModelMetadata.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
export async function callMlPredict(
  body: MlPredictRequest,
  opts: {
    force?: boolean;
  } = {},
): Promise<MlPrediction | null> {
  const env = getEnv();
  if (!opts.force && !env.ENABLE_HYBRID_ML) return null;
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
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
