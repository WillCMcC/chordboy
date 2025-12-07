/**
 * IndexedDB storage for chord presets
 * Persists saved chord presets across page refreshes
 */

import type { Preset, SerializedPreset } from "../types";

const DB_NAME = "ChordBoyDB";
const DB_VERSION = 2; // v2 adds sequencer store
const STORE_NAME = "presets";
const SEQUENCER_STORE = "sequencer";

/** Serialized preset entry for storage */
type PresetEntry = [string, SerializedPreset];

/**
 * Initialize the IndexedDB database
 */
function initDB(): Promise<IDBDatabase> {
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      // Add sequencer store in v2
      if (!db.objectStoreNames.contains(SEQUENCER_STORE)) {
        db.createObjectStore(SEQUENCER_STORE);
      }
    };
  });
}

/**
 * Save all presets to IndexedDB
 * @param presetsMap - Map of preset slot identifiers to preset data
 */
export async function savePresetsToStorage(
  presetsMap: Map<string, Preset>
): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Convert Map to array of [key, value] pairs for storage
    const presetsArray: PresetEntry[] = Array.from(presetsMap.entries()).map(
      ([slot, preset]) => {
        // Convert Set to Array for serialization
        return [
          slot,
          {
            ...preset,
            keys: Array.from(preset.keys),
          },
        ];
      }
    );

    // Store the serialized presets
    store.put(presetsArray, "chordPresets");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error saving presets:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to save presets:", error);
  }
}

/**
 * Load all presets from IndexedDB
 * @returns Map of preset slot identifiers to preset data
 */
export async function loadPresetsFromStorage(): Promise<Map<string, Preset>> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get("chordPresets");

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const presetsArray = request.result as PresetEntry[] | undefined;
        if (presetsArray) {
          // Convert array back to Map and restore Sets
          // Handle both string and number slot keys for backwards compatibility
          const presetsMap = new Map<string, Preset>(
            presetsArray.map(([slot, preset]) => [
              String(slot),
              {
                ...preset,
                keys: new Set(preset.keys),
              },
            ])
          );
          resolve(presetsMap);
        } else {
          resolve(new Map());
        }
      };

      request.onerror = () => {
        console.error("Error loading presets:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to load presets:", error);
    return new Map();
  }
}

/**
 * Clear all presets from IndexedDB
 */
export async function clearPresetsFromStorage(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete("chordPresets");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error clearing presets:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to clear presets:", error);
  }
}
