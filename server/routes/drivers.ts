// server/routes/drivers.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureDimDriver } from "../db/analytics.js";
import { createDriver, getDriverById, updateDriver } from "../db/drivers.js";

const DriverBody = z.object({
  name: z.string().min(1),
  targetRatePerHour: z.number().positive(),
  vehicleType: z.enum(["car", "bike", "scooter", "other"]),
  fuelCostPerUnit: z.number().nonnegative().nullable().optional(),
  maintenanceCostPerMile: z.number().nonnegative().nullable().optional(),
  decisionMode: z.enum(["heuristic", "hybrid_ml"]).default("heuristic"),
});

export function registerDriverRoutes(app: FastifyInstance) {
  app.post("/api/drivers", async (request, reply) => {
    const body = DriverBody.parse(request.body);
    const driver = await createDriver(body);

    // Phase 2: keep dim_driver in sync
    await ensureDimDriver(driver.id, {
      alias: driver.name,
      vehicleType: driver.vehicleType,
      targetHourlyRate: driver.targetRatePerHour,
      fuelCostPerUnit: driver.fuelCostPerUnit ?? null,
      maintenanceCostPerMile: driver.maintenanceCostPerMile ?? null,
    });

    reply.code(201);
    return driver;
  });

  app.get("/api/drivers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const driver = await getDriverById(id);
    if (!driver) {
      reply.code(404);
      return { error: "Driver not found" };
    }
    return driver;
  });

  app.patch("/api/drivers/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = DriverBody.partial().parse(request.body ?? {});
    const existing = await getDriverById(id);
    if (!existing) {
      reply.code(404);
      return { error: "Driver not found" };
    }

    const updated = await updateDriver({ ...existing, ...body });

    if (!updated) {
      // We *shouldn't* hit this in normal operation, but keep TS and runtime safe.
      reply.code(500);
      return { error: "Failed to update driver" };
    }

    // Keep dim_driver updated too
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
