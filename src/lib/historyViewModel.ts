import { loadHistoryFromStorage, type HistoryItem } from "./decisionHistory";
import type { HistoryApiRecord, HistoryPageResponse } from "./historyApi";
import { paginateHistory, type HistoryDecisionFilter } from "./historyFilters";
export type HistoryRow = HistoryApiRecord & {
  source: "remote" | "local";
};
export type HistoryFilterState = {
  decision: HistoryDecisionFilter;
  startDate?: string;
  endDate?: string;
};
function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}
export function mapLocalHistory(items: HistoryItem[]): HistoryRow[] {
  return items.map((item) => ({
    id: item.id,
    orderId: item.id,
    driverId: "local",
    accept: item.accept,
    netPayout: item.netPayout,
    requiredDollars: item.requiredDollars,
    projectedGrossPerHour: item.projectedGrossPerHour,
    projectedNetPerHour: item.projectedNetPerHour,
    finishISO: null,
    createdAt: item.decidedAtIso,
    payout: item.payout,
    miles: item.miles,
    estimatedMinutes: null,
    zoneName: item.dropoffZone ?? null,
    recommendedDecision: item.recommendedAccept ? "ACCEPT" : "REJECT",
    finalDecision: item.accept ? "ACCEPT" : "REJECT",
    source: "local",
  }));
}
function filterRows(
  rows: HistoryRow[],
  filters: HistoryFilterState,
): HistoryRow[] {
  const start = normalizeDate(filters.startDate);
  const end = normalizeDate(filters.endDate);
  return rows.filter((row) => {
    const day = (row.createdAt ?? "").slice(0, 10);
    const finalDecision =
      row.finalDecision ?? (row.accept ? "ACCEPT" : "REJECT");
    if (start && day < start) return false;
    if (end && day > end) return false;
    if (filters.decision === "accepted") {
      if (finalDecision !== "ACCEPT") return false;
    }
    if (filters.decision === "rejected") {
      if (finalDecision !== "REJECT") return false;
    }
    return true;
  });
}
export function buildLocalHistoryPage(
  filters: HistoryFilterState,
  page: number,
  perPage: number,
): HistoryPageResponse<HistoryRow> {
  const raw = loadHistoryFromStorage();
  const rows = mapLocalHistory(raw);
  const filtered = filterRows(rows, filters);
  const paged = paginateHistory(filtered, page, perPage);
  return {
    records: paged.items,
    page: paged.page,
    perPage: paged.perPage,
    totalPages: paged.totalPages,
    totalRecords: paged.totalItems,
  };
}
