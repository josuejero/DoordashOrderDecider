import { useEffect } from "react";
type UrlSyncOptions = {
  targetRatePerHour: number;
  shiftStartHHMM: string;
  earnedSoFar: number;
  offerPayout: number;
  finishHHMM: string;
  miles: number;
  costPerMile: number;
  bufferMinutes: number;
};
export function useOfferUrlSync(options: UrlSyncOptions): void {
  const {
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    bufferMinutes,
  } = options;
  useEffect(() => {
    if (typeof window === "undefined") return;
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
    const { location, history } = window;
    const next = `${location.pathname}${qs ? "?" + qs : ""}${location.hash}`;
    history.replaceState(null, "", next);
  }, [
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    bufferMinutes,
  ]);
}
