// src/components/AnalyticsDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import {
  type AnalyticsSummary,
  type AnalyticsZoneTimeRow,
  fetchSummary,
  fetchZoneTime,
  getDefaultDateRange,
} from "../lib/analyticsApi";

type AnalyticsDashboardProps = {
  driverId: string | null;
};

type LoadState = "idle" | "loading" | "ready" | "error";

function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return "$0.00";
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  return `${(value * 100).toFixed(1)}%`;
}

export function AnalyticsDashboard({ driverId }: AnalyticsDashboardProps) {
  const initialRange = useMemo(() => getDefaultDateRange(7), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [zoneRows, setZoneRows] = useState<AnalyticsZoneTimeRow[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverId) return;

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
          fetchSummary(driverId, filters),
          fetchZoneTime(driverId, filters),
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

  const hasData =
    summary != null && (summary.totalOrders ?? 0) > 0;

  const filteredZoneRows = useMemo(
    () => zoneRows,
    [zoneRows],
  );

  if (!driverId) {
    return (
      <section className="analytics">
        <h2>Analytics</h2>
        <p>
          Set your driver ID in the Settings/Profile section to see analytics.
        </p>
      </section>
    );
  }

  return (
    <section className="analytics">
      <header className="analytics-header">
        <div>
          <h2>Analytics</h2>
          <p className="analytics-subtitle">
            Summary and zone/time breakdown for driver <code>{driverId}</code>
          </p>
        </div>

        <form
          className="analytics-filters"
          onSubmit={(e) => e.preventDefault()}
        >
          <label className="analytics-filter">
            <span>Start date</span>
            <input
              type="date"
              value={startDate ?? ""}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="analytics-filter">
            <span>End date</span>
            <input
              type="date"
              value={endDate ?? ""}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </form>
      </header>

      {state === "loading" && (
        <p className="analytics-status">Loading analytics…</p>
      )}

      {state === "error" && (
        <p className="analytics-status analytics-status-error">
          Failed to load analytics: {error}
        </p>
      )}

      {state === "ready" && !hasData && (
        <p className="analytics-status">
          No analytics yet for this driver and date range.
        </p>
      )}

      {state === "ready" && hasData && summary && (
        <>
          <div className="analytics-summary-grid">
            <div className="analytics-card">
              <div className="analytics-card-label">Total orders</div>
              <div className="analytics-card-value">
                {summary.totalOrders}
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-label">Acceptance rate</div>
              <div className="analytics-card-value">
                {formatPercent(summary.acceptanceRate)}
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-label">Effective $/hr</div>
              <div className="analytics-card-value">
                {formatCurrency(summary.effectiveHourlyRate)}
              </div>
            </div>
            <div className="analytics-card">
              <div className="analytics-card-label">Dead miles (est.)</div>
              <div className="analytics-card-value">
                {summary.deadMilesEstimate.toFixed(1)}
              </div>
            </div>
          </div>

          <section className="analytics-table-section">
            <h3>By date, time of day, and zone</h3>
            {filteredZoneRows.length === 0 ? (
              <p>No zone/time breakdown yet.</p>
            ) : (
              <div className="analytics-table-wrapper">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time of day</th>
                      <th>Zone</th>
                      <th>Orders</th>
                      <th>Accepted</th>
                      <th>Acceptance %</th>
                      <th>Total earnings</th>
                      <th>Effective $/hr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredZoneRows.map((row) => (
                      <tr
                        key={`${row.date}-${row.timeOfDayBucket}-${row.zoneName}`}
                      >
                        <td>{row.date}</td>
                        <td>{row.timeOfDayBucket}</td>
                        <td>{row.zoneName}</td>
                        <td>{row.totalOrders}</td>
                        <td>{row.acceptedOrders}</td>
                        <td>{formatPercent(row.acceptanceRate)}</td>
                        <td>{formatCurrency(row.totalEarnings)}</td>
                        <td>{formatCurrency(row.effectiveHourlyRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
