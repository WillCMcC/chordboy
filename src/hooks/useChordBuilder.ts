/**
 * useChordBuilder Hook
 * Handles chord building from parsed keys with voicing transforms.
 * Manages the transformation pipeline: base chord -> voicing style -> spread -> inversion.
 *
 * @module hooks/useChordBuilder
 */

import { useMemo } from "react";
import { buildChord } from "../lib/chordBuilder";
import { getChordName } from "../lib/chordNamer";
import { applySpread, applyVoicingStyle } from "../lib/voicingTransforms";
import { invertChord } from "../lib/chordBuilder";
import type { Chord, Octave, ParsedKeys, VoicingStyle } from "../types";
import type { VoicedChord } from "./useChordEngine";

export interface UseChordBuilderParams {
  parsedKeys: ParsedKeys;
  octave: Octave;
  recalledOctave: Octave | null;
  inversionIndex: number;
  recalledInversion: number | null;
  droppedNotes: number;
  recalledDrop: number | null;
  spreadAmount: number;
  recalledSpread: number | null;
  voicingStyle: VoicingStyle;
  recalledVoicingStyle: VoicingStyle | null;
}

export interface UseChordBuilderReturn {
  baseChord: Chord | null;
  currentChord: VoicedChord | null;
}

/**
 * Hook that builds and transforms chords from parsed keyboard input.
 * Applies voicing transforms in order: voicingStyle -> spread -> inversion.
 * Uses recalled values when a preset is active, otherwise uses global values.
 *
 * @param params - Chord building parameters including parsed keys and voicing settings
 * @returns Base chord and fully voiced chord
 */
export function useChordBuilder(params: UseChordBuilderParams): UseChordBuilderReturn {
  const {
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
  } = params;

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
   *
   * Transform order: voicingStyle -> spread -> inversion
   */
  const currentChord = useMemo((): VoicedChord | null => {
    if (!baseChord) return null;

    // Use recalled values if preset is active, otherwise use global values
    const activeInversion = recalledInversion !== null ? recalledInversion : inversionIndex;
    const activeDrop = recalledDrop !== null ? recalledDrop : droppedNotes;
    const activeSpread = recalledSpread !== null ? recalledSpread : spreadAmount;
    const activeVoicingStyle = recalledVoicingStyle !== null ? recalledVoicingStyle : voicingStyle;

    // Apply voicing style first (this is the main jazz voicing transform)
    let notes = applyVoicingStyle(baseChord, activeVoicingStyle);

    // Apply spread (can be used on top of any voicing style)
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
      voicingStyle: activeVoicingStyle,
    };
  }, [
    baseChord,
    inversionIndex,
    droppedNotes,
    spreadAmount,
    voicingStyle,
    recalledInversion,
    recalledDrop,
    recalledSpread,
    recalledVoicingStyle,
  ]);

  return {
    baseChord,
    currentChord,
  };
}
