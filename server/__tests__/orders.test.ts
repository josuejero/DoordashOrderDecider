// server/__tests__/orders.test.ts
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../app";

const app = buildApp();

afterAll(async () => {
  await app.close();
});

describe("orders routes", () => {
  it("evaluates an order and persists decision", async () => {
    // 1) Create a driver fixture via the API so we have a real UUID that exists in the DB
    const driverRes = await app.inject({
      method: "POST",
      url: "/api/drivers",
      payload: {
        name: "Test Driver",
        targetRatePerHour: 25,
        vehicleType: "car",
      },
    });

    expect(driverRes.statusCode).toBe(201);
    const driver = driverRes.json() as { id: string };
    const driverId = driver.id;

    // 2) Evaluate an order for that driver
    const res = await app.inject({
      method: "POST",
      url: "/api/orders/evaluate",
      payload: {
        driverId,
        targetRatePerHour: 25,
        shiftStartHHMM: "18:00",
        earnedSoFar: 0,
        offerPayout: 30,
        finishHHMM: "19:00",
      },
    });

    expect(res.statusCode).toBe(201);

    const json = res.json() as {
      orderId: string;
      decision: { accept: boolean; driverId: string; orderId: string };
    };

    expect(json.decision.accept).toBe(true);
    expect(json.decision.driverId).toBe(driverId);
    expect(json.orderId).toBeTruthy();

    // 3) Optionally confirm it shows up in history for that driver
    const historyRes = await app.inject({
      method: "GET",
      url: `/api/orders/history?driverId=${driverId}&limit=10`,
    });

    expect(historyRes.statusCode).toBe(200);
    const historyJson = historyRes.json() as {
      records: Array<{ orderId: string }>;
    };

    expect(historyJson.records.length).toBeGreaterThan(0);
    expect(historyJson.records[0].orderId).toBe(json.orderId);
  });
});
