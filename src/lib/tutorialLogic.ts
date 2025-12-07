/**
 * Tutorial Logic Module
 * Pure functions for tutorial step condition checking.
 * Extracted for testability.
 *
 * @module lib/tutorialLogic
 */

import type { TutorialState, TutorialStep, Octave, MIDINote, NoteName } from "../types";

/** Chord data for tutorial state building */
interface ChordData {
  root?: NoteName | null;
  name?: string;
  notes?: MIDINote[];
}

/** Parameters for building tutorial state */
interface BuildTutorialStateParams {
  currentChord: ChordData | null;
  inversionIndex: number;
  octave: Octave;
  spreadAmount: number;
  presetCount: number;
  initialInversion: number;
  initialOctave: Octave;
  initialSpread: number;
  initialPresetCount: number;
}

/**
 * Desktop tutorial step definitions with conditions.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to ChordBoy",
    hasCondition: false,
  },
  {
    id: "root",
    title: "Play a Root Note",
    hasCondition: true,
    check: (state: TutorialState) => state.hasRoot,
  },
  {
    id: "quality",
    title: "Add a Chord Quality",
    hasCondition: true,
    check: (state: TutorialState) => state.isMinor,
  },
  {
    id: "extension",
    title: "Try an Extension",
    hasCondition: true,
    check: (state: TutorialState) => state.hasExtension,
  },
  {
    id: "voicing",
    title: "Change the Voicing",
    hasCondition: true,
    check: (state: TutorialState) => state.hasVoicingChange,
  },
  {
    id: "preset",
    title: "Save a Preset",
    hasCondition: true,
    check: (state: TutorialState) => state.hasPreset,
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
export const MOBILE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to ChordBoy",
    hasCondition: false,
  },
  {
    id: "root",
    title: "Tap a Root Note",
    hasCondition: true,
    check: (state: TutorialState) => state.hasRoot,
  },
  {
    id: "quality",
    title: "Add a Chord Quality",
    hasCondition: true,
    check: (state: TutorialState) => state.isMinor,
  },
  {
    id: "extension",
    title: "Try an Extension",
    hasCondition: true,
    check: (state: TutorialState) => state.hasExtension,
  },
  {
    id: "voicing",
    title: "Change the Voicing",
    hasCondition: true,
    check: (state: TutorialState) => state.hasVoicingChange,
  },
  {
    id: "preset",
    title: "Save a Preset",
    hasCondition: true,
    check: (state: TutorialState) => state.hasPreset,
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
 * @param params - App state
 * @returns Tutorial state object
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
}: BuildTutorialStateParams): TutorialState {
  const chordName = currentChord?.name || "";

  return {
    hasRoot: currentChord?.root != null,
    hasChord: (currentChord?.notes?.length ?? 0) > 0,
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
 * @param stepIndex - The step index to check
 * @param tutorialState - The current tutorial state
 * @param steps - The steps array to use (defaults to TUTORIAL_STEPS)
 * @returns Whether the condition is met
 */
export function isStepConditionMet(
  stepIndex: number,
  tutorialState: TutorialState,
  steps: TutorialStep[] = TUTORIAL_STEPS
): boolean {
  const step = steps[stepIndex];
  if (!step || !step.hasCondition || !step.check) return false;
  return step.check(tutorialState);
}

/**
 * Get the next step index.
 *
 * @param currentStep - Current step index
 * @param steps - The steps array to use (defaults to TUTORIAL_STEPS)
 * @returns Next step index, or null if at end
 */
export function getNextStep(
  currentStep: number,
  steps: TutorialStep[] = TUTORIAL_STEPS
): number | null {
  if (currentStep >= steps.length - 1) return null;
  return currentStep + 1;
}
