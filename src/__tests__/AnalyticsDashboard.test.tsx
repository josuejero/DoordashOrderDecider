// src/__tests__/AnalyticsDashboard.test.tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsDashboard } from "../components/AnalyticsDashboard";
import type {
  AnalyticsSummary,
  AnalyticsZoneTimeRow,
} from "../lib/analyticsApi";

const fetchSummaryMock = vi.fn<
  (driverId: string, filters: { startDate?: string; endDate?: string }) => Promise<AnalyticsSummary>
>();

const fetchZoneTimeMock = vi.fn<
  (driverId: string, filters: { startDate?: string; endDate?: string }) => Promise<AnalyticsZoneTimeRow[]>
>();


vi.mock("../lib/analyticsApi", async () => {
  const actual = await vi.importActual<
    typeof import("../lib/analyticsApi")
  >("../lib/analyticsApi");

  return {
    ...actual,
    getDefaultDateRange: () => ({
      startDate: "2025-01-01",
      endDate: "2025-01-07",
    }),
    fetchSummary: (...args: Parameters<typeof fetchSummaryMock>) =>
      fetchSummaryMock(...args),
    fetchZoneTime: (...args: Parameters<typeof fetchZoneTimeMock>) =>
      fetchZoneTimeMock(...args),
  };
});

describe("AnalyticsDashboard", () => {
  it("shows message when driverId is missing", () => {
    render(<AnalyticsDashboard driverId={null} />);

    expect(
      screen.getByText(/set your driver id/i),
    ).toBeTruthy();
  });

  it("renders summary metrics and table from API data", async () => {
    fetchSummaryMock.mockResolvedValue({
      driverId: "00000000-0000-0000-0000-000000000001",
      startDate: "2025-01-01",
      endDate: "2025-01-07",
      totalOrders: 10,
      acceptedOrders: 8,
      rejectedOrders: 2,
      acceptanceRate: 0.8,
      totalEarnings: 150,
      totalMiles: 50,
      totalMinutes: 300,
      deadMilesEstimate: 5,
      effectiveHourlyRate: 30,
      days: [],
    });

    fetchZoneTimeMock.mockResolvedValue([
      {
        driverId: "00000000-0000-0000-0000-000000000001",
        date: "2025-01-01",
        timeOfDayBucket: "evening",
        zoneName: "Zone A",
        totalOrders: 5,
        acceptedOrders: 4,
        rejectedOrders: 1,
        acceptanceRate: 0.8,
        totalEarnings: 75,
        effectiveHourlyRate: 30,
      },
    ]);

    render(
      <AnalyticsDashboard driverId="00000000-0000-0000-0000-000000000001" />,
    );

    // Loading state
    expect(
      screen.getByText(/loading analytics/i),
    ).toBeTruthy();

    // Wait for summary to appear
    await waitFor(() => {
      expect(
        screen.getByText(/total orders/i),
      ).toBeTruthy();
    });

    // Summary card values
    expect(screen.getByText("10")).toBeTruthy(); // total orders

    const acceptanceCard = screen
      .getByText(/acceptance rate/i)
      .closest(".analytics-card");
    expect(acceptanceCard).not.toBeNull();

    if (acceptanceCard) {
      const cardElement = acceptanceCard as HTMLElement;
      expect(
        within(cardElement).getByText(/80.0%/i),
      ).toBeTruthy();
    }


    // Table row
    expect(
      screen.getByText("Zone A"),
    ).toBeTruthy();
  });

  it("shows no data state when API returns 0 orders", async () => {
    fetchSummaryMock.mockResolvedValue({
      driverId: "driver-1",
      startDate: "2025-01-01",
      endDate: "2025-01-07",
      totalOrders: 0,
      acceptedOrders: 0,
      rejectedOrders: 0,
      acceptanceRate: 0,
      totalEarnings: 0,
      totalMiles: 0,
      totalMinutes: 0,
      deadMilesEstimate: 0,
      effectiveHourlyRate: 0,
      days: [],
    });

    fetchZoneTimeMock.mockResolvedValue([]);

    render(<AnalyticsDashboard driverId="driver-1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/no analytics yet/i),
      ).toBeTruthy();
    });
  });
});
