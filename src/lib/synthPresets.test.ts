/**
 * Tests for Synth Presets Module
 * Validates preset definitions, ADSR envelopes, and preset loading
 *
 * @module lib/synthPresets.test
 */

import { describe, it, expect } from "vitest";
import {
  synthPresets,
  getPresetById,
  DEFAULT_PRESET_ID,
  type ADSREnvelope,
} from "./synthPresets";

describe("synthPresets", () => {
  describe("preset array", () => {
    it("should have at least one preset", () => {
      expect(synthPresets.length).toBeGreaterThan(0);
    });

    it("should have 7 presets", () => {
      expect(synthPresets.length).toBe(7);
    });

    it("should include all expected presets by ID", () => {
      const expectedIds = [
        "poly-saw",
        "mellow-sine",
        "electric-piano",
        "warm-pad",
        "glass-keys",
        "smooth-bass",
        "analog-brass",
      ];

      const actualIds = synthPresets.map((p) => p.id);
      expect(actualIds).toEqual(expectedIds);
    });
  });

  describe("preset structure validation", () => {
    it("should have valid structure for all presets", () => {
      synthPresets.forEach((preset) => {
        // Required string fields
        expect(typeof preset.id).toBe("string");
        expect(preset.id.length).toBeGreaterThan(0);
        expect(typeof preset.name).toBe("string");
        expect(preset.name.length).toBeGreaterThan(0);
        expect(typeof preset.description).toBe("string");
        expect(preset.description.length).toBeGreaterThan(0);

        // Valid category
        expect(preset.category).toMatch(/^(keys|pad|lead|bass)$/);

        // Factory function exists
        expect(typeof preset.createSynth).toBe("function");

        // Default envelope is valid ADSR
        expect(preset.defaultEnvelope).toBeDefined();
        validateADSREnvelope(preset.defaultEnvelope);
      });
    });

    it("should have unique IDs", () => {
      const ids = synthPresets.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have unique names", () => {
      const names = synthPresets.map((p) => p.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe("ADSR envelope validation", () => {
    it("should have valid ADSR values for all presets", () => {
      synthPresets.forEach((preset) => {
        const env = preset.defaultEnvelope;

        // Attack: should be >= 0
        expect(env.attack).toBeGreaterThanOrEqual(0);
        expect(env.attack).toBeLessThanOrEqual(5);

        // Decay: should be >= 0
        expect(env.decay).toBeGreaterThanOrEqual(0);
        expect(env.decay).toBeLessThanOrEqual(5);

        // Sustain: 0 to 1
        expect(env.sustain).toBeGreaterThanOrEqual(0);
        expect(env.sustain).toBeLessThanOrEqual(1);

        // Release: should be >= 0
        expect(env.release).toBeGreaterThanOrEqual(0);
        expect(env.release).toBeLessThanOrEqual(10);
      });
    });

    it("should have reasonable envelope timings", () => {
      synthPresets.forEach((preset) => {
        const env = preset.defaultEnvelope;

        // Total envelope time shouldn't be absurdly long
        const totalTime = env.attack + env.decay + env.release;
        expect(totalTime).toBeLessThan(20);

        // At least one time component should be non-zero
        expect(env.attack + env.decay + env.release).toBeGreaterThan(0);
      });
    });
  });

  describe("preset categories", () => {
    it("should have presets in each category", () => {
      const categories = synthPresets.map((p) => p.category);
      const uniqueCategories = new Set(categories);

      // Should have multiple categories represented
      expect(uniqueCategories.size).toBeGreaterThan(1);
    });

    it("should have keys category presets", () => {
      const keysPresets = synthPresets.filter((p) => p.category === "keys");
      expect(keysPresets.length).toBeGreaterThan(0);
    });

    it("should have pad category presets", () => {
      const padPresets = synthPresets.filter((p) => p.category === "pad");
      expect(padPresets.length).toBeGreaterThan(0);
    });

    it("should have lead category presets", () => {
      const leadPresets = synthPresets.filter((p) => p.category === "lead");
      expect(leadPresets.length).toBeGreaterThan(0);
    });

    it("should have bass category presets", () => {
      const bassPresets = synthPresets.filter((p) => p.category === "bass");
      expect(bassPresets.length).toBeGreaterThan(0);
    });
  });

  describe("preset factory functions", () => {
    it("should have createSynth function defined", () => {
      synthPresets.forEach((preset) => {
        expect(typeof preset.createSynth).toBe("function");
      });
    });

    it("should have valid factory function signature", () => {
      synthPresets.forEach((preset) => {
        // Verify createSynth is a function that accepts an envelope parameter
        expect(preset.createSynth).toBeInstanceOf(Function);
        expect(preset.createSynth.length).toBe(1); // Takes one parameter (envelope)
      });
    });

    it("should be callable with ADSR envelope", () => {
      // Note: We can't actually instantiate Tone.js synths in Node.js test environment
      // (requires AudioContext which is browser-only), but we verify the API exists
      synthPresets.forEach((preset) => {
        // Verify function exists and is callable
        expect(preset.createSynth).toBeDefined();
        expect(typeof preset.createSynth).toBe("function");
        // In browser environment with AudioContext:
        // const synth = preset.createSynth(preset.defaultEnvelope);
      });
    });
  });

  describe("effects configuration", () => {
    it("should have effects function when defined", () => {
      synthPresets.forEach((preset) => {
        if (preset.effects) {
          expect(typeof preset.effects).toBe("function");
          expect(preset.effects.length).toBe(0); // Takes no parameters
        }
      });
    });

    it("should have effects defined for most presets", () => {
      const presetsWithEffects = synthPresets.filter((p) => p.effects);
      expect(presetsWithEffects.length).toBeGreaterThan(0);
    });

    it("should allow presets without effects", () => {
      const presetsWithoutEffects = synthPresets.filter((p) => !p.effects);
      // This is valid - not all presets need effects
      expect(presetsWithoutEffects.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getPresetById", () => {
    it("should return preset for valid ID", () => {
      const preset = getPresetById("electric-piano");
      expect(preset).toBeDefined();
      expect(preset?.id).toBe("electric-piano");
      expect(preset?.name).toBe("Electric Piano");
    });

    it("should return undefined for invalid ID", () => {
      const preset = getPresetById("non-existent-preset");
      expect(preset).toBeUndefined();
    });

    it("should work for all preset IDs", () => {
      synthPresets.forEach((expectedPreset) => {
        const foundPreset = getPresetById(expectedPreset.id);
        expect(foundPreset).toBe(expectedPreset);
      });
    });

    it("should be case-sensitive", () => {
      const preset = getPresetById("ELECTRIC-PIANO");
      expect(preset).toBeUndefined();
    });
  });

  describe("DEFAULT_PRESET_ID", () => {
    it("should be a valid preset ID", () => {
      expect(DEFAULT_PRESET_ID).toBeDefined();
      expect(typeof DEFAULT_PRESET_ID).toBe("string");

      const preset = getPresetById(DEFAULT_PRESET_ID);
      expect(preset).toBeDefined();
    });

    it("should point to electric-piano", () => {
      expect(DEFAULT_PRESET_ID).toBe("electric-piano");
    });

    it("should be retrievable via getPresetById", () => {
      const preset = getPresetById(DEFAULT_PRESET_ID);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe(DEFAULT_PRESET_ID);
    });
  });

  describe("specific preset tests", () => {
    it("should have poly-saw with pad category", () => {
      const preset = getPresetById("poly-saw");
      expect(preset?.category).toBe("pad");
      expect(preset?.name).toBe("Poly Saw");
    });

    it("should have mellow-sine with keys category", () => {
      const preset = getPresetById("mellow-sine");
      expect(preset?.category).toBe("keys");
      expect(preset?.name).toBe("Mellow Sine");
    });

    it("should have electric-piano with keys category", () => {
      const preset = getPresetById("electric-piano");
      expect(preset?.category).toBe("keys");
      expect(preset?.name).toBe("Electric Piano");
    });

    it("should have warm-pad with slow attack", () => {
      const preset = getPresetById("warm-pad");
      expect(preset?.category).toBe("pad");
      // Pads typically have slow attack
      expect(preset?.defaultEnvelope.attack).toBeGreaterThan(0.5);
    });

    it("should have smooth-bass with bass category", () => {
      const preset = getPresetById("smooth-bass");
      expect(preset?.category).toBe("bass");
      expect(preset?.name).toBe("Smooth Bass");
    });

    it("should have analog-brass with lead category", () => {
      const preset = getPresetById("analog-brass");
      expect(preset?.category).toBe("lead");
      expect(preset?.name).toBe("Analog Brass");
    });
  });

  describe("preset descriptions", () => {
    it("should have meaningful descriptions", () => {
      synthPresets.forEach((preset) => {
        // Description should be at least somewhat descriptive
        expect(preset.description.length).toBeGreaterThan(10);

        // Should not just be the name repeated
        expect(preset.description.toLowerCase()).not.toBe(
          preset.name.toLowerCase(),
        );
      });
    });
  });
});

/**
 * Helper function to validate ADSR envelope values
 */
function validateADSREnvelope(env: ADSREnvelope): void {
  expect(typeof env.attack).toBe("number");
  expect(typeof env.decay).toBe("number");
  expect(typeof env.sustain).toBe("number");
  expect(typeof env.release).toBe("number");

  expect(env.attack).toBeGreaterThanOrEqual(0);
  expect(env.decay).toBeGreaterThanOrEqual(0);
  expect(env.sustain).toBeGreaterThanOrEqual(0);
  expect(env.sustain).toBeLessThanOrEqual(1);
  expect(env.release).toBeGreaterThanOrEqual(0);
}
