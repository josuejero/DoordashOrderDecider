// src/hooks/useDecisionLogger.ts
import { useCallback, useEffect, useState } from "react";
import type { DecisionResult } from "../lib/decision";
import {
  HISTORY_LIMIT,
  loadHistoryFromStorage,
  saveHistoryToStorage,
  type HistoryItem,
} from "../lib/decisionHistory";
import { syncDriverProfile, type DriverProfilePayload } from "../lib/driverApi";
import {
  evaluateOrder,
  type EvaluateOrderPayload,
  type QueuedOrderPayload,
} from "../lib/ordersApi";
import { cacheModelMetadata } from "../lib/offlineCache";
import {
  enqueuePendingDecision,
  listPendingDecisions,
  pendingDecisionCount,
  removePendingDecision,
  type PendingDecision,
} from "../lib/offlineQueue";
import type { DecisionMode, VehicleType } from "../lib/profile";

type DecisionLoggerOptions = {
  driverId?: string | null;
  setDriverId?: (value: string) => void;
  driverName: string;
  vehicleType: VehicleType;
  decisionMode: DecisionMode;
  preferredZones: string[];
  preferredTimeBuckets: string[];
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
  result: DecisionResult;
  explanation: string;
  isOnline: boolean;
  onAccept: () => void;
  onModelMetadata?: (meta: {
    version: string | null;
    mode: "heuristic" | "hybrid_ml" | null;
  }) => void;
};

type UseDecisionLoggerReturn = {
  history: HistoryItem[];
  canLogDecision: boolean;
  pendingQueueCount: number;
  handleLogDecision: (accepted: boolean) => void;
};

type DecisionApiOutcome = {
  ok: boolean;
  modelVersion: string | null;
  mode: "heuristic" | "hybrid_ml" | null;
};

function buildProfileSnapshot(options: DecisionLoggerOptions): DriverProfilePayload {
  return {
    driverName: options.driverName || "Driver",
    vehicleType: options.vehicleType,
    targetRatePerHour: options.targetRatePerHour,
    costPerMile: options.costPerMile,
    decisionMode: options.decisionMode,
    preferredZones: options.preferredZones,
    preferredTimeBuckets: options.preferredTimeBuckets,
  };
}

async function sendDecisionToApi(
  payload: EvaluateOrderPayload,
): Promise<DecisionApiOutcome> {
  try {
    const res = await evaluateOrder(payload);

    return {
      ok: true,
      modelVersion: res.modelVersion ?? null,
      mode: res.mode ?? null,
    };
  } catch (err) {
    console.info("Failed to sync decision to server", err);
    return {
      ok: false,
      modelVersion: null,
      mode: null,
    };
  }
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
    setDriverId,
    driverName,
    vehicleType,
    decisionMode,
    preferredZones,
    preferredTimeBuckets,
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
    onAccept,
    onModelMetadata,
  } = options;

  const [history, setHistory] = useState<HistoryItem[]>(() =>
    loadHistoryFromStorage(),
  );
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  const canLogDecision = offerPayout > 0 && !!finishHHMM;

  const resolveQueuedPayload = useCallback(
    async (item: PendingDecision): Promise<EvaluateOrderPayload | null> => {
      let resolvedDriverId = item.payload.driverId ?? driverId ?? null;

      if (!resolvedDriverId) {
        if (!isOnline) return null;

        try {
          const driver = await syncDriverProfile({
            profile:
              item.profileSnapshot ??
              {
                driverName: driverName || "Driver",
                vehicleType,
                targetRatePerHour,
                costPerMile,
                decisionMode,
                preferredZones,
                preferredTimeBuckets,
              },
          });
          resolvedDriverId = driver.id;
          setDriverId?.(driver.id);
        } catch (err) {
          console.info("Failed to provision driver for queued decision", err);
          return null;
        }
      }

      return { ...item.payload, driverId: resolvedDriverId };
    },
    [
      costPerMile,
      decisionMode,
      driverId,
      driverName,
      isOnline,
      preferredTimeBuckets,
      preferredZones,
      setDriverId,
      targetRatePerHour,
      vehicleType,
    ],
  );

  useEffect(() => {
    void pendingDecisionCount().then((count) => setPendingQueueCount(count));
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    void (async () => {
      const queued = await listPendingDecisions();
      if (!queued.length) {
        setPendingQueueCount(0);
        return;
      }

      for (const item of queued) {
        const resolved = await resolveQueuedPayload(item);
        if (!resolved) continue;

        const outcome = await sendDecisionToApi(resolved);
        if (outcome.ok) {
          await cacheModelMetadata({
            driverId: resolved.driverId,
            modelVersion: outcome.modelVersion,
            mode: outcome.mode ?? "heuristic",
          });
          onModelMetadata?.({
            version: outcome.modelVersion,
            mode: outcome.mode ?? "heuristic",
          });

          const remaining = await removePendingDecision(item.id);
          setPendingQueueCount(remaining);
        }
      }
    })();
  }, [isOnline, onModelMetadata, resolveQueuedPayload]);

  const ensureDriverId = async (): Promise<string | null> => {
    if (driverId) return driverId;
    if (!isOnline) return null;
    try {
      const driver = await syncDriverProfile({
        profile: buildProfileSnapshot(options),
      });
      setDriverId?.(driver.id);
      return driver.id;
    } catch (err) {
      console.info("Failed to auto-provision driver profile", err);
      return null;
    }
  };

  const handleLogDecision = (accepted: boolean) => {
    if (!canLogDecision) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const decidedAtIso = new Date().toISOString();
    const recommendedAccept = result.accept;
    const pickupStoreTypeClean = pickupStoreType.trim();
    const pickupLocationClean = pickupLocation.trim();
    const dropoffZoneClean = dropoffZone.trim();

    const item: HistoryItem = {
      id,
      decidedAtIso,
      recommendedAccept,
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
      pickupStoreType: pickupStoreTypeClean || null,
      pickupLocation: pickupLocationClean || null,
      dropoffZone: dropoffZoneClean || null,
    };

    setHistory((prev) => {
      const next = [item, ...prev].slice(0, HISTORY_LIMIT);
      saveHistoryToStorage(next);
      return next;
    });

    void (async () => {
      const resolvedDriverId = await ensureDriverId();
      const profileSnapshot = buildProfileSnapshot(options);

      const queuedPayload: QueuedOrderPayload = {
        driverId: resolvedDriverId,
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
        pickupStoreType: pickupStoreTypeClean || undefined,
        pickupLocation: pickupLocationClean || undefined,
        dropoffZone: dropoffZoneClean || undefined,
      };

      const payloadToSend: EvaluateOrderPayload | null = resolvedDriverId
        ? { ...queuedPayload, driverId: resolvedDriverId }
        : null;

      if (payloadToSend && isOnline) {
        const outcome = await sendDecisionToApi(payloadToSend);

        if (outcome.ok && resolvedDriverId) {
          await cacheModelMetadata({
            driverId: resolvedDriverId,
            modelVersion: outcome.modelVersion,
            mode: outcome.mode ?? "heuristic",
          });
          onModelMetadata?.({
            version: outcome.modelVersion,
            mode: outcome.mode ?? "heuristic",
          });
          return;
        }
      }

      const queuedCount = await enqueuePendingDecision(
        queuedPayload,
        profileSnapshot,
      );
      setPendingQueueCount(queuedCount);
    })();

    if (accepted) {
      onAccept();
    }
  };

  return { history, canLogDecision, pendingQueueCount, handleLogDecision };
}
