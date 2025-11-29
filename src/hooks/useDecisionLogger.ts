// src/hooks/useDecisionLogger.ts
import { useState } from "react";
import type { DecisionResult } from "../lib/decision";
import {
  HISTORY_LIMIT,
  loadHistoryFromStorage,
  saveHistoryToStorage,
  type HistoryItem,
} from "../lib/decisionHistory";

type DecisionLoggerOptions = {
  offerPayout: number;
  finishHHMM: string;
  miles: number;
  costPerMile: number;
  bufferMinutes: number;
  result: DecisionResult;
  explanation: string;
  onAccept: () => void;
};

type UseDecisionLoggerReturn = {
  history: HistoryItem[];
  canLogDecision: boolean;
  handleLogDecision: (accepted: boolean) => void;
};

/**
 * Owns decision history updates and keeps the App component slimmer.
 * History is still persisted through the existing decisionHistory helpers.
 */
export function useDecisionLogger(
  options: DecisionLoggerOptions,
): UseDecisionLoggerReturn {
  const {
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    bufferMinutes,
    result,
    explanation,
    onAccept,
  } = options;

  const [history, setHistory] = useState<HistoryItem[]>(() =>
    loadHistoryFromStorage(),
  );

  const canLogDecision = offerPayout > 0 && !!finishHHMM;

  const handleLogDecision = (accepted: boolean) => {
    if (!canLogDecision) return;

     
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
      onAccept();
    }
  };

  return { history, canLogDecision, handleLogDecision };
}
