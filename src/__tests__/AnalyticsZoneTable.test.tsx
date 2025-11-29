import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsZoneTable } from "../components/analytics/AnalyticsZoneTable";
import type { AnalyticsZoneTimeRow } from "../lib/analyticsApi";
import { formatCurrency, formatPercent } from "../lib/formatters";

function makeRow(
  overrides: Partial<AnalyticsZoneTimeRow> = {},
): AnalyticsZoneTimeRow {
  const base: AnalyticsZoneTimeRow = {
    driverId: "driver-1",
    date: "2024-01-01",
    timeOfDayBucket: "morning",
    zoneName: "Downtown",
    totalOrders: 3,
    acceptedOrders: 2,
    rejectedOrders: 1,
    acceptanceRate: 2 / 3,
    totalEarnings: 45.67,
    effectiveHourlyRate: 24.5,
  };
  return { ...base, ...overrides };
}

describe("AnalyticsZoneTable", () => {
  it("renders an empty state when there are no rows", () => {
    render(<AnalyticsZoneTable rows={[]} />);

    expect(
      screen.getByText(/no zone\/time breakdown yet/i),
    ).toBeTruthy();
  });

  it("renders a table row for each zone and time bucket", () => {
    const rows = [
      makeRow(),
      makeRow({ zoneName: "Suburbs", timeOfDayBucket: "evening" }),
    ];

    render(<AnalyticsZoneTable rows={rows} />);

    const table = screen.getByRole("table");
    const allRows = within(table).getAllByRole("row");

    // table: 1 header row + 2 data rows
    expect(allRows.length).toBeGreaterThanOrEqual(3);

    const firstDataRow = allRows[1];
    const cells = within(firstDataRow).getAllByRole("cell");

    const row = rows[0];

    expect(cells[0]).toContain(row.date);
    expect(cells[1]).toContain(row.timeOfDayBucket);
    expect(cells[2]).toContain(row.zoneName);
    expect(cells[3]).toContain(String(row.totalOrders));
    expect(cells[4]).toContain(String(row.acceptedOrders));
    expect(cells[5]).toContain(formatPercent(row.acceptanceRate));
    expect(cells[6]).toContain(formatCurrency(row.totalEarnings));
    expect(cells[7]).toContain(
      formatCurrency(row.effectiveHourlyRate),
    );
  });
});
