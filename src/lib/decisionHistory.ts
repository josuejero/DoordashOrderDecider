// src/lib/decisionHistory.ts
export type HistoryItem = {
  id: string;
  decidedAtIso: string;
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
};

const HISTORY_KEY = "doordash-decider:v1:history";
export const HISTORY_LIMIT = 50;

export function loadHistoryFromStorage(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistoryToStorage(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}
