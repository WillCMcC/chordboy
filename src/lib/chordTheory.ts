/**
 * Chord Theory Utilities
 * Handles note-to-MIDI conversion, intervals, and music theory calculations
 */

import type { NoteNameWithFlats, MIDINote, Interval, Octave } from "../types";

/**
 * Note names to semitone offsets (within an octave)
 */
const NOTE_TO_SEMITONE: Record<NoteNameWithFlats, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

/**
 * MIDI note number for Middle C (C4)
 */
export const MIDDLE_C_MIDI: MIDINote = 60;

/**
 * Musical intervals in semitones
 */
export const INTERVALS = {
  UNISON: 0,
  MINOR_SECOND: 1,
  MAJOR_SECOND: 2,
  MINOR_THIRD: 3,
  MAJOR_THIRD: 4,
  PERFECT_FOURTH: 5,
  TRITONE: 6,
  DIMINISHED_FIFTH: 6,
  PERFECT_FIFTH: 7,
  AUGMENTED_FIFTH: 8,
  MINOR_SIXTH: 8,
  MAJOR_SIXTH: 9,
  DIMINISHED_SEVENTH: 9,
  MINOR_SEVENTH: 10,
  MAJOR_SEVENTH: 11,
  OCTAVE: 12,
  MINOR_NINTH: 13,
  MAJOR_NINTH: 14,
  AUGMENTED_NINTH: 15,
  PERFECT_ELEVENTH: 17,
  AUGMENTED_ELEVENTH: 18,
  MINOR_THIRTEENTH: 20,
  MAJOR_THIRTEENTH: 21,
} as const;

/**
 * Convert a note name and octave to a MIDI note number
 * @param noteName - Note name (e.g., "C", "C#", "Bb")
 * @param octave - Octave number (default: 4, middle octave)
 * @returns MIDI note number (0-127)
 */
export function noteToMIDI(noteName: NoteNameWithFlats, octave: Octave = 4): MIDINote {
  const semitone = NOTE_TO_SEMITONE[noteName];

  if (semitone === undefined) {
    console.error(`Invalid note name: ${noteName}`);
    return 60; // Default to middle C
  }

  // Calculate MIDI note number
  // MIDI note 60 = C4 (middle C)
  const midiNote = 12 * (octave + 1) + semitone;

  // Clamp to valid MIDI range (0-127)
  return Math.max(0, Math.min(127, midiNote));
}

/**
 * Convert a MIDI note number to a note name with octave
 * @param midiNumber - MIDI note number (0-127)
 * @returns Note name with octave (e.g., "C4", "A#5")
 */
export function MIDIToNote(midiNumber: MIDINote): string {
  const noteNames = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ] as const;
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteIndex = midiNumber % 12;

  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Transpose a MIDI note by a number of semitones
 * @param midiNote - Original MIDI note number
 * @param semitones - Number of semitones to transpose (positive or negative)
 * @returns Transposed MIDI note number
 */
export function transpose(midiNote: MIDINote, semitones: Interval): MIDINote {
  const transposed = midiNote + semitones;
  return Math.max(0, Math.min(127, transposed));
}

/**
 * Get an array of MIDI notes from a root and intervals
 * @param rootNote - Root note name
 * @param octave - Starting octave
 * @param intervals - Array of interval semitones
 * @returns Array of MIDI note numbers
 */
export function buildNotesFromIntervals(
  rootNote: NoteNameWithFlats,
  octave: Octave,
  intervals: Interval[]
): MIDINote[] {
  const rootMIDI = noteToMIDI(rootNote, octave);
  return intervals.map((interval) => rootMIDI + interval);
}

/**
 * Check if a MIDI note is in valid range
 * @param midiNote - MIDI note number
 * @returns True if valid
 */
export function isValidMIDINote(midiNote: MIDINote): boolean {
  return midiNote >= 0 && midiNote <= 127;
}

/**
 * Get the interval between two MIDI notes
 * @param note1 - First MIDI note
 * @param note2 - Second MIDI note
 * @returns Interval in semitones
 */
export function getInterval(note1: MIDINote, note2: MIDINote): Interval {
  return Math.abs(note2 - note1);
}
