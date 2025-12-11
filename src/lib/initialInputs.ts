import { loadSettings } from "./storage";
export type InitialInputs = {
  targetRatePerHour: number;
  shiftStartHHMM: string;
  earnedSoFar: number;
  offerPayout: number;
  finishHHMM: string;
  miles: number;
  costPerMile: number;
  bufferMinutes: number;
  pickupStoreType: string;
  pickupLocation: string;
  dropoffZone: string;
};
export const DEFAULTS: InitialInputs = {
  targetRatePerHour: 25,
  shiftStartHHMM: "18:00",
  earnedSoFar: 0,
  offerPayout: 30,
  finishHHMM: "19:00",
  miles: 8,
  costPerMile: 0.5,
  bufferMinutes: 0,
  pickupStoreType: "",
  pickupLocation: "",
  dropoffZone: "",
};
export function getInitialInputs(): InitialInputs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  const out: InitialInputs = { ...DEFAULTS };
  const s = loadSettings();
  if (s?.targetRatePerHour != null) out.targetRatePerHour = s.targetRatePerHour;
  if (s?.shiftStartHHMM) out.shiftStartHHMM = s.shiftStartHHMM;
  if (s?.earnedSoFar != null) out.earnedSoFar = s.earnedSoFar;
  if (s?.costPerMile != null) out.costPerMile = s.costPerMile;
  try {
    const raw = sessionStorage.getItem("offerDraft");
    const draft = raw ? JSON.parse(raw) : {};
    if (draft.offerPayout != null) out.offerPayout = draft.offerPayout;
    if (draft.finishHHMM) out.finishHHMM = draft.finishHHMM;
    if (draft.miles != null) out.miles = draft.miles;
    if (draft.bufferMinutes != null) out.bufferMinutes = draft.bufferMinutes;
    if (typeof draft.pickupStoreType === "string")
      out.pickupStoreType = draft.pickupStoreType;
    if (typeof draft.pickupLocation === "string")
      out.pickupLocation = draft.pickupLocation;
    if (typeof draft.dropoffZone === "string")
      out.dropoffZone = draft.dropoffZone;
  } catch { /* empty */ }
  const q = new URLSearchParams(window.location.search);
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
