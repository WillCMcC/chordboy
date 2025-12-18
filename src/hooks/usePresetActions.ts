/**
 * usePresetActions Hook
 * Provides high-level preset actions including save, recall, solve, and chord building from presets.
 *
 * @module hooks/usePresetActions
 */

import { useCallback, useRef } from "react";
import { parseKeys } from "../lib/parseKeys";
import { buildChord, invertChord } from "../lib/chordBuilder";
import { applySpread, applyVoicingStyle } from "../lib/voicingTransforms";
import type { MIDINote, Octave, Preset, VoicingStyle } from "../types";

export interface UsePresetActionsParams {
  pressedKeys: Set<string>;
  recalledKeys: Set<string> | null;
  octave: Octave;
  inversionIndex: number;
  droppedNotes: number;
  spreadAmount: number;
  voicingStyle: VoicingStyle;
  savedPresets: Map<string, Preset>;
  savePreset: (
    slotNumber: string,
    preset: {
      keys: Set<string>;
      octave: Octave;
      inversionIndex?: number;
      droppedNotes?: number;
      spreadAmount?: number;
      voicingStyle?: VoicingStyle;
    }
  ) => boolean;
  recallPreset: (slotNumber: string) => Preset | null;
  stopRecalling: () => void;
  solvePresetVoicings: (selectedSlots: string[], octave: Octave, spreadPreference: number) => boolean;
}

export interface UsePresetActionsReturn {
  saveCurrentChordToSlot: (slotNumber: string) => boolean;
  recallPresetFromSlot: (slotNumber: string) => boolean;
  stopRecallingPreset: () => void;
  solvePresets: (selectedSlots: string[], spreadPreference?: number) => boolean;
  getChordNotesFromPreset: (slotNumber: string) => MIDINote[] | null;
  recalledKeysJustSetRef: React.MutableRefObject<boolean>;
}

/**
 * Hook that provides preset action functions.
 * Handles saving, recalling, and solving presets, as well as building chords from preset data.
 *
 * @param params - Preset action parameters
 * @returns Preset action functions
 */
export function usePresetActions(params: UsePresetActionsParams): UsePresetActionsReturn {
  const {
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
  } = params;

  /**
   * Track if recalledKeys was just set (by sequencer or preset recall).
   * This prevents clearing a preset that was just triggered.
   * Set synchronously in recallPresetFromSlot, cleared via microtask.
   */
  const recalledKeysJustSetRef = useRef<boolean>(false);

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
          voicingStyle,
        });
      }
      return false;
    },
    [pressedKeys, recalledKeys, octave, inversionIndex, droppedNotes, spreadAmount, voicingStyle, savePreset]
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
   * @param selectedSlots - Array of slot IDs in progression order
   * @param spreadPreference - -1 (close) to 1 (wide), 0 = neutral
   */
  const solvePresets = useCallback(
    (selectedSlots: string[], spreadPreference: number = 0): boolean => {
      return solvePresetVoicings(selectedSlots, octave, spreadPreference);
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

      // Apply voicing style first
      let notes = applyVoicingStyle(chord, preset.voicingStyle ?? "close");

      // Apply spread
      if (preset.spreadAmount && preset.spreadAmount > 0) {
        notes = applySpread(notes, preset.spreadAmount);
      }

      // Apply inversion last
      notes = invertChord(notes, preset.inversionIndex ?? 0);

      return notes;
    },
    [savedPresets]
  );

  return {
    saveCurrentChordToSlot,
    recallPresetFromSlot,
    stopRecallingPreset,
    solvePresets,
    getChordNotesFromPreset,
    recalledKeysJustSetRef,
  };
}
