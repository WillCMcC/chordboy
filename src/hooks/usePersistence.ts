/**
 * Persistence Hooks
 * Utilities for persisting state to localStorage and IndexedDB.
 *
 * @module hooks/usePersistence
 */

import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from "react";

/** Options for usePersistentState */
interface PersistentStateOptions<T> {
  /** Custom serializer (default: JSON.stringify) */
  serialize?: (value: T) => string;
  /** Custom deserializer (default: JSON.parse) */
  deserialize?: (value: string) => T;
}

/** Return type for usePersistentState */
export type UsePersistentStateReturn<T> = [T, Dispatch<SetStateAction<T>>];

/**
 * Use state that persists to localStorage.
 * Synchronously reads initial value, writes on change.
 *
 * @param key - localStorage key
 * @param initialValue - Default value if key doesn't exist
 * @param options - Options for serialization
 * @returns [value, setValue]
 *
 * @example
 * const [name, setName] = usePersistentState('user-name', 'Guest');
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  { serialize = JSON.stringify, deserialize = JSON.parse }: PersistentStateOptions<T> = {}
): UsePersistentStateReturn<T> {
  // Read initial value synchronously from localStorage
  const [value, setValue] = useState<T>(() => {
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
    (newValue: SetStateAction<T>): void => {
      setValue((prev) => {
        const resolved =
          typeof newValue === "function" ? (newValue as (prev: T) => T)(prev) : newValue;
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

/** Options for useAsyncStorage */
export interface AsyncStorageOptions<T> {
  /** Async function to load state, returns value or null */
  load: () => Promise<T | null>;
  /** Async function to save state, receives value */
  save: (value: T) => Promise<void>;
  /** Default value before load completes */
  initialValue: T;
  /** Debounce save operations (default: 0) */
  debounceMs?: number;
}

/** Return type for useAsyncStorage */
export interface UseAsyncStorageReturn<T> {
  /** Current value */
  value: T;
  /** Set value function */
  setValue: Dispatch<SetStateAction<T>>;
  /** True if initial load is complete */
  isLoaded: boolean;
  /** True while initial load is in progress */
  isLoading: boolean;
  /** Error from load operation, if any */
  error: Error | null;
}

/**
 * Use state that persists to async storage (like IndexedDB).
 * Loads asynchronously on mount, saves on change after load completes.
 *
 * @param options - Configuration options
 * @returns Object with value, setValue, isLoaded, isLoading, error
 *
 * @example
 * const { value: presets, setValue: setPresets, isLoaded } = useAsyncStorage({
 *   load: loadPresetsFromStorage,
 *   save: savePresetsToStorage,
 *   initialValue: new Map(),
 * });
 */
export function useAsyncStorage<T>({
  load,
  save,
  initialValue,
  debounceMs = 0,
}: AsyncStorageOptions<T>): UseAsyncStorageReturn<T> {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef<boolean>(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<T | null>(null);

  // Load on mount
  useEffect(() => {
    isMountedRef.current = true;

    const doLoad = async (): Promise<void> => {
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
          setError(err as Error);
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

    const doSave = (): void => {
      pendingSaveRef.current = value;

      if (debounceMs > 0) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            if (pendingSaveRef.current !== null) {
              await save(pendingSaveRef.current);
            }
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

/** Options for useIndexedDB */
interface IndexedDBOptions {
  /** Debounce save operations (default: 100) */
  debounceMs?: number;
}

/**
 * Use state that persists to IndexedDB via simple key-value store.
 * Wraps useAsyncStorage with IndexedDB-specific load/save functions.
 *
 * @param dbName - IndexedDB database name
 * @param storeName - Object store name
 * @param key - Key within the store
 * @param initialValue - Default value
 * @param options - Additional options
 * @returns Object with value, setValue, isLoaded, isLoading, error
 *
 * @example
 * const { value: settings, setValue: setSettings } = useIndexedDB(
 *   'chordboy',
 *   'settings',
 *   'user-prefs',
 *   { volume: 100 }
 * );
 */
export function useIndexedDB<T>(
  dbName: string,
  storeName: string,
  key: string,
  initialValue: T,
  { debounceMs = 100 }: IndexedDBOptions = {}
): UseAsyncStorageReturn<T> {
  const loadRef = useRef(async (): Promise<T | null> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
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
            resolve((getRequest.result as T) ?? null);
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

  const saveRef = useRef(async (value: T): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
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
