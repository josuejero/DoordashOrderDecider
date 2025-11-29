import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalyticsSummaryCards } from "../components/analytics/AnalyticsSummaryCards";
import type { AnalyticsSummary } from "../lib/analyticsApi";
import { formatCurrency, formatPercent } from "../lib/formatters";

function makeSummary(overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary {
  const base: AnalyticsSummary = {
    driverId: "driver-1",
    startDate: "2024-01-01",
    endDate: "2024-01-07",
    totalOrders: 10,
    acceptedOrders: 8,
    rejectedOrders: 2,
    acceptanceRate: 0.8,
    totalEarnings: 123.45,
    totalMiles: 42,
    totalMinutes: 120,
    deadMilesEstimate: 5.5,
    effectiveHourlyRate: 30.12,
    days: [],
  };
  return { ...base, ...overrides };
}

describe("AnalyticsSummaryCards", () => {
  it("renders key summary metrics", () => {
    const summary = makeSummary();

    render(<AnalyticsSummaryCards summary={summary} />);

    expect(screen.getByText(/Total orders/i)).toBeTruthy();
    expect(screen.getByText(String(summary.totalOrders))).toBeTruthy();

    expect(screen.getByText(/Acceptance rate/i)).toBeTruthy();
    expect(
      screen.getByText(formatPercent(summary.acceptanceRate)),
    ).toBeTruthy();

    expect(screen.getByText(/Total earnings/i)).toBeTruthy();
    expect(
      screen.getByText(formatCurrency(summary.totalEarnings)),
    ).toBeTruthy();

    expect(screen.getByText(/Effective hourly/i)).toBeTruthy();
    expect(
      screen.getByText(formatCurrency(summary.effectiveHourlyRate)),
    ).toBeTruthy();
  });

  it("renders dead miles estimate with one decimal place", () => {
    const summary = makeSummary({ deadMilesEstimate: 12.3 });

    render(<AnalyticsSummaryCards summary={summary} />);

    expect(screen.getByText(/Dead miles \(est\.\)/i)).toBeTruthy();
    expect(
      screen.getByText(summary.deadMilesEstimate.toFixed(1)),
    ).toBeTruthy();
  });
});
