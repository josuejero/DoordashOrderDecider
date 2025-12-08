// src/components/ProfileTab.tsx
import type { DecisionMode, VehicleType } from "../lib/profile";
import { NumberField } from "./NumberField";
import { SelectField } from "./SelectField";
import { TextField } from "./TextField";

type ProfileTabProps = {
  driverId: string;
  setDriverId: (value: string) => void;
  driverName: string;
  setDriverName: (value: string) => void;
  vehicleType: VehicleType;
  setVehicleType: (value: VehicleType) => void;
  preferredZones: string[];
  setPreferredZones: (value: string[]) => void;
  preferredTimeBuckets: string[];
  setPreferredTimeBuckets: (value: string[]) => void;
  targetRatePerHour: number;
  setTargetRatePerHour: (value: number) => void;
  costPerMile: number;
  setCostPerMile: (value: number) => void;
  earnedSoFar: number;
  setEarnedSoFar: (value: number) => void;
  decisionMode: DecisionMode;
  setDecisionMode: (value: DecisionMode) => void;
  onSyncProfile: () => void;
  isSyncingProfile: boolean;
  syncStatus: "idle" | "success" | "error";
  syncMessage: string | null;
};

export function ProfileTab({
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
}: ProfileTabProps) {
  const parseList = (value: string) =>
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
      <h2 className="text-sm font-semibold opacity-80">Driver profile</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField
          label="Driver ID"
          value={driverId}
          onChange={setDriverId}
          placeholder="UUID from backend"
          hint="Required for analytics + server sync"
        />
        <TextField
          label="Name / callsign"
          value={driverName}
          onChange={setDriverName}
          placeholder="e.g. NightRunner"
          hint="Optional — used only for display"
        />
        <SelectField
          label="Vehicle type"
          value={vehicleType}
          onChange={setVehicleType}
          options={[
            { value: "car", label: "Car" },
            { value: "bike", label: "Bike" },
            { value: "scooter", label: "Scooter" },
            { value: "other", label: "Other" },
          ]}
          hint="Helps you remember which cost assumptions you're using"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumberField
          label="Default target $/hr"
          value={targetRatePerHour}
          step={1}
          min={1}
          onChange={setTargetRatePerHour}
          hint="Used for every decision"
        />
        <NumberField
          label="Default cost per mile"
          value={costPerMile}
          step={0.05}
          min={0}
          onChange={setCostPerMile}
          hint="Fuel + maintenance per mile"
        />
        <NumberField
          label="Starting earned so far"
          value={earnedSoFar}
          step={1}
          min={0}
          onChange={setEarnedSoFar}
          hint="Set at the beginning of a shift"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-4">
        <SelectField
          label="Decision mode"
          value={decisionMode}
          onChange={(value) => setDecisionMode(value as DecisionMode)}
          options={[
            { value: "heuristic", label: "Heuristic only" },
            { value: "hybrid_ml", label: "Hybrid ML (when available)" },
          ]}
          hint="Hybrid ML uses a model when online and falls back to heuristics otherwise."
        />
        <TextField
          label="Preferred zones"
          value={preferredZones.join(", ")}
          onChange={(value) => setPreferredZones(parseList(value))}
          placeholder="Downtown, Airport"
          hint="Comma-separated list sent to the backend"
        />
        <TextField
          label="Preferred time buckets"
          value={preferredTimeBuckets.join(", ")}
          onChange={(value) => setPreferredTimeBuckets(parseList(value))}
          placeholder="morning, evening"
          hint="Comma-separated; align with your backend buckets"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onSyncProfile}
          disabled={isSyncingProfile}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          {isSyncingProfile ? "Saving…" : "Sync profile to backend"}
        </button>
        {syncMessage ? (
          <span
            className={`text-xs ${
              syncStatus === "error" ? "text-rose-600" : "text-emerald-500"
            }`}
          >
            {syncMessage}
          </span>
        ) : null}
      </div>
      <p className="text-[11px] opacity-70">
        Profile stays local-first; decisions cache offline and sync to the
        backend History tab when you are online. Clearing site data removes
        the local cache.
      </p>
    </section>
  );
}
