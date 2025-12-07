/**
 * Keyboard Mappings for ChordBoy
 * Defines how physical keyboard keys map to musical functions
 */

import type {
  NoteName,
  ModifierType,
  LeftHandKeyMap,
  RightHandModifierMap,
  SpecialKeyMap,
} from "../types";

/**
 * LEFT HAND - Root Note Selection (Chromatic)
 * Three-row chromatic layout spanning one octave
 */
export const LEFT_HAND_KEYS: LeftHandKeyMap = {
  // Row 1 (QWER): C, C#, D, D#
  q: "C",
  w: "C#",
  e: "D",
  r: "D#",

  // Row 2 (ASDF): E, F, F#, G
  a: "E",
  s: "F",
  d: "F#",
  f: "G",

  // Row 3 (ZXCV): G#, A, A#, B
  z: "G#",
  x: "A",
  c: "A#",
  v: "B",
};

/**
 * RIGHT HAND - Chord Modifiers (Finger-Based)
 * Organized by finger position for easy stacking
 */
export const RIGHT_HAND_MODIFIERS: RightHandModifierMap = {
  // ===== INDEX FINGER (J/U/M/7 columns) - Quality =====
  j: "major", // Major quality (default)
  u: "minor", // Minor quality
  m: "diminished", // Diminished
  7: "augmented", // Augmented

  // ===== MIDDLE FINGER (K/I/< columns) - Sevenths =====
  k: "dom7", // Dominant 7th
  i: "maj7", // Major 7th
  ",": "6", // Add 6th

  // ===== RING FINGER (L/O/> columns) - Extensions =====
  l: "9", // Add 9th
  o: "11", // Add 11th
  ".": "13", // Add 13th

  // ===== PINKY (;/P/? columns) - Suspensions & Alterations =====
  ";": "sus2", // Sus2
  p: "sus4", // Sus4
  "/": "flat5", // Flat 5 (b5)

  // ===== ALTERATIONS (brackets/quotes area) =====
  "[": "sharp9", // Sharp 9 (#9)
  "]": "flat9", // Flat 9 (b9)
  "'": "sharp11", // Sharp 11 (#11)
  "\\": "flat13", // Flat 13 (b13) - using backslash as it's near the brackets
};

/**
 * SPECIAL FUNCTION KEYS
 */
export const SPECIAL_KEYS: SpecialKeyMap = {
  // Inversion control
  Shift: "inversion", // Left Shift - Cycle voicing/inversion

  // Octave shifting
  1: "octave-2",
  2: "octave-1",
  3: "octave0",
  4: "octave+1",
  5: "octave+2",
  0: "octave-reset",

  // Transpose
  "-": "transpose-down",
  "=": "transpose-up",

  // Future features
  Tab: "chord-buffer",
  " ": "spread-voicing", // Space bar
  Escape: "panic",
};

/**
 * Get the root note from pressed keys
 * @param pressedKeys - Set of currently pressed keys
 * @returns The root note name or null
 */
export function getRootNote(pressedKeys: Set<string>): NoteName | null {
  for (const key of pressedKeys) {
    const note = LEFT_HAND_KEYS[key];
    if (note) {
      return note;
    }
  }
  return null;
}

/**
 * Get all active modifiers from pressed keys
 * @param pressedKeys - Set of currently pressed keys
 * @returns Array of active modifier names
 */
export function getModifiers(pressedKeys: Set<string>): ModifierType[] {
  const modifiers: ModifierType[] = [];
  for (const key of pressedKeys) {
    const modifier = RIGHT_HAND_MODIFIERS[key];
    if (modifier) {
      modifiers.push(modifier);
    }
  }
  return modifiers;
}

/**
 * Check if a special function key is pressed
 * @param pressedKeys - Set of currently pressed keys
 * @param functionName - Name of the special function
 * @returns True if the function key is pressed
 */
export function isSpecialKeyPressed(
  pressedKeys: Set<string>,
  functionName: string
): boolean {
  for (const key of pressedKeys) {
    if (SPECIAL_KEYS[key] === functionName) {
      return true;
    }
  }
  return false;
}

/**
 * Get all pressed special function keys
 * @param pressedKeys - Set of currently pressed keys
 * @returns Array of active special functions
 */
export function getSpecialFunctions(pressedKeys: Set<string>): string[] {
  const functions: string[] = [];
  for (const key of pressedKeys) {
    const fn = SPECIAL_KEYS[key];
    if (fn) {
      functions.push(fn);
    }
  }
  return functions;
}
