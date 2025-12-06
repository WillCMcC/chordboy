/**
 * Strum Module
 * Provides strum timing for MIDI chord playback.
 * Simulates guitar-like strumming by spacing out note triggers.
 *
 * @module lib/strum
 */

/** @type {number} Maximum strum spread in ms */
export const MAX_STRUM_SPREAD = 200;

/** @type {string} Strum direction: low to high notes */
export const STRUM_UP = "up";

/** @type {string} Strum direction: high to low notes */
export const STRUM_DOWN = "down";

/** @type {string} Strum direction: alternates between up/down */
export const STRUM_ALTERNATE = "alternate";

/**
 * Generate strum time offsets for a set of notes.
 * Unlike humanization, strum produces evenly-spaced delays
 * based on note position in the sorted chord.
 *
 * @param {number[]} notes - Array of MIDI note numbers
 * @param {number} spreadMs - Total spread time in milliseconds
 * @param {string} direction - 'up', 'down', or 'alternate'
 * @param {string} lastDirection - Previous direction (for alternate mode)
 * @returns {{ offsets: number[], nextDirection: string }} Delay offsets and next direction
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
export function getStrumOffsets(notes, spreadMs, direction, lastDirection = "up") {
  const noteCount = notes.length;

  if (spreadMs === 0 || noteCount <= 1) {
    return {
      offsets: new Array(noteCount).fill(0),
      nextDirection: lastDirection,
    };
  }

  // Determine actual direction for this strum
  let actualDirection = direction;
  let nextDirection = lastDirection;

  if (direction === STRUM_ALTERNATE) {
    actualDirection = lastDirection === "up" ? "down" : "up";
    nextDirection = actualDirection;
  } else {
    nextDirection = direction;
  }

  // Sort notes to determine position-based delays
  const sortedNotes = [...notes].sort((a, b) => a - b);
  const notePositions = new Map();
  sortedNotes.forEach((note, idx) => {
    notePositions.set(note, idx);
  });

  // Calculate interval between notes
  const interval = spreadMs / (noteCount - 1);

  // Generate offsets based on each note's position in the sorted array
  const offsets = notes.map((note) => {
    const position = notePositions.get(note);
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
