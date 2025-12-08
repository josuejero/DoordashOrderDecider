// server/__tests__/orders.test.ts
import { afterAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import * as analyticsDb from "../db/analytics.js";
import { createDriver } from "../db/drivers.js";
import { getDbPool } from "../db/pool.js";


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
      recommendedDecision: "ACCEPT" | "REJECT";
      finalDecision: "ACCEPT" | "REJECT";
    };

    expect(json.recommendedDecision).toBe("ACCEPT");
    expect(json.finalDecision).toBe("ACCEPT");
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
      page: number;
      perPage: number;
      totalPages: number;
      totalRecords: number;
    };

    expect(historyJson.records.length).toBeGreaterThan(0);
    expect(historyJson.records[0].orderId).toBe(json.orderId);
    expect(historyJson.page).toBe(1);
    expect(historyJson.totalRecords).toBeGreaterThan(0);
    expect(historyJson.totalPages).toBe(1);
  });

  it("captures final decision overrides", async () => {
    const driverRes = await app.inject({
      method: "POST",
      url: "/api/drivers",
      payload: {
        name: "Override Driver",
        targetRatePerHour: 25,
        vehicleType: "car",
      },
    });

    expect(driverRes.statusCode).toBe(201);
    const driver = driverRes.json() as { id: string };

    const res = await app.inject({
      method: "POST",
      url: "/api/orders/evaluate",
      payload: {
        driverId: driver.id,
        targetRatePerHour: 25,
        shiftStartHHMM: "18:00",
        earnedSoFar: 0,
        offerPayout: 40,
        finishHHMM: "19:00",
        finalDecision: "REJECT",
        pickupStoreType: "fast food",
        pickupLocation: "Test plaza",
        dropoffZone: "Downtown",
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json() as {
      orderId: string;
      recommendedDecision: "ACCEPT" | "REJECT";
      finalDecision: "ACCEPT" | "REJECT";
      decision: { accept: boolean };
    };

    expect(json.recommendedDecision).toBe("ACCEPT");
    expect(json.finalDecision).toBe("REJECT");
    expect(json.decision.accept).toBe(false);

    const historyRes = await app.inject({
      method: "GET",
      url: `/api/orders/history?driverId=${driver.id}&limit=1`,
    });

    expect(historyRes.statusCode).toBe(200);
    const historyJson = historyRes.json() as {
      records: Array<{ accept: boolean; orderId: string }>;
      totalRecords: number;
    };

    expect(historyJson.records[0].orderId).toBe(json.orderId);
    expect(historyJson.records[0].accept).toBe(false);
    expect(historyJson.totalRecords).toBeGreaterThan(0);
  });
});

describe("order history pagination", () => {
  it("paginates driver history with metadata", async () => {
    const driverRes = await app.inject({
      method: "POST",
      url: "/api/drivers",
      payload: {
        name: "History Pager",
        targetRatePerHour: 22,
        vehicleType: "car",
      },
    });

    expect(driverRes.statusCode).toBe(201);
    const { id: driverId } = driverRes.json() as { id: string };

    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/orders/evaluate",
        payload: {
          driverId,
          targetRatePerHour: 22,
          shiftStartHHMM: "10:00",
          earnedSoFar: 0,
          offerPayout: 15 + i,
          finishHHMM: "10:30",
        },
      });

      expect(res.statusCode).toBe(201);
    }

    const page1Res = await app.inject({
      method: "GET",
      url: `/api/orders/history?driverId=${driverId}&limit=2&page=1`,
    });

    const page1 = page1Res.json() as {
      records: Array<{ id: string }>;
      page: number;
      perPage: number;
      totalPages: number;
      totalRecords: number;
    };

    expect(page1.records.length).toBe(2);
    expect(page1.page).toBe(1);
    expect(page1.perPage).toBe(2);
    expect(page1.totalPages).toBeGreaterThanOrEqual(2);
    expect(page1.totalRecords).toBeGreaterThanOrEqual(3);

    const page2Res = await app.inject({
      method: "GET",
      url: `/api/orders/history?driverId=${driverId}&limit=2&page=2`,
    });

    const page2 = page2Res.json() as {
      records: Array<{ id: string }>;
      page: number;
    };

    expect(page2.records.length).toBeGreaterThan(0);
    expect(page2.page).toBe(2);
  });

  it("applies start/end date filters inclusively", async () => {
    const driverRes = await app.inject({
      method: "POST",
      url: "/api/drivers",
      payload: {
        name: "History Filter Driver",
        targetRatePerHour: 22,
        vehicleType: "car",
      },
    });

    expect(driverRes.statusCode).toBe(201);
    const { id: driverId } = driverRes.json() as { id: string };

    const first = await app.inject({
      method: "POST",
      url: "/api/orders/evaluate",
      payload: {
        driverId,
        targetRatePerHour: 22,
        shiftStartHHMM: "10:00",
        earnedSoFar: 0,
        offerPayout: 15,
        finishHHMM: "10:30",
      },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: "POST",
      url: "/api/orders/evaluate",
      payload: {
        driverId,
        targetRatePerHour: 22,
        shiftStartHHMM: "10:00",
        earnedSoFar: 0,
        offerPayout: 18,
        finishHHMM: "10:45",
      },
    });
    expect(second.statusCode).toBe(201);

    const { decisionId: firstDecisionId } = first.json() as {
      decisionId: string;
    };
    const { decisionId: secondDecisionId } = second.json() as {
      decisionId: string;
    };

    const pool = getDbPool();
    await pool.query(
      `UPDATE decisions SET created_at = $1 WHERE id = $2`,
      ["2025-01-10T12:00:00.000Z", firstDecisionId],
    );
    await pool.query(
      `UPDATE decisions SET created_at = $1 WHERE id = $2`,
      ["2025-01-12T18:00:00.000Z", secondDecisionId],
    );

    const filteredRes = await app.inject({
      method: "GET",
      url: `/api/orders/history?driverId=${driverId}&limit=10&startDate=2025-01-11&endDate=2025-01-12`,
    });
    expect(filteredRes.statusCode).toBe(200);

    const filtered = filteredRes.json() as {
      records: Array<{ id: string }>;
      totalRecords: number;
    };

    expect(filtered.totalRecords).toBe(1);
    expect(filtered.records[0].id).toBe(secondDecisionId);
  });

  it("rejects malformed history query params", async () => {
    const driverRes = await app.inject({
      method: "POST",
      url: "/api/drivers",
      payload: {
        name: "History Validation Driver",
        targetRatePerHour: 22,
        vehicleType: "car",
      },
    });

    expect(driverRes.statusCode).toBe(201);
    const { id: driverId } = driverRes.json() as { id: string };

    const badRes = await app.inject({
      method: "GET",
      url: `/api/orders/history?driverId=${driverId}&startDate=not-a-date`,
    });

    expect(badRes.statusCode).toBe(400);
  });
});

it("returns 201 even if analytics insertion fails", async () => {
  const app = buildApp();

  const driver = await createDriver({
    name: "Analytics Failure Driver",
    targetRatePerHour: 25,
    vehicleType: "car",
  });

  const spyOrder = vi
    .spyOn(analyticsDb, "insertFactOrder")
    .mockRejectedValue(new Error("boom inserting order fact"));

  const spyDecision = vi
    .spyOn(analyticsDb, "insertFactDecision")
    .mockRejectedValue(new Error("boom inserting decision fact"));

  const response = await app.inject({
    method: "POST",
    url: "/api/orders/evaluate",
    payload: {
      driverId: driver.id,
      targetRatePerHour: 25,
      shiftStartHHMM: "09:00",
      earnedSoFar: 0,
      offerPayout: 8,
      finishHHMM: "09:30",
      miles: 4,
      costPerMile: 0.5,
      bufferMinutes: 5,
    },
  });

  expect(response.statusCode).toBe(201);

  expect(spyOrder).toHaveBeenCalled();
  expect(spyDecision).toHaveBeenCalled();

  spyOrder.mockRestore();
  spyDecision.mockRestore();

  await app.close();
});
