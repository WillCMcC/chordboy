/**
 * Persistence Hooks
 * Utilities for persisting state to localStorage and IndexedDB.
 *
 * @module hooks/usePersistence
 */

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Use state that persists to localStorage.
 * Synchronously reads initial value, writes on change.
 *
 * @param {string} key - localStorage key
 * @param {*} initialValue - Default value if key doesn't exist
 * @param {Object} [options] - Options
 * @param {Function} [options.serialize] - Custom serializer (default: JSON.stringify)
 * @param {Function} [options.deserialize] - Custom deserializer (default: JSON.parse)
 * @returns {[*, Function]} [value, setValue]
 *
 * @example
 * const [name, setName] = usePersistentState('user-name', 'Guest');
 */
export function usePersistentState(
  key,
  initialValue,
  { serialize = JSON.stringify, deserialize = JSON.parse } = {}
) {
  // Read initial value synchronously from localStorage
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? deserialize(stored) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Wrapped setter that persists to localStorage
  const setPersistedValue = useCallback(
    (newValue) => {
      setValue((prev) => {
        const resolved =
          typeof newValue === "function" ? newValue(prev) : newValue;
        try {
          localStorage.setItem(key, serialize(resolved));
        } catch (error) {
          console.warn(`Error writing localStorage key "${key}":`, error);
        }
        return resolved;
      });
    },
    [key, serialize]
  );

  return [value, setPersistedValue];
}

/**
 * Use state that persists to async storage (like IndexedDB).
 * Loads asynchronously on mount, saves on change after load completes.
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.load - Async function to load state, returns value or null
 * @param {Function} options.save - Async function to save state, receives value
 * @param {*} options.initialValue - Default value before load completes
 * @param {number} [options.debounceMs] - Debounce save operations (default: 0)
 * @returns {Object} { value, setValue, isLoaded, isLoading, error }
 *
 * @example
 * const { value: presets, setValue: setPresets, isLoaded } = useAsyncStorage({
 *   load: loadPresetsFromStorage,
 *   save: savePresetsToStorage,
 *   initialValue: new Map(),
 * });
 */
export function useAsyncStorage({
  load,
  save,
  initialValue,
  debounceMs = 0,
}) {
  const [value, setValue] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);
  const saveTimeoutRef = useRef(null);
  const pendingSaveRef = useRef(null);

  // Load on mount
  useEffect(() => {
    isMountedRef.current = true;

    const doLoad = async () => {
      try {
        const loadedValue = await load();
        if (isMountedRef.current) {
          if (loadedValue !== null && loadedValue !== undefined) {
            setValue(loadedValue);
          }
          setIsLoaded(true);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err);
          setIsLoading(false);
          setIsLoaded(true); // Mark as loaded even on error so saves work
          console.error("Error loading from async storage:", err);
        }
      }
    };

    doLoad();

    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Flush pending save on unmount
        if (pendingSaveRef.current !== null) {
          save(pendingSaveRef.current).catch(console.error);
        }
      }
    };
  }, [load, save]);

  // Save when value changes (after initial load)
  useEffect(() => {
    if (!isLoaded) return;

    const doSave = () => {
      pendingSaveRef.current = value;

      if (debounceMs > 0) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            await save(pendingSaveRef.current);
            pendingSaveRef.current = null;
          } catch (err) {
            console.error("Error saving to async storage:", err);
          }
        }, debounceMs);
      } else {
        save(value).catch((err) => {
          console.error("Error saving to async storage:", err);
        });
        pendingSaveRef.current = null;
      }
    };

    doSave();
  }, [value, isLoaded, save, debounceMs]);

  return {
    value,
    setValue,
    isLoaded,
    isLoading,
    error,
  };
}

/**
 * Use state that persists to IndexedDB via simple key-value store.
 * Wraps useAsyncStorage with IndexedDB-specific load/save functions.
 *
 * @param {string} dbName - IndexedDB database name
 * @param {string} storeName - Object store name
 * @param {string} key - Key within the store
 * @param {*} initialValue - Default value
 * @param {Object} [options] - Additional options
 * @param {number} [options.debounceMs] - Debounce save operations
 * @returns {Object} { value, setValue, isLoaded, isLoading, error }
 *
 * @example
 * const { value: settings, setValue: setSettings } = useIndexedDB(
 *   'chordboy',
 *   'settings',
 *   'user-prefs',
 *   { volume: 100 }
 * );
 */
export function useIndexedDB(
  dbName,
  storeName,
  key,
  initialValue,
  { debounceMs = 100 } = {}
) {
  const loadRef = useRef(async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const getRequest = store.get(key);

          getRequest.onsuccess = () => {
            db.close();
            resolve(getRequest.result ?? null);
          };

          getRequest.onerror = () => {
            db.close();
            reject(getRequest.error);
          };
        } catch (err) {
          db.close();
          reject(err);
        }
      };
    });
  });

  const saveRef = useRef(async (value) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction(storeName, "readwrite");
          const store = tx.objectStore(storeName);
          const putRequest = store.put(value, key);

          putRequest.onsuccess = () => {
            db.close();
            resolve();
          };

          putRequest.onerror = () => {
            db.close();
            reject(putRequest.error);
          };
        } catch (err) {
          db.close();
          reject(err);
        }
      };
    });
  });

  return useAsyncStorage({
    load: loadRef.current,
    save: saveRef.current,
    initialValue,
    debounceMs,
  });
}
