/**
 * VoicePool - Polyphonic voice management
 * @module lib/synth/VoicePool
 */

import * as Tone from "tone";
import type {
  CustomPatch,
  EnvelopeConfig,
  FilterEnvelopeConfig,
  OscillatorConfig,
} from "../../types/synth";
import { CustomVoice } from "./CustomVoice";

/**
 * Manages pool of voices for polyphony with note stealing
 */
export class VoicePool {
  private voices: CustomVoice[] = [];
  private activeNotes = new Map<number, CustomVoice>();
  private readonly maxVoices = 8;
  private filterModConnected = false;

  // Shared filter modulation signals (engine-level targets)
  // Use "number" type for frequency offset (not "frequency" which has special 0Hz handling)
  public filterFrequencyMod: Tone.Signal<"number">;
  public filterResonanceMod: Tone.Signal<"number">;

  constructor(
    private patch: CustomPatch,
    private destination: Tone.InputNode,
  ) {
    // Create shared filter modulation signals for LFO routing
    // Initialize to 0 since these are OFFSETS that get ADDED to the filter's base values
    // Use "number" type to avoid Tone.js frequency-specific conversions at 0Hz
    this.filterFrequencyMod = new Tone.Signal(0, "number");
    this.filterResonanceMod = new Tone.Signal(0, "number");
    this.createVoices();
  }

  /**
   * Get filter frequency parameter for modulation routing
   */
  getFilterFrequencyParam(): Tone.Signal<"number"> {
    return this.filterFrequencyMod;
  }

  /**
   * Get filter resonance parameter for modulation routing
   */
  getFilterResonanceParam(): Tone.Signal<"number"> {
    return this.filterResonanceMod;
  }

  /**
   * Connect filter modulation signals to all voices (called on-demand when filter routings exist)
   * Only connects once per voice pool lifecycle
   */
  connectFilterMod(): void {
    if (this.filterModConnected) return;
    for (const voice of this.voices) {
      voice.connectFilterMod();
    }
    this.filterModConnected = true;
  }

  /**
   * Reset filter mod connection state (called when routings are cleared/re-applied)
   * Also resets the modulation signal values to 0 to prevent stuck filter positions
   */
  resetFilterModConnection(): void {
    // CRITICAL: Disconnect filter mod signals from all voices BEFORE clearing connections
    // This prevents disposed modulation nodes from taking the filter connections with them
    if (this.filterModConnected) {
      try {
        this.filterFrequencyMod.disconnect();
        this.filterResonanceMod.disconnect();
      } catch (e) {
        console.warn('[VoicePool] Error disconnecting filter mod signals:', e);
      }
    }

    this.filterModConnected = false;
    // Reset signal values to 0 to prevent stuck filter positions after unrouting
    this.filterFrequencyMod.value = 0;
    this.filterResonanceMod.value = 0;
  }

  /**
   * Create voice pool
   */
  private createVoices(): void {
    for (let i = 0; i < this.maxVoices; i++) {
      const voice = new CustomVoice(
        this.patch,
        this.filterFrequencyMod,
        this.filterResonanceMod,
      );
      voice.connect(this.destination);
      this.voices.push(voice);
    }
  }

  /**
   * Trigger attack on a note
   */
  triggerAttack(note: number, velocity: number = 1): void {
    // If note already playing, retrigger it
    if (this.activeNotes.has(note)) {
      const voice = this.activeNotes.get(note)!;
      voice.triggerAttack(note, velocity);
      return;
    }

    // Find available voice or steal oldest
    let voice = this.voices.find((v) => !v.isActive);

    if (!voice) {
      // Find oldest active voice by triggeredAt timestamp
      voice = this.voices.reduce((oldest, v) =>
        v.triggeredAt < oldest.triggeredAt ? v : oldest,
      );
      if (voice.note !== null) {
        this.activeNotes.delete(voice.note);
      }
      // Cancel envelopes immediately instead of triggering release
      // This prevents envelope state corruption when re-triggering
      voice.cancelEnvelopes(Tone.now());
    }

    voice.triggerAttack(note, velocity);
    this.activeNotes.set(note, voice);
  }

  /**
   * Trigger release on a note
   */
  triggerRelease(note: number): void {
    const voice = this.activeNotes.get(note);
    if (voice) {
      voice.triggerRelease();
      this.activeNotes.delete(note);
    }
  }

  /**
   * Release all active notes
   */
  releaseAll(): void {
    for (const voice of this.voices) {
      if (voice.isActive) {
        voice.triggerRelease();
      }
    }
    this.activeNotes.clear();
  }

  /**
   * Update oscillator mix on all voices
   */
  setOscMix(mix: number): void {
    for (const voice of this.voices) {
      voice.setOscMix(mix);
    }
  }

  /**
   * Update oscillator on all voices
   */
  updateOscillator(oscNum: 1 | 2, config: OscillatorConfig): void {
    for (const voice of this.voices) {
      voice.updateOscillator(oscNum, config);
    }
  }

  /**
   * Update filter on all voices
   */
  updateFilter(frequency: number, resonance: number, type?: string): void {
    for (const voice of this.voices) {
      voice.updateFilter(frequency, resonance, type);
    }
  }

  /**
   * Update amp envelope on all voices
   */
  updateAmpEnvelope(env: EnvelopeConfig): void {
    for (const voice of this.voices) {
      voice.updateAmpEnvelope(env);
    }
  }

  /**
   * Update filter envelope on all voices
   */
  updateFilterEnvelope(
    env: FilterEnvelopeConfig,
    filterFreq: number,
    envAmount: number,
  ): void {
    for (const voice of this.voices) {
      voice.updateFilterEnvelope(env, filterFreq, envAmount);
    }
  }

  /**
   * Rebuild voice pool with new patch.
   * Waits for release envelopes to complete before disposing to prevent audio glitches.
   */
  rebuild(patch: CustomPatch): void {
    // Calculate max release time from current patch
    const maxRelease = Math.max(
      this.patch.ampEnvelope.release,
      this.patch.filter.enabled ? this.patch.filterEnvelope.release : 0,
    );

    // Release all voices
    this.releaseAll();

    // Store old voices for delayed disposal
    const oldVoices = this.voices;
    const oldFilterFreqMod = this.filterFrequencyMod;
    const oldFilterResMod = this.filterResonanceMod;

    // Clear state immediately
    this.voices = [];
    this.activeNotes.clear();
    this.filterModConnected = false;
    this.patch = patch;

    // Create new filter mod signals for new voices
    this.filterFrequencyMod = new Tone.Signal(0, "number");
    this.filterResonanceMod = new Tone.Signal(0, "number");

    // Create new voices immediately (so new notes can play)
    this.createVoices();

    // Dispose old voices after release completes (add 100ms buffer)
    const disposeDelay = maxRelease * 1000 + 100;
    setTimeout(() => {
      for (const voice of oldVoices) {
        try {
          voice.dispose();
        } catch {
          // Ignore disposal errors
        }
      }
      try {
        oldFilterFreqMod.dispose();
        oldFilterResMod.dispose();
      } catch {
        // Ignore disposal errors
      }
    }, disposeDelay);
  }

  /**
   * Dispose of all voices
   */
  dispose(): void {
    for (const voice of this.voices) {
      voice.dispose();
    }
    this.voices = [];
    this.activeNotes.clear();
    this.filterFrequencyMod.dispose();
    this.filterResonanceMod.dispose();
  }
}
