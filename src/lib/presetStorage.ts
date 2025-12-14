/**
 * IndexedDB storage for chord presets
 * Persists saved chord presets across page refreshes
 *
 * Uses per-slot keys to prevent race conditions on concurrent saves.
 * Each preset is stored with key "preset-{slot}" for atomic updates.
 */

import type { Preset, SerializedPreset } from "../types";
import { initDB, STORE_NAMES } from "./dbUtils";

/** Prefix for per-slot preset keys */
const PRESET_KEY_PREFIX = "preset-";

/** Legacy key for backwards compatibility migration */
const LEGACY_KEY = "chordPresets";

/** Serialized preset entry for legacy storage format */
type PresetEntry = [string, SerializedPreset];

/**
 * Save all presets to IndexedDB using per-slot keys.
 * Each preset is saved atomically to prevent race conditions.
 * @param presetsMap - Map of preset slot identifiers to preset data
 */
export async function savePresetsToStorage(
  presetsMap: Map<string, Preset>,
): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.PRESETS], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.PRESETS);

    // Save each preset with its own key for atomic updates
    for (const [slot, preset] of presetsMap.entries()) {
      const serialized: SerializedPreset = {
        ...preset,
        keys: Array.from(preset.keys),
      };
      store.put(serialized, `${PRESET_KEY_PREFIX}${slot}`);
    }

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
    throw error; // Re-throw so caller knows save failed
  }
}

/**
 * Save a single preset to IndexedDB.
 * Atomic operation - safe for concurrent saves to different slots.
 * @param slot - Preset slot identifier (e.g., "1", "2")
 * @param preset - Preset data to save
 */
export async function savePresetToStorage(
  slot: string,
  preset: Preset,
): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.PRESETS], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.PRESETS);

    const serialized: SerializedPreset = {
      ...preset,
      keys: Array.from(preset.keys),
    };
    store.put(serialized, `${PRESET_KEY_PREFIX}${slot}`);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error saving preset:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to save preset:", error);
    throw error;
  }
}

/**
 * Delete a single preset from IndexedDB.
 * @param slot - Preset slot identifier to delete
 */
export async function deletePresetFromStorage(slot: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.PRESETS], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.PRESETS);

    store.delete(`${PRESET_KEY_PREFIX}${slot}`);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error deleting preset:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to delete preset:", error);
    throw error;
  }
}

/**
 * Load all presets from IndexedDB.
 * Supports both new per-slot format and legacy array format for migration.
 * @returns Map of preset slot identifiers to preset data
 */
export async function loadPresetsFromStorage(): Promise<Map<string, Preset>> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.PRESETS], "readonly");
    const store = transaction.objectStore(STORE_NAMES.PRESETS);

    const presetsMap = new Map<string, Preset>();

    // First check for legacy format
    const legacyRequest = store.get(LEGACY_KEY);

    return new Promise((resolve, reject) => {
      legacyRequest.onsuccess = () => {
        const legacyData = legacyRequest.result;

        if (legacyData && Array.isArray(legacyData)) {
          // Legacy array format - migrate
          const legacyArray = legacyData as PresetEntry[];
          for (const [slot, preset] of legacyArray) {
            presetsMap.set(String(slot), {
              ...preset,
              keys: new Set(preset.keys),
            });
          }
        }

        // Also check for new per-slot format (slots 0-9)
        const slotPromises: Promise<void>[] = [];
        for (let i = 0; i <= 9; i++) {
          const slotKey = `${PRESET_KEY_PREFIX}${i}`;
          const slotRequest = store.get(slotKey);

          slotPromises.push(
            new Promise<void>((resolveSlot) => {
              slotRequest.onsuccess = () => {
                const slotData = slotRequest.result as
                  | SerializedPreset
                  | undefined;
                if (slotData) {
                  presetsMap.set(String(i), {
                    ...slotData,
                    keys: new Set(slotData.keys),
                  });
                }
                resolveSlot();
              };
              slotRequest.onerror = () => {
                // Ignore individual slot errors
                resolveSlot();
              };
            }),
          );
        }

        // Wait for all slot requests to complete
        Promise.all(slotPromises).then(() => {
          resolve(presetsMap);
        });
      };

      legacyRequest.onerror = () => {
        console.error("Error loading presets:", legacyRequest.error);
        reject(legacyRequest.error);
      };
    });
  } catch (error) {
    console.error("Failed to load presets:", error);
    return new Map();
  }
}

/**
 * Clear all presets from IndexedDB.
 * Removes both new per-slot keys and legacy format.
 */
export async function clearPresetsFromStorage(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.PRESETS], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.PRESETS);

    // Delete legacy key
    store.delete(LEGACY_KEY);

    // Delete all per-slot keys (0-9)
    for (let i = 0; i <= 9; i++) {
      store.delete(`${PRESET_KEY_PREFIX}${i}`);
    }

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
    throw error;
  }
}
