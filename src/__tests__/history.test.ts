import { describe, expect, test } from "vitest";
import {
  appendHistory,
  loadHistory,
  type HistoryRecord,
} from "../lib/history";

import {
  filterHistory,
  paginateHistory,
} from "../lib/historyFilters";


describe("history", () => {
  test("appends records and caps at 50", () => {
    for (let i = 0; i < 60; i++) {
      const rec: HistoryRecord = {
        id: String(i),
        createdAt: new Date().toISOString(),
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
        reasonCode: "ACCEPT_ON_TARGET",
        reasonText: "",
        syncStatus: "pending",
      };
      appendHistory(rec);
    }
    const all = loadHistory();
    expect(all.length).toBeLessThanOrEqual(50);
  });
});

// Extra tests for filters and pagination

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

    const accepted = filterHistory(records, {
      decision: "accepted",
    });
    const rejected = filterHistory(records, {
      decision: "rejected",
    });

    expect(accepted.map((r) => r.id)).toEqual(["a1"]);
    expect(rejected.map((r) => r.id)).toEqual(["r1"]);
  });

  test("filters by date range", () => {
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

  test("paginates history records", () => {
    const records: HistoryRecord[] = Array.from(
      { length: 25 },
      (_, i) =>
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
