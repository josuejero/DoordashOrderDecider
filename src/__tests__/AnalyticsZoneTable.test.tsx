// src/__tests__/AnalyticsZoneTable.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsZoneTable } from "../components/analytics/AnalyticsZoneTable";
import type { AnalyticsZoneTimeRow } from "../lib/analyticsApi";
import { formatCurrency, formatPercent } from "../lib/formatters"; // Fixed from "../../lib/formatters"

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

    // Check table headers
    expect(screen.getByText("Date")).toBeTruthy();
    expect(screen.getByText("Time of day")).toBeTruthy();
    expect(screen.getByText("Zone")).toBeTruthy();
    
    // Check data is rendered - there are two rows with the same date
    const dateCells = screen.getAllByText("2024-01-01");
    expect(dateCells).toHaveLength(2);

    // Check time buckets are correct
    expect(screen.getByText("morning")).toBeTruthy();
    expect(screen.getByText("evening")).toBeTruthy();
    
    // Check zones are correct
    expect(screen.getByText("Downtown")).toBeTruthy();
    expect(screen.getByText("Suburbs")).toBeTruthy();
    
    // Check numeric values (these appear in both rows, so use getAllByText)
    const totalOrderCells = screen.getAllByText("3");
    const acceptedOrderCells = screen.getAllByText("2");
    expect(totalOrderCells).toHaveLength(2);
    expect(acceptedOrderCells).toHaveLength(2);
    
    // Check formatted values (also appear in both rows)
    const percentCells = screen.getAllByText(formatPercent(2/3));
    const earningsCells = screen.getAllByText(formatCurrency(45.67));
    const rateCells = screen.getAllByText(formatCurrency(24.5));
    expect(percentCells).toHaveLength(2);
    expect(earningsCells).toHaveLength(2);
    expect(rateCells).toHaveLength(2);
  });
});