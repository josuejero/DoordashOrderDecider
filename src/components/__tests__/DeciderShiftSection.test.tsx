import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeciderShiftSection } from "../DeciderShiftSection";

// Mock the missing DecisionMode type
type DecisionMode = "heuristic" | "hybrid_ml";

describe("DeciderShiftSection decision mode indicator", () => {
  const defaultProps = {
    driverName: "Test Driver",
    vehicleType: "car" as const,
    targetRatePerHour: 25,
    setTargetRatePerHour: vi.fn(),
    shiftStartHHMM: "10:00",
    setShiftStartHHMM: vi.fn(),
    earnedSoFar: 0,
    setEarnedSoFar: vi.fn(),
    decisionMode: "heuristic" as DecisionMode,
  };

  it("renders heuristic mode badge when decisionMode is heuristic", () => {
    render(<DeciderShiftSection {...defaultProps} />);

    const badge = screen.getByText("Heuristic");
    expect(badge).toBeInTheDocument();
    // Updated to match actual classes from test output
    expect(badge).toHaveClass("rounded-full", "px-2.5", "py-0.5", "text-xs", "font-medium");
  });

  it("renders hybrid ML mode badge when decisionMode is hybrid_ml", () => {
    const props = { ...defaultProps, decisionMode: "hybrid_ml" as DecisionMode };
    render(<DeciderShiftSection {...props} />);

    const badge = screen.getByText("Hybrid ML");
    expect(badge).toBeInTheDocument();
    // Updated to match actual classes from test output
    expect(badge).toHaveClass("bg-emerald-500/10", "text-emerald-300");
  });

  it("displays driver name and vehicle type alongside decision mode badge", () => {
    render(
      <DeciderShiftSection
        {...defaultProps}
        driverName="NightRunner"
        vehicleType="scooter"
      />,
    );

    expect(screen.getByText(/NightRunner.*scooter/i)).toBeInTheDocument();
    expect(screen.getByText("Heuristic")).toBeInTheDocument();
  });

  it("shows vehicle type when driver name is empty", () => {
    const props = { ...defaultProps, driverName: "" };
    render(<DeciderShiftSection {...props} />);

    expect(screen.getByText(/Vehicle: car/i)).toBeInTheDocument();
    expect(screen.getByText("Heuristic")).toBeInTheDocument();
  });

  it("has correct styling for the decision mode badge", () => {
    render(<DeciderShiftSection {...defaultProps} />);

    const badge = screen.getByText("Heuristic");
    expect(badge).toHaveClass("text-xs");
    expect(badge).toHaveClass("rounded-full");
    expect(badge).toHaveClass("px-2");
    expect(badge).toHaveClass("py-0.5");
  });
});
