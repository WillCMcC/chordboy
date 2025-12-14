/**
 * Strum Module
 * Provides strum timing for MIDI chord playback.
 * Simulates guitar-like strumming by spacing out note triggers.
 *
 * @module lib/strum
 */

import type { MIDINote, StrumDirection, StrumOffsetsResult } from "../types";

/** Maximum strum spread in ms */
export const MAX_STRUM_SPREAD = 200;

/** Strum direction: low to high notes */
export const STRUM_UP: StrumDirection = "up";

/** Strum direction: high to low notes */
export const STRUM_DOWN: StrumDirection = "down";

/** Strum direction: alternates between up/down */
export const STRUM_ALTERNATE: StrumDirection = "alternate";

/**
 * Generate strum time offsets for a set of notes.
 * Unlike humanization, strum produces evenly-spaced delays
 * based on note position in the sorted chord.
 *
 * @param notes - Array of MIDI note numbers
 * @param spreadMs - Total spread time in milliseconds
 * @param direction - 'up', 'down', or 'alternate'
 * @param lastDirection - Previous direction (for alternate mode)
 * @returns Delay offsets and next direction
 *
 * @example
 * // Strum up with 100ms spread
 * getStrumOffsets([60, 64, 67], 100, 'up', 'up');
 * // Returns { offsets: [0, 50, 100], nextDirection: 'up' }
 *
 * @example
 * // Strum down with 100ms spread
 * getStrumOffsets([60, 64, 67], 100, 'down', 'down');
 * // Returns { offsets: [100, 50, 0], nextDirection: 'down' }
 */
export function getStrumOffsets(
  notes: MIDINote[],
  spreadMs: number,
  direction: StrumDirection,
  lastDirection: StrumDirection = "up"
): StrumOffsetsResult {
  const noteCount = notes.length;

  if (spreadMs === 0 || noteCount <= 1) {
    return {
      offsets: new Array(noteCount).fill(0),
      nextDirection: lastDirection,
    };
  }

  // Determine actual direction for this strum
  let actualDirection: StrumDirection = direction;
  let nextDirection: StrumDirection = lastDirection;

  if (direction === STRUM_ALTERNATE) {
    actualDirection = lastDirection === "up" ? "down" : "up";
    nextDirection = actualDirection;
  } else {
    nextDirection = direction;
  }

  // Sort notes to determine position-based delays
  const sortedNotes = [...notes].sort((a, b) => a - b);
  const notePositions = new Map<MIDINote, number>();
  sortedNotes.forEach((note, idx) => {
    notePositions.set(note, idx);
  });

  // Calculate interval between notes
  const interval = spreadMs / (noteCount - 1);

  // Generate offsets based on each note's position in the sorted array
  const offsets = notes.map((note) => {
    const position = notePositions.get(note) ?? 0;
    if (actualDirection === "up") {
      // Low notes first (position 0 = 0ms delay)
      return position * interval;
    } else {
      // High notes first (highest position = 0ms delay)
      return (noteCount - 1 - position) * interval;
    }
  });

  return { offsets, nextDirection };
}
