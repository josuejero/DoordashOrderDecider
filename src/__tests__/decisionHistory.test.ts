// src/__tests__/decisionHistory.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import {
  HISTORY_LIMIT,
  loadHistoryFromStorage,
  saveHistoryToStorage,
  type HistoryItem,
} from "../lib/decisionHistory";

function makeItem(i: number): HistoryItem {
  return {
    id: `id-${i}`,
    decidedAtIso: new Date(i * 1000).toISOString(),
    accept: i % 2 === 0,
    payout: i,
    miles: null,
    costPerMile: null,
    bufferMinutes: 0,
    netPayout: i,
    requiredDollars: i,
    projectedGrossPerHour: i,
    projectedNetPerHour: i,
    explanation: `exp-${i}`,
  };
}

describe("decisionHistory storage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns [] when nothing stored or JSON invalid", () => {
    expect(loadHistoryFromStorage()).toEqual([]);

    localStorage.setItem("doordash-decider:v1:history", "not-json");
    expect(loadHistoryFromStorage()).toEqual([]);
  });

  it("reads back items that were saved", () => {
    const items = [makeItem(1), makeItem(2)];
    saveHistoryToStorage(items);

    const loaded = loadHistoryFromStorage();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe("id-1");
  });

  it("enforces HISTORY_LIMIT when saving", () => {
    const many = Array.from({ length: HISTORY_LIMIT + 10 }, (_, i) => makeItem(i));
    saveHistoryToStorage(many);

    const loaded = loadHistoryFromStorage();
    expect(loaded).toHaveLength(HISTORY_LIMIT);
  });
});
