const DB_NAME = "ambrosia-btc";
const DB_VERSION = 1;
const STORE_NAME = "pending-checkouts";
const SYNC_TAG = "btc-checkout";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "paymentHash" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(storeName, mode, callback) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = callback(store);

    if (result && typeof result.onsuccess !== "undefined") {
      result.onsuccess = () => resolve(result.result);
      result.onerror = () => reject(result.error);
    } else {
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
    }
  }));
}

export async function savePendingCheckout(payload) {
  const entry = {
    paymentHash: payload.paymentHash,
    checkoutPayload: payload.checkoutPayload,
    status: "pending",
    savedAt: Date.now(),
  };
  return runTransaction(STORE_NAME, "readwrite", (store) => store.put(entry));
}

export async function markCheckoutCompleted(paymentHash, completedResult) {
  const existing = await runTransaction(STORE_NAME, "readonly", (store) => store.get(paymentHash));
  const updated = existing
    ? { ...existing, status: "completed", completedResult, completedAt: Date.now() }
    : { paymentHash, status: "completed", completedResult, completedAt: Date.now() };
  return runTransaction(STORE_NAME, "readwrite", (store) => store.put(updated));
}

function getAllByStatus(status) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const getAllRequest = store.getAll();
    getAllRequest.onsuccess = () => resolve((getAllRequest.result || []).filter((entry) => entry.status === status));
    getAllRequest.onerror = () => reject(getAllRequest.error);
  }));
}

export function getPendingCheckouts() {
  return getAllByStatus("pending");
}

export function getCompletedCheckouts() {
  return getAllByStatus("completed");
}

export async function deleteCheckout(paymentHash) {
  return runTransaction(STORE_NAME, "readwrite", (store) => store.delete(paymentHash));
}

export async function registerBtcCheckoutSync() {
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator) || !("SyncManager" in self)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(SYNC_TAG);
  } catch {
    // Browser doesn't support Background Sync — page-based recovery handles it
  }
}
