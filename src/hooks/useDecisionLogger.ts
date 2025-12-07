// src/hooks/useDecisionLogger.ts
import { useEffect, useState } from "react";
import type { DecisionResult } from "../lib/decision";
import {
  HISTORY_LIMIT,
  loadHistoryFromStorage,
  saveHistoryToStorage,
  type HistoryItem,
} from "../lib/decisionHistory";

type DecisionLoggerOptions = {
  driverId?: string | null;
  targetRatePerHour: number;
  shiftStartHHMM: string;
  earnedSoFar: number;
  offerPayout: number;
  finishHHMM: string;
  miles: number;
  costPerMile: number;
  bufferMinutes: number;
  result: DecisionResult;
  explanation: string;
  isOnline: boolean;
  onAccept: () => void;
};

type UseDecisionLoggerReturn = {
  history: HistoryItem[];
  canLogDecision: boolean;
  handleLogDecision: (accepted: boolean) => void;
};

const ANALYTICS_QUEUE_KEY = "dd:pending-analytics-v1";

type PendingAnalyticsPayload = {
  id: string;
  payload: {
    driverId: string;
    platform: "doordash";
    targetRatePerHour: number;
    shiftStartHHMM: string;
    earnedSoFar: number;
    offerPayout: number;
    finishHHMM: string;
    miles?: number;
    costPerMile?: number;
    bufferMinutes?: number;
    finalDecision: "ACCEPT" | "REJECT";
  };
};

function loadQueue(): PendingAnalyticsPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ANALYTICS_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: PendingAnalyticsPayload[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ANALYTICS_QUEUE_KEY,
      JSON.stringify(queue.slice(0, 50)),
    );
  } catch {
    // ignore best-effort sync errors
  }
}

async function sendDecisionToApi(
  payload: PendingAnalyticsPayload["payload"],
): Promise<boolean> {
  try {
    const res = await fetch("/api/orders/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.info("Failed to sync decision to server", err);
    return false;
  }
}

async function flushAnalyticsQueue() {
  const queue = loadQueue();
  if (!queue.length) return;

  const remaining: PendingAnalyticsPayload[] = [];
  for (const item of queue) {
    const ok = await sendDecisionToApi(item.payload);
    if (!ok) {
      remaining.push(item);
    }
  }

  saveQueue(remaining);
}

/**
 * Owns decision history updates and keeps the App component slimmer.
 * History is still persisted through the existing decisionHistory helpers.
 */
export function useDecisionLogger(
  options: DecisionLoggerOptions,
): UseDecisionLoggerReturn {
  const {
    driverId,
    targetRatePerHour,
    shiftStartHHMM,
    earnedSoFar,
    offerPayout,
    finishHHMM,
    miles,
    costPerMile,
    bufferMinutes,
    result,
    explanation,
    isOnline,
    onAccept,
  } = options;

  const [history, setHistory] = useState<HistoryItem[]>(() =>
    loadHistoryFromStorage(),
  );

  const canLogDecision = offerPayout > 0 && !!finishHHMM;

  useEffect(() => {
    if (!driverId || !isOnline) return;
    void flushAnalyticsQueue();
  }, [driverId, isOnline]);

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

    const pendingPayload: PendingAnalyticsPayload["payload"] | null =
      driverId
        ? {
            driverId,
            platform: "doordash",
            targetRatePerHour,
            shiftStartHHMM,
            earnedSoFar,
            offerPayout,
            finishHHMM,
            miles: Number.isFinite(miles) ? miles : undefined,
            costPerMile: Number.isFinite(costPerMile) ? costPerMile : undefined,
            bufferMinutes: Number.isFinite(bufferMinutes)
              ? bufferMinutes
              : undefined,
            finalDecision: accepted ? "ACCEPT" : "REJECT",
          }
        : null;

    if (pendingPayload) {
      const payloadWithId: PendingAnalyticsPayload = {
        id,
        payload: pendingPayload,
      };

      void (async () => {
        const ok = await sendDecisionToApi(pendingPayload);
        if (!ok) {
          const nextQueue = [payloadWithId, ...loadQueue()];
          saveQueue(nextQueue);
        }
      })();
    }

    if (accepted) {
      onAccept();
    }
  };

  return { history, canLogDecision, handleLogDecision };
}
