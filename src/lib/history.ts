import type {
  DecisionInput,
  DecisionReasonCode,
  DecisionResult,
} from "./decision";
export type HistorySyncStatus = "pending" | "synced" | "failed";
export type HistoryRecord = {
  id: string;
  createdAt: string;
  driverId?: string;
  input: DecisionInput;
  result: DecisionResult;
  reasonCode: DecisionReasonCode;
  reasonText: string;
  syncStatus: HistorySyncStatus;
};
const HISTORY_KEY = "doordash-decider:v1:history";
const QUEUE_KEY = "doordash-decider:v1:queue";
function safeParse<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}
export function loadHistory(): HistoryRecord[] {
  if (typeof window === "undefined") return [];
  return safeParse<HistoryRecord>(localStorage.getItem(HISTORY_KEY));
}
function saveHistory(records: HistoryRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 50)));
}
export function appendHistory(record: HistoryRecord): HistoryRecord[] {
  const existing = loadHistory();
  const next = [record, ...existing].slice(0, 50);
  saveHistory(next);
  return next;
}
export function enqueueForSync(record: HistoryRecord) {
  if (typeof window === "undefined") return;
  const queue = safeParse<HistoryRecord>(localStorage.getItem(QUEUE_KEY));
  queue.push(record);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}
async function flushQueueOnce(apiBaseUrl: string): Promise<void> {
  const queue = safeParse<HistoryRecord>(localStorage.getItem(QUEUE_KEY));
  if (!queue.length) return;
  const remaining: HistoryRecord[] = [];
  for (const rec of queue) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/orders/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: rec.driverId,
          ...rec.input,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      rec.syncStatus = "synced";
    } catch {
      rec.syncStatus = "failed";
      remaining.push(rec);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
export function installOnlineSync(apiBaseUrl: string) {
  if (typeof window === "undefined") return;
  const tryFlush = () => {
    if (navigator.onLine) {
      void flushQueueOnce(apiBaseUrl);
    }
  };
  window.addEventListener("online", tryFlush);
  tryFlush();
}
export type OfflineEvent = {
  id: string;
  type: "ORDER_DECIDED";
  payload: any;
  createdAt: string;
};
const PENDING_KEY = "dd_pending_events_v1";
export function getPendingEvents(): OfflineEvent[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
export function setPendingEvents(events: OfflineEvent[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(events));
}
export function enqueueOfflineEvent(event: OfflineEvent) {
  const existing = getPendingEvents();
  setPendingEvents([...existing, event]);
}
export interface InstallOnlineSyncOpts {
  apiBaseUrl: string;
  getDriverId: () => string | null;
}
