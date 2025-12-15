/**
 * Integration Tests
 * Tests complex multi-step workflows:
 * 1. Synth FX chain signal routing and parameter updates
 * 2. Chord building pipeline (keyboard→parseKeys→buildChord→voicing→MIDI)
 * 3. Event bus coordination between hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CustomSynthEngine } from "./customSynthEngine";
import { createDefaultPatch } from "./defaultPatch";
import { parseKeys, isValidChord } from "./parseKeys";
import { buildChord } from "./chordBuilder";
import {
  applyVoicingStyle,
  applyTrueDrop2,
  applySpread,
} from "./voicingTransforms";
import { createEventBus } from "./eventBus";
import type {
  ParsedKeys,
  Chord,
  MIDINote,
  VoicingStyle,
  AppEventMap,
} from "../types";
import type { CustomPatch } from "../types/synth";

// Mock Tone.js with effects support
vi.mock("tone", () => {
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

  class MockSignal {
    value: number;

    constructor(value: number = 0, _units?: string) {
      this.value = value;
    }

    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

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

  // Mock effects with connection tracking
  class MockChorus {
    wet = createMockParam(0.5);
    frequency = createMockParam(1.5);
    delayTime: number = 3.5;
    depth: number = 0.7;
    connections: any[] = [];

    constructor(options: any = {}) {
      this.wet.value = options.wet ?? 0.5;
      this.frequency.value = options.frequency ?? 1.5;
      this.delayTime = options.delayTime ?? 3.5;
      this.depth = options.depth ?? 0.7;
    }

    start = vi.fn().mockReturnThis();
    connect = vi.fn((destination: any) => {
      this.connections.push(destination);
      return this;
    });
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  class MockReverb {
    wet = createMockParam(0.3);
    decay: number = 2.5;
    preDelay: number = 0.01;
    connections: any[] = [];

    constructor(options: any = {}) {
      this.wet.value = options.wet ?? 0.3;
      this.decay = options.decay ?? 2.5;
      this.preDelay = options.preDelay ?? 0.01;
    }

    connect = vi.fn((destination: any) => {
      this.connections.push(destination);
      return this;
    });
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  class MockFeedbackDelay {
    wet = createMockParam(0.3);
    delayTime = createMockParam(0.25);
    feedback = createMockParam(0.3);
    connections: any[] = [];

    constructor(options: any = {}) {
      this.wet.value = options.wet ?? 0.3;
      this.delayTime.value = options.delayTime ?? 0.25;
      this.feedback.value = options.feedback ?? 0.3;
    }

    connect = vi.fn((destination: any) => {
      this.connections.push(destination);
      return this;
    });
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  class MockMultiply {
    constructor(public value: number = 1) {}
    connect = vi.fn().mockReturnThis();
    disconnect = vi.fn();
    dispose = vi.fn();
  }

  class MockScale {
    constructor(
      public min: number = 0,
      public max: number = 1,
    ) {}
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

  const now = vi.fn(() => 0);
  const gainToDb = vi.fn((gain: number) => Math.log10(gain) * 20);

  class MockFrequency {
    constructor(
      public value: number,
      public units?: string,
    ) {}
    toFrequency() {
      return this.value;
    }
  }

  const Frequency = vi.fn((value: number, units?: string) => {
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

describe("Integration Tests", () => {
  describe("Synth FX Chain - Signal Routing and Parameter Updates", () => {
    let patch: CustomPatch;
    let engine: CustomSynthEngine;

    beforeEach(() => {
      patch = createDefaultPatch("FX Test Patch");
      vi.clearAllMocks();
    });

    afterEach(() => {
      if (engine) {
        engine.dispose();
      }
    });

    it("should create FX chain in correct order: chorus → reverb → delay", () => {
      // Configure patch with FX chain
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
        {
          type: "delay",
          enabled: true,
          wet: 0.4,
          params: { delayTime: 0.25, feedback: 0.3 },
        },
      ];

      engine = new CustomSynthEngine(patch);
      const effectsChain = (engine as any).effectsChain;

      // Verify all effects were created
      expect(effectsChain).toBeDefined();
      expect(effectsChain.length).toBe(3);

      // Verify correct effect types
      expect(effectsChain[0].constructor.name).toBe("MockChorus");
      expect(effectsChain[1].constructor.name).toBe("MockReverb");
      expect(effectsChain[2].constructor.name).toBe("MockFeedbackDelay");

      // Verify signal chain connections (each effect connects to the next)
      expect(effectsChain[0].connect).toHaveBeenCalled();
      expect(effectsChain[1].connect).toHaveBeenCalled();
      expect(effectsChain[2].connect).toHaveBeenCalled();
    });

    it("should verify FX parameters are set correctly on creation", () => {
      patch.effects = [
        {
          type: "chorus",
          enabled: true,
          wet: 0.8,
          params: { frequency: 2.5, delayTime: 4.0, depth: 0.9 },
        },
      ];

      engine = new CustomSynthEngine(patch);
      const effectsChain = (engine as any).effectsChain;
      const chorus = effectsChain[0];

      // Verify parameters were set during construction
      expect(chorus.wet.value).toBe(0.8);
      expect(chorus.frequency.value).toBe(2.5);
      expect(chorus.delayTime).toBe(4.0);
      expect(chorus.depth).toBe(0.9);

      // Changing FX structure requires rebuild (not supported by updatePatchLive)
      const newPatch = createDefaultPatch("Updated FX");
      newPatch.effects = [
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

      // Adding effects requires rebuild
      const canUpdate = engine.updatePatchLive(newPatch);
      expect(canUpdate).toBe(false);
    });

    it("should require rebuild when FX chain structure changes", () => {
      patch.effects = [
        {
          type: "chorus",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
        },
      ];

      engine = new CustomSynthEngine(patch);

      // Add new effect to chain
      const newPatch = createDefaultPatch("New FX Chain");
      newPatch.effects = [
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

      // Should require rebuild
      const canUpdate = engine.updatePatchLive(newPatch);
      expect(canUpdate).toBe(false);
    });

    it("should route audio through entire FX chain on note trigger", () => {
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

      engine = new CustomSynthEngine(patch);
      const effectsChain = (engine as any).effectsChain;
      const chorus = effectsChain[0];
      const reverb = effectsChain[1];

      // Clear connection mocks
      vi.clearAllMocks();

      // Trigger a note
      engine.triggerAttack(60, 1);

      // Voice should be created and connected through FX chain
      const voicePool = (engine as any).voicePool;
      const activeVoices = voicePool.voices.filter((v: any) => v.isActive);
      expect(activeVoices.length).toBe(1);

      // Effects should maintain their connections
      expect(chorus.connections.length).toBeGreaterThan(0);
      expect(reverb.connections.length).toBeGreaterThan(0);
    });

    it("should handle disabling effects in the chain", () => {
      patch.effects = [
        {
          type: "chorus",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
        },
        {
          type: "reverb",
          enabled: false, // Disabled
          wet: 0.3,
          params: { decay: 2.5, preDelay: 0.01 },
        },
        {
          type: "delay",
          enabled: true,
          wet: 0.4,
          params: { delayTime: 0.25, feedback: 0.3 },
        },
      ];

      engine = new CustomSynthEngine(patch);
      const effectsChain = (engine as any).effectsChain;

      // Only enabled effects should be in chain
      expect(effectsChain.length).toBe(2);
      expect(effectsChain[0].constructor.name).toBe("MockChorus");
      expect(effectsChain[1].constructor.name).toBe("MockFeedbackDelay");
    });
  });

  describe("Chord Building Pipeline - End-to-End Flow", () => {
    it("should complete full flow: keyboard → parseKeys → buildChord → voicing → MIDI", () => {
      // Step 1: Simulate keyboard input (Cmaj7 chord)
      const pressedKeys = new Set(["q", "j", "i"]); // Q=C root, J=major, I=maj7

      // Step 2: Parse keys
      const parsed: ParsedKeys = parseKeys(pressedKeys);

      expect(parsed.root).toBe("C");
      expect(parsed.modifiers).toContain("major");
      expect(parsed.modifiers).toContain("maj7");
      expect(isValidChord(parsed)).toBe(true);

      // Step 3: Build chord
      const chord: Chord | null = buildChord(parsed.root, parsed.modifiers, {
        octave: 4,
      });

      expect(chord).not.toBeNull();
      expect(chord!.root).toBe("C");
      expect(chord!.quality).toBe("major");
      expect(chord!.notes).toContain(60); // C4
      expect(chord!.notes).toContain(64); // E4
      expect(chord!.notes).toContain(67); // G4
      expect(chord!.notes).toContain(71); // B4 (maj7)

      // Step 4: Apply voicing transform (drop2)
      const voicedNotes: MIDINote[] = applyTrueDrop2(chord!.notes);

      expect(voicedNotes.length).toBe(4);
      expect(voicedNotes).not.toEqual(chord!.notes); // Should be different from close voicing

      // Step 5: Verify MIDI notes are valid (0-127 range)
      voicedNotes.forEach((note) => {
        expect(note).toBeGreaterThanOrEqual(0);
        expect(note).toBeLessThanOrEqual(127);
      });
    });

    it("should handle modifier combinations (Dm7b5 - half-diminished)", () => {
      // D half-diminished (Dm7b5) - common ii chord in minor
      const pressedKeys = new Set(["e", "u", "n"]); // E=D root, U=minor, N=half-dim

      const parsed = parseKeys(pressedKeys);
      expect(parsed.root).toBe("D");
      expect(parsed.modifiers).toContain("minor");
      expect(parsed.modifiers).toContain("half-dim");

      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord).not.toBeNull();
      expect(chord!.notes).toContain(62); // D4
      expect(chord!.notes).toContain(65); // F4 (minor 3rd)
      expect(chord!.notes).toContain(68); // Ab4 (diminished 5th)
      expect(chord!.notes).toContain(72); // C5 (minor 7th)
    });

    it("should handle altered dominants (G7#9#11)", () => {
      const pressedKeys = new Set(["f", "k", "[", "'"]); // F=G root, K=dom7, [=sharp9, '=sharp11

      const parsed = parseKeys(pressedKeys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 3 });

      expect(chord).not.toBeNull();
      expect(chord!.notes.length).toBeGreaterThanOrEqual(4); // Should have base + extensions
      expect(chord!.modifiers).toContain("dom7");
      expect(chord!.modifiers).toContain("sharp9");
      expect(chord!.modifiers).toContain("sharp11");
    });

    it("should apply multiple voicing transforms sequentially", () => {
      const pressedKeys = new Set(["a", "j", "i"]); // Cmaj7
      const parsed = parseKeys(pressedKeys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord).not.toBeNull();

      // Apply drop2
      const drop2Notes = applyTrueDrop2(chord!.notes);

      // Then apply spread
      const finalNotes = applySpread(drop2Notes, 1);

      expect(finalNotes.length).toBe(4);
      expect(finalNotes).not.toEqual(chord!.notes);
      expect(finalNotes).not.toEqual(drop2Notes);

      // Verify all notes are still valid MIDI
      finalNotes.forEach((note) => {
        expect(note).toBeGreaterThanOrEqual(0);
        expect(note).toBeLessThanOrEqual(127);
      });
    });

    it("should handle all voicing styles from the pipeline", () => {
      const pressedKeys = new Set(["a", "j", "i"]); // Cmaj7
      const parsed = parseKeys(pressedKeys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord).not.toBeNull();

      const styles: VoicingStyle[] = [
        "close",
        "drop2",
        "drop3",
        "drop24",
        "rootless-a",
        "rootless-b",
        "shell",
        "quartal",
        "upper-struct",
      ];

      styles.forEach((style) => {
        const voiced = applyVoicingStyle(chord!, style);

        // All voicings should produce valid MIDI notes
        expect(voiced.length).toBeGreaterThan(0);
        voiced.forEach((note) => {
          expect(note).toBeGreaterThanOrEqual(0);
          expect(note).toBeLessThanOrEqual(127);
        });
      });
    });

    it("should return null for invalid chord (no root)", () => {
      const pressedKeys = new Set(["j", "i"]); // Modifiers without root

      const parsed = parseKeys(pressedKeys);
      expect(parsed.root).toBeNull();
      expect(isValidChord(parsed)).toBe(false);

      const chord = buildChord(parsed.root, parsed.modifiers);
      expect(chord).toBeNull();
    });
  });

  describe("Event Bus Coordination - Multi-Hook Communication", () => {
    let bus: any;

    beforeEach(() => {
      bus = createEventBus();
    });

    afterEach(() => {
      bus.clear();
    });

    it("should coordinate chord changes between hooks via events", () => {
      const chordChangedSpy = vi.fn();

      // Hook 1: Subscribe to chord changes (like useMIDI)
      bus.on("chord:changed", chordChangedSpy);

      // Hook 2: Emit chord change (like useChordEngine)
      const testNotes: MIDINote[] = [60, 64, 67, 71];
      bus.emit("chord:changed", {
        notes: testNotes,
        name: "Cmaj7",
        source: "useChordEngine",
      });

      // Verify event was received
      expect(chordChangedSpy).toHaveBeenCalledTimes(1);
      expect(chordChangedSpy).toHaveBeenCalledWith({
        notes: testNotes,
        name: "Cmaj7",
        source: "useChordEngine",
      });
    });

    it("should handle chord cleared events", () => {
      const chordClearedSpy = vi.fn();

      bus.on("chord:cleared", chordClearedSpy);

      bus.emit("chord:cleared", { source: "useKeyboard" });

      expect(chordClearedSpy).toHaveBeenCalledTimes(1);
      expect(chordClearedSpy).toHaveBeenCalledWith({ source: "useKeyboard" });
    });

    it("should coordinate voicing changes across multiple subscribers", () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      const subscriber3 = vi.fn();

      bus.on("voicing:changed", subscriber1);
      bus.on("voicing:changed", subscriber2);
      bus.on("voicing:changed", subscriber3);

      const voicingState = {
        inversion: 1,
        drop: "drop2" as const,
        voicingStyle: "rootless-a" as VoicingStyle,
        spread: 0,
        octave: 0,
      };

      bus.emit("voicing:changed", voicingState);

      // All subscribers should receive the event
      expect(subscriber1).toHaveBeenCalledWith(voicingState);
      expect(subscriber2).toHaveBeenCalledWith(voicingState);
      expect(subscriber3).toHaveBeenCalledWith(voicingState);
    });

    it("should handle preset workflow: save → recall → clear", () => {
      const savedSpy = vi.fn();
      const recalledSpy = vi.fn();
      const clearedSpy = vi.fn();

      bus.on("preset:saved", savedSpy);
      bus.on("preset:recalled", recalledSpy);
      bus.on("preset:cleared", clearedSpy);

      // Save preset
      const keys = new Set(["a", "j", "i"]);
      const voicing = {
        inversion: 0,
        drop: "close" as const,
        voicingStyle: "drop2" as VoicingStyle,
        spread: 0,
        octave: 0,
      };

      bus.emit("preset:saved", { slot: 1, keys, voicing });
      expect(savedSpy).toHaveBeenCalledTimes(1);

      // Recall preset
      const preset = {
        keys,
        octave: 4 as const,
        inversionIndex: voicing.inversion,
        spreadAmount: voicing.spread,
        voicingStyle: voicing.voicingStyle,
      };

      bus.emit("preset:recalled", { slot: 1, preset });
      expect(recalledSpy).toHaveBeenCalledTimes(1);

      // Clear preset
      bus.emit("preset:cleared", { slot: 1 });
      expect(clearedSpy).toHaveBeenCalledTimes(1);
    });

    it("should allow unsubscribing from events", () => {
      const handler = vi.fn();

      const unsubscribe = bus.on("chord:changed", handler);

      bus.emit("chord:changed", {
        notes: [60, 64, 67],
        name: "C",
      });
      expect(handler).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      bus.emit("chord:changed", {
        notes: [62, 65, 69],
        name: "Dm",
      });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should support once() for single-fire subscriptions", () => {
      const handler = vi.fn();

      bus.once("chord:changed", handler);

      bus.emit("chord:changed", { notes: [60, 64, 67], name: "C" });
      expect(handler).toHaveBeenCalledTimes(1);

      bus.emit("chord:changed", { notes: [62, 65, 69], name: "Dm" });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1
    });

    it("should isolate errors in event handlers (one failing handler doesn't break others)", () => {
      const failingHandler = vi.fn(() => {
        throw new Error("Handler error");
      });
      const workingHandler = vi.fn();

      // Suppress console.error for this test
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      bus.on("chord:changed", failingHandler);
      bus.on("chord:changed", workingHandler);

      bus.emit("chord:changed", { notes: [60, 64, 67], name: "C" });

      // Both handlers should have been called
      expect(failingHandler).toHaveBeenCalled();
      expect(workingHandler).toHaveBeenCalled();

      // Error should have been logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should track listener counts correctly", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      expect(bus.listenerCount("chord:changed")).toBe(0);

      bus.on("chord:changed", handler1);
      expect(bus.listenerCount("chord:changed")).toBe(1);

      bus.on("chord:changed", handler2);
      expect(bus.listenerCount("chord:changed")).toBe(2);

      bus.off("chord:changed", handler1);
      expect(bus.listenerCount("chord:changed")).toBe(1);

      bus.clear("chord:changed");
      expect(bus.listenerCount("chord:changed")).toBe(0);
    });

    it("should simulate full user interaction workflow with events", () => {
      // Simulate multiple hooks coordinating via events
      const chordChanges: AppEventMap["chord:changed"][] = [];
      const voicingChanges: AppEventMap["voicing:changed"][] = [];
      const presetRecalls: AppEventMap["preset:recalled"][] = [];

      // Hook subscriptions
      bus.on("chord:changed", (payload: AppEventMap["chord:changed"]) => {
        chordChanges.push(payload);
      });

      bus.on("voicing:changed", (payload: AppEventMap["voicing:changed"]) => {
        voicingChanges.push(payload);
      });

      bus.on("preset:recalled", (payload: AppEventMap["preset:recalled"]) => {
        presetRecalls.push(payload);
      });

      // User presses keys
      const keys1 = new Set(["q", "j", "i"]); // Cmaj7 (Q=C root, J=major, I=maj7)
      const parsed1 = parseKeys(keys1);
      const chord1 = buildChord(parsed1.root, parsed1.modifiers, { octave: 4 });

      bus.emit("chord:changed", {
        notes: chord1!.notes,
        name: "Cmaj7",
        source: "useChordEngine",
      });

      // User changes voicing
      bus.emit("voicing:changed", {
        inversion: 1,
        drop: "drop2" as const,
        voicingStyle: "rootless-a" as VoicingStyle,
        spread: 0,
        octave: 0,
      });

      // User saves preset
      const voicingState = {
        inversion: 1,
        drop: "drop2" as const,
        voicingStyle: "rootless-a" as VoicingStyle,
        spread: 0,
        octave: 0,
      };

      bus.emit("preset:saved", { slot: 0, keys: keys1, voicing: voicingState });

      // User recalls preset
      const preset = {
        keys: keys1,
        octave: 4 as const,
        inversionIndex: voicingState.inversion,
        spreadAmount: voicingState.spread,
        voicingStyle: voicingState.voicingStyle,
      };

      bus.emit("preset:recalled", { slot: 0, preset });

      // Verify all events were captured
      expect(chordChanges.length).toBe(1);
      expect(voicingChanges.length).toBe(1);
      expect(presetRecalls.length).toBe(1);

      expect(chordChanges[0].notes).toEqual(chord1!.notes);
      expect(voicingChanges[0].voicingStyle).toBe("rootless-a");
      expect(presetRecalls[0].preset.keys).toEqual(keys1);
    });
  });
});
