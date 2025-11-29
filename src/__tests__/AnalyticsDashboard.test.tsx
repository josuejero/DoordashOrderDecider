import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsDashboard } from "../components/AnalyticsDashboard";
import type {
  AnalyticsSummary,
  AnalyticsZoneTimeRow,
} from "../lib/analyticsApi";

const fetchSummaryMock = vi.fn<
  (
    driverId: string,
    filters: { startDate?: string; endDate?: string },
  ) => Promise<AnalyticsSummary>
>();

const fetchZoneTimeMock = vi.fn<
  (
    driverId: string,
    filters: { startDate?: string; endDate?: string },
  ) => Promise<AnalyticsZoneTimeRow[]>
>();

vi.mock("../lib/analyticsApi", async () => {
  const actual = await vi.importActual<typeof import("../lib/analyticsApi")>(
    "../lib/analyticsApi",
  );

  return {
    ...actual,
    // Stabilize the default range so tests are deterministic
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

const DRIVER_ID = "00000000-0000-0000-0000-000000000001";

function makeSummary(
  overrides: Partial<AnalyticsSummary> = {},
): AnalyticsSummary {
  const base: AnalyticsSummary = {
    driverId: DRIVER_ID,
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
  };

  return { ...base, ...overrides };
}

function makeZoneRow(
  overrides: Partial<AnalyticsZoneTimeRow> = {},
): AnalyticsZoneTimeRow {
  const base: AnalyticsZoneTimeRow = {
    driverId: DRIVER_ID,
    date: "2025-01-01",
    timeOfDayBucket: "morning",
    zoneName: "Zone A",
    totalOrders: 10,
    acceptedOrders: 8,
    rejectedOrders: 2,
    acceptanceRate: 0.8,
    totalEarnings: 150,
    effectiveHourlyRate: 30,
  };

  return { ...base, ...overrides };
}

describe("AnalyticsDashboard", () => {
  beforeEach(() => {
    fetchSummaryMock.mockReset();
    fetchZoneTimeMock.mockReset();
  });

  it("shows message when driverId is missing", () => {
    render(<AnalyticsDashboard driverId={null} />);

    expect(
      screen.getByText(
        /set your driver id in the settings\/profile section to see analytics/i,
      ),
    ).toBeTruthy();
  });

  it("renders summary metrics and zone table from API data", async () => {
    fetchSummaryMock.mockResolvedValue(
      makeSummary({
        totalOrders: 10,
        acceptedOrders: 8,
        rejectedOrders: 2,
        acceptanceRate: 0.8,
        totalEarnings: 150,
        totalMiles: 50,
        totalMinutes: 300,
        deadMilesEstimate: 5,
        effectiveHourlyRate: 30,
      }),
    );

    fetchZoneTimeMock.mockResolvedValue([
      makeZoneRow({
        zoneName: "Zone A",
        timeOfDayBucket: "morning",
        totalOrders: 10,
        acceptedOrders: 8,
        rejectedOrders: 2,
        acceptanceRate: 0.8,
        totalEarnings: 150,
        effectiveHourlyRate: 30,
      }),
    ]);

    render(<AnalyticsDashboard driverId={DRIVER_ID} />);

    // Loading state appears immediately
    expect(screen.getByText(/loading analytics/i)).toBeTruthy();

    // Wait for summary cards to render
    await waitFor(() =>
      expect(screen.getByText(/total orders/i)).toBeTruthy(),
    );

    // The hook should have called the API with the default date range
    expect(fetchSummaryMock).toHaveBeenCalledWith(DRIVER_ID, {
      startDate: "2025-01-01",
      endDate: "2025-01-07",
    });
    expect(fetchZoneTimeMock).toHaveBeenCalledWith(DRIVER_ID, {
      startDate: "2025-01-01",
      endDate: "2025-01-07",
    });

    // Header shows driver id
    expect(screen.getByText("Analytics")).toBeTruthy();

    // Subtitle text (excluding the driver id)
    expect(
      screen.getByText(/Summary and zone\/time breakdown for driver/i),
    ).toBeTruthy();

    // Driver id is rendered (inside the <code> tag)
    expect(screen.getByText(DRIVER_ID)).toBeTruthy();

    // Summary metric cards — total orders and acceptance rate
    const totalOrdersLabel = screen.getByText(/total orders/i);
    const totalOrdersCard = totalOrdersLabel.closest(
      ".analytics-card",
    ) as HTMLElement | null;

    expect(totalOrdersCard).not.toBeNull();
    expect(
      within(totalOrdersCard as HTMLElement).getByText("10"),
    ).toBeTruthy();

    const acceptanceLabel = screen.getByText(/acceptance rate/i);
    const acceptanceCard = acceptanceLabel.closest(
      ".analytics-card",
    ) as HTMLElement | null;

    expect(acceptanceCard).not.toBeNull();
    expect(
      within(acceptanceCard as HTMLElement).getByText(/80\.0%/i),
    ).toBeTruthy();

    // Zone/time table row
    expect(screen.getByText("Zone A")).toBeTruthy();
    expect(screen.getByText("morning")).toBeTruthy();
  });

  it("shows 'no analytics yet' state when API returns zero orders", async () => {
    fetchSummaryMock.mockResolvedValue(
      makeSummary({
        totalOrders: 0,
        acceptedOrders: 0,
        rejectedOrders: 0,
        acceptanceRate: 0,
        totalEarnings: 0,
        totalMiles: 0,
        totalMinutes: 0,
        deadMilesEstimate: 0,
        effectiveHourlyRate: 0,
      }),
    );

    fetchZoneTimeMock.mockResolvedValue([]);

    render(<AnalyticsDashboard driverId={DRIVER_ID} />);

    await waitFor(() =>
      expect(
        screen.getByText(
          /no analytics yet for this driver and date range/i,
        ),
      ).toBeTruthy(),
    );
  });

  it("renders an error state when analytics API throws an Error", async () => {
    fetchSummaryMock.mockRejectedValueOnce(new Error("summary boom"));
    fetchZoneTimeMock.mockResolvedValueOnce([]);

    render(<AnalyticsDashboard driverId={DRIVER_ID} />);

    await waitFor(() =>
      expect(
        screen.getByText(/failed to load analytics:/i),
      ).toBeTruthy(),
    );

    expect(
      screen.getByText(/failed to load analytics: summary boom/i),
    ).toBeTruthy();
  });

  it("shows a generic error when analytics API throws a non-Error value", async () => {
    fetchSummaryMock.mockRejectedValueOnce("totally broken");
    fetchZoneTimeMock.mockResolvedValueOnce([]);

    render(<AnalyticsDashboard driverId={DRIVER_ID} />);

    await waitFor(() =>
      expect(
        screen.getByText(/unknown error loading analytics/i),
      ).toBeTruthy(),
    );
  });
});
