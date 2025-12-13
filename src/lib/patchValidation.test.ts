import { describe, it, expect } from "vitest";
import { validatePatch, sanitizePatch } from "./patchValidation";
import { createDefaultPatch } from "./defaultPatch";
import type { CustomPatch } from "../types/synth";

describe("patchValidation", () => {
  describe("validatePatch", () => {
    describe("valid patches", () => {
      it("should validate a default patch", () => {
        const patch = createDefaultPatch();
        expect(validatePatch(patch)).toBe(true);
      });

      it("should validate a patch with all fields set to valid values", () => {
        const patch = createDefaultPatch();
        patch.name = "Test Patch";
        patch.description = "Test description";
        patch.category = "lead";
        patch.masterVolume = 0.5;
        patch.oscMix = 0.7;
        patch.glide = 100;
        expect(validatePatch(patch)).toBe(true);
      });

      it("should validate a patch with both oscillators enabled", () => {
        const patch = createDefaultPatch();
        patch.osc1.enabled = true;
        patch.osc2.enabled = true;
        expect(validatePatch(patch)).toBe(true);
      });

      it("should validate a patch with effects", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: "chorus",
            enabled: true,
            wet: 0.5,
            params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
          },
          {
            type: "reverb",
            enabled: true,
            wet: 0.3,
            params: { decay: 2.5, preDelay: 0.01 },
          },
        ];
        expect(validatePatch(patch)).toBe(true);
      });

      it("should validate a patch with mod matrix routings", () => {
        const patch = createDefaultPatch();
        patch.modMatrix.routings = [
          {
            id: crypto.randomUUID(),
            source: "lfo1",
            destination: "filter_freq",
            amount: 0.5,
            enabled: true,
          },
        ];
        patch.modMatrix.lfo1.enabled = true;
        expect(validatePatch(patch)).toBe(true);
      });

      it("should validate a patch with optional oscillator fields", () => {
        const patch = createDefaultPatch();
        patch.osc1.spread = 50;
        patch.osc1.count = 4;
        expect(validatePatch(patch)).toBe(true);
      });

      it("should validate a patch with optional envelope curves", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.attackCurve = "exponential";
        patch.ampEnvelope.releaseCurve = "linear";
        expect(validatePatch(patch)).toBe(true);
      });
    });

    describe("invalid patch structure", () => {
      it("should reject null", () => {
        expect(validatePatch(null)).toBe(false);
      });

      it("should reject undefined", () => {
        expect(validatePatch(undefined)).toBe(false);
      });

      it("should reject non-object values", () => {
        expect(validatePatch(42)).toBe(false);
        expect(validatePatch("patch")).toBe(false);
        expect(validatePatch([])).toBe(false);
      });

      it("should reject empty object", () => {
        expect(validatePatch({})).toBe(false);
      });

      it("should reject patch with missing required fields", () => {
        const patch = createDefaultPatch();
        const incomplete = { ...patch };
        delete (incomplete as any).id;
        expect(validatePatch(incomplete)).toBe(false);
      });

      it("should reject patch with empty id string", () => {
        const patch = createDefaultPatch();
        (patch as any).id = "";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with wrong field types", () => {
        const patch = createDefaultPatch();
        (patch as any).name = 42;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-numeric timestamps", () => {
        const patch = createDefaultPatch();
        (patch as any).createdAt = "2024-01-01";
        expect(validatePatch(patch)).toBe(false);
      });
    });

    describe("invalid oscillator configs", () => {
      it("should reject patch with invalid oscillator waveform type", () => {
        const patch = createDefaultPatch();
        (patch.osc1 as any).waveform = 123;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid oscillator enabled field", () => {
        const patch = createDefaultPatch();
        (patch.osc1 as any).enabled = "true";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with volume out of range (negative)", () => {
        const patch = createDefaultPatch();
        patch.osc1.volume = -0.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with volume out of range (too high)", () => {
        const patch = createDefaultPatch();
        patch.osc1.volume = 1.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with pan out of range (negative)", () => {
        const patch = createDefaultPatch();
        patch.osc1.pan = -1.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with pan out of range (positive)", () => {
        const patch = createDefaultPatch();
        patch.osc1.pan = 1.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-numeric octave", () => {
        const patch = createDefaultPatch();
        (patch.osc1 as any).octave = "0";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-numeric detune", () => {
        const patch = createDefaultPatch();
        (patch.osc1 as any).detune = "0";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid optional spread type", () => {
        const patch = createDefaultPatch();
        (patch.osc1 as any).spread = "50";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid optional count type", () => {
        const patch = createDefaultPatch();
        (patch.osc1 as any).count = "4";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with null oscillator", () => {
        const patch = createDefaultPatch();
        (patch as any).osc1 = null;
        expect(validatePatch(patch)).toBe(false);
      });
    });

    describe("invalid filter configs", () => {
      it("should reject patch with invalid filter type", () => {
        const patch = createDefaultPatch();
        (patch.filter as any).type = 123;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with filter frequency too low", () => {
        const patch = createDefaultPatch();
        patch.filter.frequency = 10;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with filter frequency too high", () => {
        const patch = createDefaultPatch();
        patch.filter.frequency = 25000;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with negative filter frequency", () => {
        const patch = createDefaultPatch();
        patch.filter.frequency = -100;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-numeric resonance", () => {
        const patch = createDefaultPatch();
        (patch.filter as any).resonance = "1";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with envelopeAmount out of range (negative)", () => {
        const patch = createDefaultPatch();
        patch.filter.envelopeAmount = -1.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with envelopeAmount out of range (positive)", () => {
        const patch = createDefaultPatch();
        patch.filter.envelopeAmount = 1.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with keyTracking out of range (negative)", () => {
        const patch = createDefaultPatch();
        patch.filter.keyTracking = -0.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with keyTracking out of range (too high)", () => {
        const patch = createDefaultPatch();
        patch.filter.keyTracking = 1.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with null filter", () => {
        const patch = createDefaultPatch();
        (patch as any).filter = null;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid filter enabled type", () => {
        const patch = createDefaultPatch();
        (patch.filter as any).enabled = 1;
        expect(validatePatch(patch)).toBe(false);
      });
    });

    describe("invalid envelope configs", () => {
      it("should reject patch with negative attack", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.attack = -0.1;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with negative decay", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.decay = -0.1;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with negative sustain", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.sustain = -0.1;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with sustain greater than 1", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.sustain = 1.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with negative release", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.release = -0.1;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-numeric envelope values", () => {
        const patch = createDefaultPatch();
        (patch.ampEnvelope as any).attack = "0.01";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid attackCurve type", () => {
        const patch = createDefaultPatch();
        (patch.ampEnvelope as any).attackCurve = 123;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid releaseCurve type", () => {
        const patch = createDefaultPatch();
        (patch.ampEnvelope as any).releaseCurve = 123;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with null envelope", () => {
        const patch = createDefaultPatch();
        (patch as any).ampEnvelope = null;
        expect(validatePatch(patch)).toBe(false);
      });
    });

    describe("invalid filter envelope configs", () => {
      it("should reject patch with negative octaves", () => {
        const patch = createDefaultPatch();
        patch.filterEnvelope.octaves = -1;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with octaves greater than 8", () => {
        const patch = createDefaultPatch();
        patch.filterEnvelope.octaves = 9;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-numeric octaves", () => {
        const patch = createDefaultPatch();
        (patch.filterEnvelope as any).octaves = "2";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject filter envelope with invalid envelope fields", () => {
        const patch = createDefaultPatch();
        patch.filterEnvelope.attack = -0.1;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with null filter envelope", () => {
        const patch = createDefaultPatch();
        (patch as any).filterEnvelope = null;
        expect(validatePatch(patch)).toBe(false);
      });
    });

    describe("invalid mod matrix configs", () => {
      it("should reject patch with null modMatrix", () => {
        const patch = createDefaultPatch();
        (patch as any).modMatrix = null;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-array routings", () => {
        const patch = createDefaultPatch();
        (patch.modMatrix as any).routings = {};
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid routing entry (missing id)", () => {
        const patch = createDefaultPatch();
        patch.modMatrix.routings = [
          {
            source: "lfo1",
            destination: "filter_freq",
            amount: 0.5,
            enabled: true,
          } as any,
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid routing entry (non-string source)", () => {
        const patch = createDefaultPatch();
        patch.modMatrix.routings = [
          {
            id: crypto.randomUUID(),
            source: 123,
            destination: "filter_freq",
            amount: 0.5,
            enabled: true,
          } as any,
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid routing entry (non-string destination)", () => {
        const patch = createDefaultPatch();
        patch.modMatrix.routings = [
          {
            id: crypto.randomUUID(),
            source: "lfo1",
            destination: 123,
            amount: 0.5,
            enabled: true,
          } as any,
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid routing entry (non-numeric amount)", () => {
        const patch = createDefaultPatch();
        patch.modMatrix.routings = [
          {
            id: crypto.randomUUID(),
            source: "lfo1",
            destination: "filter_freq",
            amount: "0.5",
            enabled: true,
          } as any,
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid routing entry (non-boolean enabled)", () => {
        const patch = createDefaultPatch();
        patch.modMatrix.routings = [
          {
            id: crypto.randomUUID(),
            source: "lfo1",
            destination: "filter_freq",
            amount: 0.5,
            enabled: "true",
          } as any,
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with null routing entry", () => {
        const patch = createDefaultPatch();
        (patch.modMatrix.routings as any) = [null];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid LFO (null)", () => {
        const patch = createDefaultPatch();
        (patch.modMatrix as any).lfo1 = null;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid LFO (missing enabled)", () => {
        const patch = createDefaultPatch();
        const lfo = { ...patch.modMatrix.lfo1 };
        delete (lfo as any).enabled;
        patch.modMatrix.lfo1 = lfo;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid LFO (non-string waveform)", () => {
        const patch = createDefaultPatch();
        (patch.modMatrix.lfo1 as any).waveform = 123;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid LFO (non-numeric frequency)", () => {
        const patch = createDefaultPatch();
        (patch.modMatrix.lfo1 as any).frequency = "2";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid LFO (non-boolean sync)", () => {
        const patch = createDefaultPatch();
        (patch.modMatrix.lfo1 as any).sync = "false";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid mod envelope", () => {
        const patch = createDefaultPatch();
        patch.modMatrix.modEnv1.attack = -0.1;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with null mod envelope", () => {
        const patch = createDefaultPatch();
        (patch.modMatrix as any).modEnv1 = null;
        expect(validatePatch(patch)).toBe(false);
      });
    });

    describe("invalid effects configs", () => {
      it("should reject patch with non-array effects", () => {
        const patch = createDefaultPatch();
        (patch as any).effects = {};
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with null effect entry", () => {
        const patch = createDefaultPatch();
        (patch.effects as any) = [null];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid effect type (non-string)", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: 123,
            enabled: true,
            wet: 0.5,
            params: {},
          } as any,
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with invalid effect enabled (non-boolean)", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: "chorus",
            enabled: "true",
            wet: 0.5,
            params: {},
          } as any,
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with wet out of range (negative)", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: "chorus",
            enabled: true,
            wet: -0.5,
            params: {},
          },
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with wet out of range (too high)", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: "chorus",
            enabled: true,
            wet: 1.5,
            params: {},
          },
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-object params", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: "chorus",
            enabled: true,
            wet: 0.5,
            params: [] as any,
          },
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with null params", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: "chorus",
            enabled: true,
            wet: 0.5,
            params: null as any,
          },
        ];
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with missing effect fields", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: "chorus",
            wet: 0.5,
            params: {},
          } as any,
        ];
        expect(validatePatch(patch)).toBe(false);
      });
    });

    describe("invalid master settings", () => {
      it("should reject patch with negative masterVolume", () => {
        const patch = createDefaultPatch();
        patch.masterVolume = -0.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with masterVolume greater than 1", () => {
        const patch = createDefaultPatch();
        patch.masterVolume = 1.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-numeric masterVolume", () => {
        const patch = createDefaultPatch();
        (patch as any).masterVolume = "0.8";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with negative oscMix", () => {
        const patch = createDefaultPatch();
        patch.oscMix = -0.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with oscMix greater than 1", () => {
        const patch = createDefaultPatch();
        patch.oscMix = 1.5;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-numeric oscMix", () => {
        const patch = createDefaultPatch();
        (patch as any).oscMix = "0.5";
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with negative glide", () => {
        const patch = createDefaultPatch();
        patch.glide = -10;
        expect(validatePatch(patch)).toBe(false);
      });

      it("should reject patch with non-numeric glide", () => {
        const patch = createDefaultPatch();
        (patch as any).glide = "0";
        expect(validatePatch(patch)).toBe(false);
      });
    });
  });

  describe("sanitizePatch", () => {
    describe("clamping out-of-range values", () => {
      it("should clamp masterVolume to 0-1 range", () => {
        const patch = createDefaultPatch();
        patch.masterVolume = 1.5;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.masterVolume).toBe(1);

        patch.masterVolume = -0.5;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.masterVolume).toBe(0);
      });

      it("should clamp oscMix to 0-1 range", () => {
        const patch = createDefaultPatch();
        patch.oscMix = 1.5;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.oscMix).toBe(1);

        patch.oscMix = -0.5;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.oscMix).toBe(0);
      });

      it("should clamp glide to minimum 0", () => {
        const patch = createDefaultPatch();
        patch.glide = -10;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.glide).toBe(0);
      });

      it("should clamp oscillator volume to 0-1 range", () => {
        const patch = createDefaultPatch();
        patch.osc1.volume = 1.5;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.osc1.volume).toBe(1);

        patch.osc1.volume = -0.5;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.osc1.volume).toBe(0);
      });

      it("should clamp oscillator octave to -4 to 4 range", () => {
        const patch = createDefaultPatch();
        patch.osc1.octave = 10;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.osc1.octave).toBe(4);

        patch.osc1.octave = -10;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.osc1.octave).toBe(-4);
      });

      it("should clamp oscillator detune to -100 to 100 range", () => {
        const patch = createDefaultPatch();
        patch.osc1.detune = 200;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.osc1.detune).toBe(100);

        patch.osc1.detune = -200;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.osc1.detune).toBe(-100);
      });

      it("should clamp oscillator pan to -1 to 1 range", () => {
        const patch = createDefaultPatch();
        patch.osc1.pan = 2;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.osc1.pan).toBe(1);

        patch.osc1.pan = -2;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.osc1.pan).toBe(-1);
      });

      it("should clamp filter frequency to 20-20000 range", () => {
        const patch = createDefaultPatch();
        patch.filter.frequency = 50000;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.filter.frequency).toBe(20000);

        patch.filter.frequency = 10;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.filter.frequency).toBe(20);
      });

      it("should clamp filter resonance to 0.1-8 range (safe musical range)", () => {
        const patch = createDefaultPatch();
        patch.filter.resonance = 50;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.filter.resonance).toBe(8);

        patch.filter.resonance = -5;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.filter.resonance).toBe(0.1);
      });

      it("should clamp filter envelopeAmount to -1 to 1 range", () => {
        const patch = createDefaultPatch();
        patch.filter.envelopeAmount = 2;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.filter.envelopeAmount).toBe(1);

        patch.filter.envelopeAmount = -2;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.filter.envelopeAmount).toBe(-1);
      });

      it("should clamp filter keyTracking to 0-1 range", () => {
        const patch = createDefaultPatch();
        patch.filter.keyTracking = 2;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.filter.keyTracking).toBe(1);

        patch.filter.keyTracking = -0.5;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.filter.keyTracking).toBe(0);
      });

      it("should clamp envelope attack to 0.001-5 range", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.attack = 10;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.ampEnvelope.attack).toBe(5);

        patch.ampEnvelope.attack = 0;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.ampEnvelope.attack).toBe(0.001);
      });

      it("should clamp envelope decay to 0.001-5 range", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.decay = 10;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.ampEnvelope.decay).toBe(5);

        patch.ampEnvelope.decay = 0;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.ampEnvelope.decay).toBe(0.001);
      });

      it("should clamp envelope sustain to 0-1 range", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.sustain = 1.5;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.ampEnvelope.sustain).toBe(1);

        patch.ampEnvelope.sustain = -0.5;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.ampEnvelope.sustain).toBe(0);
      });

      it("should clamp envelope release to 0.001-10 range", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.release = 20;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.ampEnvelope.release).toBe(10);

        patch.ampEnvelope.release = 0;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.ampEnvelope.release).toBe(0.001);
      });

      it("should clamp filter envelope octaves to 0-8 range", () => {
        const patch = createDefaultPatch();
        patch.filterEnvelope.octaves = 10;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.filterEnvelope.octaves).toBe(8);

        patch.filterEnvelope.octaves = -1;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.filterEnvelope.octaves).toBe(0);
      });

      it("should clamp effect wet to 0-1 range", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: "chorus",
            enabled: true,
            wet: 1.5,
            params: {},
          },
        ];
        const sanitized = sanitizePatch(patch);
        expect(sanitized.effects[0].wet).toBe(1);

        patch.effects[0].wet = -0.5;
        const sanitized2 = sanitizePatch(patch);
        expect(sanitized2.effects[0].wet).toBe(0);
      });

      it("should clamp all oscillators", () => {
        const patch = createDefaultPatch();
        patch.osc2.volume = 1.5;
        patch.osc2.pan = 2;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.osc2.volume).toBe(1);
        expect(sanitized.osc2.pan).toBe(1);
      });

      it("should clamp filter envelope time values", () => {
        const patch = createDefaultPatch();
        patch.filterEnvelope.attack = 10;
        patch.filterEnvelope.decay = 10;
        patch.filterEnvelope.sustain = 1.5;
        patch.filterEnvelope.release = 20;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.filterEnvelope.attack).toBe(5);
        expect(sanitized.filterEnvelope.decay).toBe(5);
        expect(sanitized.filterEnvelope.sustain).toBe(1);
        expect(sanitized.filterEnvelope.release).toBe(10);
      });
    });

    describe("preserving valid values", () => {
      it("should not modify values that are already in range", () => {
        const patch = createDefaultPatch();
        const sanitized = sanitizePatch(patch);
        expect(sanitized.masterVolume).toBe(patch.masterVolume);
        expect(sanitized.oscMix).toBe(patch.oscMix);
        expect(sanitized.glide).toBe(patch.glide);
      });

      it("should preserve all non-numeric fields", () => {
        const patch = createDefaultPatch();
        patch.name = "Test Patch";
        patch.description = "Test description";
        patch.category = "lead";
        const sanitized = sanitizePatch(patch);
        expect(sanitized.name).toBe("Test Patch");
        expect(sanitized.description).toBe("Test description");
        expect(sanitized.category).toBe("lead");
        expect(sanitized.id).toBe(patch.id);
      });

      it("should preserve envelope curve settings", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.attackCurve = "exponential";
        patch.ampEnvelope.releaseCurve = "linear";
        const sanitized = sanitizePatch(patch);
        expect(sanitized.ampEnvelope.attackCurve).toBe("exponential");
        expect(sanitized.ampEnvelope.releaseCurve).toBe("linear");
      });

      it("should preserve oscillator waveforms and enabled state", () => {
        const patch = createDefaultPatch();
        patch.osc1.waveform = "triangle";
        patch.osc1.enabled = false;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.osc1.waveform).toBe("triangle");
        expect(sanitized.osc1.enabled).toBe(false);
      });

      it("should preserve filter type and enabled state", () => {
        const patch = createDefaultPatch();
        patch.filter.type = "highpass";
        patch.filter.enabled = false;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.filter.type).toBe("highpass");
        expect(sanitized.filter.enabled).toBe(false);
      });

      it("should preserve mod matrix structure", () => {
        const patch = createDefaultPatch();
        patch.modMatrix.routings = [
          {
            id: crypto.randomUUID(),
            source: "lfo1",
            destination: "filter_freq",
            amount: 0.5,
            enabled: true,
          },
        ];
        const sanitized = sanitizePatch(patch);
        expect(sanitized.modMatrix.routings).toEqual(patch.modMatrix.routings);
      });

      it("should preserve effect params object", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: "chorus",
            enabled: true,
            wet: 0.5,
            params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
          },
        ];
        const sanitized = sanitizePatch(patch);
        expect(sanitized.effects[0].params).toEqual(
          patch.effects[0].params
        );
      });

      it("should preserve timestamps", () => {
        const patch = createDefaultPatch();
        const sanitized = sanitizePatch(patch);
        expect(sanitized.createdAt).toBe(patch.createdAt);
        expect(sanitized.updatedAt).toBe(patch.updatedAt);
      });
    });

    describe("complex sanitization scenarios", () => {
      it("should sanitize multiple out-of-range values in one pass", () => {
        const patch = createDefaultPatch();
        patch.masterVolume = 1.5;
        patch.osc1.volume = 1.5;
        patch.filter.frequency = 50000;
        patch.ampEnvelope.attack = 10;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.masterVolume).toBe(1);
        expect(sanitized.osc1.volume).toBe(1);
        expect(sanitized.filter.frequency).toBe(20000);
        expect(sanitized.ampEnvelope.attack).toBe(5);
      });

      it("should handle patches with multiple effects", () => {
        const patch = createDefaultPatch();
        patch.effects = [
          {
            type: "chorus",
            enabled: true,
            wet: 1.5,
            params: {},
          },
          {
            type: "reverb",
            enabled: true,
            wet: -0.5,
            params: {},
          },
        ];
        const sanitized = sanitizePatch(patch);
        expect(sanitized.effects[0].wet).toBe(1);
        expect(sanitized.effects[1].wet).toBe(0);
      });

      it("should not mutate the original patch", () => {
        const patch = createDefaultPatch();
        patch.masterVolume = 1.5;
        const originalVolume = patch.masterVolume;
        sanitizePatch(patch);
        expect(patch.masterVolume).toBe(originalVolume);
      });

      it("should return a new patch object", () => {
        const patch = createDefaultPatch();
        const sanitized = sanitizePatch(patch);
        expect(sanitized).not.toBe(patch);
      });
    });

    describe("edge cases", () => {
      it("should handle empty effects array", () => {
        const patch = createDefaultPatch();
        patch.effects = [];
        const sanitized = sanitizePatch(patch);
        expect(sanitized.effects).toEqual([]);
      });

      it("should handle zero values correctly", () => {
        const patch = createDefaultPatch();
        patch.masterVolume = 0;
        patch.oscMix = 0;
        patch.glide = 0;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.masterVolume).toBe(0);
        expect(sanitized.oscMix).toBe(0);
        expect(sanitized.glide).toBe(0);
      });

      it("should handle boundary values correctly", () => {
        const patch = createDefaultPatch();
        patch.masterVolume = 1;
        patch.oscMix = 1;
        patch.osc1.pan = 1;
        patch.filter.keyTracking = 1;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.masterVolume).toBe(1);
        expect(sanitized.oscMix).toBe(1);
        expect(sanitized.osc1.pan).toBe(1);
        expect(sanitized.filter.keyTracking).toBe(1);
      });

      it("should handle very large envelope times", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.attack = 999;
        patch.ampEnvelope.release = 999;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.ampEnvelope.attack).toBe(5);
        expect(sanitized.ampEnvelope.release).toBe(10);
      });

      it("should handle very small envelope times", () => {
        const patch = createDefaultPatch();
        patch.ampEnvelope.attack = 0.0001;
        patch.ampEnvelope.decay = 0.0001;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.ampEnvelope.attack).toBe(0.001);
        expect(sanitized.ampEnvelope.decay).toBe(0.001);
      });

      it("should handle Infinity values by clamping to maximum", () => {
        const patch = createDefaultPatch();
        patch.masterVolume = Infinity;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.masterVolume).toBe(1);
      });

      it("should handle negative Infinity values by clamping to minimum", () => {
        const patch = createDefaultPatch();
        patch.masterVolume = -Infinity;
        const sanitized = sanitizePatch(patch);
        expect(sanitized.masterVolume).toBe(0);
      });
    });
  });
});
