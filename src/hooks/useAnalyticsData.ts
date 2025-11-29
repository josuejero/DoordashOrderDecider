// src/hooks/useAnalyticsData.ts
import { useEffect, useMemo, useState } from "react";
import {
  type AnalyticsSummary,
  type AnalyticsZoneTimeRow,
  fetchSummary,
  fetchZoneTime,
  getDefaultDateRange,
} from "../lib/analyticsApi";

export type LoadState = "idle" | "loading" | "ready" | "error";

type UseAnalyticsDataArgs = {
  driverId: string | null;
};

export function useAnalyticsData({ driverId }: UseAnalyticsDataArgs) {
  const initialRange = useMemo(() => getDefaultDateRange(7), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [zoneRows, setZoneRows] = useState<AnalyticsZoneTimeRow[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverId) return;
    const activeDriverId = driverId; // now typed as string

    let cancelled = false;

    async function load() {
      setState("loading");
      setError(null);

      try {
        const filters =
          startDate || endDate
            ? { startDate, endDate }
            : {};

        const [s, z] = await Promise.all([
          fetchSummary(activeDriverId, filters),
          fetchZoneTime(activeDriverId, filters),
        ]);

        if (cancelled) return;

        setSummary(s);
        setZoneRows(z);
        setState("ready");
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        setError(
          err instanceof Error ? err.message : "Unknown error loading analytics",
        );
        setState("error");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [driverId, startDate, endDate]);


  const hasData = summary != null && (summary.totalOrders ?? 0) > 0;

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    summary,
    zoneRows,
    state,
    error,
    hasData,
  };
}
