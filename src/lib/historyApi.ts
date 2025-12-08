// src/lib/historyApi.ts
import type { HistoryDecisionFilter } from "./historyFilters";

export type HistoryApiRecord = {
  id: string;
  orderId: string;
  driverId: string;
  accept: boolean;
  netPayout: number;
  requiredDollars: number;
  projectedGrossPerHour: number;
  projectedNetPerHour: number;
  finishISO: string | null;
  createdAt: string;
  payout: number;
  miles: number | null;
  estimatedMinutes: number | null;
  zoneName: string | null;
  recommendedDecision: "ACCEPT" | "REJECT" | null;
  finalDecision: "ACCEPT" | "REJECT" | null;
};

export type HistoryPageResponse<TRecord = HistoryApiRecord> = {
  records: TRecord[];
  page: number;
  perPage: number;
  totalPages: number;
  totalRecords: number;
};

export type HistoryQueryParams = {
  driverId: string;
  limit: number;
  page: number;
  startDate?: string;
  endDate?: string;
  zone?: string;
  decision?: HistoryDecisionFilter;
};

/**
 * Fetches a page of decision history from the backend.
 */
export async function fetchHistoryPage(
  params: HistoryQueryParams,
  signal?: AbortSignal,
): Promise<HistoryPageResponse> {
  const search = new URLSearchParams();
  search.set("driverId", params.driverId);
  search.set("limit", String(params.limit));
  search.set("page", String(params.page));

  if (params.startDate) search.set("startDate", params.startDate);
  if (params.endDate) search.set("endDate", params.endDate);
  if (params.zone) search.set("zone", params.zone);

  if (params.decision && params.decision !== "all") {
    search.set("decision", params.decision);
  }

  const res = await fetch(`/api/orders/history?${search.toString()}`, {
    method: "GET",
    signal,
  });

  if (!res.ok) {
    throw new Error(`Failed to load history (${res.status} ${res.statusText})`);
  }

  return (await res.json()) as HistoryPageResponse;
}
