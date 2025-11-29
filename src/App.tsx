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
import {
  getInitialProfileState,
  type VehicleType,
} from "./lib/profile";
import { loadSettings } from "./lib/storage";
import type { TabId } from "./lib/tabs";

export default function App() {
  const init = getInitialInputs();
  const profileInit = getInitialProfileState();
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

  const [driverName, setDriverName] = useState(() => profileInit.driverName);
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

  const resetOffer = () => {
    setOfferPayout(0);
    setMiles(0);
    setBufferMinutes(0);
  };

  const { canLogDecision, handleLogDecision } = useDecisionLogger({
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    bufferMinutes,
    result,
    explanation,
    onAccept: () => {
      setEarnedSoFar((prev) => prev + result.netPayout);
      resetOffer();
    },
  });

  const isOnline = useOnlineStatus();

  useAppPersistence({
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    costPerMile,
    driverName,
    vehicleType,
    offerDraft: {
      offerPayout,
      finishHHMM,
      miles,
      bufferMinutes,
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

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isOnline={isOnline}
      driverId={settings?.driverId ?? null}
      driverName={driverName}
      setDriverName={setDriverName}
      vehicleType={vehicleType}
      setVehicleType={setVehicleType}
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
      result={result}
      explanation={explanation}
      finishLocal={finishLocal ?? null}
      canLogDecision={canLogDecision}
      onLogDecision={handleLogDecision}
      onResetOffer={resetOffer}
    />
  );
}
