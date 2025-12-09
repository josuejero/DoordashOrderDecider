import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { callMlPredict, fetchMlMetadata } from "../clients/mlClient.js";
import { loadEnv } from "../config/env.js";
const PredictBody = z.object({
  driverId: z.string().uuid(),
  targetRatePerHour: z.number().positive(),
  vehicleType: z.string().optional(),
  payout: z.number().nonnegative(),
  miles: z.number().nonnegative().nullable().optional(),
  estimatedMinutes: z.number().nonnegative().nullable().optional(),
});
export async function registerModelRoutes(app: FastifyInstance) {
  app.get("/api/model/metadata", async (_request, reply) => {
    const meta = await fetchMlMetadata();
    if (!meta) {
      reply.code(503);
      return { error: "ML service unavailable" };
    }
    return meta;
  });
  app.post("/api/model/predict", async (request, reply) => {
    const env = loadEnv();
    if (!env.ENABLE_HYBRID_ML) {
      reply.code(503);
      return { error: "Hybrid ML disabled" };
    }
    const parsed = PredictBody.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "Invalid payload" };
    }
    const prediction = await callMlPredict(parsed.data, { force: true });
    if (!prediction) {
      reply.code(502);
      return { error: "ML service unavailable" };
    }
    return prediction;
  });
}
