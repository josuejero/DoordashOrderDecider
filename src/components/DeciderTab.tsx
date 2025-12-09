import { useEffect, useState } from "react";
import type { DecisionInput, DecisionResult } from "../lib/decision";
import type { DecisionMode, VehicleType } from "../lib/profile";
import { DeciderOfferSection } from "./DeciderOfferSection";
import { DeciderShiftSection } from "./DeciderShiftSection";
type DeciderTabProps = {
  inputs: DecisionInput;
  onInputsChange: (inputs: DecisionInput) => void;
  decisionResult: DecisionResult | null;
  explanation: string[];
  driverName: string;
  vehicleType: VehicleType;
  decisionMode: DecisionMode;
  onLogDecision: (accepted: boolean) => void;
  onResetOffer: () => void;
  canLogDecision: boolean;
};
export function DeciderTab({
  inputs,
  onInputsChange,
  decisionResult,
  explanation,
  driverName,
  vehicleType,
  decisionMode,
  onLogDecision,
  onResetOffer,
  canLogDecision,
}: DeciderTabProps) {
  const [finishLocal, setFinishLocal] = useState<string | null>(null);
  useEffect(() => {
    if (inputs.finishHHMM) {
      const [hours, minutes] = inputs.finishHHMM.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      setFinishLocal(
        date.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      );
    } else {
      setFinishLocal(null);
    }
  }, [inputs.finishHHMM]);
  const updateInput = <K extends keyof DecisionInput>(
    key: K,
    value: DecisionInput[K],
  ) => {
    onInputsChange({ ...inputs, [key]: value });
  };
  if (!decisionResult) {
    return (
      <div className="space-y-6">
        <DeciderShiftSection
          driverName={driverName}
          vehicleType={vehicleType}
          targetRatePerHour={inputs.targetRatePerHour}
          setTargetRatePerHour={(value) =>
            updateInput("targetRatePerHour", value)
          }
          shiftStartHHMM={inputs.shiftStartHHMM}
          setShiftStartHHMM={(value) => updateInput("shiftStartHHMM", value)}
          earnedSoFar={inputs.earnedSoFar}
          setEarnedSoFar={(value) => updateInput("earnedSoFar", value)}
          decisionMode={decisionMode}
        />
        <p className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 text-slate-400">
          Loading decision...
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <DeciderShiftSection
        driverName={driverName}
        vehicleType={vehicleType}
        targetRatePerHour={inputs.targetRatePerHour}
        setTargetRatePerHour={(value) =>
          updateInput("targetRatePerHour", value)
        }
        shiftStartHHMM={inputs.shiftStartHHMM}
        setShiftStartHHMM={(value) => updateInput("shiftStartHHMM", value)}
        earnedSoFar={inputs.earnedSoFar}
        setEarnedSoFar={(value) => updateInput("earnedSoFar", value)}
        decisionMode={decisionMode}
      />

      <DeciderOfferSection
        offerPayout={inputs.offerPayout}
        setOfferPayout={(value) => updateInput("offerPayout", value)}
        finishHHMM={inputs.finishHHMM}
        setFinishHHMM={(value) => updateInput("finishHHMM", value)}
        miles={inputs.miles ?? 0}
        setMiles={(value) => updateInput("miles", value)}
        costPerMile={inputs.costPerMile ?? 0}
        setCostPerMile={(value) => updateInput("costPerMile", value)}
        bufferMinutes={inputs.bufferMinutes ?? 0}
        setBufferMinutes={(value) => updateInput("bufferMinutes", value)}
        pickupStoreType={(inputs as any).pickupStoreType || ""}
        setPickupStoreType={(value) =>
          onInputsChange({
            ...(inputs as any),
            pickupStoreType: value,
          } as DecisionInput)
        }
        pickupLocation={(inputs as any).pickupLocation || ""}
        setPickupLocation={(value) =>
          onInputsChange({
            ...(inputs as any),
            pickupLocation: value,
          } as DecisionInput)
        }
        dropoffZone={(inputs as any).dropoffZone || ""}
        setDropoffZone={(value) =>
          onInputsChange({
            ...(inputs as any),
            dropoffZone: value,
          } as DecisionInput)
        }
        result={decisionResult}
        explanation={explanation}
        finishLocal={finishLocal}
        canLogDecision={canLogDecision}
        onLogDecision={onLogDecision}
        onResetOffer={onResetOffer}
      />
    </div>
  );
}
