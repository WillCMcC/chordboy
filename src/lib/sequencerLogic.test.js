/**
 * Tests for Sequencer Logic
 */

import { describe, it, expect } from "vitest";
import { processStep, runSequence } from "./sequencerLogic";

describe("sequencerLogic", () => {
  describe("processStep", () => {
    describe("sustain mode (retrigMode = false)", () => {
      it("should trigger when preset is new (lastTriggered is null)", () => {
        const result = processStep({
          currentPreset: "1",
          lastTriggeredPreset: null,
          retrigMode: false,
        });
        expect(result.action).toBe("trigger");
        expect(result.preset).toBe("1");
        expect(result.lastTriggeredPreset).toBe("1");
      });

      it("should sustain when same preset continues", () => {
        const result = processStep({
          currentPreset: "1",
          lastTriggeredPreset: "1",
          retrigMode: false,
        });
        expect(result.action).toBe("sustain");
        expect(result.preset).toBe("1");
        expect(result.lastTriggeredPreset).toBe("1");
      });

      it("should trigger when preset changes", () => {
        const result = processStep({
          currentPreset: "2",
          lastTriggeredPreset: "1",
          retrigMode: false,
        });
        expect(result.action).toBe("trigger");
        expect(result.preset).toBe("2");
        expect(result.lastTriggeredPreset).toBe("2");
      });

      it("should stop on empty step", () => {
        const result = processStep({
          currentPreset: null,
          lastTriggeredPreset: "1",
          retrigMode: false,
        });
        expect(result.action).toBe("stop");
        expect(result.preset).toBe(null);
        expect(result.lastTriggeredPreset).toBe(null);
      });

      it("should trigger after empty step even if same preset", () => {
        // This is the key test for the bug!
        // After an empty step, lastTriggeredPreset becomes null,
        // so the next "1" should trigger (not sustain)
        const result = processStep({
          currentPreset: "1",
          lastTriggeredPreset: null, // was cleared by empty step
          retrigMode: false,
        });
        expect(result.action).toBe("trigger");
        expect(result.preset).toBe("1");
      });
    });

    describe("retrig mode (retrigMode = true)", () => {
      it("should trigger when preset is new", () => {
        const result = processStep({
          currentPreset: "1",
          lastTriggeredPreset: null,
          retrigMode: true,
        });
        expect(result.action).toBe("trigger");
        expect(result.preset).toBe("1");
      });

      it("should retrigger when same preset continues", () => {
        const result = processStep({
          currentPreset: "1",
          lastTriggeredPreset: "1",
          retrigMode: true,
        });
        expect(result.action).toBe("retrigger");
        expect(result.preset).toBe("1");
      });

      it("should trigger when preset changes", () => {
        const result = processStep({
          currentPreset: "2",
          lastTriggeredPreset: "1",
          retrigMode: true,
        });
        expect(result.action).toBe("trigger");
        expect(result.preset).toBe("2");
      });

      it("should stop on empty step", () => {
        const result = processStep({
          currentPreset: null,
          lastTriggeredPreset: "1",
          retrigMode: true,
        });
        expect(result.action).toBe("stop");
        expect(result.preset).toBe(null);
      });
    });
  });

  describe("runSequence", () => {
    describe("sustain mode", () => {
      it("should handle sequence: 1, -, 1, -, 4, 4, 4, -", () => {
        // This is the exact sequence from the bug report
        const sequence = ["1", null, "1", null, "4", "4", "4", null];
        const results = runSequence(sequence, false);

        // Step 0: "1" - trigger (first occurrence)
        expect(results[0]).toEqual({
          action: "trigger",
          preset: "1",
          lastTriggeredPreset: "1",
        });

        // Step 1: null - stop
        expect(results[1]).toEqual({
          action: "stop",
          preset: null,
          lastTriggeredPreset: null,
        });

        // Step 2: "1" - trigger (after rest, should re-articulate)
        expect(results[2]).toEqual({
          action: "trigger",
          preset: "1",
          lastTriggeredPreset: "1",
        });

        // Step 3: null - stop
        expect(results[3]).toEqual({
          action: "stop",
          preset: null,
          lastTriggeredPreset: null,
        });

        // Step 4: "4" - trigger (new preset)
        expect(results[4]).toEqual({
          action: "trigger",
          preset: "4",
          lastTriggeredPreset: "4",
        });

        // Step 5: "4" - sustain (same preset continues)
        expect(results[5]).toEqual({
          action: "sustain",
          preset: "4",
          lastTriggeredPreset: "4",
        });

        // Step 6: "4" - sustain (same preset continues)
        expect(results[6]).toEqual({
          action: "sustain",
          preset: "4",
          lastTriggeredPreset: "4",
        });

        // Step 7: null - stop
        expect(results[7]).toEqual({
          action: "stop",
          preset: null,
          lastTriggeredPreset: null,
        });
      });

      it("should sustain consecutive same presets", () => {
        const sequence = ["1", "1", "1"];
        const results = runSequence(sequence, false);

        expect(results[0].action).toBe("trigger");
        expect(results[1].action).toBe("sustain");
        expect(results[2].action).toBe("sustain");
      });

      it("should trigger on preset change", () => {
        const sequence = ["1", "2", "1"];
        const results = runSequence(sequence, false);

        expect(results[0].action).toBe("trigger");
        expect(results[0].preset).toBe("1");

        expect(results[1].action).toBe("trigger");
        expect(results[1].preset).toBe("2");

        expect(results[2].action).toBe("trigger");
        expect(results[2].preset).toBe("1");
      });
    });

    describe("retrig mode", () => {
      it("should retrigger consecutive same presets", () => {
        const sequence = ["1", "1", "1"];
        const results = runSequence(sequence, true);

        expect(results[0].action).toBe("trigger");
        expect(results[1].action).toBe("retrigger");
        expect(results[2].action).toBe("retrigger");
      });

      it("should handle sequence with rests", () => {
        const sequence = ["1", null, "1"];
        const results = runSequence(sequence, true);

        expect(results[0].action).toBe("trigger");
        expect(results[1].action).toBe("stop");
        expect(results[2].action).toBe("trigger"); // After rest, it's a new trigger
      });
    });
  });
});
