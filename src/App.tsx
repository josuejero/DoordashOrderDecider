// src/App.tsx
import { useState } from "react";
import { AppLayout } from "./components/AppLayout";
import { useAppPersistence } from "./hooks/useAppPersistence";
import { useBackForwardCache } from "./hooks/useBackForwardCache";
import { useDecisionLogger } from "./hooks/useDecisionLogger";
import { useOfferUrlSync } from "./hooks/useOfferUrlSync";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import {
  computeDecision,
  type DecisionInput,
  type DecisionResult,
} from "./lib/decision";
import { buildExplanation } from "./lib/decisionExplanation";
import { getInitialInputs } from "./lib/initialInputs";
import { syncDriverProfile } from "./lib/driverApi";
import {
  getInitialProfileState,
  type DecisionMode,
  type VehicleType,
} from "./lib/profile";
import { loadSettings } from "./lib/storage";
import type { TabId } from "./lib/tabs";

export default function App() {
  const init = getInitialInputs();
  const profileInit = getInitialProfileState();

  const [decisionMode, setDecisionMode] = useState<DecisionMode>(
    () => profileInit.decisionMode,
  );
  const [preferredZones, setPreferredZones] = useState<string[]>(
    () => profileInit.preferredZones,
  );
  const [preferredTimeBuckets, setPreferredTimeBuckets] = useState<string[]>(
    () => profileInit.preferredTimeBuckets,
  );
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [profileSyncStatus, setProfileSyncStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [profileSyncMessage, setProfileSyncMessage] = useState<string | null>(
    null,
  );

  const [settings] = useState(() => loadSettings());

  const [targetRatePerHour, setTargetRatePerHour] = useState(
    () => init.targetRatePerHour,
  );
  const [shiftStartHHMM, setShiftStartHHMM] = useState(
    () => init.shiftStartHHMM,
  );
  const [earnedSoFar, setEarnedSoFar] = useState(() => init.earnedSoFar);

  const [offerPayout, setOfferPayout] = useState(() => init.offerPayout);
  const [finishHHMM, setFinishHHMM] = useState(() => init.finishHHMM);
  const [miles, setMiles] = useState(() => init.miles);
  const [costPerMile, setCostPerMile] = useState(() => init.costPerMile);
  const [bufferMinutes, setBufferMinutes] = useState(
    () => init.bufferMinutes,
  );
  const [pickupStoreType, setPickupStoreType] = useState(
    () => init.pickupStoreType,
  );
  const [pickupLocation, setPickupLocation] = useState(
    () => init.pickupLocation,
  );
  const [dropoffZone, setDropoffZone] = useState(() => init.dropoffZone);

  const [driverName, setDriverName] = useState(() => profileInit.driverName);
  const [driverId, setDriverId] = useState(() => settings?.driverId ?? "");
  const [vehicleType, setVehicleType] = useState<VehicleType>(
    () => profileInit.vehicleType,
  );

  const [activeTab, setActiveTab] = useState<TabId>("decider");

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

  const result: DecisionResult = computeDecision(input);
  const explanation = buildExplanation(input, result);

  const isOnline = useOnlineStatus();

  const resetOffer = () => {
    setOfferPayout(0);
    setMiles(0);
    setBufferMinutes(0);
    setPickupStoreType("");
    setPickupLocation("");
    setDropoffZone("");
  };

  const { canLogDecision, handleLogDecision } = useDecisionLogger({
    driverId,
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    bufferMinutes,
    pickupStoreType,
    pickupLocation,
    dropoffZone,
    result,
    explanation,
    isOnline,
    onAccept: () => {
      setEarnedSoFar((prev) => prev + result.netPayout);
      resetOffer();
    },
  });

  useAppPersistence({
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
    offerDraft: {
      offerPayout,
      finishHHMM,
      miles,
      bufferMinutes,
      pickupStoreType,
      pickupLocation,
      dropoffZone,
    },
  });

  useOfferUrlSync({
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    bufferMinutes,
  });

  useBackForwardCache();

  const finishLocal =
    result.finishIso &&
    new Date(result.finishIso).toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const handleSyncProfile = async () => {
    setIsSyncingProfile(true);
    setProfileSyncMessage(null);
    setProfileSyncStatus("idle");
    try {
      const driver = await syncDriverProfile({
        driverId,
        profile: {
          driverName,
          vehicleType,
          targetRatePerHour,
          costPerMile,
          decisionMode,
          preferredZones,
          preferredTimeBuckets,
        },
      });
      setDriverId(driver.id);
      setPreferredZones(driver.preferredZones ?? []);
      setPreferredTimeBuckets(driver.preferredTimeBuckets ?? []);
      setProfileSyncStatus("success");
      setProfileSyncMessage("Profile saved to backend.");
    } catch (err) {
      setProfileSyncStatus("error");
      setProfileSyncMessage(
        err instanceof Error ? err.message : "Failed to sync profile",
      );
    } finally {
      setIsSyncingProfile(false);
    }
  };

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isOnline={isOnline}
      driverId={driverId || null}
      setDriverId={setDriverId}
      driverName={driverName}
      setDriverName={setDriverName}
      vehicleType={vehicleType}
      setVehicleType={setVehicleType}
      preferredZones={preferredZones}
      setPreferredZones={setPreferredZones}
      preferredTimeBuckets={preferredTimeBuckets}
      setPreferredTimeBuckets={setPreferredTimeBuckets}
      targetRatePerHour={targetRatePerHour}
      setTargetRatePerHour={setTargetRatePerHour}
      shiftStartHHMM={shiftStartHHMM}
      setShiftStartHHMM={setShiftStartHHMM}
      earnedSoFar={earnedSoFar}
      setEarnedSoFar={setEarnedSoFar}
      offerPayout={offerPayout}
      setOfferPayout={setOfferPayout}
      finishHHMM={finishHHMM}
      setFinishHHMM={setFinishHHMM}
      miles={miles}
      setMiles={setMiles}
      costPerMile={costPerMile}
      setCostPerMile={setCostPerMile}
      bufferMinutes={bufferMinutes}
      setBufferMinutes={setBufferMinutes}
      pickupStoreType={pickupStoreType}
      setPickupStoreType={setPickupStoreType}
      pickupLocation={pickupLocation}
      setPickupLocation={setPickupLocation}
      dropoffZone={dropoffZone}
      setDropoffZone={setDropoffZone}
      result={result}
      explanation={explanation}
      finishLocal={finishLocal ?? null}
      canLogDecision={canLogDecision}
      onLogDecision={handleLogDecision}
      onResetOffer={resetOffer}
      decisionMode={decisionMode}
      setDecisionMode={setDecisionMode}
      onSyncProfile={handleSyncProfile}
      isSyncingProfile={isSyncingProfile}
      profileSyncStatus={profileSyncStatus}
      profileSyncMessage={profileSyncMessage}
    />
  );
}
