// src/components/AppLayout.tsx
import type { Dispatch, SetStateAction } from "react";
import { ENABLE_ANALYTICS_UI } from "../lib/config";
import type { DecisionResult } from "../lib/decision";
import type { DecisionMode, VehicleType } from "../lib/profile";
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
  setDriverId: StringSetter;

  driverName: string;
  setDriverName: StringSetter;
  vehicleType: VehicleType;
  setVehicleType: VehicleTypeSetter;
  preferredZones: string[];
  setPreferredZones: Dispatch<SetStateAction<string[]>>;
  preferredTimeBuckets: string[];
  setPreferredTimeBuckets: Dispatch<SetStateAction<string[]>>;

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
  pickupStoreType: string;
  setPickupStoreType: StringSetter;
  pickupLocation: string;
  setPickupLocation: StringSetter;
  dropoffZone: string;
  setDropoffZone: StringSetter;

  result: DecisionResult;
  explanation: string;
  finishLocal: string | null;
  canLogDecision: boolean;
  onLogDecision: (accepted: boolean) => void;
  onResetOffer: () => void;

  // New props for decision mode
  decisionMode: DecisionMode;
  setDecisionMode: (mode: DecisionMode) => void;
  onSyncProfile: () => void;
  isSyncingProfile: boolean;
  profileSyncStatus: "idle" | "success" | "error";
  profileSyncMessage: string | null;
};

export function AppLayout(props: AppLayoutProps) {
  const {
  activeTab,
  onTabChange,
  isOnline,
  driverId,
  setDriverId,

  driverName,
  setDriverName,
  vehicleType,
  setVehicleType,
  preferredZones,
  setPreferredZones,
  preferredTimeBuckets,
  setPreferredTimeBuckets,

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
    pickupStoreType,
    setPickupStoreType,
    pickupLocation,
    setPickupLocation,
    dropoffZone,
    setDropoffZone,

    result,
    explanation,
    finishLocal,
    canLogDecision,
    onLogDecision,
    onResetOffer,

    decisionMode,
    setDecisionMode,
    onSyncProfile,
    isSyncingProfile,
    profileSyncStatus,
    profileSyncMessage,
  } = props;

  const acceptStyles = result.accept
    ? "from-emerald-500 to-green-600"
    : "from-rose-500 to-red-600";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-2xl font-semibold text-transparent">
              DoorDash Decider
            </h1>
            <p className="text-sm text-slate-400">
              Make smarter accept / reject decisions while tracking your real
              hourly rate.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex rounded-full bg-slate-900/70 p-1 text-xs shadow-sm ring-1 ring-slate-800">
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`rounded-full px-3 py-1 transition-colors ${
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
            decisionMode={decisionMode}
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
            pickupStoreType={pickupStoreType}
            setPickupStoreType={setPickupStoreType}
            pickupLocation={pickupLocation}
            setPickupLocation={setPickupLocation}
            dropoffZone={dropoffZone}
            setDropoffZone={setDropoffZone}
            result={result}
            explanation={explanation}
            finishLocal={finishLocal}
            canLogDecision={canLogDecision}
            onLogDecision={onLogDecision}
            onResetOffer={onResetOffer}
          />
        )}

        {activeTab === "analytics" && ENABLE_ANALYTICS_UI && (
          <AnalyticsDashboard driverId={driverId ?? null} />
        )}

        {activeTab === "history" && <HistoryView />}

        {activeTab === "profile" && (
          <ProfileTab
            driverId={driverId ?? ""}
            setDriverId={setDriverId}
            driverName={driverName}
            setDriverName={setDriverName}
            vehicleType={vehicleType}
            setVehicleType={setVehicleType}
            preferredZones={preferredZones}
            setPreferredZones={setPreferredZones}
            preferredTimeBuckets={preferredTimeBuckets}
            setPreferredTimeBuckets={setPreferredTimeBuckets}
            targetRatePerHour={targetRatePerHour}
            setTargetRatePerHour={setTargetRatePerHour}
            costPerMile={costPerMile}
            setCostPerMile={setCostPerMile}
            earnedSoFar={earnedSoFar}
            setEarnedSoFar={setEarnedSoFar}
            decisionMode={decisionMode}
            setDecisionMode={setDecisionMode}
            onSyncProfile={onSyncProfile}
            isSyncingProfile={isSyncingProfile}
            syncStatus={profileSyncStatus}
            syncMessage={profileSyncMessage}
          />
        )}

        <div
          className={`mt-6 rounded-xl bg-gradient-to-r ${acceptStyles} p-[1px]`}
        >
          <div className="flex items-center justify-between rounded-[10px] bg-slate-950/95 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Decision
              </p>
              <p className="text-lg font-semibold text-white">
                {result.accept ? "Accept this offer" : "Reject this offer"}
              </p>
            </div>
            <p className="max-w-xs text-right text-xs text-slate-300">
              {explanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
