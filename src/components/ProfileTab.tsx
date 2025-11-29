// src/components/ProfileTab.tsx
import type { VehicleType } from "../lib/profile";
import { NumberField } from "./NumberField";
import { SelectField } from "./SelectField";
import { TextField } from "./TextField";

type ProfileTabProps = {
  driverName: string;
  setDriverName: (value: string) => void;
  vehicleType: VehicleType;
  setVehicleType: (value: VehicleType) => void;
  targetRatePerHour: number;
  setTargetRatePerHour: (value: number) => void;
  costPerMile: number;
  setCostPerMile: (value: number) => void;
  earnedSoFar: number;
  setEarnedSoFar: (value: number) => void;
};

export function ProfileTab({
  driverName,
  setDriverName,
  vehicleType,
  setVehicleType,
  targetRatePerHour,
  setTargetRatePerHour,
  costPerMile,
  setCostPerMile,
  earnedSoFar,
  setEarnedSoFar,
}: ProfileTabProps) {
  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
      <h2 className="text-sm font-semibold opacity-80">Driver profile</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      <p className="text-[11px] opacity-70">
        Profile and history are stored locally in your browser so the app
        works offline. Clearing site data will reset them.
      </p>
    </section>
  );
}
