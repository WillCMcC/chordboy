/**
 * Chord Solver
 * Finds optimal voicings for a sequence of chords to minimize voice movement.
 * Uses dynamic programming to find the best voicing style/inversion/spread combination.
 *
 * Jazz-aware features:
 * - Weights 7th→3rd resolution (the defining motion of ii-V-I)
 * - Applies register constraints per voicing style
 * - Considers all voicing styles (rootless, shell, quartal, etc.)
 */

import { buildChord, invertChord } from "./chordBuilder";
import { parseKeys } from "./parseKeys";
import {
  applyProgressiveDrop,
  applySpread,
  applyVoicingStyle,
  calculateRegisterPenalty,
} from "./voicingTransforms";
import type { MIDINote, Octave, Preset, VoicingSettings, VoicingStyle, Chord } from "../types";
import { VOICING_STYLES } from "../types";

/** Internal voicing option with computed notes */
interface VoicingOption {
  inversionIndex: number;
  spreadAmount: number;
  droppedNotes: number;
  voicingStyle: VoicingStyle;
  octave?: Octave;
  notes: MIDINote[];
}

/** Options for the chord solver */
export interface SolverOptions {
  /** Preferred octave to center voicings around */
  targetOctave?: Octave;
  /** Voicing styles to consider (defaults to all) */
  allowedStyles?: readonly VoicingStyle[];
  /** Whether to apply 7th→3rd resolution weighting */
  jazzVoiceLeading?: boolean;
  /** Whether to apply register constraints */
  useRegisterConstraints?: boolean;
  /**
   * Spread preference: -1 to 1
   * -1 = strongly prefer close voicings (minimal spread)
   *  0 = neutral (default, minimizes voice movement)
   *  1 = strongly prefer wide voicings (more spread)
   */
  spreadPreference?: number;
}

/**
 * Calculate spread bonus/penalty based on voicing width and preference.
 * @param notes - Chord notes
 * @param preference - -1 (close) to 1 (wide)
 * @returns Adjustment to distance score (negative = bonus)
 */
function calculateSpreadAdjustment(notes: MIDINote[], preference: number): number {
  if (!notes || notes.length < 2 || preference === 0) return 0;

  const sorted = [...notes].sort((a, b) => a - b);
  const span = sorted[sorted.length - 1] - sorted[0];

  // Scale factor must compete with voice movement costs (1 point per semitone)
  // Higher value makes spread preference more impactful
  const scaleFactor = 30;

  if (preference < 0) {
    // Close preference: reward compact voicings (span ≤ 15), penalize wider
    // Typical close jazz voicing spans 10-15 semitones
    const excessSpan = Math.max(0, span - 15);
    let adjustment = excessSpan * scaleFactor * Math.abs(preference) * 0.15;

    // Bonus for truly compact voicings (≤ 12 semitones)
    if (span <= 12 && Math.abs(preference) > 0.5) {
      adjustment -= 12 * Math.abs(preference);
    }
    return adjustment;
  } else {
    // Wide preference: reward open voicings (span ≥ 20), penalize narrower
    // Typical spread jazz voicing spans 20-30 semitones
    const spanDeficit = Math.max(0, 20 - span);
    let adjustment = spanDeficit * scaleFactor * preference * 0.15;

    // Bonus for truly wide voicings (≥ 24 semitones)
    if (span >= 24 && preference > 0.5) {
      adjustment -= 15 * preference;
    }
    return adjustment;
  }
}

/**
 * Interval constants for voice leading analysis
 */
const INTERVALS = {
  MINOR_THIRD: 3,
  MAJOR_THIRD: 4,
  MINOR_SEVENTH: 10,
  MAJOR_SEVENTH: 11,
} as const;

/**
 * Detect if a note is a 7th in relation to a chord's root
 */
function isSeventh(note: MIDINote, rootMidi: MIDINote): boolean {
  const interval = ((note - rootMidi) % 12 + 12) % 12;
  return interval === INTERVALS.MINOR_SEVENTH || interval === INTERVALS.MAJOR_SEVENTH;
}

/**
 * Detect if a note is a 3rd in relation to a chord's root
 */
function isThird(note: MIDINote, rootMidi: MIDINote): boolean {
  const interval = ((note - rootMidi) % 12 + 12) % 12;
  return interval === INTERVALS.MINOR_THIRD || interval === INTERVALS.MAJOR_THIRD;
}

/**
 * Calculate the total voice distance between two chord voicings.
 * Measures how much each voice needs to move between chords.
 *
 * Jazz-aware: rewards 7th→3rd resolution (the defining motion of ii-V-I).
 *
 * @param chord1 - First chord MIDI notes (sorted)
 * @param chord2 - Second chord MIDI notes (sorted)
 * @param chord1Data - Optional chord data for voice leading analysis
 * @param chord2Data - Optional chord data for voice leading analysis
 * @param jazzVoiceLeading - Whether to apply 7th→3rd weighting
 * @returns Total semitone distance (lower is better)
 */
function calculateVoiceDistance(
  chord1: MIDINote[] | null | undefined,
  chord2: MIDINote[] | null | undefined,
  chord1Data?: Chord | null,
  chord2Data?: Chord | null,
  jazzVoiceLeading: boolean = true
): number {
  if (!chord1 || !chord2 || chord1.length === 0 || chord2.length === 0) {
    return Infinity;
  }

  // If chords have different numbers of notes, handle accordingly
  const maxLen = Math.max(chord1.length, chord2.length);
  const minLen = Math.min(chord1.length, chord2.length);

  let totalDistance = 0;
  let resolutionBonus = 0;

  // Match voices from bass up
  for (let i = 0; i < minLen; i++) {
    const movement = Math.abs(chord1[i] - chord2[i]);
    totalDistance += movement;

    // Jazz voice leading: reward 7th→3rd resolution
    // In ii-V-I, the 7th of one chord should resolve to the 3rd of the next
    if (jazzVoiceLeading && chord1Data && chord2Data && movement <= 2) {
      const root1 = chord1Data.notes[0];
      const root2 = chord2Data.notes[0];

      // Check if this voice is moving from a 7th to a 3rd (or vice versa)
      if (
        (isSeventh(chord1[i], root1) && isThird(chord2[i], root2)) ||
        (isThird(chord1[i], root1) && isSeventh(chord2[i], root2))
      ) {
        // Reward smooth resolution by half-step or whole-step
        resolutionBonus += 4; // Significant bonus for proper resolution
      }
    }
  }

  // Penalize voice count differences
  totalDistance += (maxLen - minLen) * 12; // One octave penalty per missing voice

  // Apply resolution bonus (subtract from distance to make it more attractive)
  return Math.max(0, totalDistance - resolutionBonus);
}

/**
 * Generate all possible voicings for a chord, including all voicing styles.
 * @param preset - Preset object with keys, octave, etc.
 * @param allowedStyles - Which voicing styles to include
 * @returns Array of voicing options with their resulting notes and metadata
 */
function generateAllVoicings(
  preset: Preset,
  allowedStyles: readonly VoicingStyle[] = VOICING_STYLES
): { voicings: VoicingOption[]; chord: Chord | null } {
  const parsedKeys = parseKeys(preset.keys);
  if (!parsedKeys.root) return { voicings: [], chord: null };

  const baseChord = buildChord(parsedKeys.root, parsedKeys.modifiers, {
    octave: preset.octave,
  });

  if (!baseChord || !baseChord.notes) return { voicings: [], chord: null };

  const voicings: VoicingOption[] = [];
  const maxInversions = baseChord.notes.length;
  const maxSpread = 3; // Increased for more voicing variety with spread preference

  // For each voicing style, generate combinations with inversions and spread
  for (const style of allowedStyles) {
    // Apply the voicing style first
    let styledNotes = applyVoicingStyle(baseChord, style);

    // For each inversion of the styled voicing
    for (let inversion = 0; inversion < Math.min(maxInversions, styledNotes.length); inversion++) {
      // For each spread amount
      for (let spread = 0; spread <= maxSpread; spread++) {
        let notes = [...styledNotes];

        // Apply spread
        if (spread > 0) {
          notes = applySpread(notes, spread);
        }

        // Apply inversion
        notes = invertChord(notes, inversion);
        notes = notes.sort((a, b) => a - b);

        voicings.push({
          inversionIndex: inversion,
          spreadAmount: spread,
          droppedNotes: 0, // Legacy field, not used with voicing styles
          voicingStyle: style,
          notes,
        });
      }
    }
  }

  return { voicings, chord: baseChord };
}

/**
 * Generate voicings with octave shifts for a chord
 * @param preset - Preset object
 * @param octaveRange - How many octaves up/down to try
 * @param allowedStyles - Which voicing styles to include
 * @returns Array of voicing options and the base chord data
 */
function generateVoicingsWithOctaveShifts(
  preset: Preset,
  octaveRange: number = 1,
  allowedStyles: readonly VoicingStyle[] = VOICING_STYLES
): { voicings: VoicingOption[]; chord: Chord | null } {
  const allVoicings: VoicingOption[] = [];
  let baseChord: Chord | null = null;

  for (
    let octaveShift = -octaveRange;
    octaveShift <= octaveRange;
    octaveShift++
  ) {
    const shiftedPreset: Preset = {
      ...preset,
      octave: Math.max(-1, Math.min(9, preset.octave + octaveShift)) as Octave,
    };

    const { voicings, chord } = generateAllVoicings(
      shiftedPreset,
      allowedStyles
    );

    if (!baseChord && chord) baseChord = chord;

    voicings.forEach((v) => {
      v.octave = shiftedPreset.octave;
      allVoicings.push(v);
    });
  }

  return { voicings: allVoicings, chord: baseChord };
}

/**
 * Solve for optimal voicings using dynamic programming
 * Considers all voicing styles, 7th→3rd resolution, and register constraints.
 *
 * @param presets - Array of preset objects in order
 * @param options - Solver options
 * @returns Optimal voicing settings for each chord
 */
export function solveChordVoicings(
  presets: Preset[] | null | undefined,
  options: SolverOptions = {}
): VoicingSettings[] {
  const {
    targetOctave,
    allowedStyles = VOICING_STYLES,
    jazzVoiceLeading = true,
    useRegisterConstraints = true,
    spreadPreference = 0,
  } = options;

  if (!presets || presets.length === 0) return [];
  if (presets.length === 1) {
    // Single chord - return default voicing
    return [
      {
        inversionIndex: presets[0].inversionIndex || 0,
        spreadAmount: presets[0].spreadAmount || 0,
        droppedNotes: presets[0].droppedNotes || 0,
        voicingStyle: presets[0].voicingStyle || "close",
        octave: targetOctave || presets[0].octave,
      },
    ];
  }

  // Generate all possible voicings for each chord, including all styles
  // Store both voicings and chord data for voice leading analysis
  const voicingData: { voicings: VoicingOption[]; chord: Chord | null }[] = presets.map(
    (preset) => {
      const presetWithTargetOctave = targetOctave
        ? { ...preset, octave: targetOctave }
        : preset;
      return generateVoicingsWithOctaveShifts(
        presetWithTargetOctave,
        1,
        allowedStyles
      );
    }
  );

  const allVoicings = voicingData.map((d) => d.voicings);
  const allChords = voicingData.map((d) => d.chord);

  // Check if any chord has no valid voicings
  if (allVoicings.some((v) => v.length === 0)) {
    console.error("Some chords have no valid voicings");
    return presets.map((p) => ({
      inversionIndex: p.inversionIndex || 0,
      spreadAmount: p.spreadAmount || 0,
      droppedNotes: p.droppedNotes || 0,
      voicingStyle: p.voicingStyle || "close",
      octave: p.octave,
    }));
  }

  const n = presets.length;

  // dp[i][j] = minimum total distance to reach chord i with voicing j
  const dp: number[][] = [];
  const parent: number[][] = []; // To reconstruct the path

  // Initialize first chord with register penalties and spread preference
  dp[0] = allVoicings[0].map((v) => {
    let cost = useRegisterConstraints ? calculateRegisterPenalty(v.notes, v.voicingStyle) : 0;
    cost += calculateSpreadAdjustment(v.notes, spreadPreference);
    return cost;
  });
  parent[0] = allVoicings[0].map(() => -1);

  // Fill DP table
  for (let i = 1; i < n; i++) {
    dp[i] = [];
    parent[i] = [];

    for (let j = 0; j < allVoicings[i].length; j++) {
      let minDist = Infinity;
      let minParent = 0;

      // Calculate register penalty for this voicing
      const registerPenalty = useRegisterConstraints
        ? calculateRegisterPenalty(allVoicings[i][j].notes, allVoicings[i][j].voicingStyle)
        : 0;

      // Calculate spread adjustment based on preference
      const spreadAdjustment = calculateSpreadAdjustment(
        allVoicings[i][j].notes,
        spreadPreference
      );

      for (let k = 0; k < allVoicings[i - 1].length; k++) {
        // Calculate voice distance with jazz voice leading awareness
        const voiceDistance = calculateVoiceDistance(
          allVoicings[i - 1][k].notes,
          allVoicings[i][j].notes,
          allChords[i - 1],
          allChords[i],
          jazzVoiceLeading
        );

        const totalDist = dp[i - 1][k] + voiceDistance + registerPenalty + spreadAdjustment;

        if (totalDist < minDist) {
          minDist = totalDist;
          minParent = k;
        }
      }

      dp[i][j] = minDist;
      parent[i][j] = minParent;
    }
  }

  // Find the best ending voicing
  let minFinalDist = Infinity;
  let bestFinalVoicing = 0;
  for (let j = 0; j < allVoicings[n - 1].length; j++) {
    if (dp[n - 1][j] < minFinalDist) {
      minFinalDist = dp[n - 1][j];
      bestFinalVoicing = j;
    }
  }

  // Reconstruct the optimal path
  const result: VoicingSettings[] = new Array(n);
  let currentVoicing = bestFinalVoicing;

  for (let i = n - 1; i >= 0; i--) {
    const voicing = allVoicings[i][currentVoicing];
    result[i] = {
      inversionIndex: voicing.inversionIndex,
      spreadAmount: voicing.spreadAmount,
      droppedNotes: voicing.droppedNotes,
      voicingStyle: voicing.voicingStyle,
      octave: voicing.octave ?? presets[i].octave,
    };
    currentVoicing = parent[i][currentVoicing];
  }

  return result;
}

/**
 * Get a preview of the solved chord notes
 * @param preset - Preset object
 * @param voicing - Voicing settings
 * @returns MIDI notes for the voiced chord
 */
export function getVoicedChordNotes(
  preset: Preset,
  voicing: VoicingSettings
): MIDINote[] {
  const parsedKeys = parseKeys(preset.keys);
  if (!parsedKeys.root) return [];

  const baseChord = buildChord(parsedKeys.root, parsedKeys.modifiers, {
    octave: voicing.octave,
  });

  if (!baseChord || !baseChord.notes) return [];

  // Apply voicing style first (if specified)
  let notes: MIDINote[] = voicing.voicingStyle
    ? applyVoicingStyle(baseChord, voicing.voicingStyle)
    : [...baseChord.notes];

  // Legacy: apply progressive drop if specified
  if (voicing.droppedNotes > 0) {
    notes = applyProgressiveDrop(notes, voicing.droppedNotes);
  }

  // Apply spread
  if (voicing.spreadAmount > 0) {
    notes = applySpread(notes, voicing.spreadAmount);
  }

  // Apply inversion
  notes = invertChord(notes, voicing.inversionIndex);

  return notes.sort((a, b) => a - b);
}
