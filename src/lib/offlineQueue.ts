import type { DriverProfilePayload } from "./driverApi";
import type { QueuedOrderPayload } from "./ordersApi";

const DB_NAME = "dd-decider-offline";
const STORE = "pending-evaluations";
const VERSION = 1;

export type PendingDecision = {
  id: string;
  createdAt: number;
  payload: QueuedOrderPayload;
  profileSnapshot?: DriverProfilePayload;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("failed to open indexedDB"));
  });
}

async function runInStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const request = fn(store);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error("indexedDB operation failed"));
  });
}

export async function pendingDecisionCount(): Promise<number> {
  try {
    return await runInStore("readonly", (store) => store.count());
  } catch {
    return 0;
  }
}

export async function enqueuePendingDecision(
  payload: QueuedOrderPayload,
  profileSnapshot?: DriverProfilePayload,
): Promise<number> {
  const record: PendingDecision = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    payload,
    profileSnapshot,
  };

  try {
    await runInStore("readwrite", (store) => store.put(record));
    return await pendingDecisionCount();
  } catch {
    return 0;
  }
}

export async function listPendingDecisions(): Promise<PendingDecision[]> {
  try {
    return await runInStore("readonly", (store) => store.getAll());
  } catch {
    return [];
  }
}

export async function removePendingDecision(id: string): Promise<number> {
  try {
    await runInStore("readwrite", (store) => store.delete(id));
    return await pendingDecisionCount();
  } catch {
    return 0;
  }
}
