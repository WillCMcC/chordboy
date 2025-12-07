/**
 * Chord Builder
 * Converts root note and modifiers into chord structures with MIDI notes
 */

import { INTERVALS, buildNotesFromIntervals } from "./chordTheory";
import type {
  NoteName,
  NoteNameWithFlats,
  MIDINote,
  Interval,
  Octave,
  ModifierType,
  ChordQuality,
  Chord,
  DropType,
} from "../types";

/** Options for building a chord */
interface BuildChordOptions {
  octave?: Octave;
}

/**
 * Build a chord from root note and modifiers
 * @param root - Root note name (e.g., "C", "F#")
 * @param modifiers - Array of modifier names
 * @param options - Additional options (octave, etc.)
 * @returns Chord object { root, intervals, notes, quality } or null if no root
 */
export function buildChord(
  root: NoteName | NoteNameWithFlats | null | undefined,
  modifiers: ModifierType[] = [],
  options: BuildChordOptions = {}
): Chord | null {
  const { octave = 4 } = options;

  if (!root) {
    return null;
  }

  // Start with root note
  const intervals: Interval[] = [INTERVALS.UNISON];
  let quality: ChordQuality = "major"; // Default quality

  // Determine basic chord quality (triad)
  if (modifiers.includes("minor")) {
    quality = "minor";
    intervals.push(INTERVALS.MINOR_THIRD);
    intervals.push(INTERVALS.PERFECT_FIFTH);
  } else if (modifiers.includes("diminished")) {
    quality = "diminished";
    intervals.push(INTERVALS.MINOR_THIRD);
    intervals.push(INTERVALS.DIMINISHED_FIFTH);
  } else if (modifiers.includes("augmented")) {
    quality = "augmented";
    intervals.push(INTERVALS.MAJOR_THIRD);
    intervals.push(INTERVALS.AUGMENTED_FIFTH);
  } else if (modifiers.includes("sus2")) {
    quality = "sus2";
    intervals.push(INTERVALS.MAJOR_SECOND);
    intervals.push(INTERVALS.PERFECT_FIFTH);
  } else if (modifiers.includes("sus4")) {
    quality = "sus4";
    intervals.push(INTERVALS.PERFECT_FOURTH);
    intervals.push(INTERVALS.PERFECT_FIFTH);
  } else {
    // Default major triad
    quality = "major";
    intervals.push(INTERVALS.MAJOR_THIRD);
    intervals.push(INTERVALS.PERFECT_FIFTH);
  }

  // Handle flat 5 alteration
  if (modifiers.includes("flat5")) {
    // Replace perfect fifth with diminished fifth
    const fifthIndex = intervals.indexOf(INTERVALS.PERFECT_FIFTH);
    if (fifthIndex !== -1) {
      intervals[fifthIndex] = INTERVALS.DIMINISHED_FIFTH;
    }
  }

  // Add sevenths (context-aware based on chord quality)
  if (modifiers.includes("dom7")) {
    // K key: Add 7th based on chord quality
    if (quality === "diminished") {
      // Diminished 7th chord
      intervals.push(INTERVALS.DIMINISHED_SEVENTH);
    } else {
      // Dominant 7th (minor seventh interval)
      intervals.push(INTERVALS.MINOR_SEVENTH);
    }
  }

  if (modifiers.includes("maj7")) {
    // I key: Add major 7th interval
    // This creates Maj7 for major chords, min(maj7) for minor chords
    intervals.push(INTERVALS.MAJOR_SEVENTH);
  }

  // Add sixth (if no seventh is present)
  if (
    modifiers.includes("6") &&
    !modifiers.includes("dom7") &&
    !modifiers.includes("maj7")
  ) {
    intervals.push(INTERVALS.MAJOR_SIXTH);
  }

  // Add extensions
  if (modifiers.includes("9")) {
    intervals.push(INTERVALS.MAJOR_NINTH);
  }

  if (modifiers.includes("11")) {
    intervals.push(INTERVALS.PERFECT_ELEVENTH);
  }

  if (modifiers.includes("13")) {
    intervals.push(INTERVALS.MAJOR_THIRTEENTH);
  }

  // Add alterations
  if (modifiers.includes("flat9")) {
    intervals.push(INTERVALS.MINOR_NINTH);
  }

  if (modifiers.includes("sharp9")) {
    intervals.push(INTERVALS.AUGMENTED_NINTH);
  }

  if (modifiers.includes("sharp11")) {
    intervals.push(INTERVALS.AUGMENTED_ELEVENTH);
  }

  if (modifiers.includes("flat13")) {
    intervals.push(INTERVALS.MINOR_THIRTEENTH);
  }

  // Sort intervals (lowest to highest) and remove duplicates
  const uniqueIntervals = [...new Set(intervals)].sort((a, b) => a - b);

  // Convert intervals to MIDI notes
  const notes = buildNotesFromIntervals(root as NoteNameWithFlats, octave, uniqueIntervals);

  return {
    root: root as NoteName,
    quality,
    modifiers,
    intervals: uniqueIntervals,
    notes,
    octave,
  };
}

/**
 * Invert a chord by moving the lowest notes up an octave
 * @param notes - Array of MIDI notes
 * @param inversionIndex - Which inversion (0 = root position, 1 = first inversion, etc.)
 * @returns Inverted chord notes
 */
export function invertChord(notes: MIDINote[], inversionIndex: number = 0): MIDINote[] {
  if (!notes || notes.length === 0 || inversionIndex === 0) {
    return notes;
  }

  const sortedNotes = [...notes].sort((a, b) => a - b);
  const inverted = [...sortedNotes];

  // Apply inversions by moving lowest notes up an octave
  const actualInversions = inversionIndex % notes.length;
  for (let i = 0; i < actualInversions; i++) {
    const lowestNote = inverted.shift();
    if (lowestNote !== undefined) {
      inverted.push(lowestNote + 12); // Move up one octave
    }
  }

  return inverted.sort((a, b) => a - b);
}

/**
 * Get the number of possible inversions for a chord
 * @param notes - Array of MIDI notes
 * @returns Number of inversions
 */
export function getInversionCount(notes: MIDINote[] | null | undefined): number {
  if (!notes || notes.length === 0) return 0;
  return notes.length;
}

/**
 * Spread chord voicing across multiple octaves
 * @param notes - Array of MIDI notes
 * @param voicingType - Type of voicing ("drop2", "drop3", etc.)
 * @returns Spread chord notes
 */
export function spreadVoicing(
  notes: MIDINote[] | null | undefined,
  voicingType: DropType = "drop2"
): MIDINote[] {
  if (!notes || notes.length < 4) return notes || [];

  const sorted = [...notes].sort((a, b) => a - b);

  switch (voicingType) {
    case "drop2":
      // Drop the second-highest note down an octave
      if (sorted.length >= 4) {
        const result = [...sorted];
        result[result.length - 2] -= 12;
        return result.sort((a, b) => a - b);
      }
      break;

    case "drop3":
      // Drop the third-highest note down an octave
      if (sorted.length >= 4) {
        const result = [...sorted];
        result[result.length - 3] -= 12;
        return result.sort((a, b) => a - b);
      }
      break;

    default:
      return notes;
  }

  return notes;
}
