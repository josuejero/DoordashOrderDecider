import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../db/pool.js", () => {
  const query = vi.fn();
  const client = { query, release: vi.fn() };
  const pool = {
    query,
    connect: vi.fn(async () => client),
    end: vi.fn(),
  };
  return {
    createDbPool: vi.fn(() => pool),
    getDbPool: vi.fn(() => pool),
  };
});

import { buildApp } from "../app.js";
import * as mlClient from "../clients/mlClient.js";

let app: ReturnType<typeof buildApp>;

describe("model routes", () => {
  beforeAll(() => {
    process.env.ENABLE_HYBRID_ML = "true";
    process.env.ML_SERVICE_URL = "http://ml.test";
    process.env.ML_SERVICE_TIMEOUT_MS = "150";
    app = buildApp();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
    process.env.ENABLE_HYBRID_ML = undefined;
  });

  it("GET /api/model/metadata returns model metadata", async () => {
    vi.spyOn(mlClient, "fetchMlMetadata").mockResolvedValue({
      modelVersion: "v-test",
      trainedAt: "2025-01-01T00:00:00Z",
      source: "mlflow",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/model/metadata",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { modelVersion: string };
    expect(body.modelVersion).toBe("v-test");
  });

  it("POST /api/model/predict proxies to ml service", async () => {
    const spy = vi.spyOn(mlClient, "callMlPredict").mockResolvedValue({
      predictedEffectiveHourlyRate: 42,
      confidence: 0.9,
      modelVersion: "v-test",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/model/predict",
      payload: {
        driverId: "7f2a3f57-1b36-4cf3-8e3d-6f0c6f7b4d0b",
        targetRatePerHour: 25,
        payout: 12,
        miles: 4,
        estimatedMinutes: 30,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json() as { predictedEffectiveHourlyRate: number };
    expect(body.predictedEffectiveHourlyRate).toBe(42);
    expect(spy).toHaveBeenCalled();
  });

  it("returns 503 when hybrid ML is disabled", async () => {
    process.env.ENABLE_HYBRID_ML = "false";

    const res = await app.inject({
      method: "POST",
      url: "/api/model/predict",
      payload: {
        driverId: "7f2a3f57-1b36-4cf3-8e3d-6f0c6f7b4d0b",
        targetRatePerHour: 25,
        payout: 12,
        miles: 4,
        estimatedMinutes: 30,
      },
    });

    expect(res.statusCode).toBe(503);
    process.env.ENABLE_HYBRID_ML = "true";
  });
});
