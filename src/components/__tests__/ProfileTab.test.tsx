import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DecisionMode, VehicleType } from "../../lib/profile";
import { ProfileTab } from "../ProfileTab";
describe("ProfileTab decision mode", () => {
  const defaultProps = {
    driverName: "Test Driver",
    setDriverName: vi.fn(),
    vehicleType: "car" as VehicleType,
    setVehicleType: vi.fn(),
    preferredZones: [] as string[],
    setPreferredZones: vi.fn(),
    preferredTimeBuckets: [] as string[],
    setPreferredTimeBuckets: vi.fn(),
    targetRatePerHour: 25,
    setTargetRatePerHour: vi.fn(),
    costPerMile: 0.5,
    setCostPerMile: vi.fn(),
    earnedSoFar: 100,
    setEarnedSoFar: vi.fn(),
    decisionMode: "heuristic" as DecisionMode,
    setDecisionMode: vi.fn(),
    onSyncProfile: vi.fn(),
    isSyncingProfile: false,
    syncStatus: "idle" as const,
    syncMessage: null as string | null,
    modelMetadata: null as {
      version: string | null;
      mode: DecisionMode | null;
      updatedAt?: string;
    } | null,
  };
  it("renders both heuristic and hybrid_ml options", () => {
    render(<ProfileTab {...defaultProps} />);
    const options = screen.getAllByRole("option");
    const optionValues = options.map((option) => option.getAttribute("value"));
    expect(optionValues).toContain("heuristic");
    expect(optionValues).toContain("hybrid_ml");
  });
  it("calls setDecisionMode when selecting hybrid_ml", () => {
    const mockSetDecisionMode = vi.fn();
    render(
      <ProfileTab
        {...defaultProps}
        decisionMode="heuristic"
        setDecisionMode={mockSetDecisionMode}
      />,
    );
    const select = screen.getByLabelText("Decision mode");
    fireEvent.change(select, { target: { value: "hybrid_ml" } });
    expect(mockSetDecisionMode).toHaveBeenCalledWith("hybrid_ml");
  });
  it("parses preferred zones from comma separated input", () => {
    const mockSetPreferredZones = vi.fn();
    render(
      <ProfileTab
        {...defaultProps}
        preferredZones={[]}
        setPreferredZones={mockSetPreferredZones}
      />,
    );
    const input = screen.getByLabelText("Preferred zones");
    fireEvent.change(input, { target: { value: "Downtown, Airport" } });
    expect(mockSetPreferredZones).toHaveBeenCalledWith(["Downtown", "Airport"]);
  });
  it("invokes sync handler when clicking sync button", () => {
    const onSyncProfile = vi.fn();
    render(<ProfileTab {...defaultProps} onSyncProfile={onSyncProfile} />);
    fireEvent.click(screen.getByText("Sync profile to backend"));
    expect(onSyncProfile).toHaveBeenCalledTimes(1);
  });
  it("shows cached model metadata when provided", () => {
    const modelMetadata = {
      version: "v1-test",
      mode: "hybrid_ml" as DecisionMode,
      updatedAt: "2025-01-01T12:34:56.000Z",
    };
    render(<ProfileTab {...defaultProps} modelMetadata={modelMetadata} />);
    expect(screen.getByText(/Cached model version:/)).toBeInTheDocument();
    expect(screen.getByText("v1-test")).toBeInTheDocument();
  });
});
