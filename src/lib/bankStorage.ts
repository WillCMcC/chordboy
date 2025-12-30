/**
 * IndexedDB storage for chord banks
 * Persists chord banks containing preset collections across page refreshes.
 */

import type {
  ChordBank,
  SerializedChordBank,
  Preset,
  SerializedPreset,
} from "../types";
import { initDB, STORE_NAMES } from "./dbUtils";

/** Storage key for banks array */
const BANKS_KEY = "chordBanks";

/** Storage key for active bank ID */
const ACTIVE_BANK_KEY = "activeBankId";

/** Default bank ID */
export const DEFAULT_BANK_ID = "default";

/** Default bank name */
export const DEFAULT_BANK_NAME = "Default";

/**
 * Serialize a ChordBank for storage.
 * Converts Map and Set to arrays for IndexedDB compatibility.
 */
function serializeBank(bank: ChordBank): SerializedChordBank {
  const serializedPresets: [string, SerializedPreset][] = Array.from(
    bank.presets.entries()
  ).map(([slot, preset]) => [
    slot,
    {
      ...preset,
      keys: Array.from(preset.keys),
    },
  ]);

  return {
    id: bank.id,
    name: bank.name,
    presets: serializedPresets,
    createdAt: bank.createdAt,
    updatedAt: bank.updatedAt,
  };
}

/**
 * Deserialize a ChordBank from storage.
 * Converts arrays back to Map and Set.
 */
function deserializeBank(serialized: SerializedChordBank): ChordBank {
  const presets = new Map<string, Preset>();

  for (const [slot, serializedPreset] of serialized.presets) {
    presets.set(slot, {
      ...serializedPreset,
      keys: new Set(serializedPreset.keys),
    });
  }

  return {
    id: serialized.id,
    name: serialized.name,
    presets,
    createdAt: serialized.createdAt,
    updatedAt: serialized.updatedAt,
  };
}

/**
 * Save all banks to IndexedDB.
 * @param banksMap - Map of bank IDs to bank data
 */
export async function saveBanksToStorage(
  banksMap: Map<string, ChordBank>
): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.BANKS], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.BANKS);

    const serializedBanks: [string, SerializedChordBank][] = Array.from(
      banksMap.entries()
    ).map(([id, bank]) => [id, serializeBank(bank)]);

    store.put(serializedBanks, BANKS_KEY);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error saving banks:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to save banks:", error);
    throw error;
  }
}

/**
 * Load all banks from IndexedDB.
 * @returns Map of bank IDs to bank data
 */
export async function loadBanksFromStorage(): Promise<Map<string, ChordBank>> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.BANKS], "readonly");
    const store = transaction.objectStore(STORE_NAMES.BANKS);
    const request = store.get(BANKS_KEY);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const data = request.result as
          | [string, SerializedChordBank][]
          | undefined;

        if (data && Array.isArray(data)) {
          const banksMap = new Map<string, ChordBank>();
          for (const [id, serialized] of data) {
            banksMap.set(id, deserializeBank(serialized));
          }
          resolve(banksMap);
        } else {
          resolve(new Map());
        }
      };
      request.onerror = () => {
        console.error("Error loading banks:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to load banks:", error);
    return new Map();
  }
}

/**
 * Save active bank ID to IndexedDB.
 * @param bankId - ID of the active bank
 */
export async function saveActiveBankId(bankId: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.BANKS], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.BANKS);

    store.put(bankId, ACTIVE_BANK_KEY);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error saving active bank ID:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to save active bank ID:", error);
    throw error;
  }
}

/**
 * Load active bank ID from IndexedDB.
 * @returns Active bank ID or null if not set
 */
export async function loadActiveBankId(): Promise<string | null> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.BANKS], "readonly");
    const store = transaction.objectStore(STORE_NAMES.BANKS);
    const request = store.get(ACTIVE_BANK_KEY);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result ?? null);
      };
      request.onerror = () => {
        console.error("Error loading active bank ID:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to load active bank ID:", error);
    return null;
  }
}

/**
 * Migrate existing presets to a default bank.
 * Called on first load after DB upgrade to preserve user's presets.
 * @returns The migrated bank, or null if no migration was needed
 */
export async function migrateExistingPresets(): Promise<ChordBank | null> {
  try {
    // Check if banks already exist
    const existingBanks = await loadBanksFromStorage();
    if (existingBanks.size > 0) {
      return null; // Already migrated
    }

    // Load existing presets from the presets store
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.PRESETS], "readonly");
    const store = transaction.objectStore(STORE_NAMES.PRESETS);

    const presets = new Map<string, Preset>();

    // Load presets from per-slot keys
    const loadPromises: Promise<void>[] = [];
    for (let i = 0; i <= 9; i++) {
      const slotKey = `preset-${i}`;
      const request = store.get(slotKey);

      loadPromises.push(
        new Promise<void>((resolve) => {
          request.onsuccess = () => {
            const data = request.result as SerializedPreset | undefined;
            if (data) {
              presets.set(String(i), {
                ...data,
                keys: new Set(data.keys),
              });
            }
            resolve();
          };
          request.onerror = () => {
            resolve(); // Ignore errors on individual slots
          };
        })
      );
    }

    await Promise.all(loadPromises);

    // Create default bank with existing presets
    const defaultBank: ChordBank = {
      id: DEFAULT_BANK_ID,
      name: DEFAULT_BANK_NAME,
      presets,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save the default bank
    const banksMap = new Map<string, ChordBank>();
    banksMap.set(DEFAULT_BANK_ID, defaultBank);
    await saveBanksToStorage(banksMap);

    // Set as active bank
    await saveActiveBankId(DEFAULT_BANK_ID);

    return defaultBank;
  } catch (error) {
    console.error("Failed to migrate existing presets:", error);
    return null;
  }
}

/**
 * Clear all banks from IndexedDB.
 */
export async function clearBanksFromStorage(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.BANKS], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.BANKS);

    store.delete(BANKS_KEY);
    store.delete(ACTIVE_BANK_KEY);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error clearing banks:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to clear banks:", error);
    throw error;
  }
}
