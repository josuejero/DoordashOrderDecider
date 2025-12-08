import { beforeEach, describe, expect, it } from "vitest";
import {
  saveHistoryToStorage,
  type HistoryItem,
} from "../lib/decisionHistory";
import {
  buildLocalHistoryPage,
  mapLocalHistory,
} from "../lib/historyViewModel";

function makeHistoryItem(
  id: string,
  opts: Partial<HistoryItem> = {},
): HistoryItem {
  const base: HistoryItem = {
    id,
    decidedAtIso: "2025-01-02T10:00:00.000Z",
    recommendedAccept: true,
    accept: true,
    payout: 10,
    miles: null,
    costPerMile: null,
    bufferMinutes: 0,
    netPayout: 10,
    requiredDollars: 8,
    projectedGrossPerHour: 20,
    projectedNetPerHour: 18,
    explanation: "test",
    pickupStoreType: null,
    pickupLocation: null,
    dropoffZone: null,
  };

  return { ...base, ...opts };
}

describe("history view model helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("maps local history items to rows with a local source flag", () => {
    const item = makeHistoryItem("one", { accept: false });
    const rows = mapLocalHistory([item]);

    expect(rows[0].id).toBe("one");
    expect(rows[0].finalDecision).toBe("REJECT");
    expect(rows[0].source).toBe("local");
  });

  it("filters by decision and date inclusively when building local pages", () => {
    const items: HistoryItem[] = [
      makeHistoryItem("acc-1", { decidedAtIso: "2025-01-02T10:00:00.000Z" }),
      makeHistoryItem("rej-1", {
        decidedAtIso: "2025-01-03T10:00:00.000Z",
        accept: false,
        recommendedAccept: false,
      }),
      makeHistoryItem("acc-2", { decidedAtIso: "2025-01-04T10:00:00.000Z" }),
    ];

    saveHistoryToStorage(items);

    const page = buildLocalHistoryPage(
      {
        decision: "accepted",
        startDate: "2025-01-03",
        endDate: "2025-01-04",
      },
      1,
      10,
    );

    expect(page.totalRecords).toBe(1);
    expect(page.records[0].id).toBe("acc-2");
    expect(page.records[0].source).toBe("local");
  });
});
