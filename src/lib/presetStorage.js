/**
 * IndexedDB storage for chord presets
 * Persists saved chord presets across page refreshes
 */

const DB_NAME = "ChordBoyDB";
const DB_VERSION = 1;
const STORE_NAME = "presets";

/**
 * Initialize the IndexedDB database
 */
function initDB() {
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
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Save all presets to IndexedDB
 * @param {Map} presetsMap - Map of preset slot numbers to preset data
 */
export async function savePresetsToStorage(presetsMap) {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Convert Map to array of [key, value] pairs for storage
    const presetsArray = Array.from(presetsMap.entries()).map(
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
        console.log("Presets saved to IndexedDB");
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
 * @returns {Promise<Map>} Map of preset slot numbers to preset data
 */
export async function loadPresetsFromStorage() {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get("chordPresets");

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const presetsArray = request.result;
        if (presetsArray) {
          // Convert array back to Map and restore Sets
          const presetsMap = new Map(
            presetsArray.map(([slot, preset]) => [
              slot,
              {
                ...preset,
                keys: new Set(preset.keys),
              },
            ])
          );
          console.log("Presets loaded from IndexedDB:", presetsMap.size);
          resolve(presetsMap);
        } else {
          console.log("No saved presets found");
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
export async function clearPresetsFromStorage() {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete("chordPresets");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log("Presets cleared from IndexedDB");
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
