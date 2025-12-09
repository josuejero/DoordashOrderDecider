import type { AnalyticsZoneTimeRow } from "../../lib/analyticsApi";
import { formatCurrency, formatPercent } from "../../lib/formatters";
type AnalyticsZoneTableProps = {
  rows: AnalyticsZoneTimeRow[];
};
export function AnalyticsZoneTable({ rows }: AnalyticsZoneTableProps) {
  if (rows.length === 0) {
    return <p>No zone/time breakdown yet.</p>;
  }
  return (
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
          {rows.map((row) => (
            <tr key={`${row.date}-${row.timeOfDayBucket}-${row.zoneName}`}>
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
  );
}
