import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
let app: ReturnType<typeof buildApp>;
let driverId: string;
let emptyDriverId: string;
beforeAll(async () => {
  app = buildApp();
  await app.ready();
  const createRes = await app.inject({
    method: "POST",
    url: "/api/drivers",
    payload: {
      name: "Analytics Test Driver",
      targetRatePerHour: 25,
      vehicleType: "car",
      fuelCostPerUnit: null,
      maintenanceCostPerMile: null,
    },
  });
  expect(createRes.statusCode).toBe(201);
  const created = createRes.json() as {
    id: string;
  };
  driverId = created.id;
  const emptyDriverRes = await app.inject({
    method: "POST",
    url: "/api/drivers",
    payload: {
      name: "No Analytics Driver",
      targetRatePerHour: 25,
      vehicleType: "car",
      fuelCostPerUnit: null,
      maintenanceCostPerMile: null,
    },
  });
  expect(emptyDriverRes.statusCode).toBe(201);
  const emptyCreated = emptyDriverRes.json() as {
    id: string;
  };
  emptyDriverId = emptyCreated.id;
  const baseOrderPayload = {
    driverId,
    platform: "doordash" as const,
    targetRatePerHour: 25,
    shiftStartHHMM: "09:00",
    earnedSoFar: 0,
    offerPayout: 20,
    finishHHMM: "10:00",
    miles: 10,
    costPerMile: 0.3,
    bufferMinutes: 5,
    zoneName: "Analytics Test Zone",
    zoneCity: "Test City",
    zoneRegion: "Test Region",
  };
  for (let i = 0; i < 2; i++) {
    const res = await app.inject({
      method: "POST",
      url: "/api/orders/evaluate",
      payload: baseOrderPayload,
    });
    expect(res.statusCode).toBe(201);
  }
});
afterAll(async () => {
  await app.close();
});
describe("analytics routes", () => {
  it("GET /api/analytics/summary returns an aggregated summary for the driver", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/analytics/summary?driverId=${driverId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      driverId: string;
      totalOrders: number;
      acceptedOrders: number;
      rejectedOrders: number;
      acceptanceRate: number;
      totalEarnings: number;
      totalMiles: number;
      totalMinutes: number;
      deadMilesEstimate: number;
      effectiveHourlyRate: number;
      days: unknown[];
    };
    expect(body.driverId).toBe(driverId);
    expect(typeof body.totalOrders).toBe("number");
    expect(body.totalOrders).toBeGreaterThanOrEqual(1);
    expect(typeof body.acceptedOrders).toBe("number");
    expect(body.acceptedOrders).toBeGreaterThanOrEqual(0);
    expect(typeof body.rejectedOrders).toBe("number");
    expect(body.rejectedOrders).toBeGreaterThanOrEqual(0);
    expect(typeof body.acceptanceRate).toBe("number");
    expect(body.acceptanceRate).toBeGreaterThanOrEqual(0);
    expect(body.acceptanceRate).toBeLessThanOrEqual(1);
    expect(typeof body.totalEarnings).toBe("number");
    expect(typeof body.totalMiles).toBe("number");
    expect(typeof body.totalMinutes).toBe("number");
    expect(typeof body.deadMilesEstimate).toBe("number");
    expect(typeof body.effectiveHourlyRate).toBe("number");
    expect(Array.isArray(body.days)).toBe(true);
    expect(body.days.length).toBeGreaterThanOrEqual(1);
  });
  it("GET /api/analytics/summary returns a zeroed summary when there are no analytics rows", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/analytics/summary?driverId=${emptyDriverId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      driverId: string;
      totalOrders: number;
      acceptedOrders: number;
      rejectedOrders: number;
      acceptanceRate: number;
      totalEarnings: number;
      totalMiles: number;
      totalMinutes: number;
      deadMilesEstimate: number;
      effectiveHourlyRate: number;
      days: unknown[];
    };
    expect(body.driverId).toBe(emptyDriverId);
    expect(body.totalOrders).toBe(0);
    expect(body.acceptedOrders).toBe(0);
    expect(body.rejectedOrders).toBe(0);
    expect(body.acceptanceRate).toBe(0);
    expect(body.totalEarnings).toBe(0);
    expect(body.totalMiles).toBe(0);
    expect(body.totalMinutes).toBe(0);
    expect(body.deadMilesEstimate).toBe(0);
    expect(body.effectiveHourlyRate).toBe(0);
    expect(Array.isArray(body.days)).toBe(true);
    expect(body.days.length).toBe(0);
  });
  it("GET /api/analytics/summary returns 400 when driverId is missing", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/analytics/summary",
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as {
      error: string;
    };
    expect(typeof body.error).toBe("string");
  });
  it("GET /api/analytics/zone-time returns a zone/time breakdown for the driver", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/analytics/zone-time?driverId=${driverId}`,
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json() as Array<{
      driverId: string;
      date: string;
      timeOfDayBucket: string;
      zoneName: string;
      totalOrders: number;
      acceptedOrders: number;
      rejectedOrders: number;
      acceptanceRate: number;
      totalEarnings: number;
      effectiveHourlyRate: number;
    }>;
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const row = rows[0];
    expect(row.driverId).toBe(driverId);
    expect(typeof row.date).toBe("string");
    expect(typeof row.timeOfDayBucket).toBe("string");
    expect(typeof row.zoneName).toBe("string");
    expect(typeof row.totalOrders).toBe("number");
    expect(typeof row.acceptedOrders).toBe("number");
    expect(typeof row.rejectedOrders).toBe("number");
    expect(typeof row.totalEarnings).toBe("number");
    expect(typeof row.effectiveHourlyRate).toBe("number");
  });
  it("GET /api/analytics/zone-time returns 400 when driverId is missing", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/analytics/zone-time",
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as {
      error: string;
    };
    expect(typeof body.error).toBe("string");
  });
});
