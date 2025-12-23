/**
 * useProgressionSettings Hook
 * Manages settings for chord progression generation.
 * Persists "true random mode" setting to localStorage.
 *
 * @module hooks/useProgressionSettings
 */

import { usePersistentState } from "./usePersistence";

/** Return type for useProgressionSettings */
export interface UseProgressionSettingsReturn {
  /** Whether true random mode is enabled (bypasses smart progression) */
  trueRandomMode: boolean;
  /** Setter for true random mode */
  setTrueRandomMode: (enabled: boolean) => void;
}

/** localStorage key for progression settings */
const STORAGE_KEY = "chordboy-progression-settings";

/**
 * Hook for managing chord progression generation settings.
 *
 * @returns Settings state and setters
 *
 * @example
 * const { trueRandomMode, setTrueRandomMode } = useProgressionSettings();
 */
export function useProgressionSettings(): UseProgressionSettingsReturn {
  const [trueRandomMode, setTrueRandomMode] = usePersistentState<boolean>(
    STORAGE_KEY,
    false
  );

  return {
    trueRandomMode,
    setTrueRandomMode,
  };
}
