/**
 * useChordEngine Hook
 * Central orchestrator for chord building and voicing control.
 * Combines keyboard input with chord building logic and manages
 * inversions, voicings, octave settings, and preset interactions.
 *
 * @module hooks/useChordEngine
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { parseKeys } from "../lib/parseKeys";
import { buildChord, invertChord } from "../lib/chordBuilder";
import { getChordName } from "../lib/chordNamer";
import { applyProgressiveDrop, applySpread } from "../lib/voicingTransforms";
import { usePresets } from "./usePresets";
import { useVoicingKeyboard } from "./useVoicingKeyboard";

/**
 * Hook that orchestrates chord building from keyboard input.
 *
 * @param {Set<string>} pressedKeys - Currently pressed keyboard keys
 * @returns {Object} Chord state and control functions
 *
 * @example
 * const {
 *   currentChord,
 *   parsedKeys,
 *   savedPresets,
 *   cycleInversion,
 *   cycleDrop,
 * } = useChordEngine(pressedKeys);
 */
export function useChordEngine(pressedKeys) {
  /** @type {[number, Function]} Current inversion index */
  const [inversionIndex, setInversionIndex] = useState(0);

  /** @type {[number, Function]} Current octave (0-7) */
  const [octave, setOctave] = useState(4);

  /** @type {[number, Function]} Number of dropped notes */
  const [droppedNotes, setDroppedNotes] = useState(0);

  /** @type {[number, Function]} Spread amount (0-3) */
  const [spreadAmount, setSpreadAmount] = useState(0);

  // Use the extracted presets hook
  const {
    savedPresets,
    recalledKeys,
    recalledOctave,
    activePresetSlot,
    savePreset,
    recallPreset,
    stopRecalling,
    clearPreset,
    clearAllPresets,
    updatePresetVoicing,
    findNextAvailableSlot,
    solvePresetVoicings,
    setRecalledKeys,
    setRecalledOctave,
    setActivePresetSlot,
  } = usePresets({ defaultOctave: octave });

  /**
   * Parse the currently pressed keys (or use recalled keys if active).
   * @returns {Object} Parsed keys with root and modifiers
   */
  const parsedKeys = useMemo(() => {
    const keysToUse = recalledKeys || pressedKeys;
    return parseKeys(keysToUse);
  }, [pressedKeys, recalledKeys]);

  /**
   * Build the base chord from parsed keys.
   * @returns {Object|null} Base chord object or null
   */
  const baseChord = useMemo(() => {
    if (!parsedKeys.root) return null;

    const activeOctave = recalledOctave !== null ? recalledOctave : octave;
    return buildChord(parsedKeys.root, parsedKeys.modifiers, {
      octave: activeOctave,
    });
  }, [parsedKeys.root, parsedKeys.modifiers, octave, recalledOctave]);

  /**
   * Apply voicing transforms to the base chord.
   * @returns {Object|null} Final chord with voicing applied
   */
  const currentChord = useMemo(() => {
    if (!baseChord) return null;

    let notes = [...baseChord.notes];

    // Apply progressive note dropping
    if (droppedNotes > 0) {
      notes = applyProgressiveDrop(notes, droppedNotes);
    }

    // Apply spread
    if (spreadAmount > 0) {
      notes = applySpread(notes, spreadAmount);
    }

    // Apply inversion last
    notes = invertChord(notes, inversionIndex);

    const chordName = getChordName(baseChord.root, baseChord.modifiers);

    return {
      ...baseChord,
      notes,
      name: chordName,
      inversion: inversionIndex,
      droppedNotes,
      spreadAmount,
    };
  }, [baseChord, inversionIndex, droppedNotes, spreadAmount]);

  // Set up keyboard shortcuts for voicing control
  useVoicingKeyboard({
    currentChord,
    pressedKeys,
    savedPresets,
    recalledKeys,
    activePresetSlot,
    octave,
    inversionIndex,
    droppedNotes,
    spreadAmount,
    setInversionIndex,
    setDroppedNotes,
    setSpreadAmount,
    setOctave,
    setRecalledOctave,
    savePreset,
    recallPreset,
    stopRecalling,
    updatePresetVoicing,
    findNextAvailableSlot,
  });

  /**
   * Clear recalled keys when user starts pressing chord keys manually.
   */
  useEffect(() => {
    if (recalledKeys && pressedKeys.size > 0) {
      setRecalledKeys(null);
      setRecalledOctave(null);
      setActivePresetSlot(null);
    }
  }, [
    pressedKeys.size,
    recalledKeys,
    setRecalledKeys,
    setRecalledOctave,
    setActivePresetSlot,
  ]);

  /**
   * Reset voicing to defaults when chord changes (not from a preset).
   */
  useEffect(() => {
    if (!recalledKeys && parsedKeys.root) {
      setInversionIndex(0);
      setDroppedNotes(0);
      setSpreadAmount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedKeys.root, parsedKeys.modifiers.join(","), recalledKeys]);

  /**
   * Helper to update voicing on the active preset.
   * @param {Object} updates - Voicing updates to apply
   */
  const updateActivePresetVoicing = useCallback(
    (updates) => {
      if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
        updatePresetVoicing(activePresetSlot, updates);
      }
    },
    [activePresetSlot, savedPresets, updatePresetVoicing]
  );

  /**
   * Cycle to the next inversion. Updates preset if one is active.
   */
  const cycleInversion = useCallback(() => {
    if (!currentChord?.notes) return;
    const maxInversions = currentChord.notes.length;
    setInversionIndex((prev) => {
      const newInversion = (prev + 1) % maxInversions;
      updateActivePresetVoicing({ inversionIndex: newInversion });
      return newInversion;
    });
  }, [currentChord, updateActivePresetVoicing]);

  /**
   * Cycle to the next drop voicing. Updates preset if one is active.
   */
  const cycleDrop = useCallback(() => {
    if (!currentChord?.notes) return;
    const maxDrops = currentChord.notes.length - 1;
    setDroppedNotes((prev) => {
      const newDropped = (prev + 1) % (maxDrops + 1);
      updateActivePresetVoicing({ droppedNotes: newDropped });
      return newDropped;
    });
  }, [currentChord, updateActivePresetVoicing]);

  /**
   * Cycle to the next spread amount. Updates preset if one is active.
   */
  const cycleSpread = useCallback(() => {
    setSpreadAmount((prev) => {
      const newSpread = (prev + 1) % 4;
      updateActivePresetVoicing({ spreadAmount: newSpread });
      return newSpread;
    });
  }, [updateActivePresetVoicing]);

  /**
   * Change octave by a given direction. Updates preset if one is active.
   * @param {number} direction - +1 to go up, -1 to go down
   */
  const changeOctave = useCallback(
    (direction) => {
      if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
        setRecalledOctave((prev) => {
          const currentOct = prev !== null ? prev : octave;
          const newOctave = Math.max(0, Math.min(7, currentOct + direction));
          updateActivePresetVoicing({ octave: newOctave });
          return newOctave;
        });
      } else {
        setOctave((prev) => Math.max(0, Math.min(7, prev + direction)));
      }
    },
    [
      activePresetSlot,
      savedPresets,
      octave,
      setRecalledOctave,
      updateActivePresetVoicing,
    ]
  );

  /**
   * Increase global octave by 1.
   */
  const increaseOctave = useCallback(() => {
    setOctave((prev) => Math.min(7, prev + 1));
  }, []);

  /**
   * Decrease global octave by 1.
   */
  const decreaseOctave = useCallback(() => {
    setOctave((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Reset octave to default (4).
   */
  const resetOctave = useCallback(() => {
    setOctave(4);
  }, []);

  /**
   * Save current chord to a specific slot.
   * @param {string} slotNumber - Slot identifier ("0"-"9")
   * @returns {boolean} True if saved successfully
   */
  const saveCurrentChordToSlot = useCallback(
    (slotNumber) => {
      if (pressedKeys.size > 0 && !recalledKeys) {
        return savePreset(slotNumber, {
          keys: pressedKeys,
          octave,
          inversionIndex,
          droppedNotes,
          spreadAmount,
        });
      }
      return false;
    },
    [
      pressedKeys,
      recalledKeys,
      octave,
      inversionIndex,
      droppedNotes,
      spreadAmount,
      savePreset,
    ]
  );

  /**
   * Recall a preset from a slot.
   * @param {string} slotNumber - Slot identifier ("0"-"9")
   * @returns {boolean} True if recalled successfully
   */
  const recallPresetFromSlot = useCallback(
    (slotNumber) => {
      const preset = recallPreset(slotNumber);
      if (preset) {
        setInversionIndex(preset.inversionIndex || 0);
        setDroppedNotes(preset.droppedNotes || 0);
        setSpreadAmount(preset.spreadAmount || 0);
        return true;
      }
      return false;
    },
    [recallPreset]
  );

  /**
   * Stop recalling the current preset.
   */
  const stopRecallingPreset = useCallback(() => {
    stopRecalling();
  }, [stopRecalling]);

  /**
   * Solve voice leading for selected preset slots.
   * @param {string[]} selectedSlots - Array of slot identifiers
   * @returns {boolean} True if solving succeeded
   */
  const solvePresets = useCallback(
    (selectedSlots) => {
      return solvePresetVoicings(selectedSlots, octave);
    },
    [solvePresetVoicings, octave]
  );

  /**
   * Build chord notes from a preset without changing state.
   * Used by sequencer for retrigger functionality.
   * @param {string} slotNumber - Slot identifier
   * @returns {number[]|null} Array of MIDI notes or null
   */
  const getChordNotesFromPreset = useCallback(
    (slotNumber) => {
      if (!savedPresets.has(slotNumber)) return null;

      const preset = savedPresets.get(slotNumber);
      const parsed = parseKeys(preset.keys);

      if (!parsed.root) return null;

      const chord = buildChord(parsed.root, parsed.modifiers, {
        octave: preset.octave,
      });

      if (!chord) return null;

      let notes = [...chord.notes];

      if (preset.droppedNotes > 0) {
        notes = applyProgressiveDrop(notes, preset.droppedNotes);
      }

      if (preset.spreadAmount > 0) {
        notes = applySpread(notes, preset.spreadAmount);
      }

      notes = invertChord(notes, preset.inversionIndex);

      return notes;
    },
    [savedPresets]
  );

  return {
    // Chord state
    currentChord,
    parsedKeys,
    inversionIndex,
    octave,
    droppedNotes,
    spreadAmount,

    // Preset state
    savedPresets,
    activePresetSlot,

    // Preset actions
    clearPreset,
    clearAllPresets,
    saveCurrentChordToSlot,
    recallPresetFromSlot,
    stopRecallingPreset,
    solvePresets,
    getChordNotesFromPreset,

    // Octave controls
    increaseOctave,
    decreaseOctave,
    resetOctave,
    setOctave,
    changeOctave,

    // Voicing controls
    setInversionIndex,
    setDroppedNotes,
    setSpreadAmount,
    cycleInversion,
    cycleDrop,
    cycleSpread,
  };
}
