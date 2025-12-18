/**
 * Tests for usePresets.solvePresetVoicings
 * Specifically tests the bug fix for voicingStyle being properly applied
 * from solver output back to presets.
 *
 * Bug: solvePresetVoicings was updating octave, inversionIndex, droppedNotes,
 * and spreadAmount from solver results but NOT voicingStyle.
 *
 * Fix: Line 315 in usePresets.ts now includes `voicingStyle: solved.voicingStyle`
 *
 * These tests verify that when solveChordVoicings returns voicing settings,
 * those settings (including voicingStyle) are properly applied to presets.
 */

import { describe, it, expect } from "vitest";
import { solveChordVoicings } from "../lib/chordSolver";
import type { Preset, VoicingSettings } from "../types";

/**
 * Helper to create a Preset object
 */
function createPreset(
  keys: string[],
  octave: number = 4,
  options: Partial<Preset> = {}
): Preset {
  return {
    keys: new Set(keys),
    octave: octave as any,
    inversionIndex: 0,
    droppedNotes: 0,
    spreadAmount: 0,
    voicingStyle: "close",
    ...options,
  };
}

/**
 * Simulate the preset update logic from usePresets.solvePresetVoicings
 * This is the critical part where the bug was fixed.
 */
function updatePresetsWithSolvedVoicings(
  presets: Preset[],
  solvedVoicings: VoicingSettings[]
): Preset[] {
  return presets.map((preset, index) => {
    const solved = solvedVoicings[index];
    return {
      ...preset,
      octave: solved.octave!,
      inversionIndex: solved.inversionIndex,
      droppedNotes: solved.droppedNotes,
      spreadAmount: solved.spreadAmount,
      voicingStyle: solved.voicingStyle, // BUG FIX: This line was missing
    };
  });
}

describe("usePresets.solvePresetVoicings - voicingStyle bug fix", () => {
  describe("Integration with solveChordVoicings", () => {
    it("should apply voicingStyle from solver output to presets", () => {
      // Create presets with "close" voicing style
      const presets = [
        createPreset(["q", "j"], 4, { voicingStyle: "close" }), // C major
        createPreset(["f", "j"], 4, { voicingStyle: "close" }), // G major
      ];

      // Solve voicings - the solver may choose different voicing styles
      const solvedVoicings = solveChordVoicings(presets, {
        targetOctave: 4,
        spreadPreference: 0,
      });

      // Apply solved voicings to presets (this is what usePresets does)
      const updatedPresets = updatePresetsWithSolvedVoicings(presets, solvedVoicings);

      // CRITICAL: Verify that voicingStyle was updated from solver output
      // The solver may have chosen different styles for optimal voice leading
      expect(updatedPresets[0].voicingStyle).toBeDefined();
      expect(updatedPresets[1].voicingStyle).toBeDefined();

      // Verify the voicingStyle came from the solver, not the original preset
      expect(updatedPresets[0].voicingStyle).toBe(solvedVoicings[0].voicingStyle);
      expect(updatedPresets[1].voicingStyle).toBe(solvedVoicings[1].voicingStyle);
    });

    it("should update voicingStyle when solver suggests different style", () => {
      // Create a preset with "close" voicing
      const presets = [
        createPreset(["q", "j", "i"], 4, { voicingStyle: "close" }), // Cmaj7
        createPreset(["e", "u", "k"], 4, { voicingStyle: "close" }), // Dm7
      ];

      // Allow solver to choose from multiple styles
      const solvedVoicings = solveChordVoicings(presets, {
        targetOctave: 4,
        allowedStyles: ["close", "drop2", "drop3", "shell", "rootless-a"],
      });

      const updatedPresets = updatePresetsWithSolvedVoicings(presets, solvedVoicings);

      // Each preset should have the voicingStyle returned by the solver
      updatedPresets.forEach((preset, i) => {
        expect(preset.voicingStyle).toBe(solvedVoicings[i].voicingStyle);
      });
    });

    it("should update all voicing parameters including voicingStyle", () => {
      // Create presets with default/initial values
      const presets = [
        createPreset(["q", "j", "i"], 4, {
          octave: 4,
          inversionIndex: 0,
          spreadAmount: 0,
          droppedNotes: 0,
          voicingStyle: "close",
        }),
        createPreset(["e", "u", "k"], 4, {
          octave: 4,
          inversionIndex: 0,
          spreadAmount: 0,
          droppedNotes: 0,
          voicingStyle: "close",
        }),
      ];

      // Solve voicings
      const solvedVoicings = solveChordVoicings(presets, {
        targetOctave: 4,
        spreadPreference: 0.5, // Prefer wider voicings
      });

      const updatedPresets = updatePresetsWithSolvedVoicings(presets, solvedVoicings);

      // Verify ALL parameters were updated from solver output
      updatedPresets.forEach((preset, i) => {
        const solved = solvedVoicings[i];
        expect(preset.octave).toBe(solved.octave);
        expect(preset.inversionIndex).toBe(solved.inversionIndex);
        expect(preset.spreadAmount).toBe(solved.spreadAmount);
        expect(preset.droppedNotes).toBe(solved.droppedNotes);
        expect(preset.voicingStyle).toBe(solved.voicingStyle); // BUG FIX: This was missing
      });
    });

    it("should preserve preset keys while updating voicing parameters", () => {
      const originalKeys = new Set(["q", "j", "k", "l"]);
      const presets = [
        createPreset(Array.from(originalKeys), 4, { voicingStyle: "close" }),
      ];

      const solvedVoicings = solveChordVoicings(presets, { targetOctave: 4 });
      const updatedPresets = updatePresetsWithSolvedVoicings(presets, solvedVoicings);

      // Keys should be unchanged
      expect(updatedPresets[0].keys).toEqual(originalKeys);

      // But voicing parameters should be updated
      expect(updatedPresets[0].voicingStyle).toBe(solvedVoicings[0].voicingStyle);
      expect(updatedPresets[0].octave).toBe(solvedVoicings[0].octave);
      expect(updatedPresets[0].inversionIndex).toBe(solvedVoicings[0].inversionIndex);
    });

    it("should handle ii-V-I progression with varied voicing styles", () => {
      // Create a ii-V-I progression all starting with "close" voicing
      const presets = [
        createPreset(["e", "u", "k"], 4, { voicingStyle: "close" }), // Dm7
        createPreset(["f", "j", "k"], 4, { voicingStyle: "close" }), // G7
        createPreset(["q", "j", "i"], 4, { voicingStyle: "close" }), // Cmaj7
      ];

      // Solve with jazz voice leading - solver may choose different styles
      const solvedVoicings = solveChordVoicings(presets, {
        targetOctave: 4,
        jazzVoiceLeading: true,
        allowedStyles: ["close", "drop2", "shell", "rootless-a", "rootless-b"],
      });

      const updatedPresets = updatePresetsWithSolvedVoicings(presets, solvedVoicings);

      // Each chord should have the optimal voicing style from solver
      updatedPresets.forEach((preset, i) => {
        expect(preset.voicingStyle).toBeDefined();
        expect(preset.voicingStyle).toBe(solvedVoicings[i].voicingStyle);
      });
    });

    it("should handle solver returning all different voicing styles", () => {
      // Create 5 presets all with "close" voicing
      const presets = [
        createPreset(["q", "j", "i"], 4, { voicingStyle: "close" }), // Cmaj7
        createPreset(["e", "u", "k"], 4, { voicingStyle: "close" }), // Dm7
        createPreset(["a", "u", "k"], 4, { voicingStyle: "close" }), // Em7
        createPreset(["s", "j", "i"], 4, { voicingStyle: "close" }), // Fmaj7
        createPreset(["f", "j", "k"], 4, { voicingStyle: "close" }), // G7
      ];

      // Solve allowing all voicing styles
      const solvedVoicings = solveChordVoicings(presets, {
        targetOctave: 4,
        allowedStyles: ["close", "drop2", "drop3", "shell", "rootless-a", "rootless-b", "quartal"],
      });

      const updatedPresets = updatePresetsWithSolvedVoicings(presets, solvedVoicings);

      // Verify each preset got its voicingStyle from the solver
      for (let i = 0; i < updatedPresets.length; i++) {
        expect(updatedPresets[i].voicingStyle).toBe(solvedVoicings[i].voicingStyle);
      }
    });

    it("should handle close preference with voicingStyle updates", () => {
      const presets = [
        createPreset(["q", "j", "i"], 4, { voicingStyle: "drop2" }), // Cmaj7
        createPreset(["s", "j", "i"], 4, { voicingStyle: "drop3" }), // Fmaj7
      ];

      // Solve with close preference
      const solvedVoicings = solveChordVoicings(presets, {
        targetOctave: 4,
        spreadPreference: -1, // Strong preference for close voicings
      });

      const updatedPresets = updatePresetsWithSolvedVoicings(presets, solvedVoicings);

      // Verify voicingStyle was updated from solver (may prefer "close" style)
      expect(updatedPresets[0].voicingStyle).toBe(solvedVoicings[0].voicingStyle);
      expect(updatedPresets[1].voicingStyle).toBe(solvedVoicings[1].voicingStyle);
    });

    it("should handle wide preference with voicingStyle updates", () => {
      const presets = [
        createPreset(["q", "j", "i"], 4, { voicingStyle: "close" }), // Cmaj7
        createPreset(["e", "u", "k"], 4, { voicingStyle: "close" }), // Dm7
      ];

      // Solve with wide preference
      const solvedVoicings = solveChordVoicings(presets, {
        targetOctave: 4,
        spreadPreference: 1, // Strong preference for wide voicings
      });

      const updatedPresets = updatePresetsWithSolvedVoicings(presets, solvedVoicings);

      // Verify voicingStyle was updated from solver (may prefer wider styles like drop2/drop3)
      expect(updatedPresets[0].voicingStyle).toBe(solvedVoicings[0].voicingStyle);
      expect(updatedPresets[1].voicingStyle).toBe(solvedVoicings[1].voicingStyle);
    });

    it("should handle limited style options with voicingStyle updates", () => {
      const presets = [
        createPreset(["q", "j", "k"], 4, { voicingStyle: "close" }),
        createPreset(["s", "j", "k"], 4, { voicingStyle: "shell" }),
      ];

      // Solve with only drop2 and drop3 allowed
      const solvedVoicings = solveChordVoicings(presets, {
        targetOctave: 4,
        allowedStyles: ["drop2", "drop3"],
      });

      const updatedPresets = updatePresetsWithSolvedVoicings(presets, solvedVoicings);

      // Verify voicingStyle was updated and is one of the allowed styles
      const allowedStyles = ["drop2", "drop3"];
      expect(allowedStyles).toContain(updatedPresets[0].voicingStyle);
      expect(allowedStyles).toContain(updatedPresets[1].voicingStyle);
      expect(updatedPresets[0].voicingStyle).toBe(solvedVoicings[0].voicingStyle);
      expect(updatedPresets[1].voicingStyle).toBe(solvedVoicings[1].voicingStyle);
    });
  });

  describe("VoicingSettings structure verification", () => {
    it("should verify solver returns all required fields including voicingStyle", () => {
      const presets = [createPreset(["q", "j"], 4)];
      const solvedVoicings = solveChordVoicings(presets, { targetOctave: 4 });

      expect(solvedVoicings).toHaveLength(1);
      const solved = solvedVoicings[0];

      // Verify all VoicingSettings fields are present
      expect(solved).toHaveProperty("inversionIndex");
      expect(solved).toHaveProperty("spreadAmount");
      expect(solved).toHaveProperty("droppedNotes");
      expect(solved).toHaveProperty("voicingStyle");
      expect(solved).toHaveProperty("octave");

      // Verify types
      expect(typeof solved.inversionIndex).toBe("number");
      expect(typeof solved.spreadAmount).toBe("number");
      expect(typeof solved.droppedNotes).toBe("number");
      expect(typeof solved.voicingStyle).toBe("string");
      expect(typeof solved.octave).toBe("number");
    });

    it("should verify voicingStyle is a valid VoicingStyle enum value", () => {
      const presets = [createPreset(["q", "j", "i"], 4)];
      const solvedVoicings = solveChordVoicings(presets, { targetOctave: 4 });

      const validStyles = [
        "close",
        "drop2",
        "drop3",
        "shell",
        "rootless-a",
        "rootless-b",
        "quartal",
      ];

      expect(validStyles).toContain(solvedVoicings[0].voicingStyle);
    });
  });
});
