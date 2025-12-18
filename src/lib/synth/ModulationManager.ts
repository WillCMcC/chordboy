/**
 * ModulationManager - LFOs and modulation envelopes
 * @module lib/synth/ModulationManager
 */

import * as Tone from "tone";
import type { CustomPatch, ModRouting } from "../../types/synth";

/**
 * Convert frequency in Hz to nearest musical subdivision for synced LFOs
 * At 120 BPM: 1n = 0.5Hz, 2n = 1Hz, 4n = 2Hz, 8n = 4Hz
 */
export function frequencyToSyncedValue(hz: number): string {
  if (hz <= 0.25) return "1m"; // 1 measure
  if (hz <= 0.5) return "1n"; // Whole note
  if (hz <= 1) return "2n"; // Half note
  if (hz <= 2) return "4n"; // Quarter note
  if (hz <= 4) return "8n"; // Eighth note
  if (hz <= 8) return "16n"; // Sixteenth note
  return "32n"; // Thirty-second note
}

/**
 * Manages modulation sources (LFOs, envelopes) and routings
 */
export class ModulationManager {
  public lfo1: Tone.LFO;
  public lfo2: Tone.LFO;
  public modEnv1: Tone.Envelope;
  public modEnv2: Tone.Envelope;
  public velocitySignal: Tone.Signal<"normalRange">;
  public keytrackSignal: Tone.Signal<"normalRange">;
  public modwheelSignal: Tone.Signal<"normalRange">;
  public aftertouchSignal: Tone.Signal<"normalRange">;

  private activeConnections = new Map<
    string,
    Tone.Signal | Tone.ToneAudioNode
  >();
  private modConnections = new Map<string, Tone.ToneAudioNode>();

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
      // Use syncRate if available, otherwise fall back to frequency conversion
      this.lfo1.frequency.value =
        patch.modMatrix.lfo1.syncRate ||
        frequencyToSyncedValue(patch.modMatrix.lfo1.frequency);
    }
    if (patch.modMatrix.lfo2.sync) {
      this.lfo2.sync();
      this.lfo2.frequency.value =
        patch.modMatrix.lfo2.syncRate ||
        frequencyToSyncedValue(patch.modMatrix.lfo2.frequency);
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
  connectModulation(
    routing: ModRouting,
    target: Tone.Signal | Tone.Param,
  ): void {
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
  getModSource(
    source: string,
  ): Tone.LFO | Tone.Envelope | Tone.Signal<any> | null {
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
  getModTarget(destination: string): Tone.Signal<any> | Tone.Param<any> | null {
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
  storeConnection(id: string, node: Tone.ToneAudioNode): void {
    // Dispose existing connection if any
    const existing = this.modConnections.get(id);
    if (existing) {
      existing.dispose();
    }
    this.modConnections.set(id, node);
  }

  /**
   * Clear all modulation connections (for re-applying routings)
   * CRITICAL: Must call disconnect() before dispose() to cleanly break all connections
   */
  clearModConnections(): void {
    // First pass: disconnect all nodes from their outputs
    for (const [id, node] of this.modConnections.entries()) {
      try {
        node.disconnect();
      } catch (e) {
        console.warn(`[ModulationManager] Error disconnecting ${id}:`, e);
      }
    }

    // Second pass: dispose all nodes
    for (const [id, node] of this.modConnections.entries()) {
      try {
        node.dispose();
      } catch (e) {
        console.warn(`[ModulationManager] Error disposing ${id}:`, e);
      }
    }

    this.modConnections.clear();
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
   * Update LFO parameters
   */
  updateLFO(
    lfoNum: 1 | 2,
    param: string,
    value: number | boolean | string,
  ): void {
    const lfo = lfoNum === 1 ? this.lfo1 : this.lfo2;
    const lfoConfig =
      lfoNum === 1 ? this.patch.modMatrix.lfo1 : this.patch.modMatrix.lfo2;

    switch (param) {
      case "frequency":
        if (typeof value === "number") {
          // Only apply if sync is off (use syncRate when synced)
          if (!lfoConfig.sync) {
            lfo.frequency.value = value;
          }
        }
        break;
      case "syncRate":
        if (typeof value === "string" && lfoConfig.sync) {
          lfo.frequency.value = value;
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
            // Use syncRate if available, otherwise convert frequency
            lfo.frequency.value =
              lfoConfig.syncRate || frequencyToSyncedValue(lfoConfig.frequency);
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
