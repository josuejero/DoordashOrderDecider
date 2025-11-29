// src/components/DeciderOfferSection.tsx
import type { DecisionResult } from "../lib/decision";
import { NumberField } from "./NumberField";
import { TimeField } from "./TimeField";

export type DeciderOfferSectionProps = {
  offerPayout: number;
  setOfferPayout: (value: number) => void;
  finishHHMM: string;
  setFinishHHMM: (value: string) => void;
  miles: number;
  setMiles: (value: number) => void;
  costPerMile: number;
  setCostPerMile: (value: number) => void;
  bufferMinutes: number;
  setBufferMinutes: (value: number) => void;
  result: DecisionResult;
  explanation: string;
  finishLocal: string | null;
  canLogDecision: boolean;
  onLogDecision: (accepted: boolean) => void;
  onResetOffer: () => void;
};

export function DeciderOfferSection(props: DeciderOfferSectionProps) {
  const {
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

  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
      <h2 className="text-sm font-semibold opacity-80">Offer</h2>

      {/* Primary offer inputs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <NumberField
          label="Offer payout ($)"
          value={offerPayout}
          step={1}
          min={0}
          onChange={setOfferPayout}
        />
        <TimeField
          label="Projected finish"
          value={finishHHMM}
          onChange={setFinishHHMM}
          hint="24h time"
        />
        <NumberField
          label="Miles (optional)"
          value={miles}
          step={0.1}
          min={0}
          onChange={setMiles}
        />
        <NumberField
          label="Cost per mile (optional)"
          value={costPerMile}
          step={0.05}
          min={0}
          onChange={setCostPerMile}
          hint="Fuel/maintenance"
        />
      </div>

      {/* Buffer and per-hour stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <NumberField
          label="Buffer minutes (optional)"
          value={bufferMinutes}
          step={1}
          min={0}
          onChange={setBufferMinutes}
          hint="Parking / handoff time"
        />

        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="opacity-70">Required (this offer):</div>
          <div className="text-lg font-semibold">
            ${result.requiredDollars.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="opacity-70">Projected gross/hr:</div>
          <div className="text-lg font-semibold">
            ${result.projectedGrossPerHour.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="opacity-70">Projected net/hr:</div>
          <div className="text-lg font-semibold">
            ${result.projectedNetPerHour.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Summary and reset */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="opacity-70">Net payout (after miles):</div>
          <div className="text-lg font-semibold">
            ${result.netPayout.toFixed(2)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="opacity-70">Finish time:</div>
          <div className="text-lg font-semibold">
            {finishLocal || "—"}
          </div>
        </div>
        <button
          type="button"
          className="rounded-2xl border border-slate-300 bg-white/70 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/10"
          onClick={onResetOffer}
        >
          Reset offer
        </button>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm leading-snug dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
          Why this decision
        </div>
        <p>{explanation}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onLogDecision(true)}
          disabled={!canLogDecision}
          className={`rounded-2xl px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            canLogDecision
              ? "border border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
              : "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-400"
          }`}
        >
          I accepted this offer
        </button>

        <button
          type="button"
          onClick={() => onLogDecision(false)}
          disabled={!canLogDecision}
          className={`rounded-2xl px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${
            canLogDecision
              ? "border border-rose-500 bg-rose-500 text-white hover:bg-rose-600"
              : "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-400"
          }`}
        >
          I rejected this offer
        </button>

        {!canLogDecision && (
          <span className="text-[11px] opacity-70">
            Enter payout and finish time to log a decision.
          </span>
        )}
      </div>
    </section>
  );
}
