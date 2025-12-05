/**
 * Tests for Tutorial Logic
 */

import { describe, it, expect } from "vitest";
import {
  TUTORIAL_STEPS,
  buildTutorialState,
  isStepConditionMet,
  getNextStep,
} from "./tutorialLogic";

describe("tutorialLogic", () => {
  describe("TUTORIAL_STEPS", () => {
    it("should have 7 steps", () => {
      expect(TUTORIAL_STEPS).toHaveLength(7);
    });

    it("should have welcome as first step without condition", () => {
      expect(TUTORIAL_STEPS[0].id).toBe("welcome");
      expect(TUTORIAL_STEPS[0].hasCondition).toBe(false);
    });

    it("should have ready as last step without condition", () => {
      expect(TUTORIAL_STEPS[6].id).toBe("ready");
      expect(TUTORIAL_STEPS[6].hasCondition).toBe(false);
    });

    it("should have conditions for steps 1-5", () => {
      for (let i = 1; i <= 5; i++) {
        expect(TUTORIAL_STEPS[i].hasCondition).toBe(true);
        expect(typeof TUTORIAL_STEPS[i].check).toBe("function");
      }
    });
  });

  describe("buildTutorialState", () => {
    const defaultParams = {
      currentChord: null,
      inversionIndex: 0,
      octave: 4,
      spreadAmount: 0,
      presetCount: 0,
      initialInversion: 0,
      initialOctave: 4,
      initialSpread: 0,
      initialPresetCount: 0,
    };

    it("should detect hasRoot when chord has root", () => {
      const state = buildTutorialState({
        ...defaultParams,
        currentChord: { root: "C", notes: [60], name: "C" },
      });
      expect(state.hasRoot).toBe(true);
    });

    it("should not detect hasRoot when no chord", () => {
      const state = buildTutorialState(defaultParams);
      expect(state.hasRoot).toBe(false);
    });

    it("should detect isMinor for minor chords", () => {
      const minorNames = ["C min", "A m7", "D m9", "G minor"];
      for (const name of minorNames) {
        const state = buildTutorialState({
          ...defaultParams,
          currentChord: { root: "C", notes: [60, 63, 67], name },
        });
        expect(state.isMinor).toBe(true);
      }
    });

    it("should not detect isMinor for major chords", () => {
      const state = buildTutorialState({
        ...defaultParams,
        currentChord: { root: "C", notes: [60, 64, 67], name: "C Maj" },
      });
      expect(state.isMinor).toBe(false);
    });

    it("should detect hasExtension for 7th chords", () => {
      const extensionNames = ["C 7", "C Maj7", "C m7", "C 9", "C 11", "C 13", "C 6"];
      for (const name of extensionNames) {
        const state = buildTutorialState({
          ...defaultParams,
          currentChord: { root: "C", notes: [60, 64, 67, 70], name },
        });
        expect(state.hasExtension).toBe(true);
      }
    });

    it("should not detect hasExtension for triads", () => {
      const state = buildTutorialState({
        ...defaultParams,
        currentChord: { root: "C", notes: [60, 64, 67], name: "C Maj" },
      });
      expect(state.hasExtension).toBe(false);
    });

    it("should detect hasVoicingChange when inversion changes", () => {
      const state = buildTutorialState({
        ...defaultParams,
        inversionIndex: 1,
        initialInversion: 0,
      });
      expect(state.hasVoicingChange).toBe(true);
    });

    it("should detect hasVoicingChange when octave changes", () => {
      const state = buildTutorialState({
        ...defaultParams,
        octave: 5,
        initialOctave: 4,
      });
      expect(state.hasVoicingChange).toBe(true);
    });

    it("should detect hasVoicingChange when spread changes", () => {
      const state = buildTutorialState({
        ...defaultParams,
        spreadAmount: 1,
        initialSpread: 0,
      });
      expect(state.hasVoicingChange).toBe(true);
    });

    it("should not detect hasVoicingChange when nothing changes", () => {
      const state = buildTutorialState(defaultParams);
      expect(state.hasVoicingChange).toBe(false);
    });

    it("should detect hasPreset when preset count increases", () => {
      const state = buildTutorialState({
        ...defaultParams,
        presetCount: 1,
        initialPresetCount: 0,
      });
      expect(state.hasPreset).toBe(true);
    });

    it("should not detect hasPreset when preset count is same", () => {
      const state = buildTutorialState({
        ...defaultParams,
        presetCount: 2,
        initialPresetCount: 2,
      });
      expect(state.hasPreset).toBe(false);
    });
  });

  describe("isStepConditionMet", () => {
    it("should return false for step 0 (no condition)", () => {
      const state = { hasRoot: true };
      expect(isStepConditionMet(0, state)).toBe(false);
    });

    it("should return true for step 1 when hasRoot", () => {
      const state = { hasRoot: true };
      expect(isStepConditionMet(1, state)).toBe(true);
    });

    it("should return false for step 1 when no root", () => {
      const state = { hasRoot: false };
      expect(isStepConditionMet(1, state)).toBe(false);
    });

    it("should return true for step 2 when isMinor", () => {
      const state = { isMinor: true };
      expect(isStepConditionMet(2, state)).toBe(true);
    });

    it("should return true for step 3 when hasExtension", () => {
      const state = { hasExtension: true };
      expect(isStepConditionMet(3, state)).toBe(true);
    });

    it("should return true for step 4 when hasVoicingChange", () => {
      const state = { hasVoicingChange: true };
      expect(isStepConditionMet(4, state)).toBe(true);
    });

    it("should return true for step 5 when hasPreset", () => {
      const state = { hasPreset: true };
      expect(isStepConditionMet(5, state)).toBe(true);
    });

    it("should return false for step 6 (no condition)", () => {
      const state = {};
      expect(isStepConditionMet(6, state)).toBe(false);
    });

    it("should return false for invalid step index", () => {
      const state = {};
      expect(isStepConditionMet(99, state)).toBe(false);
      expect(isStepConditionMet(-1, state)).toBe(false);
    });
  });

  describe("getNextStep", () => {
    it("should return next step index", () => {
      expect(getNextStep(0)).toBe(1);
      expect(getNextStep(1)).toBe(2);
      expect(getNextStep(5)).toBe(6);
    });

    it("should return null at last step", () => {
      expect(getNextStep(6)).toBe(null);
    });

    it("should return null for out of bounds", () => {
      expect(getNextStep(7)).toBe(null);
      expect(getNextStep(100)).toBe(null);
    });
  });

  describe("full tutorial flow simulation", () => {
    it("should progress through all steps with correct actions", () => {
      // Step 0: Welcome (no condition)
      expect(isStepConditionMet(0, {})).toBe(false);

      // Step 1: Play root note
      let state = buildTutorialState({
        currentChord: { root: "C", notes: [60], name: "C" },
        inversionIndex: 0,
        octave: 4,
        spreadAmount: 0,
        presetCount: 0,
        initialInversion: 0,
        initialOctave: 4,
        initialSpread: 0,
        initialPresetCount: 0,
      });
      expect(isStepConditionMet(1, state)).toBe(true);
      expect(getNextStep(1)).toBe(2);

      // Step 2: Play minor chord
      state = buildTutorialState({
        currentChord: { root: "C", notes: [60, 63, 67], name: "C min" },
        inversionIndex: 0,
        octave: 4,
        spreadAmount: 0,
        presetCount: 0,
        initialInversion: 0,
        initialOctave: 4,
        initialSpread: 0,
        initialPresetCount: 0,
      });
      expect(isStepConditionMet(2, state)).toBe(true);
      expect(getNextStep(2)).toBe(3);

      // Step 3: Add extension
      state = buildTutorialState({
        currentChord: { root: "C", notes: [60, 64, 67, 70], name: "C 7" },
        inversionIndex: 0,
        octave: 4,
        spreadAmount: 0,
        presetCount: 0,
        initialInversion: 0,
        initialOctave: 4,
        initialSpread: 0,
        initialPresetCount: 0,
      });
      expect(isStepConditionMet(3, state)).toBe(true);
      expect(getNextStep(3)).toBe(4);

      // Step 4: Change voicing
      state = buildTutorialState({
        currentChord: { root: "C", notes: [60, 64, 67], name: "C Maj" },
        inversionIndex: 1,
        octave: 4,
        spreadAmount: 0,
        presetCount: 0,
        initialInversion: 0,
        initialOctave: 4,
        initialSpread: 0,
        initialPresetCount: 0,
      });
      expect(isStepConditionMet(4, state)).toBe(true);
      expect(getNextStep(4)).toBe(5);

      // Step 5: Save preset
      state = buildTutorialState({
        currentChord: { root: "C", notes: [60, 64, 67], name: "C Maj" },
        inversionIndex: 0,
        octave: 4,
        spreadAmount: 0,
        presetCount: 1,
        initialInversion: 0,
        initialOctave: 4,
        initialSpread: 0,
        initialPresetCount: 0,
      });
      expect(isStepConditionMet(5, state)).toBe(true);
      expect(getNextStep(5)).toBe(6);

      // Step 6: Ready (no condition, end)
      expect(isStepConditionMet(6, {})).toBe(false);
      expect(getNextStep(6)).toBe(null);
    });
  });
});
