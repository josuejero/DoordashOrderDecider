import { useEffect, useState } from "react";
import type { DecisionResult } from "../lib/decision";
import type { QuoteDisplayState } from "../lib/quoteApi";
import { ExplanationTree } from "./ExplanationTree";
import { MetricCard } from "./MetricCard";
import { NumberField } from "./NumberField";
import { TextField } from "./TextField";
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
  pickupStoreType: string;
  setPickupStoreType: (value: string) => void;
  pickupLocation: string;
  setPickupLocation: (value: string) => void;
  dropoffZone: string;
  setDropoffZone: (value: string) => void;
  result: DecisionResult;
  quote: QuoteDisplayState;
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
    quote,
    finishLocal,
    canLogDecision,
    onLogDecision,
    onResetOffer,
  } = props;

  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const updatedAt = Date.parse(quote.updatedAt);
  const secondsAgo = Number.isNaN(updatedAt)
    ? 0
    : Math.max(0, Math.floor((now - updatedAt) / 1000));
  const confidencePercent = Math.round(
    Math.min(100, Math.max(0, quote.confidence * 100)),
  );
  const sourceLabel =
    quote.source === "online" ? "Online truth" : "Offline estimate";
  const badgeClasses =
    quote.source === "online"
      ? "bg-emerald-500/10 text-emerald-300"
      : "bg-amber-500/10 text-amber-200";
  const recommendationClass =
    quote.recommendation === "ACCEPT"
      ? "border-emerald-600/60 bg-emerald-900/40"
      : "border-rose-600/60 bg-rose-900/40";
  const recommendationText =
    quote.recommendation === "ACCEPT" ? "Accept this offer" : "Reject this offer";

  const handleCopyCorrelation = () => {
    if (!quote.correlationId) return;
    const showCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    const clipboard =
      typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (clipboard?.writeText) {
      void clipboard.writeText(quote.correlationId).then(showCopied).catch(showCopied);
      return;
    }
    showCopied();
  };

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
            data-testid="offer-payout"
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

      <div className="space-y-4">
        <div className="space-y-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-slate-400">
                Net/hr range
              </p>
              <p className="text-3xl font-semibold text-slate-100">
                {`${formatHourly(quote.netRange.min)}–${formatHourly(
                  quote.netRange.max,
                )} / hr`}
              </p>
              <p className="text-sm text-slate-300">
                Confidence: {confidencePercent}%
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold uppercase tracking-wide ${badgeClasses}`}>
                {sourceLabel}
              </span>
              <span>Updated {secondsAgo}s ago</span>
              {quote.ruleVersion ? (
                <span>Rule {quote.ruleVersion}</span>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-1.5 rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  quote.recommendation === "ACCEPT"
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            {quote.correlationId && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="max-w-[240px] truncate text-slate-300">
                  {quote.correlationId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCorrelation}
                  className="rounded-full border border-slate-700/60 px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800/60"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
            {finishLocal || "\u2014"}
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

      <details className="group rounded-xl border border-slate-800/60 bg-slate-900/60 p-4">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-200">
          <span>Why?</span>
          <span className="text-xs text-slate-400 transition-transform group-open:rotate-180">
            ▼
          </span>
        </summary>
        <div className="mt-3">
          <ExplanationTree nodes={quote.explanationTree} />
        </div>
      </details>

      <div
        className={`rounded-2xl border p-4 ${recommendationClass}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          RECOMMENDATION
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-50">
          {recommendationText}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Net: ${result.projectedNetPerHour.toFixed(2)}/hr
        </p>
      </div>

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

function formatHourly(value: number) {
  if (!Number.isFinite(value)) {
    return "$0.0";
  }
  const formatted = value.toFixed(1);
  return `$${formatted}`;
}
