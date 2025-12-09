import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  appendHistory,
  enqueueForSync,
  enqueueOfflineEvent,
  getPendingEvents,
  installOnlineSync,
  loadHistory,
  setPendingEvents,
  type HistoryRecord,
  type OfflineEvent,
} from "../lib/history";
import { filterHistory, paginateHistory } from "../lib/historyFilters";
const HISTORY_KEY = "doordash-decider:v1:history";
const QUEUE_KEY = "doordash-decider:v1:queue";
const PENDING_KEY = "dd_pending_events_v1";
function makeHistoryRecord(
  overrides: Partial<HistoryRecord> = {},
): HistoryRecord {
  const base: HistoryRecord = {
    id: "base",
    createdAt: "2025-01-01T12:00:00.000Z",
    driverId: undefined,
    input: {
      targetRatePerHour: 25,
      shiftStartHHMM: "18:00",
      earnedSoFar: 0,
      offerPayout: 10,
      finishHHMM: "19:00",
    },
    result: {
      netPayout: 10,
      accept: true,
      requiredDollars: 5,
      projectedGrossPerHour: 10,
      projectedNetPerHour: 10,
    },
    reasonCode: "TEST" as any,
    reasonText: "",
    syncStatus: "pending",
  };
  return {
    ...base,
    ...overrides,
    input: { ...base.input, ...overrides.input },
    result: { ...base.result, ...overrides.result },
  };
}
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});
describe("history storage", () => {
  test("appendHistory appends records, caps at 50, newest first", () => {
    const nowIso = new Date().toISOString();
    for (let i = 0; i < 60; i++) {
      appendHistory(
        makeHistoryRecord({
          id: String(i),
          createdAt: nowIso,
        }),
      );
    }
    const all = loadHistory();
    expect(all.length).toBe(50);
    expect(all[0].id).toBe("59");
    expect(all[49].id).toBe("10");
  });
  test("loadHistory returns [] when nothing is stored", () => {
    expect(loadHistory()).toEqual([]);
  });
  test("loadHistory returns [] when stored JSON is invalid", () => {
    localStorage.setItem(HISTORY_KEY, "not-json");
    expect(loadHistory()).toEqual([]);
  });
  test("loadHistory returns [] when stored JSON is not an array", () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ not: "an array" }));
    expect(loadHistory()).toEqual([]);
  });
  test("history helpers no-op when window is undefined", () => {
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = undefined;
    expect(loadHistory()).toEqual([]);
    expect(() =>
      appendHistory(makeHistoryRecord({ id: "noop" })),
    ).not.toThrow();
    expect(() =>
      enqueueForSync(makeHistoryRecord({ id: "noop" })),
    ).not.toThrow();
    expect(() => installOnlineSync("http://example.test")).not.toThrow();
    (globalThis as any).window = originalWindow;
  });
});
describe("history filters and pagination", () => {
  test("filters by decision accepted/rejected", () => {
    const records: HistoryRecord[] = [
      makeHistoryRecord({
        id: "a1",
        result: {
          accept: true,
          netPayout: 10,
          requiredDollars: 5,
          projectedGrossPerHour: 20,
          projectedNetPerHour: 18,
        },
      }),
      makeHistoryRecord({
        id: "r1",
        result: {
          accept: false,
          netPayout: 10,
          requiredDollars: 5,
          projectedGrossPerHour: 20,
          projectedNetPerHour: 18,
        },
      }),
    ];
    const accepted = filterHistory(records, { decision: "accepted" });
    const rejected = filterHistory(records, { decision: "rejected" });
    expect(accepted.map((r) => r.id)).toEqual(["a1"]);
    expect(rejected.map((r) => r.id)).toEqual(["r1"]);
  });
  test("filters by date range (inclusive)", () => {
    const records: HistoryRecord[] = [
      makeHistoryRecord({
        id: "d1",
        createdAt: "2025-01-01T10:00:00.000Z",
      }),
      makeHistoryRecord({
        id: "d2",
        createdAt: "2025-01-10T10:00:00.000Z",
      }),
      makeHistoryRecord({
        id: "d3",
        createdAt: "2025-01-20T10:00:00.000Z",
      }),
    ];
    const filtered = filterHistory(records, {
      startDate: "2025-01-05",
      endDate: "2025-01-15",
    });
    expect(filtered.map((r) => r.id)).toEqual(["d2"]);
  });
  test("paginateHistory returns items for requested page and metadata", () => {
    const records: HistoryRecord[] = Array.from({ length: 25 }, (_, i) =>
      makeHistoryRecord({
        id: `rec-${i + 1}`,
      }),
    );
    const page1 = paginateHistory(records, 1, 10);
    const page3 = paginateHistory(records, 3, 10);
    expect(page1.items).toHaveLength(10);
    expect(page1.items[0].id).toBe("rec-1");
    expect(page3.items).toHaveLength(5);
    expect(page3.items[0].id).toBe("rec-21");
    expect(page3.totalPages).toBe(3);
    expect(page3.totalItems).toBe(25);
  });
});
describe("history sync queue", () => {
  test("enqueueForSync appends to queue even when stored data is invalid", () => {
    localStorage.setItem(QUEUE_KEY, "not-json");
    const record = makeHistoryRecord({ id: "q-1" });
    enqueueForSync(record);
    const raw = localStorage.getItem(QUEUE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("q-1");
  });
  test("installOnlineSync flushes queue when online and backend succeeds", async () => {
    const record = makeHistoryRecord({
      id: "success-1",
      driverId: "driver-1",
    });
    enqueueForSync(record);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as any);
    vi.stubGlobal("fetch", fetchMock);
    const originalOnLine = Object.getOwnPropertyDescriptor(
      window.navigator,
      "onLine",
    );
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    installOnlineSync("http://example.test");
    await vi.waitFor(() => {
      const raw = localStorage.getItem(QUEUE_KEY);
      expect(raw).toBe(JSON.stringify([]));
    });
    if (originalOnLine) {
      Object.defineProperty(window.navigator, "onLine", originalOnLine);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.test/api/orders/evaluate",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
  test("installOnlineSync marks failures and keeps them in queue", async () => {
    const record = makeHistoryRecord({
      id: "fail-1",
      driverId: "driver-1",
    });
    enqueueForSync(record);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as any);
    vi.stubGlobal("fetch", fetchMock);
    const originalOnLine = Object.getOwnPropertyDescriptor(
      window.navigator,
      "onLine",
    );
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    installOnlineSync("http://example.test");
    await vi.waitFor(() => {
      const raw = localStorage.getItem(QUEUE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("fail-1");
      expect(parsed[0].syncStatus).toBe("failed");
    });
    if (originalOnLine) {
      Object.defineProperty(window.navigator, "onLine", originalOnLine);
    }
  });
  test("installOnlineSync does nothing when offline", async () => {
    const record = makeHistoryRecord({
      id: "offline-1",
      driverId: "driver-1",
    });
    enqueueForSync(record);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const originalOnLine = Object.getOwnPropertyDescriptor(
      window.navigator,
      "onLine",
    );
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    installOnlineSync("http://example.test");
    await vi.waitFor(() => {
      const raw = localStorage.getItem(QUEUE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("offline-1");
    });
    if (originalOnLine) {
      Object.defineProperty(window.navigator, "onLine", originalOnLine);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
describe("offline events", () => {
  test("getPendingEvents returns [] when nothing stored or JSON is invalid", () => {
    localStorage.removeItem(PENDING_KEY);
    expect(getPendingEvents()).toEqual([]);
    localStorage.setItem(PENDING_KEY, "not-json");
    expect(getPendingEvents()).toEqual([]);
  });
  test("setPendingEvents and enqueueOfflineEvent append events", () => {
    const first: OfflineEvent = {
      id: "evt-1",
      type: "ORDER_DECIDED",
      payload: { foo: "bar" },
      createdAt: new Date().toISOString(),
    };
    setPendingEvents([first]);
    const second: OfflineEvent = {
      id: "evt-2",
      type: "ORDER_DECIDED",
      payload: { baz: 1 },
      createdAt: new Date().toISOString(),
    };
    enqueueOfflineEvent(second);
    const events = getPendingEvents();
    expect(events.map((e) => e.id)).toEqual(["evt-1", "evt-2"]);
  });
});
