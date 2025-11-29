import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";

let app: ReturnType<typeof buildApp>;
let driverId: string;

beforeAll(async () => {
  app = buildApp();

  // 1. Create a driver that analytics can key off of
  const createRes = await app.inject({
    method: "POST",
    url: "/api/drivers",
    payload: {
      name: "Analytics Test Driver",
      targetRatePerHour: 25,
      vehicleType: "car",
      fuelCostPerUnit: 3.5,
      maintenanceCostPerMile: 0.2,
    },
  });

  expect(createRes.statusCode).toBe(201);
  const driver = createRes.json();
  driverId = driver.id;

  // 2. Evaluate a couple of orders for that driver so facts and dims are populated
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

    const body = res.json();

    expect(body.driverId).toBe(driverId);
    expect(typeof body.totalOrders).toBe("number");
    expect(body.totalOrders).toBeGreaterThanOrEqual(2);

    expect(typeof body.acceptedOrders).toBe("number");
    expect(typeof body.rejectedOrders).toBe("number");
    expect(typeof body.totalEarnings).toBe("number");
    expect(typeof body.effectiveHourlyRate).toBe("number");

    if (Array.isArray(body.days) && body.days.length > 0) {
      const day = body.days[0];
      expect(typeof day.day).toBe("string");
      expect(typeof day.totalOrders).toBe("number");
      expect(typeof day.acceptedOrders).toBe("number");
    }
  });

  it("GET /api/analytics/zone-time returns per-zone per-time-of-day rows", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/analytics/zone-time?driverId=${driverId}`,
    });

    expect(res.statusCode).toBe(200);

    const rows = res.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);

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
});
