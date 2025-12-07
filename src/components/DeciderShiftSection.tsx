// src/components/DeciderShiftSection.tsx
import type { VehicleType } from "../lib/profile";
import { NumberField } from "./NumberField";
import { TimeField } from "./TimeField";

export type DeciderShiftSectionProps = {
  driverName: string;
  vehicleType: VehicleType;
  targetRatePerHour: number;
  setTargetRatePerHour: (value: number) => void;
  shiftStartHHMM: string;
  setShiftStartHHMM: (value: string) => void;
  earnedSoFar: number;
  setEarnedSoFar: (value: number) => void;
  decisionMode: DecisionMode;
};

export function DeciderShiftSection(props: DeciderShiftSectionProps) {
  const {
    driverName,
    vehicleType,
    targetRatePerHour,
    setTargetRatePerHour,
    shiftStartHHMM,
    setShiftStartHHMM,
    earnedSoFar,
    setEarnedSoFar,
    decisionMode,
  } = props;

  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
      <h2 className="flex items-center justify-between text-sm font-semibold opacity-80">
        <span>Your shift</span>
        <span className="flex items-center gap-2 text-[11px] font-normal opacity-70">
          {driverName ? `${driverName} • ${vehicleType}` : `Vehicle: ${vehicleType}`}
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-300">
            {decisionMode === "hybrid_ml" ? "Hybrid ML" : "Heuristic"}
          </span>
        </span>
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NumberField
          label="Target $/hr"
          value={targetRatePerHour}
          step={1}
          min={1}
          onChange={setTargetRatePerHour}
          hint="What do you want to average this shift?"
        />
        <TimeField
          label="Shift start"
          value={shiftStartHHMM}
          onChange={setShiftStartHHMM}
          hint="24h time"
        />
        <NumberField
          label="Earned so far ($)"
          value={earnedSoFar}
          step={1}
          min={0}
          onChange={setEarnedSoFar}
        />
      </div>
    </section>
  );
}