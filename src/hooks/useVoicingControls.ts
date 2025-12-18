/**
 * useVoicingControls Hook
 * Manages voicing transform controls (inversion, drop, spread, voicing style).
 * Handles both global voicing state and per-preset voicing state.
 *
 * @module hooks/useVoicingControls
 */

import { useCallback, Dispatch, SetStateAction } from "react";
import type { Octave, Preset, VoicingStyle } from "../types";
import { VOICING_STYLES } from "../types";
import type { VoicedChord } from "./useChordEngine";

export interface UseVoicingControlsParams {
  currentChord: VoicedChord | null;
  inversionIndex: number;
  droppedNotes: number;
  spreadAmount: number;
  voicingStyle: VoicingStyle;
  activePresetSlot: string | null;
  savedPresets: Map<string, Preset>;
  setInversionIndex: Dispatch<SetStateAction<number>>;
  setDroppedNotes: Dispatch<SetStateAction<number>>;
  setSpreadAmount: Dispatch<SetStateAction<number>>;
  setVoicingStyle: Dispatch<SetStateAction<VoicingStyle>>;
  setRecalledInversion: Dispatch<SetStateAction<number | null>>;
  setRecalledDrop: Dispatch<SetStateAction<number | null>>;
  setRecalledSpread: Dispatch<SetStateAction<number | null>>;
  setRecalledVoicingStyle: Dispatch<SetStateAction<VoicingStyle | null>>;
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

export interface UseVoicingControlsReturn {
  cycleInversion: () => void;
  cycleDrop: () => void;
  cycleSpread: () => void;
  cycleVoicingStyle: () => void;
}

/**
 * Hook that provides voicing control functions.
 * Each function updates either global state or per-preset recalled state
 * depending on whether a preset is currently active.
 *
 * @param params - Voicing control parameters
 * @returns Cycle functions for voicing controls
 */
export function useVoicingControls(params: UseVoicingControlsParams): UseVoicingControlsReturn {
  const {
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
  } = params;

  /**
   * Helper to update voicing on the active preset.
   */
  const updateActivePresetVoicing = useCallback(
    (updates: {
      octave?: Octave;
      inversionIndex?: number;
      droppedNotes?: number;
      spreadAmount?: number;
      voicingStyle?: VoicingStyle;
    }): void => {
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
  }, [
    currentChord,
    activePresetSlot,
    savedPresets,
    inversionIndex,
    updateActivePresetVoicing,
    setRecalledInversion,
    setInversionIndex,
  ]);

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
  }, [
    currentChord,
    activePresetSlot,
    savedPresets,
    droppedNotes,
    updateActivePresetVoicing,
    setRecalledDrop,
    setDroppedNotes,
  ]);

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
  }, [
    activePresetSlot,
    savedPresets,
    spreadAmount,
    updateActivePresetVoicing,
    setRecalledSpread,
    setSpreadAmount,
  ]);

  /**
   * Cycle to the next voicing style. Updates recalled value if preset active, else global.
   */
  const cycleVoicingStyle = useCallback((): void => {
    if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
      setRecalledVoicingStyle((prev) => {
        const current = prev !== null ? prev : voicingStyle;
        const currentIndex = VOICING_STYLES.indexOf(current);
        const newStyle = VOICING_STYLES[(currentIndex + 1) % VOICING_STYLES.length];
        updateActivePresetVoicing({ voicingStyle: newStyle });
        return newStyle;
      });
    } else {
      setVoicingStyle((prev) => {
        const currentIndex = VOICING_STYLES.indexOf(prev);
        return VOICING_STYLES[(currentIndex + 1) % VOICING_STYLES.length];
      });
    }
  }, [
    activePresetSlot,
    savedPresets,
    voicingStyle,
    updateActivePresetVoicing,
    setRecalledVoicingStyle,
    setVoicingStyle,
  ]);

  return {
    cycleInversion,
    cycleDrop,
    cycleSpread,
    cycleVoicingStyle,
  };
}
