/**
 * Voicing Transforms
 * Shared helper functions for modifying chord voicings.
 * Used by both useChordEngine and chordSolver.
 *
 * Jazz voicing styles based on techniques from Bill Evans (rootless),
 * Bud Powell (shell), McCoy Tyner (quartal), and Barry Harris (drops).
 */

import type { MIDINote, VoicingStyle, Chord, Interval } from "../types";
import { INTERVALS } from "./chordTheory";

/**
 * Apply progressive note dropping by moving the highest notes down an octave.
 * This creates "drop" voicings commonly used in jazz piano.
 *
 * @param notes - Array of MIDI note numbers
 * @param dropCount - Number of notes to drop (0 = no change)
 * @returns Modified notes array, sorted low to high
 *
 * @example
 * // Drop 1: Move highest note down an octave
 * applyProgressiveDrop([60, 64, 67, 72], 1) // => [60, 60, 64, 67]
 *
 * @example
 * // Drop 2: Move two highest notes down an octave
 * applyProgressiveDrop([60, 64, 67, 72], 2) // => [55, 60, 60, 64]
 */
export function applyProgressiveDrop(notes: MIDINote[], dropCount: number): MIDINote[] {
  if (dropCount === 0 || !notes || notes.length === 0) {
    return notes;
  }

  const sorted = [...notes].sort((a, b) => a - b);
  const result = [...sorted];

  // Don't drop all notes - leave at least one in original position
  const actualDrops = Math.min(dropCount, notes.length - 1);

  for (let i = 0; i < actualDrops; i++) {
    const dropIndex = result.length - 1 - i;
    if (dropIndex >= 0) {
      result[dropIndex] = result[dropIndex] - 12;
    }
  }

  return result.sort((a, b) => a - b);
}

/**
 * Apply spread voicing by moving alternating notes up by octaves.
 * Creates wider, more open voicings.
 *
 * @param notes - Array of MIDI note numbers
 * @param spreadAmount - How many octaves to spread (0-3)
 * @returns Modified notes array, sorted low to high
 *
 * @example
 * // Spread 1: Move every other note up 1 octave
 * applySpread([60, 64, 67, 72], 1) // => [60, 67, 76, 84]
 *
 * @example
 * // Spread 2: Move every other note up 2 octaves
 * applySpread([60, 64, 67], 2) // => [60, 67, 88]
 */
export function applySpread(notes: MIDINote[], spreadAmount: number): MIDINote[] {
  if (spreadAmount === 0 || !notes || notes.length < 2) {
    return notes;
  }

  const result = [...notes].sort((a, b) => a - b);

  // Move alternating notes (odd indices) up by the spread amount in octaves
  for (let i = 1; i < result.length; i += 2) {
    result[i] += 12 * spreadAmount;
  }

  return result.sort((a, b) => a - b);
}

// ============================================================================
// Jazz Voicing Styles
// ============================================================================

/**
 * Helper: Find a note in the chord that matches a target interval (mod 12)
 */
function findNoteByInterval(
  rootMidi: MIDINote,
  notes: MIDINote[],
  targetInterval: Interval
): MIDINote | null {
  const targetMod = targetInterval % 12;
  for (const note of notes) {
    if ((note - rootMidi + 120) % 12 === targetMod) {
      return note;
    }
  }
  return null;
}

/**
 * Helper: Get the root MIDI note (lowest note in close position)
 */
function getRootMidi(chord: Chord): MIDINote {
  return chord.notes[0];
}

/**
 * Apply Bill Evans Type A rootless voicing: 3-5-7-9
 * Omits the root, places 3rd on bottom.
 * If 9th is not in chord, adds it automatically.
 *
 * @param chord - The chord to transform
 * @returns Rootless voicing notes
 */
export function applyRootlessA(chord: Chord): MIDINote[] {
  const rootMidi = getRootMidi(chord);
  const notes = chord.notes;

  // Find the intervals we need
  const third =
    findNoteByInterval(rootMidi, notes, INTERVALS.MAJOR_THIRD) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.MINOR_THIRD);
  const fifth =
    findNoteByInterval(rootMidi, notes, INTERVALS.PERFECT_FIFTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.DIMINISHED_FIFTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.AUGMENTED_FIFTH);
  const seventh =
    findNoteByInterval(rootMidi, notes, INTERVALS.MAJOR_SEVENTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.MINOR_SEVENTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.DIMINISHED_SEVENTH);
  const ninth =
    findNoteByInterval(rootMidi, notes, INTERVALS.MAJOR_NINTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.MINOR_NINTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.AUGMENTED_NINTH);

  // Build the voicing: 3-5-7-9
  const result: MIDINote[] = [];

  if (third) result.push(third);
  if (fifth) result.push(fifth);
  if (seventh) result.push(seventh);

  // Add 9th - if not present in chord, add a natural 9th
  if (ninth) {
    result.push(ninth);
  } else if (third) {
    // Add natural 9th above the root octave
    result.push(rootMidi + INTERVALS.MAJOR_NINTH);
  }

  // If we don't have enough notes, return original
  if (result.length < 3) {
    return notes;
  }

  // Sort and ensure 3rd is on bottom (Type A characteristic)
  const sorted = result.sort((a, b) => a - b);

  // If third isn't the lowest, rotate it down
  if (third && sorted[0] !== third) {
    const thirdIndex = sorted.indexOf(third);
    if (thirdIndex > 0) {
      sorted[thirdIndex] -= 12;
    }
  }

  return sorted.sort((a, b) => a - b);
}

/**
 * Apply Bill Evans Type B rootless voicing: 7-9-3-5
 * Omits the root, places 7th on bottom.
 * If 9th is not in chord, adds it automatically.
 *
 * @param chord - The chord to transform
 * @returns Rootless voicing notes
 */
export function applyRootlessB(chord: Chord): MIDINote[] {
  const rootMidi = getRootMidi(chord);
  const notes = chord.notes;

  // Find the intervals we need
  const third =
    findNoteByInterval(rootMidi, notes, INTERVALS.MAJOR_THIRD) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.MINOR_THIRD);
  const fifth =
    findNoteByInterval(rootMidi, notes, INTERVALS.PERFECT_FIFTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.DIMINISHED_FIFTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.AUGMENTED_FIFTH);
  const seventh =
    findNoteByInterval(rootMidi, notes, INTERVALS.MAJOR_SEVENTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.MINOR_SEVENTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.DIMINISHED_SEVENTH);
  const ninth =
    findNoteByInterval(rootMidi, notes, INTERVALS.MAJOR_NINTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.MINOR_NINTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.AUGMENTED_NINTH);

  // Build the voicing: 7-9-3-5
  const result: MIDINote[] = [];

  if (seventh) result.push(seventh);

  // Add 9th - if not present in chord, add a natural 9th
  if (ninth) {
    result.push(ninth);
  } else {
    result.push(rootMidi + INTERVALS.MAJOR_NINTH);
  }

  if (third) result.push(third);
  if (fifth) result.push(fifth);

  // If we don't have enough notes, return original
  if (result.length < 3) {
    return notes;
  }

  // Sort and ensure 7th is on bottom (Type B characteristic)
  const sorted = result.sort((a, b) => a - b);

  // If seventh isn't the lowest, rotate it down
  if (seventh && sorted[0] !== seventh) {
    const seventhIndex = sorted.indexOf(seventh);
    if (seventhIndex > 0) {
      sorted[seventhIndex] -= 12;
    }
  }

  return sorted.sort((a, b) => a - b);
}

/**
 * Apply Bud Powell shell voicing: Root + 3rd + 7th
 * Minimal voicing for bebop comping.
 *
 * @param chord - The chord to transform
 * @returns Shell voicing notes
 */
export function applyShell(chord: Chord): MIDINote[] {
  const rootMidi = getRootMidi(chord);
  const notes = chord.notes;

  // Find the intervals we need
  const third =
    findNoteByInterval(rootMidi, notes, INTERVALS.MAJOR_THIRD) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.MINOR_THIRD);
  const seventh =
    findNoteByInterval(rootMidi, notes, INTERVALS.MAJOR_SEVENTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.MINOR_SEVENTH) ??
    findNoteByInterval(rootMidi, notes, INTERVALS.DIMINISHED_SEVENTH);

  const result: MIDINote[] = [rootMidi];

  if (third) result.push(third);

  // If we have a 7th, use it; otherwise try to find a 6th for 6th chords
  if (seventh) {
    result.push(seventh);
  } else {
    const sixth = findNoteByInterval(rootMidi, notes, INTERVALS.MAJOR_SIXTH);
    if (sixth) result.push(sixth);
  }

  // If we only got root + third, that's still a valid shell
  if (result.length < 2) {
    return notes;
  }

  return result.sort((a, b) => a - b);
}

/**
 * Apply McCoy Tyner quartal voicing: stacked perfect 4ths
 * For minor chords, creates the "So What" voicing (4th-4th-4th-3rd).
 * For dominant chords, creates quartal voicing from the 7th (Bb-Eb-Ab for C7sus).
 * For other chords, stacks 4ths from the root.
 *
 * @param chord - The chord to transform
 * @returns Quartal voicing notes
 */
export function applyQuartal(chord: Chord): MIDINote[] {
  const rootMidi = getRootMidi(chord);
  const isMinor = chord.quality === "minor";
  const hasDom7 = chord.modifiers.includes("dom7");

  if (isMinor) {
    // "So What" voicing: 4th-4th-4th-3rd from the root
    // This creates: root, +5 (P4), +10 (P4), +15 (P4), +19 (M3)
    // Which is: 1, 4, b7, 3 (an octave up), 5 (an octave up)
    // Actually the So What voicing from the 3rd degree:
    // E-A-D-G-B for Dm7 (starting from E, the 3rd)
    return [
      rootMidi + INTERVALS.MINOR_THIRD, // Start from the 3rd
      rootMidi + INTERVALS.MINOR_THIRD + 5, // +P4
      rootMidi + INTERVALS.MINOR_THIRD + 10, // +P4
      rootMidi + INTERVALS.MINOR_THIRD + 15, // +P4
      rootMidi + INTERVALS.MINOR_THIRD + 19, // +M3
    ].sort((a, b) => a - b);
  }

  if (hasDom7) {
    // Quartal voicing from the 7th for dominant chords
    // For C7: Bb-Eb-Ab (creates a sus4 sound, very modal)
    // This is the classic McCoy Tyner dominant voicing
    const seventh = rootMidi + INTERVALS.MINOR_SEVENTH; // b7
    return [
      seventh, // b7
      seventh + 5, // b3 (P4 above b7)
      seventh + 10, // b6 (P4 above that)
      seventh + 15, // b2/b9 (P4 above that)
    ].sort((a, b) => a - b);
  }

  // For non-minor, non-dominant chords: stack 4ths from root
  // Creates an ambiguous, modal sound
  const result: MIDINote[] = [
    rootMidi,
    rootMidi + 5, // P4
    rootMidi + 10, // P4
    rootMidi + 15, // P4
  ];

  // For major, add a 3rd on top for color
  if (chord.quality === "major") {
    result.push(rootMidi + 19); // M3 on top
  }

  return result.sort((a, b) => a - b);
}

/**
 * Apply upper structure triad voicing for altered dominants.
 * Places a major triad a minor 3rd above the root over the tritone.
 * For C7alt: Eb major triad (Eb-G-Bb) = #9, #5/b13, b7
 * This automatically creates an altered dominant sound.
 *
 * @param chord - The chord to transform
 * @returns Upper structure voicing notes
 */
export function applyUpperStructure(chord: Chord): MIDINote[] {
  const rootMidi = getRootMidi(chord);

  // The tritone (3rd and 7th) defines the dominant sound
  const third = findNoteByInterval(rootMidi, chord.notes, INTERVALS.MAJOR_THIRD);
  const seventh =
    findNoteByInterval(rootMidi, chord.notes, INTERVALS.MINOR_SEVENTH) ??
    findNoteByInterval(rootMidi, chord.notes, INTERVALS.MAJOR_SEVENTH);

  // Upper structure: major triad a minor 3rd above root
  // For C7: Eb major = Eb(#9) - G(#5/b13) - Bb(7)
  const upperRoot = rootMidi + INTERVALS.MINOR_THIRD; // #9 enharmonically
  const upperThird = upperRoot + INTERVALS.MAJOR_THIRD; // #5/b13
  const upperFifth = upperRoot + INTERVALS.PERFECT_FIFTH; // 7th

  const result: MIDINote[] = [];

  // Add the tritone (essential for dominant sound)
  if (third) result.push(third);
  if (seventh) result.push(seventh);

  // Add the upper structure triad
  result.push(upperRoot);
  result.push(upperThird);
  result.push(upperFifth);

  // If we don't have a proper voicing, return original
  if (result.length < 4) {
    return chord.notes;
  }

  return result.sort((a, b) => a - b);
}

/**
 * Apply true Drop 2 voicing: drop the 2nd note from top down an octave.
 * This creates a 9th/10th interval span - the classic jazz piano sound.
 *
 * @param notes - Array of MIDI notes (must have 4+ notes)
 * @returns Drop 2 voicing notes
 */
export function applyTrueDrop2(notes: MIDINote[]): MIDINote[] {
  if (!notes || notes.length < 4) {
    return notes || [];
  }

  const sorted = [...notes].sort((a, b) => a - b);
  const result = [...sorted];

  // Drop the 2nd note from top (index length-2) down an octave
  const dropIndex = result.length - 2;
  result[dropIndex] -= 12;

  return result.sort((a, b) => a - b);
}

/**
 * Apply true Drop 3 voicing: drop the 3rd note from top down an octave.
 *
 * @param notes - Array of MIDI notes (must have 4+ notes)
 * @returns Drop 3 voicing notes
 */
export function applyTrueDrop3(notes: MIDINote[]): MIDINote[] {
  if (!notes || notes.length < 4) {
    return notes || [];
  }

  const sorted = [...notes].sort((a, b) => a - b);
  const result = [...sorted];

  // Drop the 3rd note from top (index length-3) down an octave
  const dropIndex = result.length - 3;
  if (dropIndex >= 0) {
    result[dropIndex] -= 12;
  }

  return result.sort((a, b) => a - b);
}

/**
 * Apply Drop 2+4 voicing: drop both 2nd and 4th notes from top down an octave.
 * Creates very wide, orchestral voicings.
 *
 * @param notes - Array of MIDI notes (must have 4+ notes)
 * @returns Drop 2+4 voicing notes
 */
export function applyDrop24(notes: MIDINote[]): MIDINote[] {
  if (!notes || notes.length < 4) {
    return notes || [];
  }

  const sorted = [...notes].sort((a, b) => a - b);
  const result = [...sorted];

  // Drop the 2nd note from top
  result[result.length - 2] -= 12;

  // Drop the 4th note from top (if exists)
  if (result.length >= 4) {
    result[result.length - 4] -= 12;
  }

  return result.sort((a, b) => a - b);
}

/**
 * Apply a voicing style to a chord.
 * Main entry point for voicing transforms.
 *
 * @param chord - The chord to voice
 * @param style - The voicing style to apply
 * @returns Array of MIDI notes with the voicing applied
 */
export function applyVoicingStyle(chord: Chord, style: VoicingStyle): MIDINote[] {
  switch (style) {
    case "rootless-a":
      return applyRootlessA(chord);
    case "rootless-b":
      return applyRootlessB(chord);
    case "shell":
      return applyShell(chord);
    case "quartal":
      return applyQuartal(chord);
    case "drop2":
      return applyTrueDrop2(chord.notes);
    case "drop3":
      return applyTrueDrop3(chord.notes);
    case "drop24":
      return applyDrop24(chord.notes);
    case "upper-struct":
      return applyUpperStructure(chord);
    case "close":
    default:
      return chord.notes;
  }
}

/**
 * Get the next voicing style in the cycle.
 *
 * @param current - Current voicing style
 * @param styles - Array of styles to cycle through
 * @returns Next voicing style
 */
export function cycleVoicingStyle(
  current: VoicingStyle,
  styles: VoicingStyle[]
): VoicingStyle {
  const currentIndex = styles.indexOf(current);
  const nextIndex = (currentIndex + 1) % styles.length;
  return styles[nextIndex];
}

// ============================================================================
// Register Constraints
// ============================================================================

/**
 * Optimal register ranges for different voicing styles.
 * Based on jazz piano convention: rootless voicings sound best around middle C.
 *
 * MIDI note ranges:
 * - C3 = 48, C4 = 60 (middle C), C5 = 72
 * - Ideal rootless range: E3 (52) to G5 (79)
 * - Shell voicings can go lower since they include root
 */
export const REGISTER_CONSTRAINTS = {
  // Rootless voicings: keep around middle C (C3-C5 range)
  "rootless-a": { min: 48, max: 79, ideal: 60 },
  "rootless-b": { min: 48, max: 79, ideal: 60 },
  // Shell voicings can be lower (root provides foundation)
  "shell": { min: 36, max: 72, ideal: 54 },
  // Quartal voicings: similar to rootless
  "quartal": { min: 48, max: 79, ideal: 60 },
  // Upper structure: keep in mid-high register for clarity
  "upper-struct": { min: 52, max: 84, ideal: 64 },
  // Drop voicings: wider range acceptable
  "drop2": { min: 40, max: 84, ideal: 58 },
  "drop3": { min: 36, max: 84, ideal: 54 },
  "drop24": { min: 36, max: 84, ideal: 54 },
  // Close position: flexible
  "close": { min: 36, max: 96, ideal: 60 },
} as const;

/**
 * Calculate register penalty for a voicing based on its style.
 * Penalizes voicings that are outside the ideal register for their style.
 *
 * @param notes - Array of MIDI notes
 * @param style - The voicing style being used
 * @returns Penalty score (0 = ideal, higher = worse)
 */
export function calculateRegisterPenalty(
  notes: MIDINote[],
  style: VoicingStyle
): number {
  if (!notes || notes.length === 0) return 0;

  const constraints = REGISTER_CONSTRAINTS[style] || REGISTER_CONSTRAINTS.close;
  const { min, max, ideal } = constraints;

  let penalty = 0;
  const lowestNote = Math.min(...notes);
  const highestNote = Math.max(...notes);
  const centerNote = (lowestNote + highestNote) / 2;

  // Heavy penalty for notes outside the acceptable range
  if (lowestNote < min) {
    penalty += (min - lowestNote) * 3; // 3 points per semitone below min
  }
  if (highestNote > max) {
    penalty += (highestNote - max) * 3; // 3 points per semitone above max
  }

  // Light penalty for distance from ideal center
  penalty += Math.abs(centerNote - ideal) * 0.5;

  return penalty;
}

/**
 * Constrain voicing to its optimal register by octave shifting.
 * Shifts the entire voicing up or down to fit within the ideal range.
 *
 * @param notes - Array of MIDI notes
 * @param style - The voicing style being used
 * @returns Adjusted notes within optimal register
 */
export function constrainToRegister(
  notes: MIDINote[],
  style: VoicingStyle
): MIDINote[] {
  if (!notes || notes.length === 0) return notes;

  const constraints = REGISTER_CONSTRAINTS[style] || REGISTER_CONSTRAINTS.close;
  const { min, max, ideal } = constraints;

  const lowestNote = Math.min(...notes);
  const highestNote = Math.max(...notes);
  const range = highestNote - lowestNote;

  // If the chord span is larger than the allowed range, just return as-is
  if (range > max - min) return notes;

  let shift = 0;

  // Shift up if too low
  if (lowestNote < min) {
    shift = Math.ceil((min - lowestNote) / 12) * 12;
  }
  // Shift down if too high
  else if (highestNote > max) {
    shift = -Math.ceil((highestNote - max) / 12) * 12;
  }
  // Otherwise, try to center around ideal
  else {
    const center = (lowestNote + highestNote) / 2;
    const idealShift = Math.round((ideal - center) / 12) * 12;

    // Only apply centering shift if it keeps us in range
    const shiftedLow = lowestNote + idealShift;
    const shiftedHigh = highestNote + idealShift;
    if (shiftedLow >= min && shiftedHigh <= max) {
      shift = idealShift;
    }
  }

  if (shift === 0) return notes;

  return notes.map((n) => n + shift);
}
