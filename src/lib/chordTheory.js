/**
 * Chord Theory Utilities
 * Handles note-to-MIDI conversion, intervals, and music theory calculations
 */

/**
 * Note names to semitone offsets (within an octave)
 */
const NOTE_TO_SEMITONE = {
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
const MIDDLE_C_MIDI = 60;

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
};

/**
 * Convert a note name and octave to a MIDI note number
 * @param {string} noteName - Note name (e.g., "C", "C#", "Bb")
 * @param {number} octave - Octave number (default: 4, middle octave)
 * @returns {number} MIDI note number (0-127)
 */
export function noteToMIDI(noteName, octave = 4) {
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
 * @param {number} midiNumber - MIDI note number (0-127)
 * @returns {string} Note name with octave (e.g., "C4", "A#5")
 */
export function MIDIToNote(midiNumber) {
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
  ];
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteIndex = midiNumber % 12;

  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * Transpose a MIDI note by a number of semitones
 * @param {number} midiNote - Original MIDI note number
 * @param {number} semitones - Number of semitones to transpose (positive or negative)
 * @returns {number} Transposed MIDI note number
 */
export function transpose(midiNote, semitones) {
  const transposed = midiNote + semitones;
  return Math.max(0, Math.min(127, transposed));
}

/**
 * Get an array of MIDI notes from a root and intervals
 * @param {string} rootNote - Root note name
 * @param {number} octave - Starting octave
 * @param {Array<number>} intervals - Array of interval semitones
 * @returns {Array<number>} Array of MIDI note numbers
 */
export function buildNotesFromIntervals(rootNote, octave, intervals) {
  const rootMIDI = noteToMIDI(rootNote, octave);
  return intervals.map((interval) => rootMIDI + interval);
}

/**
 * Check if a MIDI note is in valid range
 * @param {number} midiNote - MIDI note number
 * @returns {boolean} True if valid
 */
export function isValidMIDINote(midiNote) {
  return midiNote >= 0 && midiNote <= 127;
}

/**
 * Get the interval between two MIDI notes
 * @param {number} note1 - First MIDI note
 * @param {number} note2 - Second MIDI note
 * @returns {number} Interval in semitones
 */
export function getInterval(note1, note2) {
  return Math.abs(note2 - note1);
}
