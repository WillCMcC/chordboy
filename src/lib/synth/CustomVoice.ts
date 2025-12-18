/**
 * CustomVoice - Single polyphonic voice
 * @module lib/synth/CustomVoice
 */

import * as Tone from "tone";
import type {
  CustomPatch,
  EnvelopeConfig,
  FilterEnvelopeConfig,
  OscillatorConfig,
} from "../../types/synth";

/**
 * Single voice with 2 oscillators, filter, and amplitude envelope
 */
export class CustomVoice {
  private osc1: Tone.OmniOscillator<any>;
  private osc2: Tone.OmniOscillator<any>;
  private mixer: Tone.CrossFade;
  private filter: Tone.Filter;
  private filterEnv: Tone.FrequencyEnvelope;
  private ampEnv: Tone.AmplitudeEnvelope;
  private output: Tone.Gain;

  public note: number | null = null;
  public isActive = false;
  public triggeredAt: number = 0;

  constructor(
    private patch: CustomPatch,
    private filterFreqMod?: Tone.Signal<"number">,
    private filterResMod?: Tone.Signal<"number">,
  ) {
    // Create oscillators - mute if disabled
    this.osc1 = new Tone.OmniOscillator({
      type: patch.osc1.waveform,
      detune: patch.osc1.detune,
      volume: patch.osc1.enabled ? Tone.gainToDb(patch.osc1.volume) : -Infinity,
    });

    this.osc2 = new Tone.OmniOscillator({
      type: patch.osc2.waveform,
      detune: patch.osc2.detune,
      volume: patch.osc2.enabled ? Tone.gainToDb(patch.osc2.volume) : -Infinity,
    });

    // Calculate effective mix based on which oscillators are enabled
    const effectiveMix = this.calculateEffectiveMix(patch);
    this.mixer = new Tone.CrossFade(effectiveMix);

    // Filter
    this.filter = new Tone.Filter({
      type: patch.filter.type,
      frequency: patch.filter.frequency,
      Q: patch.filter.resonance,
      rolloff: patch.filter.rolloff,
    });

    // Filter envelope
    this.filterEnv = new Tone.FrequencyEnvelope({
      attack: patch.filterEnvelope.attack,
      decay: patch.filterEnvelope.decay,
      sustain: patch.filterEnvelope.sustain,
      release: patch.filterEnvelope.release,
      baseFrequency: patch.filter.frequency,
      octaves: patch.filterEnvelope.octaves * patch.filter.envelopeAmount,
      attackCurve: patch.filterEnvelope.attackCurve,
      releaseCurve: patch.filterEnvelope.releaseCurve,
    });

    // Amplitude envelope
    this.ampEnv = new Tone.AmplitudeEnvelope({
      attack: patch.ampEnvelope.attack,
      decay: patch.ampEnvelope.decay,
      sustain: patch.ampEnvelope.sustain,
      release: patch.ampEnvelope.release,
      attackCurve: patch.ampEnvelope.attackCurve,
      releaseCurve: patch.ampEnvelope.releaseCurve,
    });

    // Output gain
    this.output = new Tone.Gain(1);

    // Signal chain: oscs → mixer → filter → ampEnv → output
    this.osc1.connect(this.mixer.a);
    this.osc2.connect(this.mixer.b);
    this.mixer.connect(this.filter);

    // NOTE: Filter mod signals (filterFreqMod, filterResMod) are NOT connected here.
    // They are connected on-demand by VoicePool.connectFilterMod() only when there
    // are active modulation routings targeting the filter. This prevents 0-valued
    // signals from interfering with the filter's base frequency.

    // Connect filter envelope only if filter enabled AND envelope amount is non-zero
    if (patch.filter.enabled && patch.filter.envelopeAmount !== 0) {
      this.filterEnv.connect(this.filter.frequency);
    }

    this.filter.connect(this.ampEnv);
    this.ampEnv.connect(this.output);

    // Start oscillators (muted until envelope triggers)
    this.osc1.start();
    this.osc2.start();
  }

  /**
   * Trigger note attack
   */
  triggerAttack(note: number, velocity: number = 1, time?: number): void {
    this.triggeredAt = Tone.now();
    const freq = Tone.Frequency(note, "midi").toFrequency();

    // Apply octave shifts
    const osc1Freq = freq * Math.pow(2, this.patch.osc1.octave);
    const osc2Freq = freq * Math.pow(2, this.patch.osc2.octave);

    // Set frequencies with portamento if enabled
    if (this.patch.glide > 0) {
      const glideTime = this.patch.glide / 1000;
      this.osc1.frequency.rampTo(osc1Freq, glideTime, time);
      this.osc2.frequency.rampTo(osc2Freq, glideTime, time);
    } else {
      this.osc1.frequency.setValueAtTime(osc1Freq, time ?? Tone.now());
      this.osc2.frequency.setValueAtTime(osc2Freq, time ?? Tone.now());
    }

    // Apply key tracking to filter
    if (this.patch.filter.keyTracking > 0) {
      const trackingAmount = (note - 60) / 12; // Semitones from middle C
      const trackingFreq =
        this.patch.filter.frequency *
        Math.pow(2, trackingAmount * this.patch.filter.keyTracking);
      const clampedTrackingFreq = Math.max(20, Math.min(20000, trackingFreq));
      this.filter.frequency.setValueAtTime(
        clampedTrackingFreq,
        time ?? Tone.now(),
      );
      this.filterEnv.baseFrequency = clampedTrackingFreq;
    }

    // Trigger envelopes with velocity
    this.ampEnv.triggerAttack(time, velocity);
    if (this.patch.filter.enabled && this.patch.filter.envelopeAmount !== 0) {
      this.filterEnv.triggerAttack(time);
    }

    this.note = note;
    this.isActive = true;
  }

  /**
   * Trigger note release
   */
  triggerRelease(time?: number): void {
    this.ampEnv.triggerRelease(time);
    if (this.patch.filter.enabled && this.patch.filter.envelopeAmount !== 0) {
      this.filterEnv.triggerRelease(time);
    }
    this.isActive = false;
  }

  /**
   * Cancel envelopes immediately (for voice stealing).
   * This resets envelope state to prevent corruption when re-triggering.
   */
  cancelEnvelopes(time?: number): void {
    const t = time ?? Tone.now();
    // Use cancel if available (Tone.js), otherwise fall back to triggerRelease
    if (typeof this.ampEnv.cancel === "function") {
      this.ampEnv.cancel(t);
    } else {
      this.ampEnv.triggerRelease(t);
    }
    if (this.patch.filter.enabled && this.patch.filter.envelopeAmount !== 0) {
      if (typeof this.filterEnv.cancel === "function") {
        this.filterEnv.cancel(t);
      } else {
        this.filterEnv.triggerRelease(t);
      }
    }
    this.isActive = false;
    this.note = null;
  }

  /**
   * Calculate effective mix based on which oscillators are enabled
   * Returns: 0 = all osc1, 0.5 = equal, 1 = all osc2
   */
  private calculateEffectiveMix(patch: CustomPatch): number {
    const osc1On = patch.osc1.enabled;
    const osc2On = patch.osc2.enabled;

    if (osc1On && osc2On) {
      // Both enabled - use the mix value
      return patch.oscMix;
    } else if (osc1On && !osc2On) {
      // Only osc1 - full left
      return 0;
    } else if (!osc1On && osc2On) {
      // Only osc2 - full right
      return 1;
    } else {
      // Neither enabled (shouldn't happen) - default to osc1
      return 0;
    }
  }

  /**
   * Update oscillator mix
   */
  setOscMix(mix: number): void {
    // Update the patch with new mix value
    this.patch.oscMix = mix;
    // Recalculate effective mix based on current enabled states
    const effectiveMix = this.calculateEffectiveMix(this.patch);
    this.mixer.fade.value = effectiveMix;
  }

  /**
   * Update oscillator parameters live
   */
  updateOscillator(oscNum: 1 | 2, config: OscillatorConfig): void {
    const osc = oscNum === 1 ? this.osc1 : this.osc2;
    const prevEnabled =
      oscNum === 1 ? this.patch.osc1.enabled : this.patch.osc2.enabled;

    // Update waveform
    try {
      osc.type = config.waveform as any;
    } catch {
      // Some waveform transitions may fail, ignore
    }

    // Update detune
    osc.detune.value = config.detune;

    // Update volume
    osc.volume.value = Tone.gainToDb(config.enabled ? config.volume : 0);

    // Store config in patch for next note trigger
    if (oscNum === 1) {
      this.patch.osc1 = config;
    } else {
      this.patch.osc2 = config;
    }

    // Recalculate mix if enabled state changed
    if (prevEnabled !== config.enabled) {
      const effectiveMix = this.calculateEffectiveMix(this.patch);
      this.mixer.fade.value = effectiveMix;
    }
  }

  /**
   * Update filter parameters live
   */
  updateFilter(frequency: number, resonance: number, type?: string): void {
    // Update type first as it affects Q constraints
    if (type) {
      try {
        this.filter.type = type as BiquadFilterType;
      } catch {
        // Ignore type change errors
      }
    }

    // Clamp frequency to valid range (20Hz - 20kHz)
    const clampedFreq = Math.max(20, Math.min(20000, frequency));
    try {
      this.filter.frequency.rampTo(clampedFreq, 0.05);
    } catch {
      // Fallback to direct assignment
      try {
        this.filter.frequency.value = clampedFreq;
      } catch {
        // Ignore if completely fails
      }
    }

    // Q has different valid ranges depending on filter type
    // Some filter types (allpass, etc.) don't support Q or have collapsed ranges
    // Use direct value assignment with extra protection
    // Clamp to safe musical range (max 8) to prevent self-oscillation and volume spikes
    const clampedQ = Math.max(0.1, Math.min(8, resonance));
    try {
      // Check if Q signal exists and has a valid range before updating
      const qSignal = this.filter.Q;
      if (qSignal && typeof qSignal.value === "number") {
        // Use direct assignment instead of rampTo to avoid interpolation issues
        qSignal.value = clampedQ;
      }
    } catch {
      // Filter type doesn't support Q changes, silently ignore
    }
  }

  /**
   * Update amplitude envelope parameters
   */
  updateAmpEnvelope(env: EnvelopeConfig): void {
    this.ampEnv.attack = env.attack;
    this.ampEnv.decay = env.decay;
    this.ampEnv.sustain = env.sustain;
    this.ampEnv.release = env.release;
  }

  /**
   * Update filter envelope parameters
   */
  updateFilterEnvelope(
    env: FilterEnvelopeConfig,
    filterFreq: number,
    envAmount: number,
  ): void {
    this.filterEnv.attack = env.attack;
    this.filterEnv.decay = env.decay;
    this.filterEnv.sustain = env.sustain;
    this.filterEnv.release = env.release;
    this.filterEnv.baseFrequency = filterFreq;
    this.filterEnv.octaves = env.octaves * envAmount;
  }

  /**
   * Connect filter modulation signals (called on-demand when filter routings exist)
   */
  connectFilterMod(): void {
    if (this.filterFreqMod) {
      this.filterFreqMod.connect(this.filter.frequency);
    }
    if (this.filterResMod) {
      this.filterResMod.connect(this.filter.Q);
    }
  }

  /**
   * Connect voice output to destination
   */
  connect(destination: Tone.InputNode): this {
    this.output.connect(destination);
    return this;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Stop oscillators first to prevent audio glitches
    try {
      this.osc1.stop();
      this.osc2.stop();
    } catch {
      // Ignore errors if oscillators already stopped
    }

    // Disconnect all nodes from the audio graph before disposing
    this.output.disconnect();
    this.ampEnv.disconnect();
    this.filter.disconnect();
    this.mixer.disconnect();
    this.osc1.disconnect();
    this.osc2.disconnect();
    this.filterEnv.disconnect();

    // Now dispose
    this.osc1.dispose();
    this.osc2.dispose();
    this.mixer.dispose();
    this.filter.dispose();
    this.filterEnv.dispose();
    this.ampEnv.dispose();
    this.output.dispose();
  }
}
