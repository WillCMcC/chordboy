/**
 * IndexedDB storage for sequencer state
 * Persists sequence, settings across page refreshes
 */

const DB_NAME = "ChordBoyDB";
const DB_VERSION = 2; // Bump version to add sequencer store
const PRESETS_STORE = "presets";
const SEQUENCER_STORE = "sequencer";

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

      // Create presets store if it doesn't exist (from v1)
      if (!db.objectStoreNames.contains(PRESETS_STORE)) {
        db.createObjectStore(PRESETS_STORE);
      }

      // Create sequencer store (new in v2)
      if (!db.objectStoreNames.contains(SEQUENCER_STORE)) {
        db.createObjectStore(SEQUENCER_STORE);
      }
    };
  });
}

/**
 * Save sequencer state to IndexedDB
 * @param {Object} sequencerState - The sequencer state to save
 */
export async function saveSequencerToStorage(sequencerState) {
  try {
    const db = await initDB();
    const transaction = db.transaction([SEQUENCER_STORE], "readwrite");
    const store = transaction.objectStore(SEQUENCER_STORE);

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
 * @returns {Promise<Object|null>} The saved sequencer state or null
 */
export async function loadSequencerFromStorage() {
  try {
    const db = await initDB();
    const transaction = db.transaction([SEQUENCER_STORE], "readonly");
    const store = transaction.objectStore(SEQUENCER_STORE);
    const request = store.get("sequencerState");

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const state = request.result;
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
export async function clearSequencerFromStorage() {
  try {
    const db = await initDB();
    const transaction = db.transaction([SEQUENCER_STORE], "readwrite");
    const store = transaction.objectStore(SEQUENCER_STORE);
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
