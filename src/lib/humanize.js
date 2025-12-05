/**
 * Humanize Module
 * Provides timing humanization for MIDI note playback.
 * Creates natural-sounding timing variations in chord notes.
 *
 * @module lib/humanize
 */

/** @type {number} Maximum delay in ms at 100% humanization */
export const MAX_HUMANIZE_DELAY = 150;

/**
 * Generate humanization time offsets for a set of notes.
 * Uses triangular distribution for more natural feel (clustering around center).
 *
 * @param {number} noteCount - Number of notes to generate offsets for
 * @param {number} humanizeAmount - Humanization amount (0-100)
 * @returns {number[]} Array of delay offsets in milliseconds
 *
 * @example
 * // No humanization
 * getHumanizeOffsets(4, 0); // [0, 0, 0, 0]
 *
 * // 50% humanization
 * getHumanizeOffsets(4, 50); // [~23, ~45, ~12, ~67] (random values up to 75ms)
 */
export function getHumanizeOffsets(noteCount, humanizeAmount) {
  if (humanizeAmount === 0 || noteCount <= 1) {
    return new Array(noteCount).fill(0);
  }

  const maxDelay = (humanizeAmount / 100) * MAX_HUMANIZE_DELAY;

  // Generate random offsets with triangular distribution
  // Triangular distribution clusters values toward the center,
  // creating more natural-sounding timing variations
  return Array.from({ length: noteCount }, () => {
    const r1 = Math.random();
    const r2 = Math.random();
    const triangular = (r1 + r2) / 2;
    return triangular * maxDelay;
  });
}

/**
 * Create a humanization manager for tracking scheduled note timeouts.
 * Allows clearing pending notes when chord changes.
 *
 * @returns {Object} Humanization manager with schedule and clear methods
 *
 * @example
 * const manager = createHumanizeManager();
 * manager.schedule(() => playNote(60), 25);
 * manager.clear(); // Cancel all pending notes
 */
export function createHumanizeManager() {
  /** @type {number[]} */
  let timeouts = [];

  return {
    /**
     * Schedule a callback with optional delay.
     * @param {Function} callback - Function to call
     * @param {number} delay - Delay in milliseconds
     */
    schedule(callback, delay) {
      if (delay === 0) {
        callback();
      } else {
        const timeout = setTimeout(callback, delay);
        timeouts.push(timeout);
      }
    },

    /**
     * Clear all pending scheduled callbacks.
     */
    clear() {
      timeouts.forEach((t) => clearTimeout(t));
      timeouts = [];
    },
  };
}
