/**
 * Sequencer Logic Module
 * Pure functions for sequencer step processing and trigger decisions.
 * Extracted for testability and clarity.
 *
 * @module lib/sequencerLogic
 */

/**
 * @typedef {Object} StepResult
 * @property {'trigger'|'retrigger'|'sustain'|'stop'} action - What action to take
 * @property {string|null} preset - The preset slot to trigger, or null for stop
 * @property {string|null} lastTriggeredPreset - Updated last triggered preset value
 */

/**
 * Determine what action to take for a sequencer step.
 *
 * @param {Object} params - Parameters for step processing
 * @param {string|null} params.currentPreset - Preset in current step (null = empty)
 * @param {string|null} params.lastTriggeredPreset - Last preset that was triggered
 * @param {boolean} params.retrigMode - True for retrig mode, false for sustain
 * @returns {StepResult} The action to take and updated state
 *
 * @example
 * // Sustain mode, new preset
 * processStep({ currentPreset: "1", lastTriggeredPreset: null, retrigMode: false })
 * // => { action: 'trigger', preset: "1", lastTriggeredPreset: "1" }
 *
 * // Sustain mode, same preset continues
 * processStep({ currentPreset: "1", lastTriggeredPreset: "1", retrigMode: false })
 * // => { action: 'sustain', preset: "1", lastTriggeredPreset: "1" }
 *
 * // Empty step
 * processStep({ currentPreset: null, lastTriggeredPreset: "1", retrigMode: false })
 * // => { action: 'stop', preset: null, lastTriggeredPreset: null }
 */
export function processStep({ currentPreset, lastTriggeredPreset, retrigMode }) {
  // Empty step - stop notes
  if (!currentPreset) {
    return {
      action: "stop",
      preset: null,
      lastTriggeredPreset: null,
    };
  }

  const isSamePreset = currentPreset === lastTriggeredPreset;

  if (retrigMode) {
    // Retrig mode: always play the note
    return {
      action: isSamePreset ? "retrigger" : "trigger",
      preset: currentPreset,
      lastTriggeredPreset: currentPreset,
    };
  } else {
    // Sustain mode: only trigger if different from last
    if (isSamePreset) {
      return {
        action: "sustain",
        preset: currentPreset,
        lastTriggeredPreset: currentPreset,
      };
    } else {
      return {
        action: "trigger",
        preset: currentPreset,
        lastTriggeredPreset: currentPreset,
      };
    }
  }
}

/**
 * Simulate running through a sequence and return all actions taken.
 * Useful for testing sequencer behavior.
 *
 * @param {Array<string|null>} sequence - Array of preset slots (null = empty)
 * @param {boolean} retrigMode - True for retrig mode, false for sustain
 * @returns {StepResult[]} Array of results for each step
 *
 * @example
 * runSequence(["1", null, "1", null], false)
 * // Returns actions for sustain mode with that sequence
 */
export function runSequence(sequence, retrigMode) {
  const results = [];
  let lastTriggeredPreset = null;

  for (const currentPreset of sequence) {
    const result = processStep({
      currentPreset,
      lastTriggeredPreset,
      retrigMode,
    });
    results.push(result);
    lastTriggeredPreset = result.lastTriggeredPreset;
  }

  return results;
}
