import { useEffect, useMemo, useState } from "react";
import { fetchHistoryPage, type HistoryPageResponse } from "../lib/historyApi";
import type { HistoryDecisionFilter } from "../lib/historyFilters";
import {
  buildLocalHistoryPage,
  type HistoryFilterState,
  type HistoryRow,
} from "../lib/historyViewModel";
type HistoryViewProps = {
  driverId: string | null;
  isOnline: boolean;
};
type LoadState = "idle" | "loading" | "ready";
const PAGE_SIZE = 10;
function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return "\u2014";
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return "\u2014";
  return `$${num.toFixed(2)}`;
}
export function HistoryView({ driverId, isOnline }: HistoryViewProps) {
  const [decision, setDecision] = useState<HistoryDecisionFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoryPageResponse<HistoryRow> | null>(
    null,
  );
  const [source, setSource] = useState<HistoryRow["source"]>("local");
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    setPage(1);
  }, [decision, startDate, endDate]);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const filters: HistoryFilterState = {
      decision,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    async function load() {
      setState("loading");
      setError(null);
      const canHitApi = Boolean(driverId) && isOnline;
      if (canHitApi) {
        try {
          const remote = await fetchHistoryPage(
            {
              driverId: driverId!,
              limit: PAGE_SIZE,
              page,
              decision,
              startDate: filters.startDate,
              endDate: filters.endDate,
            },
            controller.signal,
          );
          if (cancelled) return;
          setData({
            ...remote,
            records: remote.records.map((rec) => ({
              ...rec,
              source: "remote",
            })),
          });
          setSource("remote");
          setState("ready");
          return;
        } catch (err) {
          if (cancelled) return;
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load history from server",
          );
        }
      }
      const localPage = buildLocalHistoryPage(filters, page, PAGE_SIZE);
      if (cancelled) return;
      setData(localPage);
      setSource("local");
      setState("ready");
    }
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [driverId, isOnline, page, decision, startDate, endDate, refreshTick]);
  const records = data?.records ?? [];
  const statusLine = useMemo(() => {
    if (!driverId) {
      return "Set your driver ID in Profile to sync history to the backend.";
    }
    if (!isOnline) {
      return "Offline: showing the local cache. New decisions will sync when back online.";
    }
    if (source === "local") {
      return "Server unavailable; falling back to local cache.";
    }
    return "Live DB history with pagination. Filters are applied on the server.";
  }, [driverId, isOnline, source]);
  const hasPagination =
    (data?.totalPages ?? 1) > 1 || (data?.totalRecords ?? 0) > PAGE_SIZE;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm shadow-sm ring-1 ring-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:ring-slate-800/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            History
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-300">
            {statusLine}
          </p>
          {error ? (
            <p className="text-[11px] text-amber-600">
              {error} — showing local cache instead.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className={`rounded-full px-3 py-1 font-semibold ${
              source === "remote"
                ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30"
                : "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30"
            }`}
          >
            {source === "remote" ? "DB-backed" : "Local cache"}
          </span>
          <span
            className={`rounded-full px-3 py-1 font-semibold ${
              isOnline
                ? "bg-slate-800 text-slate-100"
                : "bg-amber-500/20 text-amber-900"
            }`}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={state === "loading"}
            className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {state === "loading" ? "Loading\u2026" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
          <span>Decision</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-amber-300 dark:focus:ring-amber-200/50"
            value={decision}
            onChange={(e) =>
              setDecision(e.target.value as HistoryDecisionFilter)
            }
          >
            <option value="all">All</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
          <span>Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value.slice(0, 10))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-amber-300 dark:focus:ring-amber-200/50"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
          <span>End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value.slice(0, 10))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-amber-300 dark:focus:ring-amber-200/50"
          />
        </label>
      </div>

      {state === "loading" && (
        <p className="mt-4 text-sm text-slate-500">Loading history…</p>
      )}

      {state === "ready" && records.length === 0 && (
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          No history yet for this driver and filters. Log an offer from the
          Decider tab; when online, it will sync to the backend automatically.
        </p>
      )}

      {state === "ready" && records.length > 0 && (
        <>
          <div className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Decision</th>
                  <th className="px-3 py-2">Recommended</th>
                  <th className="px-3 py-2">Payout</th>
                  <th className="px-3 py-2">Net</th>
                  <th className="px-3 py-2">$/hr (net)</th>
                  <th className="px-3 py-2">Zone</th>
                  <th className="px-3 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => {
                  const finalDecision =
                    row.finalDecision ?? (row.accept ? "ACCEPT" : "REJECT");
                  const recommended =
                    row.recommendedDecision ??
                    (row.accept ? "ACCEPT" : "REJECT");
                  const override = finalDecision !== recommended;
                  const decidedAt = row.createdAt
                    ? new Date(row.createdAt).toLocaleString()
                    : "\u2014";
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-200/70 align-middle dark:border-slate-800/60"
                    >
                      <td className="px-3 py-2 text-[12px] text-slate-500 dark:text-slate-300">
                        {decidedAt}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              finalDecision === "ACCEPT"
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }
                          >
                            {finalDecision}
                          </span>
                          {override && (
                            <span className="rounded-full bg-amber-500/10 px-2 py-[2px] text-[10px] font-semibold text-amber-700">
                              override
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-300">
                        {recommended}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(row.payout)}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(row.netPayout)}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(row.projectedNetPerHour)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-300">
                        {row.zoneName ?? "\u2014"}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-300">
                        {row.source === "remote" ? "DB" : "Local"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasPagination && data ? (
            <div className="mt-3 flex flex-col items-start justify-between gap-2 text-xs text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center">
              <span>
                Page {data.page} of {data.totalPages} · {data.totalRecords}{" "}
                records
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-3 py-1 font-semibold transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:border-slate-600"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-3 py-1 font-semibold transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:border-slate-600"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={data.page >= data.totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
