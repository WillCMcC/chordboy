/**
 * IndexedDB storage for sequencer state
 * Persists sequence, settings across page refreshes
 */

import type { SequencerState } from "../types";
import { initDB, STORE_NAMES } from "./dbUtils";

/**
 * Save sequencer state to IndexedDB
 * @param sequencerState - The sequencer state to save
 */
export async function saveSequencerToStorage(
  sequencerState: SequencerState
): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.SEQUENCER], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.SEQUENCER);

    // Store the sequencer state
    store.put(sequencerState, "sequencerState");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error saving sequencer:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to save sequencer:", error);
  }
}

/**
 * Load sequencer state from IndexedDB
 * @returns The saved sequencer state or null
 */
export async function loadSequencerFromStorage(): Promise<SequencerState | null> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.SEQUENCER], "readonly");
    const store = transaction.objectStore(STORE_NAMES.SEQUENCER);
    const request = store.get("sequencerState");

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const state = request.result as SequencerState | undefined;
        resolve(state || null);
      };

      request.onerror = () => {
        console.error("Error loading sequencer:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to load sequencer:", error);
    return null;
  }
}

/**
 * Clear sequencer state from IndexedDB
 */
export async function clearSequencerFromStorage(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.SEQUENCER], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.SEQUENCER);
    store.delete("sequencerState");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error clearing sequencer:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to clear sequencer:", error);
  }
}
