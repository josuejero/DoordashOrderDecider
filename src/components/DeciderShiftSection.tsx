import type { DecisionMode, VehicleType } from "../lib/profile";
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
    <section className="grid gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">
            YOUR SHIFT
          </h2>
          <p className="text-xs text-slate-400">Set your shift details</p>
        </div>
        <span className="flex items-center gap-2 text-[11px] font-normal opacity-80">
          {driverName ? `${driverName} • ${vehicleType}` : `Vehicle: ${vehicleType}`}
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              decisionMode === "hybrid_ml"
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-slate-800 text-slate-200"
            }`}
          >
            {decisionMode === "hybrid_ml" ? "Hybrid ML" : "Heuristic"}
          </span>
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
