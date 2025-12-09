export type EvaluateOrderPayload = {
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
  pickupStoreType?: string;
  pickupLocation?: string;
  dropoffZone?: string;
  finalDecision: "ACCEPT" | "REJECT";
};
export type QueuedOrderPayload = Omit<EvaluateOrderPayload, "driverId"> & {
  driverId: string | null;
};
export type EvaluateOrderResponse = {
  orderId: string;
  decisionId: string;
  recommendedDecision: "ACCEPT" | "REJECT";
  finalDecision: "ACCEPT" | "REJECT";
  mode: "heuristic" | "hybrid_ml";
  usedMl: boolean;
  modelVersion: string | null;
};
export async function evaluateOrder(
  payload: EvaluateOrderPayload,
): Promise<EvaluateOrderResponse> {
  const res = await fetch("/api/orders/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(
      `Failed to log order (${res.status} ${res.statusText}): ${detail}`,
    );
  }
  return (await res.json()) as EvaluateOrderResponse;
}
