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
import { usePresets } from "./usePresets";
import { useVoicingKeyboard } from "./useVoicingKeyboard";
import { useChordBuilder } from "./useChordBuilder";
import { useVoicingControls } from "./useVoicingControls";
import { useOctaveControls } from "./useOctaveControls";
import { usePresetActions } from "./usePresetActions";
import { useProgressionSettings } from "./useProgressionSettings";
import { appEvents } from "../lib/eventBus";
import type { Chord, MIDINote, Octave, Preset, ParsedKeys, VoicingStyle } from "../types";

/** Options for useChordEngine */
export interface UseChordEngineOptions {
  /** Whether the device is mobile (affects chord triggering) */
  isMobile?: boolean;
  /** Initial presets from active bank (used for bank switching) */
  initialPresets?: Map<string, Preset>;
  /** Callback when presets change (for syncing to bank) */
  onPresetsChange?: (presets: Map<string, Preset>) => void;
}

/** Extended chord with voicing information */
export interface VoicedChord extends Chord {
  /** Final MIDI notes after voicing transforms */
  notes: MIDINote[];
  /** Chord name for display */
  name: string;
  /** Current inversion index */
  inversion: number;
  /** Number of dropped notes (legacy) */
  droppedNotes: number;
  /** Spread amount applied */
  spreadAmount: number;
  /** Jazz voicing style */
  voicingStyle: VoicingStyle;
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
  voicingStyle: VoicingStyle;

  // Preset state
  savedPresets: Map<string, Preset>;
  activePresetSlot: string | null;

  // Preset actions
  clearPreset: (slotNumber: string) => void;
  clearAllPresets: () => void;
  saveCurrentChordToSlot: (slotNumber: string) => boolean;
  recallPresetFromSlot: (slotNumber: string) => boolean;
  stopRecallingPreset: () => void;
  solvePresets: (selectedSlots: string[], spreadPreference?: number) => boolean;
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
  setVoicingStyle: Dispatch<SetStateAction<VoicingStyle>>;
  cycleInversion: () => void;
  cycleDrop: () => void;
  cycleSpread: () => void;
  cycleVoicingStyle: () => void;

  // Progression settings
  trueRandomMode: boolean;
  setTrueRandomMode: (enabled: boolean) => void;

  // Preset utilities
  savePreset: (slotNumber: string, presetData: import("./usePresets").PresetInput) => boolean;
  findNextAvailableSlot: () => string | null;
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
  { isMobile = false, initialPresets, onPresetsChange }: UseChordEngineOptions = {}
): UseChordEngineReturn {
  /** Current inversion index */
  const [inversionIndex, setInversionIndex] = useState<number>(0);

  /** Current octave (0-7) */
  const [octave, setOctave] = useState<Octave>(4);

  /** Number of dropped notes (legacy) */
  const [droppedNotes, setDroppedNotes] = useState<number>(0);

  /** Spread amount (0-3) */
  const [spreadAmount, setSpreadAmount] = useState<number>(0);

  /** Jazz voicing style */
  const [voicingStyle, setVoicingStyle] = useState<VoicingStyle>("close");

  // Use the extracted presets hook
  const {
    savedPresets,
    recalledKeys,
    recalledOctave,
    recalledInversion,
    recalledDrop,
    recalledSpread,
    recalledVoicingStyle,
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
    setRecalledVoicingStyle,
    setActivePresetSlot,
  } = usePresets({ defaultOctave: octave, initialPresets, onPresetsChange });

  // Use progression settings for smart chord generation
  const { trueRandomMode, setTrueRandomMode } = useProgressionSettings();

  /**
   * Parse the currently pressed keys (or use recalled keys if active).
   */
  const parsedKeys = useMemo((): ParsedKeys => {
    const keysToUse = recalledKeys || pressedKeys;
    return parseKeys(keysToUse);
  }, [pressedKeys, recalledKeys]);

  // Use chord builder hook to build and transform chords
  const { currentChord } = useChordBuilder({
    parsedKeys,
    octave,
    recalledOctave,
    inversionIndex,
    recalledInversion,
    droppedNotes,
    recalledDrop,
    spreadAmount,
    recalledSpread,
    voicingStyle,
    recalledVoicingStyle,
  });

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
    voicingStyle,
    recalledInversion,
    recalledDrop,
    recalledSpread,
    recalledVoicingStyle,
    setInversionIndex,
    setDroppedNotes,
    setSpreadAmount,
    setVoicingStyle,
    setOctave,
    setRecalledOctave,
    setRecalledInversion,
    setRecalledDrop,
    setRecalledSpread,
    setRecalledVoicingStyle,
    savePreset,
    recallPreset,
    stopRecalling,
    updatePresetVoicing,
    findNextAvailableSlot,
  });

  // Use preset actions hook for save/recall/solve functionality
  const {
    saveCurrentChordToSlot,
    recallPresetFromSlot,
    stopRecallingPreset,
    solvePresets,
    getChordNotesFromPreset,
    recalledKeysJustSetRef,
  } = usePresetActions({
    pressedKeys,
    recalledKeys,
    octave,
    inversionIndex,
    droppedNotes,
    spreadAmount,
    voicingStyle,
    savedPresets,
    savePreset,
    recallPreset,
    stopRecalling,
    solvePresetVoicings,
  });

  // Use voicing controls hook for cycle functions
  const { cycleInversion, cycleDrop, cycleSpread, cycleVoicingStyle } = useVoicingControls({
    currentChord,
    inversionIndex,
    droppedNotes,
    spreadAmount,
    voicingStyle,
    activePresetSlot,
    savedPresets,
    setInversionIndex,
    setDroppedNotes,
    setSpreadAmount,
    setVoicingStyle,
    setRecalledInversion,
    setRecalledDrop,
    setRecalledSpread,
    setRecalledVoicingStyle,
    updatePresetVoicing,
  });

  // Use octave controls hook for octave functions
  const { increaseOctave, decreaseOctave, resetOctave, changeOctave } = useOctaveControls({
    octave,
    activePresetSlot,
    savedPresets,
    setOctave,
    setRecalledOctave,
    updatePresetVoicing,
  });

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
    setVoicingStyle("close");
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

  // Compute effective values (use recalled values if preset is active)
  const effectiveOctave = recalledOctave !== null ? recalledOctave : octave;
  const effectiveInversionIndex = recalledInversion !== null ? recalledInversion : inversionIndex;
  const effectiveDroppedNotes = recalledDrop !== null ? recalledDrop : droppedNotes;
  const effectiveSpreadAmount = recalledSpread !== null ? recalledSpread : spreadAmount;
  const effectiveVoicingStyle = recalledVoicingStyle !== null ? recalledVoicingStyle : voicingStyle;

  return {
    // Chord state
    currentChord,
    parsedKeys,
    inversionIndex: effectiveInversionIndex,
    octave: effectiveOctave,
    droppedNotes: effectiveDroppedNotes,
    spreadAmount: effectiveSpreadAmount,
    voicingStyle: effectiveVoicingStyle,

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
    setVoicingStyle,
    cycleInversion,
    cycleDrop,
    cycleSpread,
    cycleVoicingStyle,

    // Progression settings
    trueRandomMode,
    setTrueRandomMode,

    // Raw preset functions (for wizard)
    savePreset,
    findNextAvailableSlot,
  };
}
