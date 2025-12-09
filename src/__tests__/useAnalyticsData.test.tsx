import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnalyticsData } from "../hooks/useAnalyticsData";
import * as analyticsApi from "../lib/analyticsApi";
describe("useAnalyticsData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("loads summary + zone rows and marks the hook ready", async () => {
    vi.spyOn(analyticsApi, "getDefaultDateRange").mockReturnValue({
      startDate: "2025-01-01",
      endDate: "2025-01-07",
    });
    vi.spyOn(analyticsApi, "fetchSummary").mockResolvedValue({
      driverId: "driver-1",
      totalOrders: 2,
      acceptedOrders: 2,
      rejectedOrders: 0,
      acceptanceRate: 1,
      totalEarnings: 40,
      totalMiles: 10,
      totalMinutes: 60,
      deadMilesEstimate: 0,
      effectiveHourlyRate: 40,
    });
    vi.spyOn(analyticsApi, "fetchZoneTime").mockResolvedValue([
      {
        driverId: "driver-1",
        date: "2025-01-01",
        timeOfDayBucket: "morning",
        zoneName: "Z1",
        totalOrders: 2,
        acceptedOrders: 2,
        rejectedOrders: 0,
        acceptanceRate: 1,
        totalEarnings: 40,
        effectiveHourlyRate: 40,
      },
    ]);
    const { result } = renderHook(() =>
      useAnalyticsData({ driverId: "driver-1" }),
    );
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(result.current.hasData).toBe(true);
    expect(result.current.summary?.driverId).toBe("driver-1");
    expect(result.current.zoneRows).toHaveLength(1);
    act(() => {
      result.current.setStartDate("");
      result.current.setEndDate("");
    });
    await waitFor(() =>
      expect(analyticsApi.fetchSummary).toHaveBeenLastCalledWith(
        "driver-1",
        {},
      ),
    );
  });
  it("surfaces errors from the analytics endpoints", async () => {
    vi.spyOn(analyticsApi, "getDefaultDateRange").mockReturnValue({
      startDate: "2025-01-01",
      endDate: "2025-01-07",
    });
    vi.spyOn(analyticsApi, "fetchSummary").mockRejectedValue(
      new Error("summary boom"),
    );
    vi.spyOn(analyticsApi, "fetchZoneTime").mockResolvedValue([]);
    const { result } = renderHook(() =>
      useAnalyticsData({ driverId: "driver-1" }),
    );
    await waitFor(() => expect(result.current.state).toBe("error"));
    expect(result.current.error).toMatch(/summary boom/);
  });
  it("no-ops when driverId is null", async () => {
    const fetchSummarySpy = vi.spyOn(analyticsApi, "fetchSummary");
    const fetchZoneTimeSpy = vi.spyOn(analyticsApi, "fetchZoneTime");
    const { result } = renderHook(() => useAnalyticsData({ driverId: null }));
    expect(result.current.state).toBe("idle");
    expect(fetchSummarySpy).not.toHaveBeenCalled();
    expect(fetchZoneTimeSpy).not.toHaveBeenCalled();
  });
  it("cancels state updates if unmounted mid-request", async () => {
    const deferred = () => {
      let resolve: (value: any) => void;
      const promise = new Promise<any>((res) => {
        resolve = res;
      });
      return { promise, resolve: resolve! };
    };
    const summaryDeferred = deferred();
    const zoneDeferred = deferred();
    vi.spyOn(analyticsApi, "fetchSummary").mockReturnValue(
      summaryDeferred.promise,
    );
    vi.spyOn(analyticsApi, "fetchZoneTime").mockReturnValue(
      zoneDeferred.promise,
    );
    const { unmount } = renderHook(() =>
      useAnalyticsData({ driverId: "driver-1" }),
    );
    unmount();
    summaryDeferred.resolve({
      driverId: "driver-1",
      totalOrders: 0,
      acceptedOrders: 0,
      rejectedOrders: 0,
      acceptanceRate: 0,
      totalEarnings: 0,
      totalMiles: 0,
      totalMinutes: 0,
      deadMilesEstimate: 0,
      effectiveHourlyRate: 0,
    });
    zoneDeferred.resolve([]);
    await Promise.resolve();
    expect(analyticsApi.fetchSummary).toHaveBeenCalled();
  });
});
