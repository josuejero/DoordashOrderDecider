import { useMemo, useState } from "react";
import { computeDecision } from "./lib/decision";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium opacity-80">{children}</span>;
}

function NumberField(props: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  const { label, value, step = 1, min, onChange, hint } = props;
  return (
    <label className="grid gap-1">
      <Label>{label}</Label>
      <input
        type="number"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/5"
        placeholder="0"
      />
      {hint ? (
        <span className="text-[11px] opacity-60" aria-hidden>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function TimeField(props: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  hint?: string;
}) {
  const { label, value, onChange, hint } = props;
  return (
    <label className="grid gap-1">
      <Label>{label}</Label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 shadow-sm backdrop-blur transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/5"
      />
      {hint ? (
        <span className="text-[11px] opacity-60" aria-hidden>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-black/[.02] px-3 py-2 dark:bg-white/[.06]">
      <span className="text-sm opacity-70">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function App() {
  // Core inputs
  const [targetRatePerHour, setTargetRatePerHour] = useState(25);
  const [shiftStartHHMM, setShiftStartHHMM] = useState("18:00");
  const [earnedSoFar, setEarnedSoFar] = useState(0);
  const [offerPayout, setOfferPayout] = useState(30);
  const [finishHHMM, setFinishHHMM] = useState("19:00");

  // Optional inputs
  const [miles, setMiles] = useState<number>(8);
  const [costPerMile, setCostPerMile] = useState<number>(0.5);
  const [bufferMinutes, setBufferMinutes] = useState<number>(0);

  const input = {
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    bufferMinutes,
  };

  const result = useMemo(() => computeDecision(input), [JSON.stringify(input)]);

  const resetOffer = () => {
    setOfferPayout(0);
    setMiles(0);
    setBufferMinutes(0);
  };

  const acceptStyles = result.accept
    ? "from-emerald-500 to-green-600"
    : "from-rose-500 to-red-600";

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-50 to-white text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto grid max-w-2xl gap-6 px-5 py-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-3xl font-semibold text-transparent dark:from-indigo-300 dark:to-emerald-300">
            DoorDash Order Decider
          </h1>
          <p className="mt-1 text-sm opacity-75">Live, offline-friendly calculator</p>
        </header>

        {/* Basics */}
        <section className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
          <h2 className="mb-3 text-sm font-semibold tracking-wide opacity-70">
            Basics
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              label="Target $/hr"
              value={targetRatePerHour}
              step={1}
              min={0}
              onChange={setTargetRatePerHour}
              hint="Your minimum average rate goal"
            />
            <TimeField
              label="Shift start"
              value={shiftStartHHMM}
              onChange={setShiftStartHHMM}
              hint="24h time (HH:MM)"
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

        {/* Offer Details */}
        <section className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
          <h2 className="mb-3 text-sm font-semibold tracking-wide opacity-70">
            Offer details
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              step={0.1}
              min={0}
              onChange={setCostPerMile}
            />
            <NumberField
              label="Buffer minutes (optional)"
              value={bufferMinutes}
              step={5}
              min={0}
              onChange={setBufferMinutes}
              hint="Parking, handoff, etc."
            />
          </div>
        </section>

        {/* Decision */}
        <section
          className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/10"
          role="status"
          aria-live="polite"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${acceptStyles} px-3 py-1 text-sm font-semibold text-white shadow-sm transition will-change-transform`}
                 style={{ transform: "translateZ(0)" }}>
              <span className="text-base">{result.accept ? "✓" : "✕"}</span>
              <span className="tracking-wide">{result.accept ? "ACCEPT" : "REJECT"}</span>
            </div>
            {result.finishIso && (
              <div className="text-right text-xs opacity-70">
                Finish: {new Date(result.finishIso).toLocaleString()}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <StatRow label="Net payout" value={`$${result.netPayout}`} />
            <StatRow label="Required now" value={`$${result.requiredDollars}`} />
            <StatRow label="Projected gross/hr" value={`$${result.projectedGrossPerHour}`} />
            <StatRow label="Projected net/hr" value={`$${result.projectedNetPerHour}`} />
          </div>
        </section>

        {/* Actions */}
        <section className="flex flex-wrap gap-3">
          <button
            className="rounded-2xl border border-slate-300 bg-slate-900 px-4 py-2 text-white shadow-sm transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white dark:text-slate-900"
            onClick={() => alert("Logged that you accepted.")}
          >
            I accepted
          </button>
          <button
            className="rounded-2xl border border-slate-300 bg-white/60 px-4 py-2 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/10"
            onClick={resetOffer}
          >
            Reset offer
          </button>
        </section>

        <footer className="mt-2 text-center text-[11px] opacity-60">
          Uses device time & locale. Install to Home Screen for a full-screen PWA experience.
        </footer>
      </div>
    </main>
  );
}
