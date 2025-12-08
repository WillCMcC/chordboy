/**
 * Shared IndexedDB utilities
 * Common database initialization and constants used by storage modules.
 */

/** Database name for ChordBoy storage */
export const DB_NAME = "ChordBoyDB";

/** Current database version (v2 adds sequencer store) */
export const DB_VERSION = 2;

/** Object store names */
export const STORE_NAMES = {
  PRESETS: "presets",
  SEQUENCER: "sequencer",
} as const;

/**
 * Initialize the IndexedDB database.
 * Creates object stores for presets and sequencer if they don't exist.
 *
 * @returns Promise resolving to the opened IDBDatabase instance
 * @throws If IndexedDB is unavailable or database open fails
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create presets store if it doesn't exist (from v1)
      if (!db.objectStoreNames.contains(STORE_NAMES.PRESETS)) {
        db.createObjectStore(STORE_NAMES.PRESETS);
      }

      // Create sequencer store (added in v2)
      if (!db.objectStoreNames.contains(STORE_NAMES.SEQUENCER)) {
        db.createObjectStore(STORE_NAMES.SEQUENCER);
      }
    };
  });
}
