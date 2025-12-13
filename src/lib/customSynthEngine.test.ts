/**
 * Unit tests for CustomSynthEngine
 * Tests voice management, filter behavior, and parameter updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CustomSynthEngine } from "./customSynthEngine";
import { createDefaultPatch } from "./defaultPatch";
import type { CustomPatch, OscillatorConfig } from "../types/synth";

// Mock Tone.js since it requires AudioContext
vi.mock("tone", () => {
  // Helper to create a mock signal/param with value tracking
  const createMockParam = (initialValue: number = 0) => {
    let value = initialValue;
    return {
      get value() {
        return value;
      },
      set value(v: number) {
        value = v;
      },
      rampTo: vi.fn(),
      setValueAtTime: vi.fn(),
      minValue: 0,
      maxValue: 1,
    };
  };

  // Mock oscillator
  class MockOmniOscillator {
    type: string;
    frequency = createMockParam(440);
    detune = createMockParam(0);
    volume = createMockParam(0);

    constructor(options: any = {}) {
      this.type = options.type || "sine";
      this.detune.value = options.detune || 0;
      this.volume.value = options.volume || 0;
    }

    start = vi.fn();
    stop = vi.fn();
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  // Mock CrossFade mixer
  class MockCrossFade {
    fade = createMockParam(0.5);
    a = {};
    b = {};

    constructor(fade: number = 0.5) {
      this.fade.value = fade;
    }

    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  // Mock Filter
  class MockFilter {
    type: string = "lowpass";
    frequency = createMockParam(1000);
    Q = createMockParam(1);
    rolloff: number = -24;

    constructor(options: any = {}) {
      this.type = options.type || "lowpass";
      this.frequency.value = options.frequency || 1000;
      this.Q.value = options.Q || 1;
      this.rolloff = options.rolloff || -24;
    }

    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  // Mock Envelopes
  class MockFrequencyEnvelope {
    attack: number = 0.01;
    decay: number = 0.1;
    sustain: number = 0.5;
    release: number = 0.5;
    baseFrequency: number = 1000;
    octaves: number = 2;
    attackCurve: string = "linear";
    releaseCurve: string = "exponential";

    constructor(options: any = {}) {
      Object.assign(this, options);
    }

    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
    triggerAttack = vi.fn();
    triggerRelease = vi.fn();
  }

  class MockAmplitudeEnvelope {
    attack: number = 0.01;
    decay: number = 0.1;
    sustain: number = 0.5;
    release: number = 0.5;
    attackCurve: string = "linear";
    releaseCurve: string = "exponential";

    constructor(options: any = {}) {
      Object.assign(this, options);
    }

    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
    triggerAttack = vi.fn();
    triggerRelease = vi.fn();
  }

  class MockEnvelope {
    attack: number = 0.01;
    decay: number = 0.1;
    sustain: number = 0.5;
    release: number = 0.5;
    attackCurve: string = "linear";
    releaseCurve: string = "exponential";

    constructor(options: any = {}) {
      Object.assign(this, options);
    }

    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
    triggerAttack = vi.fn();
    triggerRelease = vi.fn();
  }

  // Mock Gain
  class MockGain {
    gain = createMockParam(1);

    constructor(gain: number = 1) {
      this.gain.value = gain;
    }

    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
    toDestination = vi.fn().mockReturnThis();
  }

  // Mock Signal
  class MockSignal {
    value: number;

    constructor(value: number = 0, units?: string) {
      this.value = value;
    }

    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  // Mock LFO
  class MockLFO {
    type: string;
    frequency = createMockParam(2);
    min: number = 0;
    max: number = 1;
    phase: number = 0;

    constructor(options: any = {}) {
      this.type = options.type || "sine";
      this.frequency.value = options.frequency || 2;
      this.min = options.min ?? 0;
      this.max = options.max ?? 1;
      this.phase = options.phase || 0;
    }

    start = vi.fn();
    stop = vi.fn();
    sync = vi.fn();
    unsync = vi.fn();
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  // Mock effects
  class MockChorus {
    wet = createMockParam(0.5);
    frequency = createMockParam(1.5);
    delayTime: number = 3.5;
    depth: number = 0.7;

    constructor(options: any = {}) {
      this.wet.value = options.wet ?? 0.5;
      this.frequency.value = options.frequency ?? 1.5;
      this.delayTime = options.delayTime ?? 3.5;
      this.depth = options.depth ?? 0.7;
    }

    start = vi.fn().mockReturnThis();
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  class MockReverb {
    wet = createMockParam(0.3);
    decay: number = 2.5;
    preDelay: number = 0.01;

    constructor(options: any = {}) {
      this.wet.value = options.wet ?? 0.3;
      this.decay = options.decay ?? 2.5;
      this.preDelay = options.preDelay ?? 0.01;
    }

    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  class MockFeedbackDelay {
    wet = createMockParam(0.3);
    delayTime = createMockParam(0.25);
    feedback = createMockParam(0.3);

    constructor(options: any = {}) {
      this.wet.value = options.wet ?? 0.3;
      this.delayTime.value = options.delayTime ?? 0.25;
      this.feedback.value = options.feedback ?? 0.3;
    }

    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  // Mock processing nodes
  class MockMultiply {
    constructor(public value: number = 1) {}
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  class MockScale {
    constructor(public min: number = 0, public max: number = 1) {}
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  class MockAdd {
    constructor(public value: number = 0) {}
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  // Utility functions
  const now = vi.fn(() => 0);
  const gainToDb = vi.fn((gain: number) => Math.log10(gain) * 20);

  class MockFrequency {
    constructor(public value: number, public units?: string) {}
    toFrequency() {
      return this.value;
    }
  }

  const Frequency = vi.fn((value: number, units?: string) => {
    // Convert MIDI note to frequency
    if (units === "midi") {
      return new MockFrequency(440 * Math.pow(2, (value - 69) / 12));
    }
    return new MockFrequency(value, units);
  });

  return {
    OmniOscillator: MockOmniOscillator,
    CrossFade: MockCrossFade,
    Filter: MockFilter,
    FrequencyEnvelope: MockFrequencyEnvelope,
    AmplitudeEnvelope: MockAmplitudeEnvelope,
    Envelope: MockEnvelope,
    Gain: MockGain,
    Signal: MockSignal,
    LFO: MockLFO,
    Chorus: MockChorus,
    Reverb: MockReverb,
    FeedbackDelay: MockFeedbackDelay,
    Multiply: MockMultiply,
    Scale: MockScale,
    Add: MockAdd,
    now,
    gainToDb,
    Frequency,
  };
});

describe("CustomSynthEngine", () => {
  let patch: CustomPatch;
  let engine: CustomSynthEngine;

  beforeEach(() => {
    patch = createDefaultPatch("Test Patch");
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (engine) {
      engine.dispose();
    }
  });

  describe("VoicePool - Voice Management", () => {
    it("should create 8 voices in the voice pool", () => {
      engine = new CustomSynthEngine(patch);

      // Access the private voicePool through reflection
      const voicePool = (engine as any).voicePool;
      expect(voicePool.voices).toBeDefined();
      expect(voicePool.voices.length).toBe(8);
    });

    it("should assign a free voice on triggerAttack", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Trigger a note
      engine.triggerAttack(60, 1);

      // Check that one voice is now active
      const activeVoices = voicePool.voices.filter((v: any) => v.isActive);
      expect(activeVoices.length).toBe(1);
      expect(activeVoices[0].note).toBe(60);
    });

    it("should release the correct voice on triggerRelease", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Trigger and release a note
      engine.triggerAttack(60, 1);
      engine.triggerRelease(60);

      // Voice should be marked as inactive
      const voice = voicePool.voices.find((v: any) => v.note === 60);
      expect(voice?.isActive).toBe(false);
    });

    it("should use voice stealing (oldest voice) when all voices are busy", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Trigger 8 notes to fill all voices
      for (let i = 60; i < 68; i++) {
        engine.triggerAttack(i, 1);
        // Manually set different triggeredAt times
        const voice = voicePool.voices.find((v: any) => v.note === i);
        if (voice) {
          voice.triggeredAt = i - 60; // 0, 1, 2, 3, 4, 5, 6, 7
        }
      }

      // All 8 voices should be active
      const activeVoices = voicePool.voices.filter((v: any) => v.isActive);
      expect(activeVoices.length).toBe(8);

      // Trigger a 9th note - should steal the oldest voice (note 60, triggeredAt=0)
      engine.triggerAttack(68, 1);

      // Still 8 voices active
      const activeVoicesAfter = voicePool.voices.filter((v: any) => v.isActive);
      expect(activeVoicesAfter.length).toBe(8);

      // Note 60 should no longer be in active notes
      const note60Voice = voicePool.voices.find((v: any) => v.note === 60);
      expect(note60Voice).toBeUndefined();

      // Note 68 should be the newest note
      const note68Voice = voicePool.voices.find((v: any) => v.note === 68);
      expect(note68Voice).toBeDefined();
      expect(note68Voice?.isActive).toBe(true);
    });

    it("should release all voices on releaseAll", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Trigger multiple notes
      engine.triggerAttack(60, 1);
      engine.triggerAttack(64, 1);
      engine.triggerAttack(67, 1);

      // Verify voices are active
      let activeVoices = voicePool.voices.filter((v: any) => v.isActive);
      expect(activeVoices.length).toBe(3);

      // Release all
      engine.releaseAll();

      // All voices should be inactive
      activeVoices = voicePool.voices.filter((v: any) => v.isActive);
      expect(activeVoices.length).toBe(0);
    });

    it("should retrigger the same note if already playing", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Use fake timers to control time
      vi.useFakeTimers();

      // Trigger note 60 at time 0
      engine.triggerAttack(60, 1);
      const firstVoice = voicePool.voices.find((v: any) => v.note === 60);
      const firstTriggeredAt = firstVoice?.triggeredAt;

      // Advance time
      vi.advanceTimersByTime(100);

      // Trigger note 60 again
      engine.triggerAttack(60, 1);

      // Should still have only one active note 60
      const activeNote60s = voicePool.voices.filter((v: any) => v.note === 60 && v.isActive);
      expect(activeNote60s.length).toBe(1);

      // The note should have been retriggered on the same voice
      const retriggeredVoice = voicePool.voices.find((v: any) => v.note === 60);
      expect(retriggeredVoice).toBeDefined();

      vi.useRealTimers();
    });
  });

  describe("Filter - Parameter Updates", () => {
    it("should clamp resonance to safe range (0.001-15)", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Test clamping low value
      voicePool.updateFilter(1000, -10); // Negative resonance
      const voice1 = voicePool.voices[0];
      expect(voice1.filter.Q.value).toBeGreaterThanOrEqual(0.001);

      // Test clamping high value
      voicePool.updateFilter(1000, 100); // Very high resonance
      const voice2 = voicePool.voices[0];
      expect(voice2.filter.Q.value).toBeLessThanOrEqual(15);

      // Test valid value
      voicePool.updateFilter(1000, 5);
      const voice3 = voicePool.voices[0];
      expect(voice3.filter.Q.value).toBe(5);
    });

    it("should clamp frequency to valid range (20-20000)", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Test clamping low frequency
      voicePool.updateFilter(10, 1); // Below 20Hz
      // Frequency should attempt to rampTo or set to at least 20
      // We need to check that the rampTo or setValueAtTime was called with 20
      const voice1 = voicePool.voices[0];
      expect(voice1.filter.frequency.rampTo).toHaveBeenCalledWith(20, 0.05);

      // Test clamping high frequency
      voicePool.updateFilter(30000, 1); // Above 20kHz
      const voice2 = voicePool.voices[0];
      expect(voice2.filter.frequency.rampTo).toHaveBeenCalledWith(20000, 0.05);

      // Test valid frequency
      voicePool.updateFilter(1000, 1);
      const voice3 = voicePool.voices[0];
      expect(voice3.filter.frequency.rampTo).toHaveBeenCalledWith(1000, 0.05);
    });

    it("should handle different filter types", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Test lowpass
      voicePool.updateFilter(1000, 1, "lowpass");
      expect(voicePool.voices[0].filter.type).toBe("lowpass");

      // Test highpass
      voicePool.updateFilter(1000, 1, "highpass");
      expect(voicePool.voices[0].filter.type).toBe("highpass");

      // Test bandpass
      voicePool.updateFilter(1000, 1, "bandpass");
      expect(voicePool.voices[0].filter.type).toBe("bandpass");
    });

    it("should not throw errors when filter type change fails", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Make filter type setter throw an error
      const voice = voicePool.voices[0];
      Object.defineProperty(voice.filter, "type", {
        set: () => {
          throw new Error("Type change not allowed");
        },
        get: () => "lowpass",
      });

      // Should not throw
      expect(() => {
        voicePool.updateFilter(1000, 1, "bandpass");
      }).not.toThrow();
    });

    it("should handle Q parameter updates gracefully when not supported", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Simulate a filter type that doesn't support Q
      const voice = voicePool.voices[0];
      voice.filter.Q = null; // Some filter types might not have Q

      // Should not throw
      expect(() => {
        voicePool.updateFilter(1000, 10);
      }).not.toThrow();
    });
  });

  describe("Parameter Updates", () => {
    it("should update mixer fade value with setOscMix", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      // Initial patch has both oscillators enabled (osc1=true by default, osc2=false by default)
      // So we need both enabled for the mix to use the actual value
      patch.osc2.enabled = true;
      engine = new CustomSynthEngine(patch);
      const voicePool2 = (engine as any).voicePool;

      // Set to 0.7 (more osc2)
      voicePool2.setOscMix(0.7);

      // Check all voices have updated mixer
      voicePool2.voices.forEach((voice: any) => {
        expect(voice.mixer.fade.value).toBe(0.7);
      });
    });

    it("should update oscillator parameters", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      const newOsc1Config: OscillatorConfig = {
        enabled: true,
        waveform: "square",
        octave: 1,
        detune: 10,
        volume: 0.9,
        pan: 0,
      };

      voicePool.updateOscillator(1, newOsc1Config);

      // Check first voice
      const voice = voicePool.voices[0];
      expect(voice.osc1.type).toBe("square");
      expect(voice.osc1.detune.value).toBe(10);
    });

    it("should update amp envelope parameters", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      const newEnvelope = {
        attack: 0.5,
        decay: 0.4,
        sustain: 0.6,
        release: 1.0,
        attackCurve: "exponential" as const,
        releaseCurve: "exponential" as const,
      };

      voicePool.updateAmpEnvelope(newEnvelope);

      // Check first voice
      const voice = voicePool.voices[0];
      expect(voice.ampEnv.attack).toBe(0.5);
      expect(voice.ampEnv.decay).toBe(0.4);
      expect(voice.ampEnv.sustain).toBe(0.6);
      expect(voice.ampEnv.release).toBe(1.0);
    });

    it("should update filter envelope parameters", () => {
      engine = new CustomSynthEngine(patch);
      const voicePool = (engine as any).voicePool;

      const newFilterEnv = {
        attack: 0.2,
        decay: 0.3,
        sustain: 0.4,
        release: 0.5,
        attackCurve: "linear" as const,
        releaseCurve: "exponential" as const,
        octaves: 3,
      };

      voicePool.updateFilterEnvelope(newFilterEnv, 2000, 0.8);

      // Check first voice
      const voice = voicePool.voices[0];
      expect(voice.filterEnv.attack).toBe(0.2);
      expect(voice.filterEnv.decay).toBe(0.3);
      expect(voice.filterEnv.sustain).toBe(0.4);
      expect(voice.filterEnv.release).toBe(0.5);
      expect(voice.filterEnv.baseFrequency).toBe(2000);
      expect(voice.filterEnv.octaves).toBe(3 * 0.8); // octaves * envelopeAmount
    });

    it("should not throw errors when parameter changes fail", () => {
      engine = new CustomSynthEngine(patch);

      // Attempt to update with invalid parameter
      expect(() => {
        engine.updateParameter("invalid.param", 0.5);
      }).not.toThrow();

      // Valid parameter update should work
      expect(() => {
        engine.updateParameter("oscMix", 0.6);
      }).not.toThrow();

      expect(() => {
        engine.updateParameter("masterVolume", 0.7);
      }).not.toThrow();
    });
  });

  describe("Oscillator Mix Logic", () => {
    it("should set mixer to 0 when only osc1 is enabled", () => {
      patch.osc1.enabled = true;
      patch.osc2.enabled = false;
      engine = new CustomSynthEngine(patch);

      const voicePool = (engine as any).voicePool;
      const voice = voicePool.voices[0];

      // When only osc1 is enabled, mix should be 0 (all osc1)
      expect(voice.mixer.fade.value).toBe(0);
    });

    it("should set mixer to 1 when only osc2 is enabled", () => {
      patch.osc1.enabled = false;
      patch.osc2.enabled = true;
      engine = new CustomSynthEngine(patch);

      const voicePool = (engine as any).voicePool;
      const voice = voicePool.voices[0];

      // When only osc2 is enabled, mix should be 1 (all osc2)
      expect(voice.mixer.fade.value).toBe(1);
    });

    it("should use oscMix value when both oscillators are enabled", () => {
      patch.osc1.enabled = true;
      patch.osc2.enabled = true;
      patch.oscMix = 0.3;
      engine = new CustomSynthEngine(patch);

      const voicePool = (engine as any).voicePool;
      const voice = voicePool.voices[0];

      // When both enabled, use the oscMix value
      expect(voice.mixer.fade.value).toBe(0.3);
    });

    it("should recalculate mix when oscillator enabled state changes", () => {
      patch.osc1.enabled = true;
      patch.osc2.enabled = true;
      patch.oscMix = 0.5;
      engine = new CustomSynthEngine(patch);

      const voicePool = (engine as any).voicePool;

      // Disable osc2
      const newConfig: OscillatorConfig = {
        ...patch.osc2,
        enabled: false,
      };
      voicePool.updateOscillator(2, newConfig);

      const voice = voicePool.voices[0];
      // Mix should now be 0 (only osc1)
      expect(voice.mixer.fade.value).toBe(0);
    });
  });

  describe("Engine Integration", () => {
    it("should trigger modulation envelopes on note attack", () => {
      engine = new CustomSynthEngine(patch);
      const modManager = (engine as any).modManager;

      const triggerAttackSpy = vi.spyOn(modManager, "triggerAttack");

      engine.triggerAttack(60, 1);

      expect(triggerAttackSpy).toHaveBeenCalled();
    });

    it("should release modulation envelopes on note release", () => {
      engine = new CustomSynthEngine(patch);
      const modManager = (engine as any).modManager;

      const triggerReleaseSpy = vi.spyOn(modManager, "triggerRelease");

      engine.triggerAttack(60, 1);
      engine.triggerRelease(60);

      expect(triggerReleaseSpy).toHaveBeenCalled();
    });

    it("should update master volume", () => {
      engine = new CustomSynthEngine(patch);
      const masterGain = (engine as any).masterGain;

      engine.updateParameter("masterVolume", 0.5);

      expect(masterGain.gain.rampTo).toHaveBeenCalledWith(0.5, 0.05);
    });

    it("should update LFO parameters", () => {
      engine = new CustomSynthEngine(patch);
      const modManager = (engine as any).modManager;

      engine.updateParameter("lfo1.frequency", 5);

      expect(modManager.lfo1.frequency.value).toBe(5);
    });

    it("should return current patch", () => {
      engine = new CustomSynthEngine(patch);

      const currentPatch = engine.getPatch();

      expect(currentPatch).toBe(patch);
      expect(currentPatch.name).toBe("Test Patch");
    });

    it("should dispose all resources properly", () => {
      engine = new CustomSynthEngine(patch);

      const voicePool = (engine as any).voicePool;
      const modManager = (engine as any).modManager;
      const masterGain = (engine as any).masterGain;

      const voicePoolDisposeSpy = vi.spyOn(voicePool, "dispose");
      const modManagerDisposeSpy = vi.spyOn(modManager, "dispose");
      const masterGainDisposeSpy = vi.spyOn(masterGain, "dispose");

      engine.dispose();

      expect(voicePoolDisposeSpy).toHaveBeenCalled();
      expect(modManagerDisposeSpy).toHaveBeenCalled();
      expect(masterGainDisposeSpy).toHaveBeenCalled();
    });
  });

  describe("Live Patch Updates", () => {
    it("should update patch live when only parameters change", () => {
      engine = new CustomSynthEngine(patch);

      const newPatch = createDefaultPatch("Updated Patch");
      newPatch.osc1.detune = 20;
      newPatch.filter.frequency = 3000;
      newPatch.masterVolume = 0.6;

      const result = engine.updatePatchLive(newPatch);

      expect(result).toBe(true); // Should succeed
    });

    it("should require rebuild when effects chain changes", () => {
      engine = new CustomSynthEngine(patch);

      const newPatch = createDefaultPatch("Updated Patch");
      newPatch.effects = [
        {
          type: "reverb",
          enabled: true,
          wet: 0.3,
          params: { decay: 2.5, preDelay: 0.01 },
        },
      ];

      const result = engine.updatePatchLive(newPatch);

      expect(result).toBe(false); // Should fail, needs rebuild
    });

    it("should require rebuild when filter rolloff changes", () => {
      engine = new CustomSynthEngine(patch);

      const newPatch = createDefaultPatch("Updated Patch");
      newPatch.filter.rolloff = -48; // Change from -24 to -48

      const result = engine.updatePatchLive(newPatch);

      expect(result).toBe(false); // Should fail, needs rebuild
    });

    it("should rebuild patch when updatePatch is called", () => {
      engine = new CustomSynthEngine(patch);

      const voicePool = (engine as any).voicePool;
      const initialVoices = voicePool.voices;

      const newPatch = createDefaultPatch("Rebuilt Patch");
      newPatch.effects = [
        {
          type: "chorus",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
        },
      ];

      engine.updatePatch(newPatch);

      const newVoicePool = (engine as any).voicePool;
      // Should have new voice pool after rebuild
      expect(newVoicePool).not.toBe(voicePool);
      expect(newVoicePool.voices).not.toBe(initialVoices);
    });
  });

  describe("Edge Cases", () => {
    it("should handle velocity modulation", () => {
      engine = new CustomSynthEngine(patch);
      const modManager = (engine as any).modManager;

      engine.triggerAttack(60, 0.5);

      expect(modManager.velocitySignal.value).toBe(0.5);

      engine.triggerAttack(64, 1.0);

      expect(modManager.velocitySignal.value).toBe(1.0);
    });

    it("should handle keytrack modulation", () => {
      engine = new CustomSynthEngine(patch);
      const modManager = (engine as any).modManager;

      engine.triggerAttack(60, 1); // Middle C

      // Keytrack is normalized to 0-1 range (note / 127)
      expect(modManager.keytrackSignal.value).toBeCloseTo(60 / 127, 5);
    });

    it("should handle releasing a note that is not playing", () => {
      engine = new CustomSynthEngine(patch);

      // Release a note that was never triggered
      expect(() => {
        engine.triggerRelease(60);
      }).not.toThrow();
    });

    it("should handle creating engine with effects", () => {
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

      expect(() => {
        engine = new CustomSynthEngine(patch);
      }).not.toThrow();

      const effectsChain = (engine as any).effectsChain;
      expect(effectsChain.length).toBe(2);
    });

    it("should handle disabled effects in chain", () => {
      patch.effects = [
        {
          type: "chorus",
          enabled: false, // Disabled
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

      expect(() => {
        engine = new CustomSynthEngine(patch);
      }).not.toThrow();

      const effectsChain = (engine as any).effectsChain;
      // Should only create enabled effects
      expect(effectsChain.length).toBe(1);
    });
  });
});
