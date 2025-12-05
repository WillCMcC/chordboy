/**
 * Voicing Transforms
 * Shared helper functions for modifying chord voicings.
 * Used by both useChordEngine and chordSolver.
 */

/**
 * Apply progressive note dropping by moving the highest notes down an octave.
 * This creates "drop" voicings commonly used in jazz piano.
 *
 * @param {Array<number>} notes - Array of MIDI note numbers
 * @param {number} dropCount - Number of notes to drop (0 = no change)
 * @returns {Array<number>} Modified notes array, sorted low to high
 *
 * @example
 * // Drop 1: Move highest note down an octave
 * applyProgressiveDrop([60, 64, 67, 72], 1) // => [60, 60, 64, 67]
 *
 * @example
 * // Drop 2: Move two highest notes down an octave
 * applyProgressiveDrop([60, 64, 67, 72], 2) // => [55, 60, 60, 64]
 */
export function applyProgressiveDrop(notes, dropCount) {
  if (dropCount === 0 || !notes || notes.length === 0) {
    return notes;
  }

  const sorted = [...notes].sort((a, b) => a - b);
  const result = [...sorted];

  // Don't drop all notes - leave at least one in original position
  const actualDrops = Math.min(dropCount, notes.length - 1);

  for (let i = 0; i < actualDrops; i++) {
    const dropIndex = result.length - 1 - i;
    if (dropIndex >= 0) {
      result[dropIndex] = result[dropIndex] - 12;
    }
  }

  return result.sort((a, b) => a - b);
}

/**
 * Apply spread voicing by moving alternating notes up by octaves.
 * Creates wider, more open voicings.
 *
 * @param {Array<number>} notes - Array of MIDI note numbers
 * @param {number} spreadAmount - How many octaves to spread (0-3)
 * @returns {Array<number>} Modified notes array, sorted low to high
 *
 * @example
 * // Spread 1: Move every other note up 1 octave
 * applySpread([60, 64, 67, 72], 1) // => [60, 67, 76, 84]
 *
 * @example
 * // Spread 2: Move every other note up 2 octaves
 * applySpread([60, 64, 67], 2) // => [60, 67, 88]
 */
export function applySpread(notes, spreadAmount) {
  if (spreadAmount === 0 || !notes || notes.length < 2) {
    return notes;
  }

  const result = [...notes].sort((a, b) => a - b);

  // Move alternating notes (odd indices) up by the spread amount in octaves
  for (let i = 1; i < result.length; i += 2) {
    result[i] += 12 * spreadAmount;
  }

  return result.sort((a, b) => a - b);
}
