/**
 * usePresets Hook
 * Manages chord preset storage, recall, and persistence to IndexedDB.
 * Provides save/recall/clear operations for chord presets.
 *
 * Architecture Note:
 * Uses useAsyncStorage for persistence, which handles load-on-mount
 * and save-on-change in a single consolidated pattern.
 *
 * @module hooks/usePresets
 */

import { useState, useCallback, useRef, useMemo, Dispatch, SetStateAction } from "react";
import {
  loadPresetsFromStorage,
  savePresetsToStorage,
} from "../lib/presetStorage";
import { solveChordVoicings } from "../lib/chordSolver";
import { useAsyncStorage } from "./usePersistence";
import type { Preset, Octave, VoicingStyle } from "../types";

/** Preset data input for saving */
export interface PresetInput {
  /** The keyboard keys that make up this chord */
  keys: Set<string>;
  /** The octave setting (0-7) */
  octave: Octave;
  /** Which inversion to use */
  inversionIndex?: number;
  /** How many notes are dropped down an octave (legacy) */
  droppedNotes?: number;
  /** How much spread is applied (0-3) */
  spreadAmount?: number;
  /** Jazz voicing style */
  voicingStyle?: VoicingStyle;
}

/** Options for usePresets */
export interface UsePresetsOptions {
  /** Default octave for new presets */
  defaultOctave?: Octave;
}

/** Voicing updates for presets */
export interface PresetVoicingUpdates {
  octave?: Octave;
  inversionIndex?: number;
  droppedNotes?: number;
  spreadAmount?: number;
  voicingStyle?: VoicingStyle;
}

/** Return type for usePresets */
export interface UsePresetsReturn {
  // State
  savedPresets: Map<string, Preset>;
  recalledKeys: Set<string> | null;
  recalledOctave: Octave | null;
  recalledInversion: number | null;
  recalledDrop: number | null;
  recalledSpread: number | null;
  recalledVoicingStyle: VoicingStyle | null;
  activePresetSlot: string | null;
  isLoaded: boolean;

  // Actions
  savePreset: (slotNumber: string, presetData: PresetInput) => boolean;
  recallPreset: (slotNumber: string) => Preset | null;
  stopRecalling: () => void;
  clearPreset: (slotNumber: string) => void;
  clearAllPresets: () => void;
  updatePresetVoicing: (slotNumber: string, updates: PresetVoicingUpdates) => void;
  findNextAvailableSlot: () => string | null;
  solvePresetVoicings: (selectedSlots: string[], targetOctave: Octave, spreadPreference?: number) => boolean;

  // State setters for direct manipulation
  setRecalledKeys: Dispatch<SetStateAction<Set<string> | null>>;
  setRecalledOctave: Dispatch<SetStateAction<Octave | null>>;
  setRecalledInversion: Dispatch<SetStateAction<number | null>>;
  setRecalledDrop: Dispatch<SetStateAction<number | null>>;
  setRecalledSpread: Dispatch<SetStateAction<number | null>>;
  setRecalledVoicingStyle: Dispatch<SetStateAction<VoicingStyle | null>>;
  setActivePresetSlot: Dispatch<SetStateAction<string | null>>;
}

/**
 * Hook for managing chord presets with persistence.
 *
 * @param options - Configuration options
 * @returns Preset management functions and state
 *
 * @example
 * const {
 *   savedPresets,
 *   savePreset,
 *   recallPreset,
 *   clearPreset,
 * } = usePresets({ defaultOctave: 4 });
 */
export function usePresets({ defaultOctave: _defaultOctave = 4 }: UsePresetsOptions = {}): UsePresetsReturn {
  // Memoize storage functions to prevent re-subscriptions
  const storageConfig = useMemo(
    () => ({
      load: loadPresetsFromStorage,
      save: savePresetsToStorage,
      initialValue: new Map<string, Preset>(),
      debounceMs: 100, // Debounce saves to avoid excessive writes
    }),
    []
  );

  // Use async storage for preset persistence
  // This replaces the two separate useEffect hooks for load/save
  const {
    value: savedPresets,
    setValue: setSavedPresets,
    isLoaded,
  } = useAsyncStorage(storageConfig);

  /** Currently recalled keys */
  const [recalledKeys, setRecalledKeys] = useState<Set<string> | null>(null);

  /** Octave from recalled preset */
  const [recalledOctave, setRecalledOctave] = useState<Octave | null>(null);

  /** Inversion from recalled preset */
  const [recalledInversion, setRecalledInversion] = useState<number | null>(null);

  /** Dropped notes from recalled preset */
  const [recalledDrop, setRecalledDrop] = useState<number | null>(null);

  /** Spread amount from recalled preset */
  const [recalledSpread, setRecalledSpread] = useState<number | null>(null);

  /** Voicing style from recalled preset */
  const [recalledVoicingStyle, setRecalledVoicingStyle] = useState<VoicingStyle | null>(null);

  /** Currently active preset slot */
  const [activePresetSlot, setActivePresetSlot] = useState<string | null>(null);

  // Ref to always have current savedPresets (avoids stale closure issues)
  const savedPresetsRef = useRef<Map<string, Preset>>(savedPresets);
  savedPresetsRef.current = savedPresets;

  /**
   * Save a chord to a specific slot.
   */
  const savePreset = useCallback((slotNumber: string, presetData: PresetInput): boolean => {
    if (!presetData || !presetData.keys || presetData.keys.size === 0) {
      return false;
    }

    setSavedPresets((prev) => {
      const newPresets = new Map(prev);
      newPresets.set(slotNumber, {
        keys: new Set(presetData.keys),
        octave: presetData.octave,
        inversionIndex: presetData.inversionIndex || 0,
        droppedNotes: presetData.droppedNotes || 0,
        spreadAmount: presetData.spreadAmount || 0,
        voicingStyle: presetData.voicingStyle || "close",
      });
      return newPresets;
    });

    return true;
  }, [setSavedPresets]);

  /**
   * Recall a preset from a slot, making it the active chord.
   * Uses savedPresetsRef to ensure we always read the current Map.
   * Sets all recalled voicing state from the preset.
   */
  const recallPreset = useCallback(
    (slotNumber: string): Preset | null => {
      // Use ref to always get the current savedPresets
      const currentPresets = savedPresetsRef.current;
      if (!currentPresets.has(slotNumber)) {
        return null;
      }

      const preset = currentPresets.get(slotNumber)!;
      setRecalledKeys(preset.keys);
      setRecalledOctave(preset.octave);
      setRecalledInversion(preset.inversionIndex ?? 0);
      setRecalledDrop(preset.droppedNotes ?? 0);
      setRecalledSpread(preset.spreadAmount ?? 0);
      setRecalledVoicingStyle(preset.voicingStyle ?? "close");
      setActivePresetSlot(slotNumber);

      return preset;
    },
    [] // No dependencies - uses ref which is always current
  );

  /**
   * Stop recalling the current preset, clearing the active state.
   */
  const stopRecalling = useCallback((): void => {
    setRecalledKeys(null);
    setRecalledOctave(null);
    setRecalledInversion(null);
    setRecalledDrop(null);
    setRecalledSpread(null);
    setRecalledVoicingStyle(null);
    setActivePresetSlot(null);
  }, []);

  /**
   * Clear a specific preset slot.
   */
  const clearPreset = useCallback((slotNumber: string): void => {
    setSavedPresets((prev) => {
      const newPresets = new Map(prev);
      newPresets.delete(slotNumber);
      return newPresets;
    });
  }, [setSavedPresets]);

  /**
   * Clear all saved presets.
   */
  const clearAllPresets = useCallback((): void => {
    setSavedPresets(new Map());
  }, [setSavedPresets]);

  /**
   * Update voicing settings for a specific preset.
   */
  const updatePresetVoicing = useCallback((slotNumber: string, updates: PresetVoicingUpdates): void => {
    setSavedPresets((prev) => {
      const newPresets = new Map(prev);
      const existingPreset = newPresets.get(slotNumber);

      if (existingPreset) {
        newPresets.set(slotNumber, {
          ...existingPreset,
          ...updates,
        });
      }

      return newPresets;
    });
  }, [setSavedPresets]);

  /**
   * Find the next available preset slot.
   * Uses savedPresetsRef to always get current state.
   */
  const findNextAvailableSlot = useCallback((): string | null => {
    const currentPresets = savedPresetsRef.current;
    // Check slots 1-9 first
    for (let i = 1; i <= 9; i++) {
      const slotKey = i.toString();
      if (!currentPresets.has(slotKey)) {
        return slotKey;
      }
    }
    // Then check slot 0
    if (!currentPresets.has("0")) {
      return "0";
    }
    return null;
  }, []);

  /**
   * Solve voice leading for a set of presets to minimize voice movement.
   * Uses savedPresetsRef to always get current state.
   *
   * @param selectedSlots - Array of slot IDs in progression order
   * @param targetOctave - Target octave to center voicings around
   * @param spreadPreference - -1 (close) to 1 (wide), 0 = neutral
   */
  const solvePresetVoicings = useCallback(
    (selectedSlots: string[], targetOctave: Octave, spreadPreference: number = 0): boolean => {
      if (!selectedSlots || selectedSlots.length < 2) {
        return false;
      }

      const currentPresets = savedPresetsRef.current;

      // Get presets in the order of selection
      const presetsToSolve = selectedSlots
        .filter((slot) => currentPresets.has(slot))
        .map((slot) => ({ slot, preset: currentPresets.get(slot)! }));

      if (presetsToSolve.length < 2) {
        return false;
      }

      // Extract preset data for the solver
      const presetData = presetsToSolve.map((p) => p.preset);

      // Run the solver with spread preference
      const solvedVoicings = solveChordVoicings(presetData, {
        targetOctave,
        spreadPreference,
      });

      if (!solvedVoicings || solvedVoicings.length !== presetsToSolve.length) {
        return false;
      }

      // Update presets with solved voicings
      setSavedPresets((prev) => {
        const newPresets = new Map(prev);
        presetsToSolve.forEach(({ slot, preset }, index) => {
          const solved = solvedVoicings[index];
          newPresets.set(slot, {
            ...preset,
            octave: solved.octave!,
            inversionIndex: solved.inversionIndex,
            droppedNotes: solved.droppedNotes,
            spreadAmount: solved.spreadAmount,
            voicingStyle: solved.voicingStyle,
          });
        });
        return newPresets;
      });

      return true;
    },
    [setSavedPresets]
  );

  return {
    // State
    savedPresets,
    recalledKeys,
    recalledOctave,
    recalledInversion,
    recalledDrop,
    recalledSpread,
    recalledVoicingStyle,
    activePresetSlot,
    isLoaded,

    // Actions
    savePreset,
    recallPreset,
    stopRecalling,
    clearPreset,
    clearAllPresets,
    updatePresetVoicing,
    findNextAvailableSlot,
    solvePresetVoicings,

    // State setters for direct manipulation
    setRecalledKeys,
    setRecalledOctave,
    setRecalledInversion,
    setRecalledDrop,
    setRecalledSpread,
    setRecalledVoicingStyle,
    setActivePresetSlot,
  };
}
