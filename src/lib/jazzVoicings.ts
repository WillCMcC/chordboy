/**
 * Jazz Voicing Styles
 * Jazz-specific voicing functions based on techniques from Bill Evans (rootless),
 * Bud Powell (shell), McCoy Tyner (quartal), and Barry Harris (drops).
 *
 * Split from voicingTransforms.ts for better modularity.
 */

import type { MIDINote, Chord, Interval } from "../types";
import { INTERVALS } from "./chordTheory";

/**
 * Clamp a note value to valid MIDI range (0-127).
 * MIDI notes outside this range are invalid and can cause issues with hardware/software.
 *
 * @param note - The note value to clamp
 * @returns A valid MIDI note number (0-127)
 */
function clampMIDI(note: number): MIDINote {
  return Math.max(0, Math.min(127, note)) as MIDINote;
}

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
    result.push(clampMIDI(rootMidi + INTERVALS.MAJOR_NINTH));
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
    result.push(clampMIDI(rootMidi + INTERVALS.MAJOR_NINTH));
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
      clampMIDI(rootMidi + INTERVALS.MINOR_THIRD), // Start from the 3rd
      clampMIDI(rootMidi + INTERVALS.MINOR_THIRD + 5), // +P4
      clampMIDI(rootMidi + INTERVALS.MINOR_THIRD + 10), // +P4
      clampMIDI(rootMidi + INTERVALS.MINOR_THIRD + 15), // +P4
      clampMIDI(rootMidi + INTERVALS.MINOR_THIRD + 19), // +M3
    ].sort((a, b) => a - b);
  }

  if (hasDom7) {
    // Quartal voicing from the 7th for dominant chords
    // For C7: Bb-Eb-Ab (creates a sus4 sound, very modal)
    // This is the classic McCoy Tyner dominant voicing
    const seventh = rootMidi + INTERVALS.MINOR_SEVENTH; // b7
    return [
      clampMIDI(seventh), // b7
      clampMIDI(seventh + 5), // b3 (P4 above b7)
      clampMIDI(seventh + 10), // b6 (P4 above that)
      clampMIDI(seventh + 15), // b2/b9 (P4 above that)
    ].sort((a, b) => a - b);
  }

  // For non-minor, non-dominant chords: stack 4ths from root
  // Creates an ambiguous, modal sound
  const result: MIDINote[] = [
    clampMIDI(rootMidi),
    clampMIDI(rootMidi + 5), // P4
    clampMIDI(rootMidi + 10), // P4
    clampMIDI(rootMidi + 15), // P4
  ];

  // For major, add a 3rd on top for color
  if (chord.quality === "major") {
    result.push(clampMIDI(rootMidi + 19)); // M3 on top
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
