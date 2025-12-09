import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHistoryPage } from "../lib/historyApi";
const originalFetch = globalThis.fetch;
describe("historyApi", () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });
  it("builds the query string with optional filters", async () => {
    const json = vi.fn().mockResolvedValue({
      records: [],
      page: 2,
      perPage: 25,
      totalPages: 1,
      totalRecords: 0,
    });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json,
      } as any);
    await fetchHistoryPage(
      {
        driverId: "driver-123",
        limit: 25,
        page: 2,
        startDate: "2025-01-01",
        endDate: "2025-01-07",
        zone: "Test Zone",
        decision: "accepted",
      },
      undefined,
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/orders/history?driverId=driver-123&limit=25&page=2&startDate=2025-01-01&endDate=2025-01-07&zone=Test+Zone&decision=accepted",
      { method: "GET", signal: undefined },
    );
  });
  it("omits the decision filter when set to all", async () => {
    const json = vi.fn().mockResolvedValue({
      records: [],
      page: 1,
      perPage: 10,
      totalPages: 0,
      totalRecords: 0,
    });
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json,
      } as any);
    await fetchHistoryPage({
      driverId: "driver-123",
      limit: 10,
      page: 1,
      decision: "all",
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/orders/history?driverId=driver-123&limit=10&page=1",
      expect.any(Object),
    );
  });
  it("throws on non-ok responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "boom",
      json: vi.fn(),
    } as any);
    await expect(
      fetchHistoryPage({
        driverId: "driver-123",
        limit: 5,
        page: 1,
      }),
    ).rejects.toThrow(/Failed to load history/);
  });
});
