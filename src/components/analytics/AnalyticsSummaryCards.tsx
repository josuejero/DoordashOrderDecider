import type { AnalyticsSummary } from "../../lib/analyticsApi";
import { formatCurrency, formatPercent } from "../../lib/formatters";
type AnalyticsSummaryCardsProps = {
  summary: AnalyticsSummary;
};
export function AnalyticsSummaryCards({ summary }: AnalyticsSummaryCardsProps) {
  return (
    <div className="analytics-summary-grid">
      <div className="analytics-card">
        <div className="analytics-card-label">Total orders</div>
        <div className="analytics-card-value">{summary.totalOrders}</div>
      </div>

      <div className="analytics-card">
        <div className="analytics-card-label">Acceptance rate</div>
        <div className="analytics-card-value">
          {formatPercent(summary.acceptanceRate)}
        </div>
      </div>

      <div className="analytics-card">
        <div className="analytics-card-label">Total earnings</div>
        <div className="analytics-card-value">
          {formatCurrency(summary.totalEarnings)}
        </div>
      </div>

      <div className="analytics-card">
        <div className="analytics-card-label">Effective hourly rate</div>
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
  );
}
