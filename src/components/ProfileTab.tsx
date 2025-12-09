import { useState } from "react";
import type { DecisionMode, VehicleType } from "../lib/profile";
import { NumberField } from "./NumberField";
import { SelectField } from "./SelectField";
import { TextField } from "./TextField";
const VEHICLE_TYPES: VehicleType[] = ["car", "bike", "scooter", "other"];
const DECISION_MODES: DecisionMode[] = ["heuristic", "hybrid_ml"];
type ProfileTabProps = {
  driverName: string;
  setDriverName: (name: string) => void;
  vehicleType: VehicleType;
  setVehicleType: (type: VehicleType) => void;
  preferredZones: string[];
  setPreferredZones: (zones: string[]) => void;
  preferredTimeBuckets: string[];
  setPreferredTimeBuckets: (buckets: string[]) => void;
  targetRatePerHour: number;
  setTargetRatePerHour: (rate: number) => void;
  costPerMile: number;
  setCostPerMile: (cost: number) => void;
  earnedSoFar: number;
  setEarnedSoFar: (earned: number) => void;
  decisionMode: DecisionMode;
  setDecisionMode: (mode: DecisionMode) => void;
  onSyncProfile: () => void;
  isSyncingProfile: boolean;
  syncStatus: "idle" | "success" | "error";
  syncMessage: string | null;
  modelMetadata: {
    version: string | null;
    mode: DecisionMode | null;
    updatedAt?: string;
  } | null;
};
export function ProfileTab({
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
  costPerMile,
  setCostPerMile,
  earnedSoFar,
  setEarnedSoFar,
  decisionMode,
  setDecisionMode,
  onSyncProfile,
  isSyncingProfile,
  syncStatus,
  syncMessage,
  modelMetadata,
}: ProfileTabProps) {
  const [zonesInput, setZonesInput] = useState(() => preferredZones.join(", "));
  const [timeBucketsInput, setTimeBucketsInput] = useState(() =>
    preferredTimeBuckets.join(", "),
  );
  const handleZonesChange = (value: string) => {
    setZonesInput(value);
    const zones = value
      .split(",")
      .map((zone) => zone.trim())
      .filter((zone) => zone.length > 0);
    setPreferredZones(zones);
  };
  const handleTimeBucketsChange = (value: string) => {
    setTimeBucketsInput(value);
    const buckets = value
      .split(",")
      .map((bucket) => bucket.trim())
      .filter((bucket) => bucket.length > 0);
    setPreferredTimeBuckets(buckets);
  };
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 shadow-sm">
        <header className="mb-4">
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">
            DRIVER PROFILE
          </h2>
          <p className="text-xs text-slate-400">Your personal settings</p>
        </header>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Driver name"
              value={driverName}
              onChange={setDriverName}
              placeholder="Your name or alias"
              hint="Displayed in the app"
            />
            <SelectField
              label="Vehicle type"
              value={vehicleType}
              onChange={setVehicleType}
              options={VEHICLE_TYPES.map((type) => ({
                value: type,
                label: type.charAt(0).toUpperCase() + type.slice(1),
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              label="Target $/hour"
              value={targetRatePerHour}
              step={1}
              min={1}
              onChange={setTargetRatePerHour}
              hint="Your hourly earnings goal"
            />
            <NumberField
              label="Cost per mile"
              value={costPerMile}
              step={0.05}
              min={0}
              onChange={setCostPerMile}
              hint="Fuel, maintenance, etc."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              label="Earned so far"
              value={earnedSoFar}
              step={1}
              min={0}
              onChange={setEarnedSoFar}
              hint="Earnings from current shift"
            />
            <SelectField
              label="Decision mode"
              value={decisionMode}
              onChange={setDecisionMode}
              options={DECISION_MODES.map((mode) => ({
                value: mode,
                label:
                  mode === "hybrid_ml"
                    ? "Hybrid ML (when available)"
                    : "Heuristic only",
              }))}
              hint="How decisions are calculated"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <TextField
              label="Preferred zones"
              value={zonesInput}
              onChange={handleZonesChange}
              placeholder="Downtown, Airport, Westside"
              hint="Comma-separated delivery zones you prefer"
            />
            <TextField
              label="Preferred time buckets"
              value={timeBucketsInput}
              onChange={handleTimeBucketsChange}
              placeholder="dinner, lunch, breakfast"
              hint="Comma-separated meal times you prefer"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 shadow-sm">
        <header className="mb-4">
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">
            SYNC STATUS
          </h2>
          <p className="text-xs text-slate-400">
            Cloud sync and data management
          </p>
        </header>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Profile status</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                syncStatus === "success"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : syncStatus === "error"
                    ? "bg-rose-500/10 text-rose-300"
                    : "bg-slate-800 text-slate-400"
              }`}
            >
              {syncStatus === "success"
                ? "Synced"
                : syncStatus === "error"
                  ? "Error"
                  : "Not synced"}
            </span>
          </div>

          {modelMetadata && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">
                  Cached model version:
                </span>
                <span className="text-sm font-mono text-slate-300">
                  {modelMetadata.version || "None"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Mode:</span>
                <span className="text-sm font-mono text-slate-300">
                  {modelMetadata.mode || "None"}
                </span>
              </div>
              {modelMetadata.updatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Updated:</span>
                  <span className="text-xs text-slate-400">
                    {new Date(modelMetadata.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {syncMessage && (
            <div
              className={`rounded-lg p-3 text-sm ${
                syncStatus === "error"
                  ? "bg-rose-500/10 text-rose-300"
                  : "bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {syncMessage}
            </div>
          )}

          <button
            onClick={onSyncProfile}
            disabled={isSyncingProfile}
            className="w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncingProfile ? "Syncing..." : "Sync profile to backend"}
          </button>
        </div>
      </section>
    </div>
  );
}
