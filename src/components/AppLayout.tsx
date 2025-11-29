// src/components/AppLayout.tsx
import type { Dispatch, SetStateAction } from "react";
import type { DecisionResult } from "../lib/decision";
import type { VehicleType } from "../lib/profile";
import type { TabId } from "../lib/tabs";
import { TABS } from "../lib/tabs";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { DeciderTab } from "./DeciderTab";
import { HistoryView } from "./HistoryView";
import { ProfileTab } from "./ProfileTab";

type NumberSetter = Dispatch<SetStateAction<number>>;
type StringSetter = Dispatch<SetStateAction<string>>;
type VehicleTypeSetter = Dispatch<SetStateAction<VehicleType>>;

type AppLayoutProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isOnline: boolean;
  driverId?: string | null;

  driverName: string;
  setDriverName: StringSetter;
  vehicleType: VehicleType;
  setVehicleType: VehicleTypeSetter;

  targetRatePerHour: number;
  setTargetRatePerHour: NumberSetter;
  shiftStartHHMM: string;
  setShiftStartHHMM: StringSetter;
  earnedSoFar: number;
  setEarnedSoFar: NumberSetter;

  offerPayout: number;
  setOfferPayout: NumberSetter;
  finishHHMM: string;
  setFinishHHMM: StringSetter;
  miles: number;
  setMiles: NumberSetter;
  costPerMile: number;
  setCostPerMile: NumberSetter;
  bufferMinutes: number;
  setBufferMinutes: NumberSetter;

  result: DecisionResult;
  explanation: string;
  finishLocal: string | null;
  canLogDecision: boolean;
  onLogDecision: (accepted: boolean) => void;
  onResetOffer: () => void;
};

export function AppLayout(props: AppLayoutProps) {
  const {
    activeTab,
    onTabChange,
    isOnline,
    driverId,

    driverName,
    setDriverName,
    vehicleType,
    setVehicleType,

    targetRatePerHour,
    setTargetRatePerHour,
    shiftStartHHMM,
    setShiftStartHHMM,
    earnedSoFar,
    setEarnedSoFar,

    offerPayout,
    setOfferPayout,
    finishHHMM,
    setFinishHHMM,
    miles,
    setMiles,
    costPerMile,
    setCostPerMile,
    bufferMinutes,
    setBufferMinutes,

    result,
    explanation,
    finishLocal,
    canLogDecision,
    onLogDecision,
    onResetOffer,
  } = props;

  const acceptStyles = result.accept
    ? "from-emerald-500 to-green-600"
    : "from-rose-500 to-red-600";

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-50 to-white text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto grid max-w-3xl gap-4 p-4 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">DoorDash Offer Decider</h1>
            {activeTab === "decider" && (
              <div
                className={`rounded-full bg-gradient-to-r ${acceptStyles} px-3 py-1 text-xs font-semibold text-white shadow-sm`}
              >
                {result.accept ? "ACCEPT" : "REJECT"}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs dark:bg-slate-800/80">
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`rounded-full px-3 py-1 font-medium transition ${
                      isActive
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-200"
                        : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700/80"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <span
              className={`text-[11px] ${
                isOnline ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {isOnline ? "Online" : "Offline (history stored locally)"}
            </span>
          </div>
        </header>

        {activeTab === "decider" && (
          <DeciderTab
            driverName={driverName}
            vehicleType={vehicleType}
            targetRatePerHour={targetRatePerHour}
            setTargetRatePerHour={setTargetRatePerHour}
            shiftStartHHMM={shiftStartHHMM}
            setShiftStartHHMM={setShiftStartHHMM}
            earnedSoFar={earnedSoFar}
            setEarnedSoFar={setEarnedSoFar}
            offerPayout={offerPayout}
            setOfferPayout={setOfferPayout}
            finishHHMM={finishHHMM}
            setFinishHHMM={setFinishHHMM}
            miles={miles}
            setMiles={setMiles}
            costPerMile={costPerMile}
            setCostPerMile={setCostPerMile}
            bufferMinutes={bufferMinutes}
            setBufferMinutes={setBufferMinutes}
            result={result}
            explanation={explanation}
            finishLocal={finishLocal}
            canLogDecision={canLogDecision}
            onLogDecision={onLogDecision}
            onResetOffer={onResetOffer}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsDashboard driverId={driverId ?? undefined} />
        )}

        {activeTab === "history" && <HistoryView />}

        {activeTab === "profile" && (
          <ProfileTab
            driverName={driverName}
            setDriverName={setDriverName}
            vehicleType={vehicleType}
            setVehicleType={setVehicleType}
            targetRatePerHour={targetRatePerHour}
            setTargetRatePerHour={setTargetRatePerHour}
            costPerMile={costPerMile}
            setCostPerMile={setCostPerMile}
            earnedSoFar={earnedSoFar}
            setEarnedSoFar={setEarnedSoFar}
          />
        )}

        <footer className="mt-2 text-center text-[11px] opacity-60">
          Uses device time &amp; locale. Install to Home Screen for a full-screen
          PWA experience; history &amp; profile stay on-device.
        </footer>
      </div>
    </main>
  );
}
