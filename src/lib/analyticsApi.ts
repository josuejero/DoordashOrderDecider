export type AnalyticsSummaryDay = {
  day: string;
  totalOrders: number;
  acceptedOrders: number;
  rejectedOrders: number;
  totalEarnings: number;
  totalMiles: number;
  totalMinutes: number;
  deadMilesEstimate: number;
  effectiveHourlyRate: number;
};
export type AnalyticsSummary = {
  driverId: string;
  startDate?: string;
  endDate?: string;
  totalOrders: number;
  acceptedOrders: number;
  rejectedOrders: number;
  acceptanceRate: number;
  totalEarnings: number;
  totalMiles: number;
  totalMinutes: number;
  deadMilesEstimate: number;
  effectiveHourlyRate: number;
  days?: AnalyticsSummaryDay[];
};
export type AnalyticsZoneTimeRow = {
  driverId: string;
  date: string;
  timeOfDayBucket: string;
  zoneName: string;
  totalOrders: number;
  acceptedOrders: number;
  rejectedOrders: number;
  acceptanceRate: number;
  totalEarnings: number;
  effectiveHourlyRate: number;
};
export type AnalyticsFilters = {
  startDate?: string;
  endDate?: string;
};
const API_BASE = "/api/analytics";
function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
export function getDefaultDateRange(days = 7): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const toISODate = (d: Date) => d.toISOString().slice(0, 10);
  return {
    startDate: toISODate(start),
    endDate: toISODate(end),
  };
}
export async function fetchSummary(
  driverId: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsSummary> {
  if (!driverId) throw new Error("driverId is required");
  const query = buildQuery({
    driverId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  const data = await getJson<AnalyticsSummary>(`${API_BASE}/summary${query}`);
  const totalOrders = data.totalOrders ?? 0;
  const acceptedOrders = data.acceptedOrders ?? 0;
  const acceptanceRate =
    typeof data.acceptanceRate === "number"
      ? data.acceptanceRate
      : totalOrders > 0
        ? acceptedOrders / totalOrders
        : 0;
  return { ...data, totalOrders, acceptedOrders, acceptanceRate };
}
export async function fetchZoneTime(
  driverId: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsZoneTimeRow[]> {
  if (!driverId) throw new Error("driverId is required");
  const query = buildQuery({
    driverId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  const rows = await getJson<AnalyticsZoneTimeRow[]>(
    `${API_BASE}/zone-time${query}`,
  );
  return rows.map((row) => {
    const totalOrders = row.totalOrders ?? 0;
    const acceptedOrders = row.acceptedOrders ?? 0;
    const acceptanceRate =
      typeof row.acceptanceRate === "number"
        ? row.acceptanceRate
        : totalOrders > 0
          ? acceptedOrders / totalOrders
          : 0;
    const rejectedOrders =
      typeof row.rejectedOrders === "number"
        ? row.rejectedOrders
        : totalOrders - acceptedOrders;
    return {
      ...row,
      totalOrders,
      acceptedOrders,
      rejectedOrders,
      acceptanceRate,
    };
  });
}
