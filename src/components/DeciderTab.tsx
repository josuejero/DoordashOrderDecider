// src/components/DeciderTab.tsx
import type { DecisionResult } from "../lib/decision";
import type { DecisionMode, VehicleType } from "../lib/profile";
import { DeciderOfferSection } from "./DeciderOfferSection";
import { DeciderShiftSection } from "./DeciderShiftSection";

export type DeciderTabProps = {
  driverName: string;
  vehicleType: VehicleType;
  targetRatePerHour: number;
  setTargetRatePerHour: (value: number) => void;
  shiftStartHHMM: string;
  setShiftStartHHMM: (value: string) => void;
  earnedSoFar: number;
  setEarnedSoFar: (value: number) => void;
  decisionMode: DecisionMode;
  offerPayout: number;
  setOfferPayout: (value: number) => void;
  finishHHMM: string;
  setFinishHHMM: (value: string) => void;
  miles: number;
  setMiles: (value: number) => void;
  costPerMile: number;
  setCostPerMile: (value: number) => void;
  bufferMinutes: number;
  setBufferMinutes: (value: number) => void;
  pickupStoreType: string;
  setPickupStoreType: (value: string) => void;
  pickupLocation: string;
  setPickupLocation: (value: string) => void;
  dropoffZone: string;
  setDropoffZone: (value: string) => void;
  result: DecisionResult;
  explanation: string;
  finishLocal: string | null;
  canLogDecision: boolean;
  onLogDecision: (accepted: boolean) => void;
  onResetOffer: () => void;
};

export function DeciderTab(props: DeciderTabProps) {
  const {
    driverName,
    vehicleType,
    targetRatePerHour,
    setTargetRatePerHour,
    shiftStartHHMM,
    setShiftStartHHMM,
    earnedSoFar,
    setEarnedSoFar,
    decisionMode,
    offerPayout,
    setOfferPayout,
    finishHHMM,
    setFinishHHMM,
    miles,
    setMiles,
    costPerMile,
    setCostPerMile,
    bufferMinutes,
    setBufferMinutes,
    pickupStoreType,
    setPickupStoreType,
    pickupLocation,
    setPickupLocation,
    dropoffZone,
    setDropoffZone,
    result,
    explanation,
    finishLocal,
    canLogDecision,
    onLogDecision,
    onResetOffer,
  } = props;

  return (
    <>
      <DeciderShiftSection
        driverName={driverName}
        vehicleType={vehicleType}
        targetRatePerHour={targetRatePerHour}
        setTargetRatePerHour={setTargetRatePerHour}
        shiftStartHHMM={shiftStartHHMM}
        setShiftStartHHMM={setShiftStartHHMM}
        earnedSoFar={earnedSoFar}
        setEarnedSoFar={setEarnedSoFar}
        decisionMode={decisionMode}
      />

      <DeciderOfferSection
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
        finishLocal={finishLocal}
        canLogDecision={canLogDecision}
        onLogDecision={onLogDecision}
        onResetOffer={onResetOffer}
      />
    </>
  );
}
