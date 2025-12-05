/**
 * Tutorial Logic Module
 * Pure functions for tutorial step condition checking.
 * Extracted for testability.
 *
 * @module lib/tutorialLogic
 */

/**
 * Desktop tutorial step definitions with conditions.
 */
export const TUTORIAL_STEPS = [
  {
    id: "welcome",
    title: "Welcome to ChordBoy",
    hasCondition: false,
  },
  {
    id: "root",
    title: "Play a Root Note",
    hasCondition: true,
    check: (state) => state.hasRoot,
  },
  {
    id: "quality",
    title: "Add a Chord Quality",
    hasCondition: true,
    check: (state) => state.isMinor,
  },
  {
    id: "extension",
    title: "Try an Extension",
    hasCondition: true,
    check: (state) => state.hasExtension,
  },
  {
    id: "voicing",
    title: "Change the Voicing",
    hasCondition: true,
    check: (state) => state.hasVoicingChange,
  },
  {
    id: "preset",
    title: "Save a Preset",
    hasCondition: true,
    check: (state) => state.hasPreset,
  },
  {
    id: "ready",
    title: "You're Ready!",
    hasCondition: false,
  },
];

/**
 * Mobile tutorial step definitions with conditions.
 */
export const MOBILE_TUTORIAL_STEPS = [
  {
    id: "welcome",
    title: "Welcome to ChordBoy",
    hasCondition: false,
  },
  {
    id: "root",
    title: "Tap a Root Note",
    hasCondition: true,
    check: (state) => state.hasRoot,
  },
  {
    id: "quality",
    title: "Add a Chord Quality",
    hasCondition: true,
    check: (state) => state.isMinor,
  },
  {
    id: "extension",
    title: "Try an Extension",
    hasCondition: true,
    check: (state) => state.hasExtension,
  },
  {
    id: "voicing",
    title: "Change the Voicing",
    hasCondition: true,
    check: (state) => state.hasVoicingChange,
  },
  {
    id: "preset",
    title: "Save a Preset",
    hasCondition: true,
    check: (state) => state.hasPreset,
  },
  {
    id: "hold",
    title: "Hold a Chord",
    hasCondition: false, // Manual advance - just explain the feature
  },
  {
    id: "ready",
    title: "You're Ready!",
    hasCondition: false,
  },
];

/**
 * Build the current tutorial state from app state.
 *
 * @param {Object} params - App state
 * @param {Object|null} params.currentChord - Current chord being played
 * @param {number} params.inversionIndex - Current inversion
 * @param {number} params.octave - Current octave
 * @param {number} params.spreadAmount - Current spread
 * @param {number} params.presetCount - Number of saved presets
 * @param {number} params.initialInversion - Initial inversion when tutorial opened
 * @param {number} params.initialOctave - Initial octave when tutorial opened
 * @param {number} params.initialSpread - Initial spread when tutorial opened
 * @param {number} params.initialPresetCount - Initial preset count when tutorial opened
 * @returns {Object} Tutorial state object
 */
export function buildTutorialState({
  currentChord,
  inversionIndex,
  octave,
  spreadAmount,
  presetCount,
  initialInversion,
  initialOctave,
  initialSpread,
  initialPresetCount,
}) {
  const chordName = currentChord?.name || "";

  return {
    hasRoot: currentChord?.root != null,
    hasChord: currentChord?.notes?.length > 0,
    isMinor:
      chordName.includes("min") ||
      chordName.includes("m7") ||
      chordName.includes("m9"),
    hasExtension: /7|9|11|13|6/.test(chordName),
    hasVoicingChange:
      inversionIndex !== initialInversion ||
      octave !== initialOctave ||
      spreadAmount !== initialSpread,
    hasPreset: presetCount > initialPresetCount,
  };
}

/**
 * Check if a step's condition is met.
 *
 * @param {number} stepIndex - The step index to check
 * @param {Object} tutorialState - The current tutorial state
 * @param {Array} steps - The steps array to use (defaults to TUTORIAL_STEPS)
 * @returns {boolean} Whether the condition is met
 */
export function isStepConditionMet(stepIndex, tutorialState, steps = TUTORIAL_STEPS) {
  const step = steps[stepIndex];
  if (!step || !step.hasCondition) return false;
  return step.check(tutorialState);
}

/**
 * Get the next step index.
 *
 * @param {number} currentStep - Current step index
 * @param {Array} steps - The steps array to use (defaults to TUTORIAL_STEPS)
 * @returns {number|null} Next step index, or null if at end
 */
export function getNextStep(currentStep, steps = TUTORIAL_STEPS) {
  if (currentStep >= steps.length - 1) return null;
  return currentStep + 1;
}
