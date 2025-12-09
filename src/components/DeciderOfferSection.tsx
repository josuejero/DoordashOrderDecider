import type { DecisionResult } from "../lib/decision";

import { NumberField } from "./NumberField";
import { TextField } from "./TextField";
import { TimeField } from "./TimeField";
import { MetricCard } from "./MetricCard";

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
  pickupStoreType: string;
  setPickupStoreType: (value: string) => void;
  pickupLocation: string;
  setPickupLocation: (value: string) => void;
  dropoffZone: string;
  setDropoffZone: (value: string) => void;
  result: DecisionResult;
  explanation: string[];
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
  } = props;

  return (
    <section className="grid gap-6 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">
            OFFER
          </h2>
          <p className="text-xs text-slate-400">
            Inputs for this specific order
          </p>
        </div>
      </header>

      {/* Core inputs - required for recommendation */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium text-slate-300">Core inputs</p>
          <p className="text-[11px] text-slate-400">
            Required to compute this recommendation
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
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
            hint="Fuel/maintenance"
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
      </div>

      <hr className="border-slate-800/60" />

      {/* Pickup/dropoff context for analytics */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium text-slate-300">
            Context (optional)
          </p>
          <p className="text-[11px] text-slate-400">
            Helps slice history & analytics later
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="Pickup type (optional)"
            value={pickupStoreType}
            onChange={setPickupStoreType}
            placeholder="Fast food, grocery, retail"
            hint="Helps analytics slice orders"
          />
          <TextField
            label="Pickup location (optional)"
            value={pickupLocation}
            onChange={setPickupLocation}
            placeholder="Store name or address"
            hint="e.g. Safeway - 3rd Street"
          />
          <TextField
            label="Dropoff zone (optional)"
            value={dropoffZone}
            onChange={setDropoffZone}
            placeholder="Neighborhood / complex"
            hint="Used for heatmaps later"
          />
        </div>
      </div>

      {/* Buffer and per-hour stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <NumberField
          label="Buffer minutes (optional)"
          value={bufferMinutes}
          step={1}
          min={0}
          onChange={setBufferMinutes}
          hint="Parking / handoff time"
        />

        <MetricCard
          label="Required (this offer)"
          value={`$${result.requiredDollars.toFixed(2)}`}
        />
        <MetricCard
          label="Projected gross/hr"
          value={`$${result.projectedGrossPerHour.toFixed(2)}`}
        />
        <MetricCard
          label="Projected net/hr"
          value={`$${result.projectedNetPerHour.toFixed(2)}`}
        />
      </div>

      {/* Summary and reset */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Net payout (after miles)"
          value={`$${result.netPayout.toFixed(2)}`}
        />
        <div className="flex flex-col justify-between rounded-xl bg-slate-900/60 px-3 py-2 text-sm ring-1 ring-slate-800">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            Finish time
          </span>
          <span className="mt-1 text-lg font-semibold text-slate-50">
            {finishLocal || "—"}
          </span>
        </div>
        <button
          type="button"
          className="rounded-2xl border border-slate-700 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onClick={onResetOffer}
        >
          Reset offer
        </button>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4">
        <h2 className="text-xs font-semibold tracking-wide text-slate-300">
          WHY THIS DECISION
        </h2>
        <div className="mt-3 space-y-2">
          {explanation.map((line, index) => (
            <p key={index} className="text-sm text-slate-300">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div
        className={`rounded-2xl border p-4 ${
          result.accept
            ? "border-emerald-600/60 bg-emerald-900/40"
            : "border-rose-600/60 bg-rose-900/40"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          RECOMMENDATION
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-50">
          {result.accept ? "Accept this offer" : "Reject this offer"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Mode: {result.accept ? "Heuristic" : "Heuristic"} · Net: $
          {result.projectedNetPerHour.toFixed(2)}/hr
        </p>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onLogDecision(true)}
          disabled={!canLogDecision}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            canLogDecision
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "cursor-not-allowed bg-slate-700 text-slate-400"
          }`}
        >
          I accepted this offer
        </button>

        <button
          type="button"
          onClick={() => onLogDecision(false)}
          disabled={!canLogDecision}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-rose-500 ${
            canLogDecision
              ? "bg-slate-800 hover:bg-slate-700"
              : "cursor-not-allowed bg-slate-700 text-slate-400"
          }`}
        >
          I rejected this offer
        </button>
      </div>

      {!canLogDecision && (
        <span className="text-center text-xs text-slate-400">
          Enter payout and finish time to log a decision.
        </span>
      )}
    </section>
  );
}
