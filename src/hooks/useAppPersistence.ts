// src/hooks/useAppPersistence.ts
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
  offerDraft: OfferDraft;
};

/**
 * Centralises persistence side effects:
 *  - settings in localStorage (or similar)
 *  - profile data
 *  - current offer draft in sessionStorage
 *  - a "flush" on pagehide / visibilitychange
 *
 * This keeps App.tsx concerned with state wiring and domain logic only.
 */
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
    offerDraft,
  } = options;

  // Persist core settings
  useEffect(() => {
    saveSettings({
      targetRatePerHour,
      shiftStartHHMM,
      earnedSoFar,
      costPerMile,
      driverId: driverId || undefined,
    });
  }, [
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    costPerMile,
    driverId,
  ]);

  // Persist profile
  useEffect(() => {
    saveProfileToStorage({
      driverName: driverName || undefined,
      vehicleType,
      decisionMode,
    });
  }, [driverName, vehicleType, decisionMode]);

  // Persist current offer draft
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      window.sessionStorage.setItem("offerDraft", JSON.stringify(offerDraft));
    } catch {
      // Best-effort persistence only.
    }
  }, [offerDraft]);

  // Flush state when page is hidden
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
      });
      try {
        window.sessionStorage.setItem(
          "offerDraft",
          JSON.stringify(offerDraft),
        );
      } catch {
        // Ignore quota / private mode errors.
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
    decisionMode,
    offerDraft,
  ]);
}
