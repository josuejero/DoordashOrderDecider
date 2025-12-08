

// src/lib/decisionHistory.ts
export type HistoryItem = {
  id: string;
  decidedAtIso: string;
  recommendedAccept: boolean;
  accept: boolean;
  payout: number;
  miles: number | null;
  costPerMile: number | null;
  bufferMinutes: number;
  netPayout: number;
  requiredDollars: number;
  projectedGrossPerHour: number;
  projectedNetPerHour: number;
  explanation: string;
  pickupStoreType?: string | null;
  pickupLocation?: string | null;
  dropoffZone?: string | null;
};

const HISTORY_KEY = "doordash-decider:v1:history";
export const HISTORY_LIMIT = 50;

export function loadHistoryFromStorage(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      ...item,
      recommendedAccept:
        typeof item.recommendedAccept === "boolean"
          ? item.recommendedAccept
          : item.accept,
      miles: item.miles ?? null,
      costPerMile: item.costPerMile ?? null,
      pickupStoreType: item.pickupStoreType ?? null,
      pickupLocation: item.pickupLocation ?? null,
      dropoffZone: item.dropoffZone ?? null,
    }));
  } catch {
    return [];
  }
}

export function saveHistoryToStorage(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    const limited = items.slice(0, HISTORY_LIMIT);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(limited));
  } catch {
    // ignore
  }
}
