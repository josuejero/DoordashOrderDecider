import type { HistoryRecord } from "./history";
export type HistoryDecisionFilter = "all" | "accepted" | "rejected";
export type HistoryFilters = {
  decision?: "accepted" | "rejected";
  startDate?: string;
  endDate?: string;
};
export function filterHistory(
  records: HistoryRecord[],
  filters: HistoryFilters,
): HistoryRecord[] {
  const { decision, startDate, endDate } = filters;
  return records.filter((rec) => {
    const day = rec.createdAt.slice(0, 10);
    if (startDate && day < startDate) return false;
    if (endDate && day > endDate) return false;
    if (decision === "accepted" && !rec.result.accept) return false;
    if (decision === "rejected" && rec.result.accept) return false;
    return true;
  });
}
export type Paginated<T> = {
  items: T[];
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
};
export function paginateHistory<T>(
  items: T[],
  page: number,
  perPage: number,
): Paginated<T> {
  const totalItems = items.length;
  if (totalItems === 0) {
    return {
      items: [],
      page: 1,
      perPage,
      totalPages: 1,
      totalItems: 0,
    };
  }
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * perPage;
  const end = start + perPage;
  return {
    items: items.slice(start, end),
    page: safePage,
    perPage,
    totalPages,
    totalItems,
  };
}
