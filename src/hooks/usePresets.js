/**
 * usePresets Hook
 * Manages chord preset storage, recall, and persistence to IndexedDB.
 * Provides save/recall/clear operations for chord presets.
 *
 * @module hooks/usePresets
 */

import { useState, useEffect, useCallback } from "react";
import {
  loadPresetsFromStorage,
  savePresetsToStorage,
} from "../lib/presetStorage";
import { solveChordVoicings } from "../lib/chordSolver";

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
  /** @type {[Map<string, PresetData>, Function]} */
  const [savedPresets, setSavedPresets] = useState(new Map());

  /** @type {[Set<string>|null, Function]} Currently recalled keys */
  const [recalledKeys, setRecalledKeys] = useState(null);

  /** @type {[number|null, Function]} Octave from recalled preset */
  const [recalledOctave, setRecalledOctave] = useState(null);

  /** @type {[string|null, Function]} Currently active preset slot */
  const [activePresetSlot, setActivePresetSlot] = useState(null);

  /** @type {[boolean, Function]} Whether presets have been loaded from storage */
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Load presets from IndexedDB on mount
   */
  useEffect(() => {
    const loadPresets = async () => {
      const loadedPresets = await loadPresetsFromStorage();
      if (loadedPresets.size > 0) {
        setSavedPresets(loadedPresets);
      }
      setIsLoaded(true);
    };
    loadPresets();
  }, []);

  /**
   * Save presets to IndexedDB whenever they change (after initial load)
   */
  useEffect(() => {
    if (!isLoaded) return;
    savePresetsToStorage(savedPresets);
  }, [savedPresets, isLoaded]);

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
  }, []);

  /**
   * Recall a preset from a slot, making it the active chord.
   *
   * @param {string} slotNumber - Slot identifier ("0"-"9")
   * @returns {PresetData|null} The recalled preset data, or null if not found
   */
  const recallPreset = useCallback(
    (slotNumber) => {
      if (!savedPresets.has(slotNumber)) {
        return null;
      }

      const preset = savedPresets.get(slotNumber);
      setRecalledKeys(preset.keys);
      setRecalledOctave(preset.octave);
      setActivePresetSlot(slotNumber);

      return preset;
    },
    [savedPresets]
  );

  /**
   * Stop recalling the current preset, clearing the active state.
   */
  const stopRecalling = useCallback(() => {
    setRecalledKeys(null);
    setRecalledOctave(null);
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
  }, []);

  /**
   * Clear all saved presets.
   */
  const clearAllPresets = useCallback(() => {
    setSavedPresets(new Map());
  }, []);

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
  }, []);

  /**
   * Find the next available preset slot.
   *
   * @returns {string|null} Next available slot ("1"-"9", then "0"), or null if all full
   */
  const findNextAvailableSlot = useCallback(() => {
    // Check slots 1-9 first
    for (let i = 1; i <= 9; i++) {
      const slotKey = i.toString();
      if (!savedPresets.has(slotKey)) {
        return slotKey;
      }
    }
    // Then check slot 0
    if (!savedPresets.has("0")) {
      return "0";
    }
    return null;
  }, [savedPresets]);

  /**
   * Solve voice leading for a set of presets to minimize voice movement.
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

      // Get presets in the order of selection
      const presetsToSolve = selectedSlots
        .filter((slot) => savedPresets.has(slot))
        .map((slot) => ({ slot, preset: savedPresets.get(slot) }));

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
        console.error("Solver returned invalid results");
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
    [savedPresets]
  );

  return {
    // State
    savedPresets,
    recalledKeys,
    recalledOctave,
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
    setActivePresetSlot,
  };
}
