/**
 * useChordEngine Hook
 * Central orchestrator for chord building and voicing control.
 * Combines keyboard input with chord building logic and manages
 * inversions, voicings, octave settings, and preset interactions.
 *
 * Architecture Note:
 * Emits events via appEvents when chord changes, allowing decoupled
 * subscribers (like useMIDI) to react without prop drilling or effects.
 *
 * @module hooks/useChordEngine
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { parseKeys } from "../lib/parseKeys";
import { buildChord, invertChord } from "../lib/chordBuilder";
import { getChordName } from "../lib/chordNamer";
import { applyProgressiveDrop, applySpread } from "../lib/voicingTransforms";
import { usePresets } from "./usePresets";
import { useVoicingKeyboard } from "./useVoicingKeyboard";
import { appEvents } from "../lib/eventBus";

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
    recalledInversion,
    recalledDrop,
    recalledSpread,
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
    setRecalledInversion,
    setRecalledDrop,
    setRecalledSpread,
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
   * Uses recalled values when a preset is active, otherwise uses global values.
   * @returns {Object|null} Final chord with voicing applied
   */
  const currentChord = useMemo(() => {
    if (!baseChord) return null;

    // Use recalled values if preset is active, otherwise use global values
    const activeInversion = recalledInversion !== null ? recalledInversion : inversionIndex;
    const activeDrop = recalledDrop !== null ? recalledDrop : droppedNotes;
    const activeSpread = recalledSpread !== null ? recalledSpread : spreadAmount;

    let notes = [...baseChord.notes];

    // Apply progressive note dropping
    if (activeDrop > 0) {
      notes = applyProgressiveDrop(notes, activeDrop);
    }

    // Apply spread
    if (activeSpread > 0) {
      notes = applySpread(notes, activeSpread);
    }

    // Apply inversion last
    notes = invertChord(notes, activeInversion);

    const chordName = getChordName(baseChord.root, baseChord.modifiers);

    return {
      ...baseChord,
      notes,
      name: chordName,
      inversion: activeInversion,
      droppedNotes: activeDrop,
      spreadAmount: activeSpread,
    };
  }, [baseChord, inversionIndex, droppedNotes, spreadAmount, recalledInversion, recalledDrop, recalledSpread]);

  // Track previous chord to detect changes and emit events
  const prevChordRef = useRef(null);

  // Emit chord events when chord changes
  // This replaces the useEffect in App.jsx that watched currentChord
  useEffect(() => {
    const prevNotes = prevChordRef.current?.notes;
    const currentNotes = currentChord?.notes;

    // Compare note arrays to detect actual change
    const notesChanged =
      !prevNotes !== !currentNotes ||
      (prevNotes &&
        currentNotes &&
        (prevNotes.length !== currentNotes.length ||
          prevNotes.some((n, i) => n !== currentNotes[i])));

    if (notesChanged) {
      if (currentNotes?.length) {
        appEvents.emit("chord:changed", {
          notes: currentNotes,
          name: currentChord.name,
          source: recalledKeys ? "preset" : "keyboard",
        });
      } else if (prevNotes?.length) {
        appEvents.emit("chord:cleared", {
          source: recalledKeys ? "preset" : "keyboard",
        });
      }
    }

    prevChordRef.current = currentChord;
  }, [currentChord, recalledKeys]);

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
    recalledInversion,
    recalledDrop,
    recalledSpread,
    setInversionIndex,
    setDroppedNotes,
    setSpreadAmount,
    setOctave,
    setRecalledOctave,
    setRecalledInversion,
    setRecalledDrop,
    setRecalledSpread,
    savePreset,
    recallPreset,
    stopRecalling,
    updatePresetVoicing,
    findNextAvailableSlot,
  });

  /**
   * Track if recalledKeys was just set (by sequencer or preset recall).
   * This prevents clearing a preset that was just triggered.
   * Set synchronously in recallPresetFromSlot, cleared via microtask.
   */
  const recalledKeysJustSetRef = useRef(false);

  /**
   * Track previous parsedKeys.root to detect chord changes.
   * Used for action-based voicing reset instead of effect.
   */
  const prevParsedRootRef = useRef(null);
  const prevParsedModifiersRef = useRef("");

  /**
   * Clear recalled state - action function used when user presses chord keys.
   */
  const clearRecalledState = useCallback(() => {
    setRecalledKeys(null);
    setRecalledOctave(null);
    setActivePresetSlot(null);
  }, [setRecalledKeys, setRecalledOctave, setActivePresetSlot]);

  /**
   * Reset voicing to defaults - action function for chord changes.
   */
  const resetVoicing = useCallback(() => {
    setInversionIndex(0);
    setDroppedNotes(0);
    setSpreadAmount(0);
  }, []);

  /**
   * Handle chord and preset state coordination.
   * Replaces three separate useEffect hooks with a single consolidated effect:
   * 1. Clear recalled keys on manual keypress (if not just set)
   * 2. Reset voicing when chord changes (not from preset)
   *
   * Architecture note: This effect remains because we need to detect
   * changes to derived state (parsedKeys) and coordinate multiple
   * concerns. The logic is action-based (calling clearRecalledState
   * and resetVoicing) rather than directly manipulating state.
   */
  useEffect(() => {
    const currentRoot = parsedKeys.root;
    const currentModifiers = parsedKeys.modifiers.join(",");
    const prevRoot = prevParsedRootRef.current;
    const prevModifiers = prevParsedModifiersRef.current;

    // Check if chord changed (root or modifiers)
    const chordChanged =
      currentRoot !== prevRoot || currentModifiers !== prevModifiers;

    // Clear recalled state when user presses chord keys manually
    if (recalledKeys && pressedKeys.size > 0) {
      if (recalledKeysJustSetRef.current) {
        // Just set by sequencer - clear flag but don't clear state
        recalledKeysJustSetRef.current = false;
      } else {
        // User pressed keys manually - clear recalled state
        clearRecalledState();
      }
    }

    // Reset voicing when chord changes (not from preset recall)
    if (chordChanged && currentRoot && !recalledKeys) {
      resetVoicing();
    }

    // Update refs for next comparison
    prevParsedRootRef.current = currentRoot;
    prevParsedModifiersRef.current = currentModifiers;
  }, [
    parsedKeys.root,
    parsedKeys.modifiers,
    pressedKeys.size,
    recalledKeys,
    clearRecalledState,
    resetVoicing,
  ]);

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
   * Cycle to the next inversion. Updates recalled value if preset active, else global.
   */
  const cycleInversion = useCallback(() => {
    if (!currentChord?.notes) return;
    const maxInversions = currentChord.notes.length;

    if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
      setRecalledInversion((prev) => {
        const current = prev !== null ? prev : inversionIndex;
        const newInversion = (current + 1) % maxInversions;
        updateActivePresetVoicing({ inversionIndex: newInversion });
        return newInversion;
      });
    } else {
      setInversionIndex((prev) => (prev + 1) % maxInversions);
    }
  }, [currentChord, activePresetSlot, savedPresets, inversionIndex, updateActivePresetVoicing]);

  /**
   * Cycle to the next drop voicing. Updates recalled value if preset active, else global.
   */
  const cycleDrop = useCallback(() => {
    if (!currentChord?.notes) return;
    const maxDrops = currentChord.notes.length - 1;

    if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
      setRecalledDrop((prev) => {
        const current = prev !== null ? prev : droppedNotes;
        const newDropped = (current + 1) % (maxDrops + 1);
        updateActivePresetVoicing({ droppedNotes: newDropped });
        return newDropped;
      });
    } else {
      setDroppedNotes((prev) => (prev + 1) % (maxDrops + 1));
    }
  }, [currentChord, activePresetSlot, savedPresets, droppedNotes, updateActivePresetVoicing]);

  /**
   * Cycle to the next spread amount. Updates recalled value if preset active, else global.
   */
  const cycleSpread = useCallback(() => {
    if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
      setRecalledSpread((prev) => {
        const current = prev !== null ? prev : spreadAmount;
        const newSpread = (current + 1) % 4;
        updateActivePresetVoicing({ spreadAmount: newSpread });
        return newSpread;
      });
    } else {
      setSpreadAmount((prev) => (prev + 1) % 4);
    }
  }, [activePresetSlot, savedPresets, spreadAmount, updateActivePresetVoicing]);

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
   * Sets recalledKeysJustSetRef to prevent immediate clearing by the
   * coordination effect when called from sequencer.
   * Voicing (octave, inversion, drop, spread) is now set via recalled states in recallPreset.
   *
   * @param {string} slotNumber - Slot identifier ("0"-"9")
   * @returns {boolean} True if recalled successfully
   */
  const recallPresetFromSlot = useCallback(
    (slotNumber) => {
      const preset = recallPreset(slotNumber);
      if (preset) {
        // Set flag to prevent coordination effect from clearing
        recalledKeysJustSetRef.current = true;
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
