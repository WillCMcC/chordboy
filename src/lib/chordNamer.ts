/**
 * Chord Namer
 * Formats chord names with proper musical notation
 */

import type { NoteName, ModifierType, Chord } from "../types";

/**
 * Get a human-readable chord name from root and modifiers
 * @param root - Root note name
 * @param modifiers - Array of modifier names
 * @returns Formatted chord name (e.g., "C Maj7#11")
 */
export function getChordName(
  root: NoteName | null | undefined,
  modifiers: ModifierType[] = []
): string {
  if (!root) return "";

  let name: string = root;

  // Determine base quality
  const hasMinor = modifiers.includes("minor");
  const hasDiminished = modifiers.includes("diminished");
  const hasAugmented = modifiers.includes("augmented");
  const hasSus2 = modifiers.includes("sus2");
  const hasSus4 = modifiers.includes("sus4");

  const hasDom7 = modifiers.includes("dom7");
  const hasMaj7 = modifiers.includes("maj7");
  const has6 = modifiers.includes("6");

  const has9 = modifiers.includes("9");
  const has11 = modifiers.includes("11");
  const has13 = modifiers.includes("13");

  const hasFlat9 = modifiers.includes("flat9");
  const hasSharp9 = modifiers.includes("sharp9");
  const hasSharp11 = modifiers.includes("sharp11");
  const hasFlat13 = modifiers.includes("flat13");
  const hasFlat5 = modifiers.includes("flat5");

  // Build the chord name

  // Quality + Seventh
  if (hasDiminished) {
    name += " dim";
    if (hasDom7) {
      name += "7"; // Diminished 7th
    }
  } else if (hasAugmented) {
    name += " aug";
    if (hasDom7) {
      name += "7";
    } else if (hasMaj7) {
      name += " Maj7";
    }
  } else if (hasSus2) {
    name += " sus2";
  } else if (hasSus4) {
    name += " sus4";
  } else if (hasMinor) {
    // Minor chord
    if (hasMaj7) {
      name += " min(Maj7)";
    } else if (hasDom7) {
      name += " min7";
    } else if (has6) {
      name += " min6";
    } else {
      name += " min";
    }
  } else {
    // Major chord (default)
    if (hasMaj7) {
      name += " Maj7";
    } else if (hasDom7) {
      name += "7"; // Dominant 7th
    } else if (has6) {
      name += "6";
    }
    // If none of the above, it's just a major triad - no suffix needed
  }

  // Add extensions (9, 11, 13)
  // For jazz chords, we typically show the highest extension
  if (has13) {
    // If we already have a 7th, replace it with 13
    if (hasDom7 && !name.includes("Maj")) {
      name = name.replace("7", "13");
    } else if (!hasMaj7 && !hasDom7) {
      name += "13";
    } else {
      name += " 13";
    }
  } else if (has11) {
    if (hasDom7 && !name.includes("Maj")) {
      name = name.replace("7", "11");
    } else if (!hasMaj7 && !hasDom7) {
      name += "11";
    } else {
      name += " 11";
    }
  } else if (has9) {
    if (hasDom7 && !name.includes("Maj")) {
      name = name.replace("7", "9");
    } else if (!hasMaj7 && !hasDom7) {
      name += "9";
    } else {
      name += " 9";
    }
  }

  // Add alterations
  const alterations: string[] = [];

  if (hasFlat5) {
    alterations.push("\u266D5");
  }

  if (hasFlat9) {
    alterations.push("\u266D9");
  }

  if (hasSharp9) {
    alterations.push("\u266F9");
  }

  if (hasSharp11) {
    alterations.push("\u266F11");
  }

  if (hasFlat13) {
    alterations.push("\u266D13");
  }

  if (alterations.length > 0) {
    name += " " + alterations.join(" ");
  }

  return name.trim();
}

/**
 * Get a simplified chord name (for debugging or simple display)
 * @param chord - Chord object from buildChord()
 * @returns Simple chord name
 */
export function getSimpleChordName(chord: Chord | null | undefined): string {
  if (!chord || !chord.root) return "";
  return getChordName(chord.root, chord.modifiers);
}

/**
 * Format note name with proper accidental symbols
 * @param noteName - Note name (may use # or b)
 * @returns Formatted note name with proper symbols
 */
export function formatNoteName(noteName: string | null | undefined): string {
  if (!noteName) return "";
  return noteName.replace("#", "\u266F").replace("b", "\u266D");
}
