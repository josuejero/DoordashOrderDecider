import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import * as mlClient from "../clients/mlClient.js";
import { createDriver } from "../db/drivers.js";

vi.mock("../clients/mlClient.js", async () => {
  const actual = await vi.importActual("../clients/mlClient.js");
  return {
    ...actual,
    callMlPredict: vi.fn(),
    fetchMlMetadata: vi.fn(),
  };
});
let app: ReturnType<typeof buildApp>;
beforeAll(async () => {
  app = buildApp();
  await app.ready();
});
afterAll(async () => {
  await app.close();
  vi.restoreAllMocks();
});
describe("hybrid decision mode", () => {
  it("falls back to heuristics when ML is disabled", async () => {
    const driver = await createDriver({
      name: "Heuristic Only",
      targetRatePerHour: 25,
      vehicleType: "car",
      decisionMode: "heuristic",
    });
    const spy = vi.spyOn(mlClient, "callMlPredict");
    const res = await app.inject({
      method: "POST",
      url: "/api/orders/evaluate",
      payload: {
        driverId: driver.id,
        targetRatePerHour: 25,
        shiftStartHHMM: "10:00",
        earnedSoFar: 0,
        offerPayout: 10,
        finishHHMM: "10:30",
        miles: 3,
        costPerMile: 0.4,
        bufferMinutes: 5,
        platform: "doordash",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(spy).not.toHaveBeenCalled();
  });
  it("uses ML prediction when hybrid mode is enabled and ML succeeds", async () => {
    const driver = await createDriver({
      name: "Hybrid Driver",
      targetRatePerHour: 25,
      vehicleType: "car",
      decisionMode: "hybrid_ml",
    });
    const spy = vi.spyOn(mlClient, "callMlPredict").mockResolvedValue({
      predictedEffectiveHourlyRate: 40,
      confidence: 0.8,
      modelVersion: "test-model",
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/orders/evaluate",
      payload: {
        driverId: driver.id,
        targetRatePerHour: 25,
        shiftStartHHMM: "10:00",
        earnedSoFar: 0,
        offerPayout: 10,
        finishHHMM: "10:30",
        miles: 3,
        costPerMile: 0.4,
        bufferMinutes: 5,
        platform: "doordash",
      },
    });
    expect(res.statusCode).toBe(201);
    const json = res.json() as {
      mode: string;
      usedMl: boolean;
    };
    expect(json.mode).toBe("hybrid_ml");
    expect(json.usedMl).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
