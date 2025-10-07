import { useMemo, useState } from "react";
import { computeDecision } from "./lib/decision";

function NumberField(props: {
  label: string; value: number; step?: number; onChange: (n: number) => void;
}) {
  const { label, value, step = 1, onChange } = props;
  return (
    <label className="grid gap-1 text-sm">
      <span className="opacity-75">{label}</span>
      <input
        type="number"
        step={step}
        className="rounded-xl border px-3 py-2 bg-white/70 dark:bg-black/30"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function TimeField(props: { label: string; value: string; onChange: (s: string) => void; }) {
  const { label, value, onChange } = props;
  return (
    <label className="grid gap-1 text-sm">
      <span className="opacity-75">{label}</span>
      <input
        type="time"
        className="rounded-xl border px-3 py-2 bg-white/70 dark:bg-black/30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
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

  return (
    <main className="min-h-full bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-xl p-6 space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold">DoorDash Order Decider</h1>
          <p className="text-sm opacity-75">live calculator</p>
        </header>

        <section className="grid gap-4">
          <NumberField label="Target $/hr" value={targetRatePerHour} step={1} onChange={setTargetRatePerHour} />
          <TimeField   label="Shift start" value={shiftStartHHMM} onChange={setShiftStartHHMM} />
          <NumberField label="Earned so far ($)" value={earnedSoFar} step={1} onChange={setEarnedSoFar} />
          <NumberField label="Offer payout ($)" value={offerPayout} step={1} onChange={setOfferPayout} />
          <TimeField   label="Projected finish" value={finishHHMM} onChange={setFinishHHMM} />
          <NumberField label="Miles (optional)" value={miles} step={0.1} onChange={setMiles} />
          <NumberField label="Cost per mile (optional)" value={costPerMile} step={0.1} onChange={setCostPerMile} />
          <NumberField label="Buffer minutes (optional)" value={bufferMinutes} step={5} onChange={setBufferMinutes} />
        </section>

        <section className="rounded-2xl border p-4 space-y-2">
          <div className="text-lg font-medium">Decision</div>
          <div className="text-sm">
            <span className={result.accept ? "text-green-600" : "text-red-600"}>
              {result.accept ? "ACCEPT" : "REJECT"}
            </span>
            <span className="opacity-60"> — required ≥ $, offered/net $, averages, ETA</span>
          </div>
          <div className="text-sm grid gap-1">
            <div>Net payout: <strong>${result.netPayout}</strong></div>
            <div>Required now: <strong>${result.requiredDollars}</strong></div>
            <div>Projected gross/hr: <strong>${result.projectedGrossPerHour}</strong></div>
            <div>Projected net/hr: <strong>${result.projectedNetPerHour}</strong></div>
            {result.finishIso && <div className="text-xs opacity-60">Finish: {new Date(result.finishIso).toLocaleString()}</div>}
          </div>
        </section>

        <section className="flex gap-3">
          <button className="rounded-2xl px-4 py-2 border" onClick={() => alert('Logged that you accepted.')}>
            I accepted
          </button>
          <button className="rounded-2xl px-4 py-2 border" onClick={resetOffer}>
            Reset offer
          </button>
        </section>
      </div>
    </main>
  );
}
