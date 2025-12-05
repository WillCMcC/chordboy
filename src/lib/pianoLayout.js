/**
 * Piano Keyboard Layout Utilities
 * Generates piano key data for visual keyboard component
 */

const NOTE_NAMES = [
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

/**
 * Check if a MIDI note number is a black key (sharp/flat).
 *
 * @param {number} midiNumber - MIDI note number (0-127)
 * @returns {boolean} True if the note is a black key (C#, D#, F#, G#, A#)
 */
export function isBlackKey(midiNumber) {
  const noteIndex = midiNumber % 12;
  // C# D# F# G# A#
  return [1, 3, 6, 8, 10].includes(noteIndex);
}

/**
 * Get note name with octave from MIDI number.
 *
 * @param {number} midiNumber - MIDI note number (0-127)
 * @returns {string} Note name with octave (e.g., "C4", "F#5")
 */
export function getNoteName(midiNumber) {
  const noteIndex = midiNumber % 12;
  const octave = Math.floor(midiNumber / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Generate keyboard layout data for given octave range
 * @param {number} startOctave - Starting octave (e.g., 3)
 * @param {number} endOctave - Ending octave (e.g., 5)
 * @returns {Array} Array of key objects with positioning data
 */
export function generateKeyboard(startOctave = 3, endOctave = 5) {
  const keys = [];
  let whiteKeyIndex = 0;

  // Calculate MIDI range
  const startMIDI = (startOctave + 1) * 12; // C of start octave
  const endMIDI = (endOctave + 2) * 12; // C of octave after end

  for (let midi = startMIDI; midi < endMIDI; midi++) {
    const isBlack = isBlackKey(midi);
    const noteName = getNoteName(midi);

    const key = {
      midi,
      noteName,
      isBlack,
    };

    if (!isBlack) {
      key.whiteKeyIndex = whiteKeyIndex;
      whiteKeyIndex++;
    } else {
      // Calculate position for black key based on previous white key
      key.whiteKeyIndex = whiteKeyIndex - 1;
    }

    keys.push(key);
  }

  return keys;
}

/**
 * Get the horizontal position offset for a black key relative to white keys.
 * Black keys are not centered between white keys - they have traditional piano positioning.
 *
 * @param {number} midiNumber - MIDI note number for a black key
 * @returns {number} Offset multiplier (0.5-0.7) for positioning the black key
 */
export function getBlackKeyOffset(midiNumber) {
  const noteIndex = midiNumber % 12;

  // Fine-tune positioning based on the note
  // C# is slightly right of center between C and D
  // D# is slightly right of center between D and E
  // F# is slightly right of center between F and G
  // G# is slightly left of center between G and A
  // A# is slightly left of center between A and B

  const offsets = {
    1: 0.7, // C#
    3: 0.7, // D#
    6: 0.65, // F#
    8: 0.6, // G#
    10: 0.6, // A#
  };

  return offsets[noteIndex] || 0.5;
}
