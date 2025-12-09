import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
vi.mock("../hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => true,
}));
vi.mock("../hooks/useBackForwardCache", () => ({
  useBackForwardCache: () => {},
}));
vi.mock("../hooks/useOfferUrlSync", () => ({
  useOfferUrlSync: () => {},
}));
vi.mock("../components/ProfileTab", () => ({
  ProfileTab: ({ decisionMode, setDecisionMode, onSave }: any) => (
    <div data-testid="profile-tab">
      <label htmlFor="decision-mode-select">Decision mode</label>
      <select
        id="decision-mode-select"
        data-testid="decision-mode-select"
        value={decisionMode}
        onChange={(e) => setDecisionMode(e.target.value)}
      >
        <option value="heuristic">Heuristic</option>
        <option value="hybrid_ml">Hybrid ML</option>
      </select>
      <button onClick={() => onSave?.()}>Save Profile</button>
    </div>
  ),
}));
vi.mock("../components/DeciderShiftSection", () => ({
  DeciderShiftSection: ({ decisionMode }: any) => (
    <div>
      <span>Driver Info</span>
      <span data-testid="decision-mode-badge">
        {decisionMode === "hybrid_ml" ? "Hybrid ML" : "Heuristic"}
      </span>
    </div>
  ),
}));
vi.mock("../components/DeciderOfferSection", () => ({
  DeciderOfferSection: () => (
    <div>
      <label htmlFor="offer-payout">Offer payout ($)</label>
      <input id="offer-payout" data-testid="offer-payout" />
      <div>Decision Explanation</div>
    </div>
  ),
}));
vi.mock("../hooks/useDecisionLogger", () => ({
  useDecisionLogger: () => ({
    logDecision: vi.fn(),
  }),
}));
vi.mock("../hooks/useAppPersistence", () => ({
  useAppPersistence: () => ({
    loadProfile: () => ({
      driverName: "Test",
      vehicleType: "car",
      targetRatePerHour: 25,
      costPerMile: 0.4,
      decisionMode: "heuristic",
    }),
    saveProfile: vi.fn(),
    loadSettings: () => ({
      targetRatePerHour: 25,
      shiftStartHHMM: "18:00",
      earnedSoFar: 0,
      costPerMile: 0.4,
    }),
    saveSettings: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));
describe("App decision mode integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const localStorageMock = {
      getItem: vi.fn((key: string) => {
        if (key === "doordash-decider:v1:profile") {
          return JSON.stringify({
            driverName: "Test",
            vehicleType: "car",
            decisionMode: "heuristic",
            targetRatePerHour: 25,
            costPerMile: 0.4,
            preferredZones: [],
            preferredTimeBuckets: [],
          });
        }
        if (key === "doordash-decider:v1:settings") {
          return JSON.stringify({
            targetRatePerHour: 25,
            shiftStartHHMM: "18:00",
            earnedSoFar: 0,
            costPerMile: 0.4,
          });
        }
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });
  it("persists decision mode changes across tabs", async () => {
    render(<App />);
    const profileTab = screen.getByRole("button", { name: "Profile" });
    expect(profileTab).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(profileTab);
    });
    expect(profileTab).toHaveClass("bg-slate-800");
    await waitFor(() => {
      expect(screen.getByTestId("profile-tab")).toBeInTheDocument();
    });
    const select = screen.getByTestId("decision-mode-select");
    await act(async () => {
      fireEvent.change(select, { target: { value: "hybrid_ml" } });
    });
    const deciderTab = screen.getByRole("button", { name: "Decider" });
    await act(async () => {
      fireEvent.click(deciderTab);
    });
    await waitFor(() => {
      expect(screen.getByText("Hybrid ML")).toBeInTheDocument();
    });
  });
  it("maintains decision mode after browser refresh simulation", async () => {
    const setItemSpy = vi.spyOn(window.localStorage, "setItem");
    render(<App />);
    const profileTab = screen.getByRole("button", { name: "Profile" });
    fireEvent.click(profileTab);
    await waitFor(() => {
      const select = screen.getByTestId("decision-mode-select");
      fireEvent.change(select, { target: { value: "hybrid_ml" } });
    });
    expect(setItemSpy).toHaveBeenCalledWith(
      "doordash-decider:v1:profile",
      expect.stringContaining('"decisionMode":"hybrid_ml"'),
    );
  });
  it("shows correct decision explanation based on mode", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId("offer-payout")).toBeInTheDocument();
    });
    const payoutInput = screen.getByTestId("offer-payout");
    fireEvent.change(payoutInput, { target: { value: "30" } });
    await waitFor(() => {
      expect(screen.getByText("Decision Explanation")).toBeInTheDocument();
    });
  });
});
