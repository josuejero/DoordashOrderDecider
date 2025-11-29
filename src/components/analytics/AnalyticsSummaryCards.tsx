// src/components/analytics/AnalyticsSummaryCards.tsx
import type { AnalyticsSummary } from "../../lib/analyticsApi";
import { formatCurrency, formatPercent } from "../../lib/formatters";

type AnalyticsSummaryCardsProps = {
  summary: AnalyticsSummary;
};

export function AnalyticsSummaryCards({ summary }: AnalyticsSummaryCardsProps) {
  return (
    <div className="analytics-summary-grid">
      {/* Total orders (nice extra, even though the spec doesn't strictly require it) */}
      <div className="analytics-card">
        <div className="analytics-card-label">Total orders</div>
        <div className="analytics-card-value">
          {summary.totalOrders}
        </div>
      </div>

      {/* Acceptance rate */}
      <div className="analytics-card">
        <div className="analytics-card-label">Acceptance rate</div>
        <div className="analytics-card-value">
          {formatPercent(summary.acceptanceRate)}
        </div>
      </div>

      {/* Total earnings – this is what the test and Phase 2 spec expect */}
      <div className="analytics-card">
        <div className="analytics-card-label">Total earnings</div>
        <div className="analytics-card-value">
          {formatCurrency(summary.totalEarnings)}
        </div>
      </div>

      {/* Effective hourly rate – rename so /Effective hourly/i matches */}
      <div className="analytics-card">
        <div className="analytics-card-label">Effective hourly rate</div>
        <div className="analytics-card-value">
          {formatCurrency(summary.effectiveHourlyRate)}
        </div>
      </div>

      {/* Dead miles estimate */}
      <div className="analytics-card">
        <div className="analytics-card-label">Dead miles (est.)</div>
        <div className="analytics-card-value">
          {summary.deadMilesEstimate.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
