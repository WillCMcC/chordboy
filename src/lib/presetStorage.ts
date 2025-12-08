/**
 * IndexedDB storage for chord presets
 * Persists saved chord presets across page refreshes
 */

import type { Preset, SerializedPreset } from "../types";
import { initDB, STORE_NAMES } from "./dbUtils";

/** Serialized preset entry for storage */
type PresetEntry = [string, SerializedPreset];

/**
 * Save all presets to IndexedDB
 * @param presetsMap - Map of preset slot identifiers to preset data
 */
export async function savePresetsToStorage(
  presetsMap: Map<string, Preset>
): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.PRESETS], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.PRESETS);

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
    const transaction = db.transaction([STORE_NAMES.PRESETS], "readonly");
    const store = transaction.objectStore(STORE_NAMES.PRESETS);
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
    const transaction = db.transaction([STORE_NAMES.PRESETS], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.PRESETS);
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
