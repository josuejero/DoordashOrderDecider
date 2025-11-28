import { useEffect, useState, type ReactNode } from "react";
import {
  computeDecision,
  type DecisionInput,
  type DecisionResult,
} from "./lib/decision";
import { loadSettings, saveSettings } from "./lib/storage";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { HistoryView } from "./components/HistoryView";


type TabId = "decider" | "history" | "analytics" | "profile";type VehicleType = "car" | "bike" | "scooter" | "other";

type HistoryItem = {
  id: string;
  decidedAtIso: string;
  accept: boolean;
  payout: number;
  miles: number | null;
  costPerMile: number | null;
  bufferMinutes: number;
  netPayout: number;
  requiredDollars: number;
  projectedGrossPerHour: number;
  projectedNetPerHour: number;
  explanation: string;
};

type ProfilePersisted = {
  driverName?: string;
  vehicleType?: VehicleType;
};

const HISTORY_KEY = "doordash-decider:v1:history";
const HISTORY_LIMIT = 50;
const PROFILE_KEY = "doordash-decider:v1:profile";

const TABS: { id: TabId; label: string }[] = [
  { id: "decider", label: "Decider" },
  { id: "history", label: "History" },
  { id: "analytics", label: "Analytics" },
  { id: "profile", label: "Profile" },
];


function loadHistoryFromStorage(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryToStorage(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function loadProfileFromStorage(): ProfilePersisted {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as ProfilePersisted) : {};
  } catch {
    return {};
  }
}

function saveProfileToStorage(p: ProfilePersisted) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

function Label({ children }: { children: ReactNode }) {
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

function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const { label, value, onChange, placeholder, hint } = props;
  return (
    <label className="grid gap-1">
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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

function SelectField(props: {
  label: string;
  value: VehicleType;
  onChange: (v: VehicleType) => void;
  hint?: string;
}) {
  const { label, value, onChange, hint } = props;
  return (
    <label className="grid gap-1">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as VehicleType)}
        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-base shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/10"
      >
        <option value="car">Car</option>
        <option value="bike">Bike</option>
        <option value="scooter">Scooter</option>
        <option value="other">Other</option>
      </select>
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
    void 0;
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

function getInitialProfileState(): { driverName: string; vehicleType: VehicleType } {
  if (typeof window === "undefined") {
    return { driverName: "", vehicleType: "car" };
  }
  const persisted = loadProfileFromStorage();
  return {
    driverName: persisted.driverName ?? "",
    vehicleType: persisted.vehicleType ?? "car",
  };
}

function buildExplanation(input: DecisionInput, result: DecisionResult): string {
  const action = result.accept ? "ACCEPT" : "REJECT";
  const comparison = result.accept ? "≥" : "<";

  const netStr = result.netPayout.toFixed(2);
  const reqStr = result.requiredDollars.toFixed(2);
  const targetStr = input.targetRatePerHour.toFixed(2);

  const miles = input.miles ?? 0;
  const cpm = input.costPerMile ?? 0;

  let base: string;
  if (miles > 0 && cpm > 0) {
    base = `${action} because net $${netStr} after ${miles.toFixed(
      1,
    )} mi @ $${cpm.toFixed(
      2,
    )}/mi ${comparison} required $${reqStr} to stay on pace for $${targetStr}/hr.`;
  } else {
    base = `${action} because net $${netStr} ${comparison} required $${reqStr} to stay on pace for $${targetStr}/hr.`;
  }

  const projected =
    result.projectedNetPerHour !== result.projectedGrossPerHour
      ? `Projected net: $${result.projectedNetPerHour.toFixed(
          2,
        )}/hr (gross: $${result.projectedGrossPerHour.toFixed(2)}/hr).`
      : `Projected average: $${result.projectedGrossPerHour.toFixed(2)}/hr.`;

  return `${base} ${projected}`;
}

export default function App() {
  const init = getInitialInputs();
  const profileInit = getInitialProfileState();

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

  const [driverName, setDriverName] = useState<string>(
    () => profileInit.driverName,
  );
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    () => profileInit.vehicleType,
  );

  const [activeTab, setActiveTab] = useState<TabId>("decider");
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    loadHistoryFromStorage(),
  );
  const [historyDecisionFilter, setHistoryDecisionFilter] = useState<"all" | "accepted" | "rejected">("all");


  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
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
    saveProfileToStorage({
      driverName: driverName || undefined,
      vehicleType,
    });
  }, [driverName, vehicleType]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "offerDraft",
        JSON.stringify({ offerPayout, finishHHMM, miles, bufferMinutes }),
      );
    } catch {
      void 0;
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
      saveProfileToStorage({
        driverName: driverName || undefined,
        vehicleType,
      });
      try {
        sessionStorage.setItem(
          "offerDraft",
          JSON.stringify({ offerPayout, finishHHMM, miles, bufferMinutes }),
        );
      } catch {
        void 0;
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
    driverName,
    vehicleType,
    offerPayout,
    finishHHMM,
    miles,
    bufferMinutes,
  ]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        void 0;
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
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
    // Use the global history (window.history) instead of the local 'history' state variable
    window.history.replaceState(null, "", next);
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

  const input: DecisionInput = {
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
  const explanation = buildExplanation(input, result);

  const resetOffer = () => {
    setOfferPayout(0);
    setMiles(0);
    setBufferMinutes(0);
  };

  const canLogDecision = offerPayout > 0 && !!finishHHMM;

  const handleLogDecision = (accepted: boolean) => {
    if (!canLogDecision) return;

    // Generate id and timestamp only when the user triggers the event
    // eslint-disable-next-line react-hooks/purity
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const decidedAtIso = new Date().toISOString();

    const item: HistoryItem = {
      id,
      decidedAtIso,
      accept: accepted,
      payout: offerPayout,
      miles: Number.isFinite(miles) ? miles : null,
      costPerMile: Number.isFinite(costPerMile) ? costPerMile : null,
      bufferMinutes: Number.isFinite(bufferMinutes) ? bufferMinutes : 0,
      netPayout: result.netPayout,
      requiredDollars: result.requiredDollars,
      projectedGrossPerHour: result.projectedGrossPerHour,
      projectedNetPerHour: result.projectedNetPerHour,
      explanation,
    };

    setHistory((prev) => {
      const next = [item, ...prev].slice(0, HISTORY_LIMIT);
      saveHistoryToStorage(next);
      return next;
    });

    if (accepted) {
      setEarnedSoFar((prev) => prev + result.netPayout);
      resetOffer();
    }
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
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">DoorDash Offer Decider</h1>
            {activeTab === "decider" && (
              <div
                className={`rounded-full bg-gradient-to-r ${acceptStyles} px-3 py-1 text-xs font-semibold text-white shadow-sm`}
              >
                {result.accept ? "ACCEPT" : "REJECT"}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs dark:bg-slate-800/80">
              {TABS.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-3 py-1 font-medium transition ${
                      isActive
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-200"
                        : "text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700/80"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <span
              className={`text-[11px] ${
                isOnline ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {isOnline ? "Online" : "Offline (history stored locally)"}
            </span>
          </div>
        </header>

        {activeTab === "decider" && (
          <>
            <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-white/5">
              <h2 className="flex items-center justify-between text-sm font-semibold opacity-80">
                <span>Your shift</span>
                <span className="text-[11px] font-normal opacity-70">
                  {driverName
                    ? `${driverName} • ${vehicleType}`
                    : `Vehicle: ${vehicleType}`}
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
                  <div className="text-lg font-semibold">
                    {finishLocal || "—"}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-2xl border border-slate-300 bg-white/70 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-white/10"
                  onClick={resetOffer}
                >
                  Reset offer
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm leading-snug dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                  Why this decision
                </div>
                <p>{explanation}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleLogDecision(true)}
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
                  onClick={() => handleLogDecision(false)}
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
          </>
        )}

        {activeTab === "analytics" && (
          <AnalyticsDashboard driverId={settings.driverId} />
        )}
        {activeTab === "history" && <HistoryView />}


        {activeTab === "profile" && (
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
        )}

        <footer className="mt-2 text-center text-[11px] opacity-60">
          Uses device time &amp; locale. Install to Home Screen for a full-screen
          PWA experience; history &amp; profile stay on-device.
        </footer>
      </div>
    </main>
  );
}
