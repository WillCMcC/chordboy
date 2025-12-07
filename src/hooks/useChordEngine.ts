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

import { useState, useEffect, useMemo, useCallback, useRef, Dispatch, SetStateAction } from "react";
import { parseKeys } from "../lib/parseKeys";
import { buildChord, invertChord } from "../lib/chordBuilder";
import { getChordName } from "../lib/chordNamer";
import { applyProgressiveDrop, applySpread } from "../lib/voicingTransforms";
import { usePresets } from "./usePresets";
import { useVoicingKeyboard } from "./useVoicingKeyboard";
import { appEvents } from "../lib/eventBus";
import type { Chord, MIDINote, Octave, Preset, ParsedKeys } from "../types";

/** Options for useChordEngine */
export interface UseChordEngineOptions {
  /** Whether the device is mobile (affects chord triggering) */
  isMobile?: boolean;
}

/** Extended chord with voicing information */
export interface VoicedChord extends Chord {
  /** Final MIDI notes after voicing transforms */
  notes: MIDINote[];
  /** Chord name for display */
  name: string;
  /** Current inversion index */
  inversion: number;
  /** Number of dropped notes */
  droppedNotes: number;
  /** Spread amount applied */
  spreadAmount: number;
}

/** Return type for useChordEngine */
export interface UseChordEngineReturn {
  // Chord state
  currentChord: VoicedChord | null;
  parsedKeys: ParsedKeys;
  inversionIndex: number;
  octave: Octave;
  droppedNotes: number;
  spreadAmount: number;

  // Preset state
  savedPresets: Map<string, Preset>;
  activePresetSlot: string | null;

  // Preset actions
  clearPreset: (slotNumber: string) => void;
  clearAllPresets: () => void;
  saveCurrentChordToSlot: (slotNumber: string) => boolean;
  recallPresetFromSlot: (slotNumber: string) => boolean;
  stopRecallingPreset: () => void;
  solvePresets: (selectedSlots: string[]) => boolean;
  getChordNotesFromPreset: (slotNumber: string) => MIDINote[] | null;

  // Octave controls
  increaseOctave: () => void;
  decreaseOctave: () => void;
  resetOctave: () => void;
  setOctave: Dispatch<SetStateAction<Octave>>;
  changeOctave: (direction: number) => void;

  // Voicing controls
  setInversionIndex: Dispatch<SetStateAction<number>>;
  setDroppedNotes: Dispatch<SetStateAction<number>>;
  setSpreadAmount: Dispatch<SetStateAction<number>>;
  cycleInversion: () => void;
  cycleDrop: () => void;
  cycleSpread: () => void;
}

/**
 * Hook that orchestrates chord building from keyboard input.
 *
 * @param pressedKeys - Currently pressed keyboard keys
 * @param options - Configuration options
 * @returns Chord state and control functions
 *
 * @example
 * const {
 *   currentChord,
 *   parsedKeys,
 *   savedPresets,
 *   cycleInversion,
 *   cycleDrop,
 * } = useChordEngine(pressedKeys, { isMobile: false });
 */
export function useChordEngine(
  pressedKeys: Set<string>,
  { isMobile = false }: UseChordEngineOptions = {}
): UseChordEngineReturn {
  /** Current inversion index */
  const [inversionIndex, setInversionIndex] = useState<number>(0);

  /** Current octave (0-7) */
  const [octave, setOctave] = useState<Octave>(4);

  /** Number of dropped notes */
  const [droppedNotes, setDroppedNotes] = useState<number>(0);

  /** Spread amount (0-3) */
  const [spreadAmount, setSpreadAmount] = useState<number>(0);

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
   */
  const parsedKeys = useMemo((): ParsedKeys => {
    const keysToUse = recalledKeys || pressedKeys;
    return parseKeys(keysToUse);
  }, [pressedKeys, recalledKeys]);

  /**
   * Build the base chord from parsed keys.
   */
  const baseChord = useMemo((): Chord | null => {
    if (!parsedKeys.root) return null;

    const activeOctave = recalledOctave !== null ? recalledOctave : octave;
    return buildChord(parsedKeys.root, parsedKeys.modifiers, {
      octave: activeOctave,
    });
  }, [parsedKeys.root, parsedKeys.modifiers, octave, recalledOctave]);

  /**
   * Apply voicing transforms to the base chord.
   * Uses recalled values when a preset is active, otherwise uses global values.
   */
  const currentChord = useMemo((): VoicedChord | null => {
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
  const prevChordRef = useRef<VoicedChord | null>(null);

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
          name: currentChord!.name,
          source: recalledKeys ? "preset" : "keyboard",
          // On mobile, we want full chord retrigger instead of smart diffing
          retrigger: isMobile,
        });
      } else if (prevNotes?.length) {
        appEvents.emit("chord:cleared", {
          source: recalledKeys ? "preset" : "keyboard",
        });
      }
    }

    prevChordRef.current = currentChord;
  }, [currentChord, recalledKeys, isMobile]);

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
  const recalledKeysJustSetRef = useRef<boolean>(false);

  /**
   * Track previous parsedKeys.root to detect chord changes.
   * Used for action-based voicing reset instead of effect.
   */
  const prevParsedRootRef = useRef<string | null>(null);
  const prevParsedModifiersRef = useRef<string>("");

  /**
   * Clear recalled state - action function used when user presses chord keys.
   */
  const clearRecalledState = useCallback((): void => {
    setRecalledKeys(null);
    setRecalledOctave(null);
    setActivePresetSlot(null);
  }, [setRecalledKeys, setRecalledOctave, setActivePresetSlot]);

  /**
   * Reset voicing to defaults - action function for chord changes.
   */
  const resetVoicing = useCallback((): void => {
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
   */
  const updateActivePresetVoicing = useCallback(
    (updates: { octave?: Octave; inversionIndex?: number; droppedNotes?: number; spreadAmount?: number }): void => {
      if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
        updatePresetVoicing(activePresetSlot, updates);
      }
    },
    [activePresetSlot, savedPresets, updatePresetVoicing]
  );

  /**
   * Cycle to the next inversion. Updates recalled value if preset active, else global.
   */
  const cycleInversion = useCallback((): void => {
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
  }, [currentChord, activePresetSlot, savedPresets, inversionIndex, updateActivePresetVoicing, setRecalledInversion]);

  /**
   * Cycle to the next drop voicing. Updates recalled value if preset active, else global.
   */
  const cycleDrop = useCallback((): void => {
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
  }, [currentChord, activePresetSlot, savedPresets, droppedNotes, updateActivePresetVoicing, setRecalledDrop]);

  /**
   * Cycle to the next spread amount. Updates recalled value if preset active, else global.
   */
  const cycleSpread = useCallback((): void => {
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
  }, [activePresetSlot, savedPresets, spreadAmount, updateActivePresetVoicing, setRecalledSpread]);

  /**
   * Change octave by a given direction. Updates preset if one is active.
   */
  const changeOctave = useCallback(
    (direction: number): void => {
      if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
        setRecalledOctave((prev) => {
          const currentOct = prev !== null ? prev : octave;
          const newOctave = Math.max(0, Math.min(7, currentOct + direction)) as Octave;
          updateActivePresetVoicing({ octave: newOctave });
          return newOctave;
        });
      } else {
        setOctave((prev) => Math.max(0, Math.min(7, prev + direction)) as Octave);
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
  const increaseOctave = useCallback((): void => {
    setOctave((prev) => Math.min(7, prev + 1) as Octave);
  }, []);

  /**
   * Decrease global octave by 1.
   */
  const decreaseOctave = useCallback((): void => {
    setOctave((prev) => Math.max(0, prev - 1) as Octave);
  }, []);

  /**
   * Reset octave to default (4).
   */
  const resetOctave = useCallback((): void => {
    setOctave(4);
  }, []);

  /**
   * Save current chord to a specific slot.
   */
  const saveCurrentChordToSlot = useCallback(
    (slotNumber: string): boolean => {
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
   */
  const recallPresetFromSlot = useCallback(
    (slotNumber: string): boolean => {
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
  const stopRecallingPreset = useCallback((): void => {
    stopRecalling();
  }, [stopRecalling]);

  /**
   * Solve voice leading for selected preset slots.
   */
  const solvePresets = useCallback(
    (selectedSlots: string[]): boolean => {
      return solvePresetVoicings(selectedSlots, octave);
    },
    [solvePresetVoicings, octave]
  );

  /**
   * Build chord notes from a preset without changing state.
   * Used by sequencer for retrigger functionality.
   */
  const getChordNotesFromPreset = useCallback(
    (slotNumber: string): MIDINote[] | null => {
      if (!savedPresets.has(slotNumber)) return null;

      const preset = savedPresets.get(slotNumber)!;
      const parsed = parseKeys(preset.keys);

      if (!parsed.root) return null;

      const chord = buildChord(parsed.root, parsed.modifiers, {
        octave: preset.octave,
      });

      if (!chord) return null;

      let notes = [...chord.notes];

      if (preset.droppedNotes && preset.droppedNotes > 0) {
        notes = applyProgressiveDrop(notes, preset.droppedNotes);
      }

      if (preset.spreadAmount && preset.spreadAmount > 0) {
        notes = applySpread(notes, preset.spreadAmount);
      }

      notes = invertChord(notes, preset.inversionIndex ?? 0);

      return notes;
    },
    [savedPresets]
  );

  // Compute effective values (use recalled values if preset is active)
  const effectiveOctave = recalledOctave !== null ? recalledOctave : octave;
  const effectiveInversionIndex = recalledInversion !== null ? recalledInversion : inversionIndex;
  const effectiveDroppedNotes = recalledDrop !== null ? recalledDrop : droppedNotes;
  const effectiveSpreadAmount = recalledSpread !== null ? recalledSpread : spreadAmount;

  return {
    // Chord state
    currentChord,
    parsedKeys,
    inversionIndex: effectiveInversionIndex,
    octave: effectiveOctave,
    droppedNotes: effectiveDroppedNotes,
    spreadAmount: effectiveSpreadAmount,

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
