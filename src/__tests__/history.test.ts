import { describe, expect, test } from "vitest";
import {
  appendHistory,
  loadHistory,
  type HistoryRecord,
} from "../lib/history";

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
