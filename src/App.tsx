import { useEffect, useState } from "react";
import { computeDecision } from "./lib/decision";
import { loadSettings, saveSettings } from "./lib/storage";

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
        inputMode="decimal"
        type="number"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/10"
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
        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/10"
      />
      {hint ? (
        <span className="text-[11px] opacity-60" aria-hidden>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/**
 * Compute initial inputs once (during first render) instead of calling setState in an effect.
 * Precedence: URL params > sessionStorage draft > persisted settings > defaults.
 */
const DEFAULTS = {
  targetRatePerHour: 25,
  shiftStartHHMM: "18:00",
  earnedSoFar: 0,
  offerPayout: 30,
  finishHHMM: "19:00",
  miles: 8,
  costPerMile: 0.5,
  bufferMinutes: 0,
};

function getInitialInputs() {
  if (typeof window === "undefined") return { ...DEFAULTS };

  const out = { ...DEFAULTS };

  const s = loadSettings();
  if (s.targetRatePerHour != null) out.targetRatePerHour = s.targetRatePerHour;
  if (s.shiftStartHHMM) out.shiftStartHHMM = s.shiftStartHHMM;
  if (s.earnedSoFar != null) out.earnedSoFar = s.earnedSoFar;
  if (s.costPerMile != null) out.costPerMile = s.costPerMile;

  try {
    const draft = JSON.parse(sessionStorage.getItem("offerDraft") || "{}");
    if (draft.offerPayout != null) out.offerPayout = draft.offerPayout;
    if (draft.finishHHMM) out.finishHHMM = draft.finishHHMM;
    if (draft.miles != null) out.miles = draft.miles;
    if (draft.bufferMinutes != null) out.bufferMinutes = draft.bufferMinutes;
  } catch {
  }

  const q = new URLSearchParams(location.search);
  const qp = (k: string) => q.get(k);
  if (qp("payout")) out.offerPayout = Number(qp("payout"));
  if (qp("finish")) out.finishHHMM = qp("finish")!;
  if (qp("miles")) out.miles = Number(qp("miles"));
  if (qp("cpm")) out.costPerMile = Number(qp("cpm"));
  if (qp("target")) out.targetRatePerHour = Number(qp("target"));
  if (qp("start")) out.shiftStartHHMM = qp("start")!;
  if (qp("earned")) out.earnedSoFar = Number(qp("earned"));
  if (qp("buffer")) out.bufferMinutes = Number(qp("buffer"));

  return out;
}

export default function App() {
  const init = getInitialInputs();

  const [targetRatePerHour, setTargetRatePerHour] = useState<number>(
    () => init.targetRatePerHour,
  );
  const [shiftStartHHMM, setShiftStartHHMM] = useState<string>(
    () => init.shiftStartHHMM,
  );
  const [earnedSoFar, setEarnedSoFar] = useState<number>(() => init.earnedSoFar);

  const [offerPayout, setOfferPayout] = useState<number>(() => init.offerPayout);
  const [finishHHMM, setFinishHHMM] = useState<string>(() => init.finishHHMM);
  const [miles, setMiles] = useState<number>(() => init.miles);
  const [costPerMile, setCostPerMile] = useState<number>(() => init.costPerMile);
  const [bufferMinutes, setBufferMinutes] = useState<number>(
    () => init.bufferMinutes,
  );

  useEffect(() => {
    saveSettings({
      targetRatePerHour,
      shiftStartHHMM,
      earnedSoFar,
      costPerMile,
    });
  }, [targetRatePerHour, shiftStartHHMM, earnedSoFar, costPerMile]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "offerDraft",
        JSON.stringify({ offerPayout, finishHHMM, miles, bufferMinutes }),
      );
    } catch {
    }
  }, [offerPayout, finishHHMM, miles, bufferMinutes]);

  useEffect(() => {
    const flush = () => {
      saveSettings({
        targetRatePerHour,
        shiftStartHHMM,
        earnedSoFar,
        costPerMile,
      });
      try {
        sessionStorage.setItem(
          "offerDraft",
          JSON.stringify({ offerPayout, finishHHMM, miles, bufferMinutes }),
        );
      } catch {
      }
    };

    const onPageHide = () => flush();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    costPerMile,
    offerPayout,
    finishHHMM,
    miles,
    bufferMinutes,
  ]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (offerPayout) params.set("payout", String(offerPayout));
    if (finishHHMM) params.set("finish", finishHHMM);
    if (miles) params.set("miles", String(miles));
    if (costPerMile) params.set("cpm", String(costPerMile));
    if (targetRatePerHour) params.set("target", String(targetRatePerHour));
    if (shiftStartHHMM) params.set("start", shiftStartHHMM);
    if (earnedSoFar) params.set("earned", String(earnedSoFar));
    if (bufferMinutes) params.set("buffer", String(bufferMinutes));

    const qs = params.toString();
    const next = `${location.pathname}${qs ? "?" + qs : ""}${location.hash}`;
    history.replaceState(null, "", next);
  }, [
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    bufferMinutes,
  ]);

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

  const result = computeDecision(input);

  const resetOffer = () => {
    setOfferPayout(0);
    setMiles(0);
    setBufferMinutes(0);
  };

  const acceptStyles = result.accept
    ? "from-emerald-500 to-green-600"
    : "from-rose-500 to-red-600";

  const finishLocal =
    result.finishIso &&
    new Date(result.finishIso).toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-50 to-white text-slate-900 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto grid max-w-3xl gap-4 p-4 sm:p-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">DoorDash Offer Decider</h1>
          <div
            className={`rounded-full bg-gradient-to-r ${acceptStyles} px-3 py-1 text-xs font-semibold text-white shadow-sm`}
          >
            {result.accept ? "ACCEPT" : "REJECT"}
          </div>
        </header>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
          <h2 className="text-sm font-semibold opacity-80">Your shift</h2>
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

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
          <h2 className="text-sm font-semibold opacity-80">Offer</h2>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div className="opacity-70">Net payout (after miles):</div>
              <div className="text-lg font-semibold">
                ${result.netPayout.toFixed(2)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div className="opacity-70">Finish time:</div>
              <div className="text-lg font-semibold">{finishLocal || "—"}</div>
            </div>
            <button
              type="button"
              className="rounded-2xl border border-slate-300 bg-white/70 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/10"
              onClick={resetOffer}
            >
              Reset offer
            </button>
          </div>
        </section>

        <footer className="mt-2 text-center text-[11px] opacity-60">
          Uses device time & locale. Install to Home Screen for a full-screen
          PWA experience.
        </footer>
      </div>
    </main>
  );
}
