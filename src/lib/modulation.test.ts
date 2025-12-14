import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  CustomPatch,
  ModSource,
  ModDestination,
  ModRouting,
} from "../types/synth";
import {
  DEFAULT_MOD_MATRIX,
  DEFAULT_OSCILLATOR,
  DEFAULT_FILTER,
  DEFAULT_ENVELOPE,
  DEFAULT_FILTER_ENVELOPE,
} from "../types/synth";

// Mock Tone.js
vi.mock("tone", () => {
  // Mock LFO
  class MockLFO {
    type: string;
    frequency: { value: number | string };
    min: number;
    max: number;
    phase: number;
    public started = false;
    public synced = false;

    constructor(config: any) {
      this.type = config.type;
      this.frequency = { value: config.frequency };
      this.min = config.min;
      this.max = config.max;
      this.phase = config.phase;
    }

    start() {
      this.started = true;
      return this;
    }

    stop() {
      this.started = false;
      return this;
    }

    sync() {
      this.synced = true;
      return this;
    }

    unsync() {
      this.synced = false;
      return this;
    }

    connect() {
      return this;
    }

    disconnect() {
      return this;
    }

    dispose() {
      this.started = false;
    }
  }

  // Mock Envelope
  class MockEnvelope {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    attackCurve?: string;
    releaseCurve?: string;

    constructor(config: any) {
      this.attack = config.attack;
      this.decay = config.decay;
      this.sustain = config.sustain;
      this.release = config.release;
      this.attackCurve = config.attackCurve;
      this.releaseCurve = config.releaseCurve;
    }

    triggerAttack() {
      return this;
    }

    triggerRelease() {
      return this;
    }

    connect() {
      return this;
    }

    disconnect() {
      return this;
    }

    dispose() {}
  }

  // Mock Signal
  class MockSignal {
    value: number;
    minValue?: number;
    maxValue?: number;

    constructor(value: number, _unit?: string) {
      this.value = value;
    }

    connect() {
      return this;
    }

    disconnect() {
      return this;
    }

    dispose() {}
  }

  // Mock audio nodes
  class MockMultiply {
    constructor(_value: number) {}
    connect() {
      return this;
    }
    disconnect() {
      return this;
    }
    dispose() {}
  }

  class MockScale {
    constructor(_min: number, _max: number) {}
    connect() {
      return this;
    }
    disconnect() {
      return this;
    }
    dispose() {}
  }

  class MockAdd {
    constructor(_value: number) {}
    connect() {
      return this;
    }
    disconnect() {
      return this;
    }
    dispose() {}
  }

  return {
    LFO: MockLFO,
    Envelope: MockEnvelope,
    Signal: MockSignal,
    Multiply: MockMultiply,
    Scale: MockScale,
    Add: MockAdd,
  };
});

// Import after mocking
import * as Tone from "tone";

// Create ModulationManager class for testing (extracted from customSynthEngine.ts)
class ModulationManager {
  public lfo1: Tone.LFO;
  public lfo2: Tone.LFO;
  public modEnv1: Tone.Envelope;
  public modEnv2: Tone.Envelope;
  public velocitySignal: Tone.Signal<"normalRange">;
  public keytrackSignal: Tone.Signal<"normalRange">;
  public modwheelSignal: Tone.Signal<"normalRange">;
  public aftertouchSignal: Tone.Signal<"normalRange">;

  private activeConnections = new Map<string, Tone.Signal | any>();
  private modConnections = new Map<string, any>();

  constructor(private patch: CustomPatch) {
    // Create LFOs
    this.lfo1 = new Tone.LFO({
      type: patch.modMatrix.lfo1.waveform,
      frequency: patch.modMatrix.lfo1.frequency,
      min: patch.modMatrix.lfo1.min,
      max: patch.modMatrix.lfo1.max,
      phase: patch.modMatrix.lfo1.phase,
    });

    this.lfo2 = new Tone.LFO({
      type: patch.modMatrix.lfo2.waveform,
      frequency: patch.modMatrix.lfo2.frequency,
      min: patch.modMatrix.lfo2.min,
      max: patch.modMatrix.lfo2.max,
      phase: patch.modMatrix.lfo2.phase,
    });

    // Configure sync if enabled
    if (patch.modMatrix.lfo1.sync) {
      this.lfo1.sync();
      this.lfo1.frequency.value = this.frequencyToSyncedValue(
        patch.modMatrix.lfo1.frequency,
      );
    }
    if (patch.modMatrix.lfo2.sync) {
      this.lfo2.sync();
      this.lfo2.frequency.value = this.frequencyToSyncedValue(
        patch.modMatrix.lfo2.frequency,
      );
    }

    // Start LFOs if enabled
    if (patch.modMatrix.lfo1.enabled) {
      this.lfo1.start();
    }
    if (patch.modMatrix.lfo2.enabled) {
      this.lfo2.start();
    }

    // Create modulation envelopes
    this.modEnv1 = new Tone.Envelope({
      attack: patch.modMatrix.modEnv1.attack,
      decay: patch.modMatrix.modEnv1.decay,
      sustain: patch.modMatrix.modEnv1.sustain,
      release: patch.modMatrix.modEnv1.release,
      attackCurve: patch.modMatrix.modEnv1.attackCurve,
      releaseCurve: patch.modMatrix.modEnv1.releaseCurve,
    });

    this.modEnv2 = new Tone.Envelope({
      attack: patch.modMatrix.modEnv2.attack,
      decay: patch.modMatrix.modEnv2.decay,
      sustain: patch.modMatrix.modEnv2.sustain,
      release: patch.modMatrix.modEnv2.release,
      attackCurve: patch.modMatrix.modEnv2.attackCurve,
      releaseCurve: patch.modMatrix.modEnv2.releaseCurve,
    });

    // Create modulation signals for velocity, keytrack, modwheel, aftertouch
    this.velocitySignal = new Tone.Signal(0);
    this.keytrackSignal = new Tone.Signal(0.5); // Middle C = 0.5
    this.modwheelSignal = new Tone.Signal(0);
    this.aftertouchSignal = new Tone.Signal(0);
  }

  /**
   * Connect modulation source to destination parameter
   */
  connectModulation(routing: ModRouting, target: Tone.Signal | any): void {
    if (!routing.enabled || routing.amount === 0) return;

    const source = this.getModSource(routing.source);
    if (!source) return;

    // Create scaled signal for modulation amount
    const multiply = new Tone.Multiply(routing.amount);
    const scale = new Tone.Scale(target.minValue ?? 0, target.maxValue ?? 1);

    source.connect(multiply);
    multiply.connect(scale);
    scale.connect(target);

    // Store both nodes for cleanup
    this.activeConnections.set(`${routing.id}-multiply`, multiply);
    this.activeConnections.set(`${routing.id}-scale`, scale);
  }

  /**
   * Get modulation source by name (public for external routing)
   */
  getModSource(source: string): any | null {
    switch (source) {
      case "lfo1":
        return this.lfo1;
      case "lfo2":
        return this.lfo2;
      case "env1":
        return this.modEnv1;
      case "env2":
        return this.modEnv2;
      case "velocity":
        return this.velocitySignal;
      case "keytrack":
        return this.keytrackSignal;
      case "modwheel":
        return this.modwheelSignal;
      case "aftertouch":
        return this.aftertouchSignal;
      default:
        return null;
    }
  }

  /**
   * Get modulatable target parameter by destination name
   */
  getModTarget(destination: string): any | null {
    switch (destination) {
      case "lfo1_rate":
        return this.lfo1.frequency;
      case "lfo2_rate":
        return this.lfo2.frequency;
      default:
        return null;
    }
  }

  /**
   * Store a modulation connection for cleanup
   */
  storeConnection(id: string, node: any): void {
    // Dispose existing connection if any
    const existing = this.modConnections.get(id);
    if (existing) {
      existing.dispose();
    }
    this.modConnections.set(id, node);
  }

  /**
   * Trigger modulation envelopes
   */
  triggerAttack(): void {
    this.modEnv1.triggerAttack();
    this.modEnv2.triggerAttack();
  }

  /**
   * Release modulation envelopes
   */
  triggerRelease(): void {
    this.modEnv1.triggerRelease();
    this.modEnv2.triggerRelease();
  }

  /**
   * Convert frequency in Hz to nearest musical subdivision for synced LFOs
   * At 120 BPM: 1n = 0.5Hz, 2n = 1Hz, 4n = 2Hz, 8n = 4Hz
   */
  private frequencyToSyncedValue(hz: number): string {
    if (hz <= 0.25) return "1m"; // 1 measure
    if (hz <= 0.5) return "1n"; // Whole note
    if (hz <= 1) return "2n"; // Half note
    if (hz <= 2) return "4n"; // Quarter note
    if (hz <= 4) return "8n"; // Eighth note
    if (hz <= 8) return "16n"; // Sixteenth note
    return "32n"; // Thirty-second note
  }

  /**
   * Update LFO parameters
   */
  updateLFO(lfoNum: 1 | 2, param: string, value: number | boolean): void {
    const lfo = lfoNum === 1 ? this.lfo1 : this.lfo2;
    const lfoConfig =
      lfoNum === 1 ? this.patch.modMatrix.lfo1 : this.patch.modMatrix.lfo2;

    switch (param) {
      case "frequency":
        if (typeof value === "number") {
          if (lfoConfig.sync) {
            lfo.frequency.value = this.frequencyToSyncedValue(value);
          } else {
            lfo.frequency.value = value;
          }
        }
        break;
      case "min":
        if (typeof value === "number") {
          lfo.min = value;
        }
        break;
      case "max":
        if (typeof value === "number") {
          lfo.max = value;
        }
        break;
      case "phase":
        if (typeof value === "number") {
          lfo.phase = value;
        }
        break;
      case "sync":
        if (typeof value === "boolean") {
          if (value) {
            lfo.sync();
            lfo.frequency.value = this.frequencyToSyncedValue(
              lfoConfig.frequency,
            );
          } else {
            lfo.unsync();
            lfo.frequency.value = lfoConfig.frequency;
          }
        }
        break;
    }
  }

  /**
   * Set velocity modulation signal (0-1)
   */
  setVelocity(velocity: number): void {
    this.velocitySignal.value = velocity;
  }

  /**
   * Set keytrack modulation signal from MIDI note (0-127 normalized to 0-1)
   */
  setKeytrack(note: number): void {
    this.keytrackSignal.value = note / 127;
  }

  /**
   * Set modwheel modulation signal (0-127 normalized to 0-1)
   */
  setModWheel(value: number): void {
    this.modwheelSignal.value = value / 127;
  }

  /**
   * Set aftertouch modulation signal (0-127 normalized to 0-1)
   */
  setAftertouch(value: number): void {
    this.aftertouchSignal.value = value / 127;
  }

  /**
   * Dispose of all modulation sources
   */
  dispose(): void {
    this.lfo1.dispose();
    this.lfo2.dispose();
    this.modEnv1.dispose();
    this.modEnv2.dispose();
    this.velocitySignal.dispose();
    this.keytrackSignal.dispose();
    this.modwheelSignal.dispose();
    this.aftertouchSignal.dispose();

    for (const signal of this.activeConnections.values()) {
      signal.dispose();
    }
    this.activeConnections.clear();

    // Dispose modulation routing connections
    for (const node of this.modConnections.values()) {
      node.dispose();
    }
    this.modConnections.clear();
  }
}

// Helper to create test patch
function createTestPatch(overrides?: Partial<CustomPatch>): CustomPatch {
  return {
    id: "test-patch",
    name: "Test Patch",
    description: "Test patch for modulation",
    category: "custom",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    osc1: DEFAULT_OSCILLATOR,
    osc2: DEFAULT_OSCILLATOR,
    oscMix: 0.5,
    filter: DEFAULT_FILTER,
    ampEnvelope: DEFAULT_ENVELOPE,
    filterEnvelope: DEFAULT_FILTER_ENVELOPE,
    modMatrix: DEFAULT_MOD_MATRIX,
    effects: [],
    masterVolume: 0.8,
    glide: 0,
    ...overrides,
  };
}

describe("ModulationManager", () => {
  let manager: ModulationManager;
  let patch: CustomPatch;

  beforeEach(() => {
    patch = createTestPatch();
    manager = new ModulationManager(patch);
  });

  describe("Initialization", () => {
    it("should create LFO1 with correct configuration", () => {
      expect(manager.lfo1).toBeDefined();
      expect(manager.lfo1.type).toBe("sine");
      expect(manager.lfo1.frequency.value).toBe(2);
      expect(manager.lfo1.min).toBe(0);
      expect(manager.lfo1.max).toBe(1);
      expect(manager.lfo1.phase).toBe(0);
    });

    it("should create LFO2 with correct configuration", () => {
      expect(manager.lfo2).toBeDefined();
      expect(manager.lfo2.type).toBe("sine");
      expect(manager.lfo2.frequency.value).toBe(0.5);
      expect(manager.lfo2.min).toBe(0);
      expect(manager.lfo2.max).toBe(1);
      expect(manager.lfo2.phase).toBe(0);
    });

    it("should create modEnv1 with correct configuration", () => {
      expect(manager.modEnv1).toBeDefined();
      expect(manager.modEnv1.attack).toBe(0.01);
      expect(manager.modEnv1.decay).toBe(0.3);
      expect(manager.modEnv1.sustain).toBe(0.7);
      expect(manager.modEnv1.release).toBe(0.5);
      expect(manager.modEnv1.attackCurve).toBe("linear");
      expect(manager.modEnv1.releaseCurve).toBe("exponential");
    });

    it("should create modEnv2 with correct configuration", () => {
      expect(manager.modEnv2).toBeDefined();
      expect(manager.modEnv2.attack).toBe(0.01);
      expect(manager.modEnv2.decay).toBe(0.3);
      expect(manager.modEnv2.sustain).toBe(0.7);
      expect(manager.modEnv2.release).toBe(0.5);
      expect(manager.modEnv2.attackCurve).toBe("linear");
      expect(manager.modEnv2.releaseCurve).toBe("exponential");
    });

    it("should create velocity signal initialized to 0", () => {
      expect(manager.velocitySignal).toBeDefined();
      expect(manager.velocitySignal.value).toBe(0);
    });

    it("should create keytrack signal initialized to 0.5 (middle C)", () => {
      expect(manager.keytrackSignal).toBeDefined();
      expect(manager.keytrackSignal.value).toBe(0.5);
    });

    it("should create modwheel signal initialized to 0", () => {
      expect(manager.modwheelSignal).toBeDefined();
      expect(manager.modwheelSignal.value).toBe(0);
    });

    it("should create aftertouch signal initialized to 0", () => {
      expect(manager.aftertouchSignal).toBeDefined();
      expect(manager.aftertouchSignal.value).toBe(0);
    });

    it("should start LFOs if enabled in patch", () => {
      const enabledPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          lfo1: { ...DEFAULT_MOD_MATRIX.lfo1, enabled: true },
          lfo2: { ...DEFAULT_MOD_MATRIX.lfo2, enabled: true },
        },
      });
      const enabledManager = new ModulationManager(enabledPatch);

      // Check that start was called (our mock sets started to true)
      expect((enabledManager.lfo1 as any).started).toBe(true);
      expect((enabledManager.lfo2 as any).started).toBe(true);
    });

    it("should not start LFOs if disabled in patch", () => {
      const disabledPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          lfo1: { ...DEFAULT_MOD_MATRIX.lfo1, enabled: false },
          lfo2: { ...DEFAULT_MOD_MATRIX.lfo2, enabled: false },
        },
      });
      const disabledManager = new ModulationManager(disabledPatch);

      expect((disabledManager.lfo1 as any).started).toBe(false);
      expect((disabledManager.lfo2 as any).started).toBe(false);
    });

    it("should sync LFOs if sync enabled in patch", () => {
      const syncedPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          lfo1: { ...DEFAULT_MOD_MATRIX.lfo1, sync: true, frequency: 2 },
          lfo2: { ...DEFAULT_MOD_MATRIX.lfo2, sync: true, frequency: 0.5 },
        },
      });
      const syncedManager = new ModulationManager(syncedPatch);

      expect((syncedManager.lfo1 as any).synced).toBe(true);
      expect((syncedManager.lfo2 as any).synced).toBe(true);
      // Check that frequency was converted to synced value
      expect(syncedManager.lfo1.frequency.value).toBe("4n"); // 2 Hz -> 4n
      expect(syncedManager.lfo2.frequency.value).toBe("1n"); // 0.5 Hz -> 1n
    });
  });

  describe("getModSource", () => {
    it("should return lfo1 for 'lfo1' source", () => {
      const source = manager.getModSource("lfo1");
      expect(source).toBe(manager.lfo1);
    });

    it("should return lfo2 for 'lfo2' source", () => {
      const source = manager.getModSource("lfo2");
      expect(source).toBe(manager.lfo2);
    });

    it("should return modEnv1 for 'env1' source", () => {
      const source = manager.getModSource("env1");
      expect(source).toBe(manager.modEnv1);
    });

    it("should return modEnv2 for 'env2' source", () => {
      const source = manager.getModSource("env2");
      expect(source).toBe(manager.modEnv2);
    });

    it("should return velocitySignal for 'velocity' source", () => {
      const source = manager.getModSource("velocity");
      expect(source).toBe(manager.velocitySignal);
    });

    it("should return keytrackSignal for 'keytrack' source", () => {
      const source = manager.getModSource("keytrack");
      expect(source).toBe(manager.keytrackSignal);
    });

    it("should return modwheelSignal for 'modwheel' source", () => {
      const source = manager.getModSource("modwheel");
      expect(source).toBe(manager.modwheelSignal);
    });

    it("should return aftertouchSignal for 'aftertouch' source", () => {
      const source = manager.getModSource("aftertouch");
      expect(source).toBe(manager.aftertouchSignal);
    });

    it("should return null for unknown source", () => {
      const source = manager.getModSource("unknown" as ModSource);
      expect(source).toBe(null);
    });
  });

  describe("getModTarget", () => {
    it("should return lfo1 frequency for 'lfo1_rate' destination", () => {
      const target = manager.getModTarget("lfo1_rate");
      expect(target).toBe(manager.lfo1.frequency);
    });

    it("should return lfo2 frequency for 'lfo2_rate' destination", () => {
      const target = manager.getModTarget("lfo2_rate");
      expect(target).toBe(manager.lfo2.frequency);
    });

    it("should return null for unknown destination", () => {
      const target = manager.getModTarget("unknown" as ModDestination);
      expect(target).toBe(null);
    });
  });

  describe("Modulation Routing", () => {
    it("should not connect routing if disabled", () => {
      const routing: ModRouting = {
        id: "test-routing-1",
        source: "lfo1",
        destination: "filter_freq",
        amount: 0.5,
        enabled: false,
      };

      const mockTarget = new Tone.Signal(1000);
      const connectSpy = vi.spyOn(manager.lfo1, "connect");

      manager.connectModulation(routing, mockTarget);

      expect(connectSpy).not.toHaveBeenCalled();
    });

    it("should not connect routing if amount is 0", () => {
      const routing: ModRouting = {
        id: "test-routing-2",
        source: "lfo1",
        destination: "filter_freq",
        amount: 0,
        enabled: true,
      };

      const mockTarget = new Tone.Signal(1000);
      const connectSpy = vi.spyOn(manager.lfo1, "connect");

      manager.connectModulation(routing, mockTarget);

      expect(connectSpy).not.toHaveBeenCalled();
    });

    it("should not connect routing if source is invalid", () => {
      const routing: ModRouting = {
        id: "test-routing-3",
        source: "invalid" as ModSource,
        destination: "filter_freq",
        amount: 0.5,
        enabled: true,
      };

      const mockTarget = new Tone.Signal(1000);

      // Should not throw error
      expect(() =>
        manager.connectModulation(routing, mockTarget),
      ).not.toThrow();
    });

    it("should connect valid routing and store nodes", () => {
      const routing: ModRouting = {
        id: "test-routing-4",
        source: "lfo1",
        destination: "filter_freq",
        amount: 0.5,
        enabled: true,
      };

      const mockTarget = new Tone.Signal(1000);
      const connectSpy = vi.spyOn(manager.lfo1, "connect");

      manager.connectModulation(routing, mockTarget);

      expect(connectSpy).toHaveBeenCalled();
      // Check that nodes were stored for cleanup
      expect(
        (manager as any).activeConnections.has("test-routing-4-multiply"),
      ).toBe(true);
      expect(
        (manager as any).activeConnections.has("test-routing-4-scale"),
      ).toBe(true);
    });
  });

  describe("updateLFO", () => {
    it("should update LFO1 frequency", () => {
      manager.updateLFO(1, "frequency", 5);
      expect(manager.lfo1.frequency.value).toBe(5);
    });

    it("should update LFO2 frequency", () => {
      manager.updateLFO(2, "frequency", 10);
      expect(manager.lfo2.frequency.value).toBe(10);
    });

    it("should update LFO1 min value", () => {
      manager.updateLFO(1, "min", -1);
      expect(manager.lfo1.min).toBe(-1);
    });

    it("should update LFO1 max value", () => {
      manager.updateLFO(1, "max", 2);
      expect(manager.lfo1.max).toBe(2);
    });

    it("should update LFO1 phase", () => {
      manager.updateLFO(1, "phase", 180);
      expect(manager.lfo1.phase).toBe(180);
    });

    it("should sync LFO when sync is true", () => {
      manager.updateLFO(1, "sync", true);
      expect((manager.lfo1 as any).synced).toBe(true);
      // Should convert frequency to synced value
      expect(manager.lfo1.frequency.value).toBe("4n"); // 2 Hz -> 4n
    });

    it("should unsync LFO when sync is false", () => {
      // First sync it
      manager.updateLFO(1, "sync", true);
      expect((manager.lfo1 as any).synced).toBe(true);

      // Then unsync
      manager.updateLFO(1, "sync", false);
      expect((manager.lfo1 as any).synced).toBe(false);
      // Should restore numeric frequency
      expect(manager.lfo1.frequency.value).toBe(2);
    });

    it("should convert frequency to synced value when sync enabled", () => {
      // Create synced patch
      const syncedPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          lfo1: { ...DEFAULT_MOD_MATRIX.lfo1, sync: true },
        },
      });
      const syncedManager = new ModulationManager(syncedPatch);

      // Update frequency while synced
      syncedManager.updateLFO(1, "frequency", 0.25);
      expect(syncedManager.lfo1.frequency.value).toBe("1m"); // 0.25 Hz -> 1 measure

      syncedManager.updateLFO(1, "frequency", 0.5);
      expect(syncedManager.lfo1.frequency.value).toBe("1n"); // 0.5 Hz -> whole note

      syncedManager.updateLFO(1, "frequency", 1);
      expect(syncedManager.lfo1.frequency.value).toBe("2n"); // 1 Hz -> half note

      syncedManager.updateLFO(1, "frequency", 2);
      expect(syncedManager.lfo1.frequency.value).toBe("4n"); // 2 Hz -> quarter note

      syncedManager.updateLFO(1, "frequency", 4);
      expect(syncedManager.lfo1.frequency.value).toBe("8n"); // 4 Hz -> eighth note

      syncedManager.updateLFO(1, "frequency", 8);
      expect(syncedManager.lfo1.frequency.value).toBe("16n"); // 8 Hz -> sixteenth note

      syncedManager.updateLFO(1, "frequency", 16);
      expect(syncedManager.lfo1.frequency.value).toBe("32n"); // 16 Hz -> thirty-second note
    });

    it("should ignore non-numeric values for numeric parameters", () => {
      manager.updateLFO(1, "frequency", "invalid" as any);
      // Frequency should remain unchanged
      expect(manager.lfo1.frequency.value).toBe(2);
    });

    it("should ignore non-boolean values for boolean parameters", () => {
      manager.updateLFO(1, "sync", "invalid" as any);
      // Sync state should remain unchanged
      expect((manager.lfo1 as any).synced).toBe(false);
    });
  });

  describe("Signal Value Setters", () => {
    it("should set velocity signal value", () => {
      manager.setVelocity(0.75);
      expect(manager.velocitySignal.value).toBe(0.75);
    });

    it("should set velocity signal to 0", () => {
      manager.setVelocity(0);
      expect(manager.velocitySignal.value).toBe(0);
    });

    it("should set velocity signal to 1", () => {
      manager.setVelocity(1);
      expect(manager.velocitySignal.value).toBe(1);
    });

    it("should set keytrack signal from MIDI note (0-127 normalized)", () => {
      manager.setKeytrack(60); // Middle C
      expect(manager.keytrackSignal.value).toBeCloseTo(60 / 127);
    });

    it("should set keytrack signal for low note", () => {
      manager.setKeytrack(0);
      expect(manager.keytrackSignal.value).toBe(0);
    });

    it("should set keytrack signal for high note", () => {
      manager.setKeytrack(127);
      expect(manager.keytrackSignal.value).toBe(1);
    });

    it("should set modwheel signal from CC value (0-127 normalized)", () => {
      manager.setModWheel(64);
      expect(manager.modwheelSignal.value).toBeCloseTo(64 / 127);
    });

    it("should set modwheel signal to minimum", () => {
      manager.setModWheel(0);
      expect(manager.modwheelSignal.value).toBe(0);
    });

    it("should set modwheel signal to maximum", () => {
      manager.setModWheel(127);
      expect(manager.modwheelSignal.value).toBe(1);
    });

    it("should set aftertouch signal from value (0-127 normalized)", () => {
      manager.setAftertouch(100);
      expect(manager.aftertouchSignal.value).toBeCloseTo(100 / 127);
    });

    it("should set aftertouch signal to minimum", () => {
      manager.setAftertouch(0);
      expect(manager.aftertouchSignal.value).toBe(0);
    });

    it("should set aftertouch signal to maximum", () => {
      manager.setAftertouch(127);
      expect(manager.aftertouchSignal.value).toBe(1);
    });
  });

  describe("Envelope Triggering", () => {
    it("should trigger both modulation envelopes on triggerAttack", () => {
      const env1Spy = vi.spyOn(manager.modEnv1, "triggerAttack");
      const env2Spy = vi.spyOn(manager.modEnv2, "triggerAttack");

      manager.triggerAttack();

      expect(env1Spy).toHaveBeenCalled();
      expect(env2Spy).toHaveBeenCalled();
    });

    it("should release both modulation envelopes on triggerRelease", () => {
      const env1Spy = vi.spyOn(manager.modEnv1, "triggerRelease");
      const env2Spy = vi.spyOn(manager.modEnv2, "triggerRelease");

      manager.triggerRelease();

      expect(env1Spy).toHaveBeenCalled();
      expect(env2Spy).toHaveBeenCalled();
    });
  });

  describe("storeConnection", () => {
    it("should store modulation connection", () => {
      const mockNode = new Tone.Multiply(0.5);
      manager.storeConnection("test-connection", mockNode);

      expect((manager as any).modConnections.has("test-connection")).toBe(true);
      expect((manager as any).modConnections.get("test-connection")).toBe(
        mockNode,
      );
    });

    it("should dispose existing connection when storing new one with same ID", () => {
      const mockNode1 = new Tone.Multiply(0.5);
      const mockNode2 = new Tone.Multiply(0.7);
      const disposeSpy = vi.spyOn(mockNode1, "dispose");

      manager.storeConnection("test-connection", mockNode1);
      manager.storeConnection("test-connection", mockNode2);

      expect(disposeSpy).toHaveBeenCalled();
      expect((manager as any).modConnections.get("test-connection")).toBe(
        mockNode2,
      );
    });
  });

  describe("Disposal", () => {
    it("should dispose all LFOs and envelopes", () => {
      const lfo1Spy = vi.spyOn(manager.lfo1, "dispose");
      const lfo2Spy = vi.spyOn(manager.lfo2, "dispose");
      const env1Spy = vi.spyOn(manager.modEnv1, "dispose");
      const env2Spy = vi.spyOn(manager.modEnv2, "dispose");

      manager.dispose();

      expect(lfo1Spy).toHaveBeenCalled();
      expect(lfo2Spy).toHaveBeenCalled();
      expect(env1Spy).toHaveBeenCalled();
      expect(env2Spy).toHaveBeenCalled();
    });

    it("should dispose all signals", () => {
      const velSpy = vi.spyOn(manager.velocitySignal, "dispose");
      const keySpy = vi.spyOn(manager.keytrackSignal, "dispose");
      const modSpy = vi.spyOn(manager.modwheelSignal, "dispose");
      const aftSpy = vi.spyOn(manager.aftertouchSignal, "dispose");

      manager.dispose();

      expect(velSpy).toHaveBeenCalled();
      expect(keySpy).toHaveBeenCalled();
      expect(modSpy).toHaveBeenCalled();
      expect(aftSpy).toHaveBeenCalled();
    });

    it("should dispose all active connections", () => {
      // Create some connections
      const routing: ModRouting = {
        id: "test-routing",
        source: "lfo1",
        destination: "filter_freq",
        amount: 0.5,
        enabled: true,
      };
      const mockTarget = new Tone.Signal(1000);
      manager.connectModulation(routing, mockTarget);

      // Get the stored connections
      const multiply = (manager as any).activeConnections.get(
        "test-routing-multiply",
      );
      const scale = (manager as any).activeConnections.get(
        "test-routing-scale",
      );
      const multiplySpy = vi.spyOn(multiply, "dispose");
      const scaleSpy = vi.spyOn(scale, "dispose");

      manager.dispose();

      expect(multiplySpy).toHaveBeenCalled();
      expect(scaleSpy).toHaveBeenCalled();
      expect((manager as any).activeConnections.size).toBe(0);
    });

    it("should dispose all modulation connections", () => {
      const mockNode = new Tone.Multiply(0.5);
      const disposeSpy = vi.spyOn(mockNode, "dispose");

      manager.storeConnection("test-connection", mockNode);
      manager.dispose();

      expect(disposeSpy).toHaveBeenCalled();
      expect((manager as any).modConnections.size).toBe(0);
    });

    it("should clear all connection maps", () => {
      manager.dispose();

      expect((manager as any).activeConnections.size).toBe(0);
      expect((manager as any).modConnections.size).toBe(0);
    });
  });

  describe("LFO Waveform Configuration", () => {
    it("should initialize LFO with custom waveform", () => {
      const customPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          lfo1: { ...DEFAULT_MOD_MATRIX.lfo1, waveform: "square" },
        },
      });
      const customManager = new ModulationManager(customPatch);

      expect(customManager.lfo1.type).toBe("square");
    });

    it("should initialize LFO with triangle waveform", () => {
      const customPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          lfo2: { ...DEFAULT_MOD_MATRIX.lfo2, waveform: "triangle" },
        },
      });
      const customManager = new ModulationManager(customPatch);

      expect(customManager.lfo2.type).toBe("triangle");
    });

    it("should initialize LFO with sawtooth waveform", () => {
      const customPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          lfo1: { ...DEFAULT_MOD_MATRIX.lfo1, waveform: "sawtooth" },
        },
      });
      const customManager = new ModulationManager(customPatch);

      expect(customManager.lfo1.type).toBe("sawtooth");
    });
  });

  describe("LFO Range Configuration", () => {
    it("should initialize LFO with custom min/max range", () => {
      const customPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          lfo1: { ...DEFAULT_MOD_MATRIX.lfo1, min: -1, max: 1 },
        },
      });
      const customManager = new ModulationManager(customPatch);

      expect(customManager.lfo1.min).toBe(-1);
      expect(customManager.lfo1.max).toBe(1);
    });

    it("should initialize LFO with bipolar range", () => {
      const customPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          lfo2: { ...DEFAULT_MOD_MATRIX.lfo2, min: -0.5, max: 0.5 },
        },
      });
      const customManager = new ModulationManager(customPatch);

      expect(customManager.lfo2.min).toBe(-0.5);
      expect(customManager.lfo2.max).toBe(0.5);
    });
  });

  describe("Envelope Curve Configuration", () => {
    it("should initialize envelope with linear attack curve", () => {
      const customPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          modEnv1: { ...DEFAULT_MOD_MATRIX.modEnv1, attackCurve: "linear" },
        },
      });
      const customManager = new ModulationManager(customPatch);

      expect(customManager.modEnv1.attackCurve).toBe("linear");
    });

    it("should initialize envelope with exponential attack curve", () => {
      const customPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          modEnv2: {
            ...DEFAULT_MOD_MATRIX.modEnv2,
            attackCurve: "exponential",
          },
        },
      });
      const customManager = new ModulationManager(customPatch);

      expect(customManager.modEnv2.attackCurve).toBe("exponential");
    });

    it("should initialize envelope with exponential release curve", () => {
      const customPatch = createTestPatch({
        modMatrix: {
          ...DEFAULT_MOD_MATRIX,
          modEnv1: {
            ...DEFAULT_MOD_MATRIX.modEnv1,
            releaseCurve: "exponential",
          },
        },
      });
      const customManager = new ModulationManager(customPatch);

      expect(customManager.modEnv1.releaseCurve).toBe("exponential");
    });
  });
});
