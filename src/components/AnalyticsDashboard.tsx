// src/components/AnalyticsDashboard.tsx
import { useAnalyticsData } from "../hooks/useAnalyticsData";
import { AnalyticsSummaryCards } from "./analytics/AnalyticsSummaryCards";
import { AnalyticsZoneTable } from "./analytics/AnalyticsZoneTable";

type AnalyticsDashboardProps = {
  driverId: string | null;
};

export function AnalyticsDashboard({ driverId }: AnalyticsDashboardProps) {
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    summary,
    zoneRows,
    state,
    error,
    hasData,
  } = useAnalyticsData({ driverId });

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
          <AnalyticsSummaryCards summary={summary} />

          <section className="analytics-table-section">
            <h3>By date, time of day, and zone</h3>
            <AnalyticsZoneTable rows={zoneRows} />
          </section>
        </>
      )}
    </section>
  );
}
