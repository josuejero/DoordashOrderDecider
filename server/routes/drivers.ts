import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureDimDriver } from "../db/analytics.js";
import {
  getDriverById,
  updateDriver,
  type DbDriver,
  type DecisionMode,
} from "../db/drivers.js";
import { createDriver as createDriverService } from "../services/driver.js";
const DriverBody = z.object({
  name: z.string().min(1),
  targetRatePerHour: z.number().positive(),
  vehicleType: z.enum(["car", "bike", "scooter", "other"]),
  fuelCostPerUnit: z.number().nonnegative().nullable().optional(),
  maintenanceCostPerMile: z.number().nonnegative().nullable().optional(),
  decisionMode: z.enum(["heuristic", "hybrid_ml"]).default("heuristic"),
  preferredZones: z.array(z.string().min(1)).default([]),
  preferredTimeBuckets: z.array(z.string().min(1)).default([]),
});
export function registerDriverRoutes(app: FastifyInstance) {
  app.post("/api/drivers", async (request, reply) => {
    const body = DriverBody.parse(request.body);
    const driver = await createDriverService({
      name: body.name,
      targetRatePerHour: body.targetRatePerHour,
      vehicleType: body.vehicleType,
      fuelCostPerUnit: body.fuelCostPerUnit ?? null,
      maintenanceCostPerMile: body.maintenanceCostPerMile ?? null,
      decisionMode: body.decisionMode as DecisionMode,
      preferredZones: body.preferredZones,
      preferredTimeBuckets: body.preferredTimeBuckets,
    });
    reply.code(201);
    return driver;
  });
  app.get("/api/drivers/:id", async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const driver = await getDriverById(id);
    if (!driver) {
      reply.code(404);
      return { error: "Driver not found" };
    }
    return driver;
  });
  app.put("/api/drivers/:id", async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const body = DriverBody.partial().parse(request.body ?? {});
    const existing = await getDriverById(id);
    if (!existing) {
      reply.code(404);
      return { error: "Driver not found" };
    }
    const updatedInput: DbDriver = {
      ...existing,
      ...body,
      decisionMode: (body.decisionMode ??
        existing.decisionMode) as DecisionMode,
      preferredZones: body.preferredZones ?? existing.preferredZones ?? [],
      preferredTimeBuckets:
        body.preferredTimeBuckets ?? existing.preferredTimeBuckets ?? [],
    };
    const updated = await updateDriver(updatedInput);
    if (!updated) {
      reply.code(500);
      return { error: "Failed to update driver" };
    }
    await ensureDimDriver(updated.id, {
      alias: updated.name,
      vehicleType: updated.vehicleType,
      targetHourlyRate: updated.targetRatePerHour,
      fuelCostPerUnit: updated.fuelCostPerUnit ?? null,
      maintenanceCostPerMile: updated.maintenanceCostPerMile ?? null,
    });
    return updated;
  });
}
