/**
 * IndexedDB storage for custom synth patches
 * Persists custom synth patches across page refreshes
 *
 * @module lib/patchStorage
 */

import type { CustomPatch, SerializedCustomPatch } from "../types/synth";
import { initDB, STORE_NAMES } from "./dbUtils";
import { validatePatch } from "./patchValidation";

/** Serialized patch entry for storage */
type PatchEntry = [string, SerializedCustomPatch];

/**
 * Save all custom patches to IndexedDB
 * @param patchesMap - Map of patch IDs to patch data
 */
export async function savePatchesToStorage(
  patchesMap: Map<string, CustomPatch>
): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.PATCHES], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.PATCHES);

    // Convert Map to array of [key, value] pairs for storage
    // CustomPatch is already fully serializable (no Sets/Maps)
    const patchesArray: PatchEntry[] = Array.from(patchesMap.entries());

    // Store the serialized patches
    store.put(patchesArray, "customPatches");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error saving patches:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to save patches:", error);
  }
}

/**
 * Load all custom patches from IndexedDB
 * @returns Map of patch IDs to patch data
 */
export async function loadPatchesFromStorage(): Promise<Map<string, CustomPatch>> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.PATCHES], "readonly");
    const store = transaction.objectStore(STORE_NAMES.PATCHES);
    const request = store.get("customPatches");

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const patchesArray = request.result as PatchEntry[] | undefined;
        if (patchesArray) {
          // Convert array back to Map, validating each patch
          const patchesMap = new Map<string, CustomPatch>();
          for (const [id, patch] of patchesArray) {
            if (validatePatch(patch)) {
              patchesMap.set(String(id), patch);
            } else {
              console.warn(
                `Invalid patch data for ID "${id}", skipping. Patch name: ${
                  (patch as any)?.name || "unknown"
                }`
              );
            }
          }
          resolve(patchesMap);
        } else {
          resolve(new Map());
        }
      };

      request.onerror = () => {
        console.error("Error loading patches:", request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error("Failed to load patches:", error);
    return new Map();
  }
}

/**
 * Clear all custom patches from IndexedDB
 */
export async function clearPatchesFromStorage(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAMES.PATCHES], "readwrite");
    const store = transaction.objectStore(STORE_NAMES.PATCHES);
    store.delete("customPatches");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error("Error clearing patches:", transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error("Failed to clear patches:", error);
  }
}
