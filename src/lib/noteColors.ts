/**
 * Note Colors Module
 * ROYGBIV color mapping for chromatic notes and gradient utilities.
 *
 * @module lib/noteColors
 */

import type { MIDINote } from "../types";

/**
 * ROYGBIV colors mapped to the 12 chromatic notes (C through B).
 * Spread across the rainbow with bright, vivid colors.
 */
export const NOTE_COLORS: Record<number, string> = {
  0: "#ff3333", // C - Bright Red
  1: "#ff6622", // C# - Red-Orange
  2: "#ff9900", // D - Bright Orange
  3: "#ffcc00", // D# - Gold
  4: "#ffff33", // E - Bright Yellow
  5: "#33ff33", // F - Bright Green
  6: "#00ffcc", // F# - Cyan/Turquoise
  7: "#3399ff", // G - Bright Blue
  8: "#6633ff", // G# - Indigo
  9: "#9933ff", // A - Bright Violet
  10: "#ff33cc", // A# - Magenta
  11: "#ff3399", // B - Hot Pink
};

/**
 * Get the color for a MIDI note based on its pitch class.
 *
 * @param midiNote - MIDI note number (0-127)
 * @returns Hex color string
 *
 * @example
 * getNoteColor(60); // Returns "#ff3333" (C is red)
 * getNoteColor(64); // Returns "#ffff33" (E is yellow)
 */
export function getNoteColor(midiNote: MIDINote): string {
  const noteIndex = midiNote % 12;
  return NOTE_COLORS[noteIndex];
}

/**
 * Build a northern lights style gradient from active notes.
 * Creates a flowing gradient effect based on the unique pitch classes in the chord.
 *
 * @param notes - Array of MIDI note numbers
 * @returns CSS gradient string or null if no notes
 *
 * @example
 * // Single note - radial gradient
 * buildNorthernLightsGradient([60]);
 *
 * // Multiple notes - linear gradient with color stops
 * buildNorthernLightsGradient([60, 64, 67]); // C, E, G chord
 */
export function buildNorthernLightsGradient(notes: MIDINote[] | null | undefined): string | null {
  if (!notes || notes.length === 0) {
    return null;
  }

  // Get unique note classes (0-11) from the chord, sorted
  const noteClasses = [...new Set(notes.map((n) => n % 12))].sort(
    (a, b) => a - b
  );

  // Build color stops for the gradient
  const colors = noteClasses.map((nc) => NOTE_COLORS[nc]);

  // Single note: radial gradient
  if (colors.length === 1) {
    return `radial-gradient(ellipse at 50% 100%, ${colors[0]}40 0%, ${colors[0]}20 40%, transparent 70%)`;
  }

  // Multiple colors: flowing horizontal gradient
  const colorStops = colors
    .map((color, i) => {
      const percent = (i / (colors.length - 1)) * 100;
      return `${color}35 ${percent}%`;
    })
    .join(", ");

  return `linear-gradient(90deg, ${colorStops})`;
}
