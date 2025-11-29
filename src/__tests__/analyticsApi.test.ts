// src/__tests__/analyticsApi.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchSummary,
  fetchZoneTime,
  getDefaultDateRange,
} from "../lib/analyticsApi";

const originalFetch = globalThis.fetch;

describe("analyticsApi helpers", () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("getDefaultDateRange returns last N days inclusive", () => {
    const { startDate, endDate } = getDefaultDateRange(7);
    expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("fetchSummary builds querystring and returns JSON", async () => {
    const json = vi.fn().mockResolvedValue({ totalOrders: 10 });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json } as any);

    const result = await fetchSummary("driver-1", {
      startDate: "2025-01-01",
      endDate: "2025-01-07",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/analytics/summary?driverId=driver-1&startDate=2025-01-01&endDate=2025-01-07",
    );
    expect(result.totalOrders).toBe(10);
  });

  it("fetchSummary throws when response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn(),
    } as any);

    await expect(fetchSummary("driver-1")).rejects.toThrow();
  });

  it("fetchZoneTime normalizes acceptanceRate and rejectedOrders", async () => {
    const json = vi.fn().mockResolvedValue([
      {
        zoneName: "Zone A",
        totalOrders: 5,
        acceptedOrders: 3,
        acceptanceRate: undefined,
        rejectedOrders: undefined,
      },
    ]);
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json } as any);

    const rows = await fetchZoneTime("driver-1", {});

    expect(rows[0].totalOrders).toBe(5);
    expect(rows[0].acceptedOrders).toBe(3);
    expect(rows[0].rejectedOrders).toBe(2);
    expect(rows[0].acceptanceRate).toBeCloseTo(3 / 5);
  });
});
