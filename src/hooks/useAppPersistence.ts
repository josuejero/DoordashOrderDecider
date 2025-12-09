import { useEffect } from "react";
import {
  saveProfileToStorage,
  type DecisionMode,
  type VehicleType,
} from "../lib/profile";
import { saveSettings } from "../lib/storage";
type OfferDraft = {
  offerPayout: number;
  finishHHMM: string;
  miles: number;
  bufferMinutes: number;
  pickupStoreType: string;
  pickupLocation: string;
  dropoffZone: string;
};
type AppPersistenceOptions = {
  targetRatePerHour: number;
  shiftStartHHMM: string;
  earnedSoFar: number;
  costPerMile: number;
  driverId: string;
  driverName: string;
  vehicleType: VehicleType;
  decisionMode: DecisionMode;
  preferredZones: string[];
  preferredTimeBuckets: string[];
  offerDraft: OfferDraft;
};
export function useAppPersistence(options: AppPersistenceOptions): void {
  const {
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    costPerMile,
    driverId,
    driverName,
    vehicleType,
    decisionMode,
    preferredZones,
    preferredTimeBuckets,
    offerDraft,
  } = options;
  useEffect(() => {
    saveSettings({
      targetRatePerHour,
      shiftStartHHMM,
      earnedSoFar,
      costPerMile,
      driverId: driverId || undefined,
    });
  }, [targetRatePerHour, shiftStartHHMM, earnedSoFar, costPerMile, driverId]);
  useEffect(() => {
    saveProfileToStorage({
      driverName: driverName || undefined,
      vehicleType,
      decisionMode,
      preferredZones,
      preferredTimeBuckets,
    });
  }, [
    driverName,
    vehicleType,
    decisionMode,
    preferredZones,
    preferredTimeBuckets,
  ]);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.sessionStorage.setItem("offerDraft", JSON.stringify(offerDraft));
    } catch {}
  }, [offerDraft]);
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
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
        decisionMode,
        preferredZones,
        preferredTimeBuckets,
      });
      try {
        window.sessionStorage.setItem("offerDraft", JSON.stringify(offerDraft));
      } catch {}
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
    decisionMode,
    preferredZones,
    preferredTimeBuckets,
    offerDraft,
  ]);
}
