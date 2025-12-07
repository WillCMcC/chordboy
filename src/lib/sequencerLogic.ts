/**
 * Sequencer Logic Module
 * Pure functions for sequencer step processing and trigger decisions.
 * Extracted for testability and clarity.
 *
 * @module lib/sequencerLogic
 */

import type { StepAction, StepResult } from "../types";

/** Parameters for processing a sequencer step */
interface ProcessStepParams {
  /** Preset in current step (null = empty) */
  currentPreset: string | null;
  /** Last preset that was triggered */
  lastTriggeredPreset: string | null;
  /** True for retrig mode, false for sustain */
  retrigMode: boolean;
}

/**
 * Determine what action to take for a sequencer step.
 *
 * @param params - Parameters for step processing
 * @returns The action to take and updated state
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
export function processStep({
  currentPreset,
  lastTriggeredPreset,
  retrigMode,
}: ProcessStepParams): StepResult {
  // Empty step - stop notes
  if (!currentPreset) {
    return {
      action: "stop" as StepAction,
      preset: null,
      lastTriggeredPreset: null,
    };
  }

  const isSamePreset = currentPreset === lastTriggeredPreset;

  if (retrigMode) {
    // Retrig mode: always play the note
    return {
      action: (isSamePreset ? "retrigger" : "trigger") as StepAction,
      preset: currentPreset,
      lastTriggeredPreset: currentPreset,
    };
  } else {
    // Sustain mode: only trigger if different from last
    if (isSamePreset) {
      return {
        action: "sustain" as StepAction,
        preset: currentPreset,
        lastTriggeredPreset: currentPreset,
      };
    } else {
      return {
        action: "trigger" as StepAction,
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
 * @param sequence - Array of preset slots (null = empty)
 * @param retrigMode - True for retrig mode, false for sustain
 * @returns Array of results for each step
 *
 * @example
 * runSequence(["1", null, "1", null], false)
 * // Returns actions for sustain mode with that sequence
 */
export function runSequence(
  sequence: (string | null)[],
  retrigMode: boolean
): StepResult[] {
  const results: StepResult[] = [];
  let lastTriggeredPreset: string | null = null;

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
