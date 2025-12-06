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

import { useState, useCallback, useRef, useMemo } from "react";
import {
  loadPresetsFromStorage,
  savePresetsToStorage,
} from "../lib/presetStorage";
import { solveChordVoicings } from "../lib/chordSolver";
import { useAsyncStorage } from "./usePersistence";

/**
 * @typedef {Object} PresetData
 * @property {Set<string>} keys - The keyboard keys that make up this chord
 * @property {number} octave - The octave setting (0-7)
 * @property {number} inversionIndex - Which inversion to use
 * @property {number} droppedNotes - How many notes are dropped down an octave
 * @property {number} spreadAmount - How much spread is applied (0-3)
 */

/**
 * Hook for managing chord presets with persistence.
 *
 * @param {Object} options - Configuration options
 * @param {number} options.defaultOctave - Default octave for new presets
 * @returns {Object} Preset management functions and state
 *
 * @example
 * const {
 *   savedPresets,
 *   savePreset,
 *   recallPreset,
 *   clearPreset,
 * } = usePresets({ defaultOctave: 4 });
 */
export function usePresets({ defaultOctave = 4 } = {}) {
  // Memoize storage functions to prevent re-subscriptions
  const storageConfig = useMemo(
    () => ({
      load: loadPresetsFromStorage,
      save: savePresetsToStorage,
      initialValue: new Map(),
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

  /** @type {[Set<string>|null, Function]} Currently recalled keys */
  const [recalledKeys, setRecalledKeys] = useState(null);

  /** @type {[number|null, Function]} Octave from recalled preset */
  const [recalledOctave, setRecalledOctave] = useState(null);

  /** @type {[number|null, Function]} Inversion from recalled preset */
  const [recalledInversion, setRecalledInversion] = useState(null);

  /** @type {[number|null, Function]} Dropped notes from recalled preset */
  const [recalledDrop, setRecalledDrop] = useState(null);

  /** @type {[number|null, Function]} Spread amount from recalled preset */
  const [recalledSpread, setRecalledSpread] = useState(null);

  /** @type {[string|null, Function]} Currently active preset slot */
  const [activePresetSlot, setActivePresetSlot] = useState(null);

  // Ref to always have current savedPresets (avoids stale closure issues)
  const savedPresetsRef = useRef(savedPresets);
  savedPresetsRef.current = savedPresets;

  /**
   * Save a chord to a specific slot.
   *
   * @param {string} slotNumber - Slot identifier ("0"-"9")
   * @param {PresetData} presetData - The preset data to save
   * @returns {boolean} True if saved successfully
   */
  const savePreset = useCallback((slotNumber, presetData) => {
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
      });
      return newPresets;
    });

    return true;
  }, [setSavedPresets]);

  /**
   * Recall a preset from a slot, making it the active chord.
   * Uses savedPresetsRef to ensure we always read the current Map.
   * Sets all recalled voicing state from the preset.
   *
   * @param {string} slotNumber - Slot identifier ("0"-"9")
   * @returns {PresetData|null} The recalled preset data, or null if not found
   */
  const recallPreset = useCallback(
    (slotNumber) => {
      // Use ref to always get the current savedPresets
      const currentPresets = savedPresetsRef.current;
      if (!currentPresets.has(slotNumber)) {
        return null;
      }

      const preset = currentPresets.get(slotNumber);
      setRecalledKeys(preset.keys);
      setRecalledOctave(preset.octave);
      setRecalledInversion(preset.inversionIndex ?? 0);
      setRecalledDrop(preset.droppedNotes ?? 0);
      setRecalledSpread(preset.spreadAmount ?? 0);
      setActivePresetSlot(slotNumber);

      return preset;
    },
    [] // No dependencies - uses ref which is always current
  );

  /**
   * Stop recalling the current preset, clearing the active state.
   */
  const stopRecalling = useCallback(() => {
    setRecalledKeys(null);
    setRecalledOctave(null);
    setRecalledInversion(null);
    setRecalledDrop(null);
    setRecalledSpread(null);
    setActivePresetSlot(null);
  }, []);

  /**
   * Clear a specific preset slot.
   *
   * @param {string} slotNumber - Slot identifier ("0"-"9")
   */
  const clearPreset = useCallback((slotNumber) => {
    setSavedPresets((prev) => {
      const newPresets = new Map(prev);
      newPresets.delete(slotNumber);
      return newPresets;
    });
  }, [setSavedPresets]);

  /**
   * Clear all saved presets.
   */
  const clearAllPresets = useCallback(() => {
    setSavedPresets(new Map());
  }, [setSavedPresets]);

  /**
   * Update voicing settings for a specific preset.
   *
   * @param {string} slotNumber - Slot identifier ("0"-"9")
   * @param {Partial<PresetData>} updates - Voicing updates to apply
   */
  const updatePresetVoicing = useCallback((slotNumber, updates) => {
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
   *
   * @returns {string|null} Next available slot ("1"-"9", then "0"), or null if all full
   */
  const findNextAvailableSlot = useCallback(() => {
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
   * @param {string[]} selectedSlots - Array of slot identifiers in playback order
   * @param {number} targetOctave - Target octave for the solved voicings
   * @returns {boolean} True if solving succeeded
   */
  const solvePresetVoicings = useCallback(
    (selectedSlots, targetOctave) => {
      if (!selectedSlots || selectedSlots.length < 2) {
        return false;
      }

      const currentPresets = savedPresetsRef.current;

      // Get presets in the order of selection
      const presetsToSolve = selectedSlots
        .filter((slot) => currentPresets.has(slot))
        .map((slot) => ({ slot, preset: currentPresets.get(slot) }));

      if (presetsToSolve.length < 2) {
        return false;
      }

      // Extract preset data for the solver
      const presetData = presetsToSolve.map((p) => p.preset);

      // Run the solver
      const solvedVoicings = solveChordVoicings(presetData, {
        targetOctave,
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
            octave: solved.octave,
            inversionIndex: solved.inversionIndex,
            droppedNotes: solved.droppedNotes,
            spreadAmount: solved.spreadAmount,
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
    setActivePresetSlot,
  };
}
