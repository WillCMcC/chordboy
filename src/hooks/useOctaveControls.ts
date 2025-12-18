/**
 * useOctaveControls Hook
 * Manages octave control functions for both global and per-preset octave settings.
 *
 * @module hooks/useOctaveControls
 */

import { useCallback, Dispatch, SetStateAction } from "react";
import type { Octave, Preset, VoicingStyle } from "../types";

export interface UseOctaveControlsParams {
  octave: Octave;
  activePresetSlot: string | null;
  savedPresets: Map<string, Preset>;
  setOctave: Dispatch<SetStateAction<Octave>>;
  setRecalledOctave: Dispatch<SetStateAction<Octave | null>>;
  updatePresetVoicing: (
    slotNumber: string,
    updates: {
      octave?: Octave;
      inversionIndex?: number;
      droppedNotes?: number;
      spreadAmount?: number;
      voicingStyle?: VoicingStyle;
    }
  ) => void;
}

export interface UseOctaveControlsReturn {
  increaseOctave: () => void;
  decreaseOctave: () => void;
  resetOctave: () => void;
  changeOctave: (direction: number) => void;
}

/**
 * Hook that provides octave control functions.
 * Handles both global octave changes and per-preset octave updates.
 *
 * @param params - Octave control parameters
 * @returns Octave control functions
 */
export function useOctaveControls(params: UseOctaveControlsParams): UseOctaveControlsReturn {
  const {
    octave,
    activePresetSlot,
    savedPresets,
    setOctave,
    setRecalledOctave,
    updatePresetVoicing,
  } = params;

  /**
   * Change octave by a given direction. Updates preset if one is active.
   */
  const changeOctave = useCallback(
    (direction: number): void => {
      if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
        setRecalledOctave((prev) => {
          const currentOct = prev !== null ? prev : octave;
          const newOctave = Math.max(0, Math.min(7, currentOct + direction)) as Octave;
          updatePresetVoicing(activePresetSlot, { octave: newOctave });
          return newOctave;
        });
      } else {
        setOctave((prev) => Math.max(0, Math.min(7, prev + direction)) as Octave);
      }
    },
    [activePresetSlot, savedPresets, octave, setRecalledOctave, updatePresetVoicing, setOctave]
  );

  /**
   * Increase global octave by 1.
   */
  const increaseOctave = useCallback((): void => {
    setOctave((prev) => Math.min(7, prev + 1) as Octave);
  }, [setOctave]);

  /**
   * Decrease global octave by 1.
   */
  const decreaseOctave = useCallback((): void => {
    setOctave((prev) => Math.max(0, prev - 1) as Octave);
  }, [setOctave]);

  /**
   * Reset octave to default (4).
   */
  const resetOctave = useCallback((): void => {
    setOctave(4);
  }, [setOctave]);

  return {
    increaseOctave,
    decreaseOctave,
    resetOctave,
    changeOctave,
  };
}
