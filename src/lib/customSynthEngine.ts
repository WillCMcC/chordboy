/**
 * Custom Synth Engine for ChordBoy
 * 2-oscillator subtractive synthesizer with full modulation matrix
 *
 * @module lib/customSynthEngine
 */

import * as Tone from "tone";
import type {
  CustomPatch,
  ModRouting,
  EffectConfig,
  FilterEnvelopeConfig,
  EnvelopeConfig,
  OscillatorConfig,
} from "../types/synth";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert frequency in Hz to nearest musical subdivision for synced LFOs
 * At 120 BPM: 1n = 0.5Hz, 2n = 1Hz, 4n = 2Hz, 8n = 4Hz
 */
function frequencyToSyncedValue(hz: number): string {
  if (hz <= 0.25) return "1m"; // 1 measure
  if (hz <= 0.5) return "1n"; // Whole note
  if (hz <= 1) return "2n"; // Half note
  if (hz <= 2) return "4n"; // Quarter note
  if (hz <= 4) return "8n"; // Eighth note
  if (hz <= 8) return "16n"; // Sixteenth note
  return "32n"; // Thirty-second note
}

// ============================================================================
// CustomVoice - Single polyphonic voice
// ============================================================================

/**
 * Single voice with 2 oscillators, filter, and amplitude envelope
 */
class CustomVoice {
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

// ============================================================================
// VoicePool - Polyphonic voice management
// ============================================================================

/**
 * Manages pool of voices for polyphony with note stealing
 */
class VoicePool {
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
   */
  resetFilterModConnection(): void {
    this.filterModConnected = false;
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
      voice.triggerRelease(Tone.now());
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
   * Rebuild voice pool with new patch
   */
  rebuild(patch: CustomPatch): void {
    this.releaseAll();
    this.dispose();
    this.voices = [];
    this.activeNotes.clear(); // Clear tracking state
    this.filterModConnected = false; // Reset so filter mod can be reconnected if needed
    this.patch = patch;
    this.createVoices();
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

// ============================================================================
// ModulationManager - LFOs and modulation envelopes
// ============================================================================

/**
 * Manages modulation sources (LFOs, envelopes) and routings
 */
class ModulationManager {
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
   */
  clearModConnections(): void {
    for (const node of this.modConnections.values()) {
      try {
        node.disconnect();
        node.dispose();
      } catch {
        // Ignore errors
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

// ============================================================================
// Effects Chain Helper
// ============================================================================

/**
 * Create Tone.js effect from configuration
 */
function createEffect(config: EffectConfig): Tone.ToneAudioNode | null {
  if (!config.enabled) return null;

  const params = config.params;

  switch (config.type) {
    case "chorus":
      return new Tone.Chorus({
        frequency: params.frequency as number,
        delayTime: params.delayTime as number,
        depth: params.depth as number,
        wet: config.wet,
      }).start();

    case "phaser":
      return new Tone.Phaser({
        frequency: params.frequency as number,
        octaves: params.octaves as number,
        baseFrequency: params.baseFrequency as number,
        wet: config.wet,
      });

    case "vibrato":
      return new Tone.Vibrato({
        frequency: params.frequency as number,
        depth: params.depth as number,
        wet: config.wet,
      });

    case "tremolo":
      return new Tone.Tremolo({
        frequency: params.frequency as number,
        depth: params.depth as number,
        wet: config.wet,
      }).start();

    case "reverb":
      return new Tone.Reverb({
        decay: params.decay as number,
        preDelay: params.preDelay as number,
        wet: config.wet,
      });

    case "delay":
      return new Tone.FeedbackDelay({
        delayTime: params.delayTime as number,
        feedback: params.feedback as number,
        wet: config.wet,
      });

    case "pingpong":
      return new Tone.PingPongDelay({
        delayTime: params.delayTime as number,
        feedback: params.feedback as number,
        wet: config.wet,
      });

    case "distortion":
      return new Tone.Distortion({
        distortion: params.distortion as number,
        oversample: params.oversample as "none" | "2x" | "4x",
        wet: config.wet,
      });

    case "bitcrusher": {
      const bitcrusher = new Tone.BitCrusher({
        bits: params.bits as number,
      });
      bitcrusher.wet.value = config.wet;
      return bitcrusher;
    }

    case "compressor": {
      // Compressor doesn't have native wet/dry, so create manual wet/dry mixing
      const compressor = new Tone.Compressor({
        threshold: params.threshold as number,
        ratio: params.ratio as number,
        attack: params.attack as number,
        release: params.release as number,
      });

      // Create parallel dry/wet paths with proper wet/dry mixing
      const dryGain = new Tone.Gain(1 - config.wet);
      const wetGain = new Tone.Gain(config.wet);
      const mixer = new Tone.Gain(1);

      // Input splitter
      const splitter = new Tone.Gain(1);

      // Connect: input -> splitter -> [dry path, compressed path] -> mixer
      splitter.connect(dryGain);
      splitter.connect(compressor);
      compressor.connect(wetGain);
      dryGain.connect(mixer);
      wetGain.connect(mixer);

      // Store internal nodes for disposal and wet/dry updates
      (mixer as any)._compressor = compressor;
      (mixer as any)._dryGain = dryGain;
      (mixer as any)._wetGain = wetGain;
      (mixer as any)._splitter = splitter;
      (mixer as any).input = splitter;

      // Create a wet control that updates both gains
      (mixer as any).wet = {
        get value() {
          return (mixer as any)._wetValue || config.wet;
        },
        set value(v: number) {
          (mixer as any)._wetValue = v;
          dryGain.gain.value = 1 - v;
          wetGain.gain.value = v;
        },
      };
      (mixer as any)._wetValue = config.wet;

      // Override dispose to clean up all internal nodes
      const originalDispose = mixer.dispose.bind(mixer);
      (mixer as any).dispose = () => {
        try {
          splitter.disconnect();
          dryGain.disconnect();
          compressor.disconnect();
          wetGain.disconnect();

          splitter.dispose();
          dryGain.dispose();
          compressor.dispose();
          wetGain.dispose();
          originalDispose();
        } catch (e) {
          // Ignore disposal errors
        }
      };

      return mixer;
    }

    case "autofilter":
      return new Tone.AutoFilter({
        frequency: params.frequency as number,
        depth: params.depth as number,
        baseFrequency: params.baseFrequency as number,
        wet: config.wet,
      }).start();

    case "autopanner":
      return new Tone.AutoPanner({
        frequency: params.frequency as number,
        depth: params.depth as number,
        wet: config.wet,
      }).start();

    case "autowah":
      return new Tone.AutoWah({
        baseFrequency: params.baseFrequency as number,
        octaves: params.octaves as number,
        sensitivity: params.sensitivity as number,
        wet: config.wet,
      });

    default:
      console.warn(`Unknown effect type: ${config.type}`);
      return null;
  }
}

/**
 * Create and chain effects from configs
 */
function createEffectsChain(effects: EffectConfig[]): Tone.ToneAudioNode[] {
  const chain: Tone.ToneAudioNode[] = [];

  for (const effectConfig of effects) {
    const effect = createEffect(effectConfig);
    if (effect) {
      chain.push(effect);
    }
  }

  // Chain effects together
  for (let i = 0; i < chain.length - 1; i++) {
    chain[i].connect(chain[i + 1]);
  }

  return chain;
}

// ============================================================================
// CustomSynthEngine - Main synth engine
// ============================================================================

/**
 * Main custom synthesizer engine
 * Manages voice pool, modulation, and effects chain
 */
export class CustomSynthEngine {
  private voicePool: VoicePool;
  private modManager: ModulationManager;
  private effectsChain: Tone.ToneAudioNode[] = [];
  private masterGain: Tone.Gain;
  private patch: CustomPatch;

  constructor(patch: CustomPatch) {
    this.patch = patch;

    // Master output gain
    this.masterGain = new Tone.Gain(patch.masterVolume);

    // Create effects chain
    this.effectsChain = createEffectsChain(patch.effects);

    // Determine voice pool destination
    const voiceDestination =
      this.effectsChain.length > 0 ? this.effectsChain[0] : this.masterGain;

    // Create voice pool
    this.voicePool = new VoicePool(patch, voiceDestination);

    // Connect effects chain to master
    if (this.effectsChain.length > 0) {
      this.effectsChain[this.effectsChain.length - 1].connect(this.masterGain);
    }

    // Connect master to destination
    this.masterGain.toDestination();

    // Create modulation manager
    this.modManager = new ModulationManager(patch);

    // Apply modulation routings
    this.applyModulationRoutings();
  }

  /**
   * Apply modulation matrix routings
   * Connects mod sources to engine-level destinations (lfo rates, filter freq, master volume)
   */
  private applyModulationRoutings(): void {
    for (const routing of this.patch.modMatrix.routings) {
      if (!routing.enabled || routing.amount === 0) continue;

      // Skip routing if its source LFO is disabled (would output static 0 causing filter issues)
      if (routing.source === "lfo1" && !this.patch.modMatrix.lfo1.enabled)
        continue;
      if (routing.source === "lfo2" && !this.patch.modMatrix.lfo2.enabled)
        continue;

      const source = this.modManager.getModSource(routing.source);
      if (!source) {
        console.debug(`Unknown mod source: ${routing.source}`);
        continue;
      }

      let target: Tone.Signal<any> | Tone.Param<any> | null = null;

      // Get target based on destination
      switch (routing.destination) {
        case "lfo1_rate":
        case "lfo2_rate":
          target = this.modManager.getModTarget(routing.destination);
          break;
        case "filter_freq":
          // Connect filter mod signals to voices on-demand (only when routing exists)
          this.voicePool.connectFilterMod();
          target = this.voicePool.getFilterFrequencyParam();
          break;
        case "filter_res":
          // Connect filter mod signals to voices on-demand (only when routing exists)
          this.voicePool.connectFilterMod();
          target = this.voicePool.getFilterResonanceParam();
          break;
        case "amp_volume":
          target = this.masterGain.gain;
          break;
        default:
          console.debug(
            `Unimplemented mod destination: ${routing.destination}`,
          );
          continue;
      }

      if (!target) continue;

      // Create modulation connection with destination-specific scaling
      // For filter frequency, we need to scale to an audible range (Hz)
      // For amp/volume, we keep normalized values

      let scaledSource: Tone.ToneAudioNode;

      switch (routing.destination) {
        case "filter_freq": {
          // Filter frequency modulation: scale to ±4000 Hz range at 100%
          // LFO typically outputs 0-1, so center it around 0 (-0.5 to +0.5)
          // then scale by amount and frequency range
          const center = new Tone.Add(-0.5);
          const scale = new Tone.Multiply(routing.amount * 8000); // ±4000 Hz at full amount
          source.connect(center);
          center.connect(scale);
          scaledSource = scale;

          // Store intermediate nodes for cleanup
          this.modManager.storeConnection(`${routing.id}-center`, center);
          this.modManager.storeConnection(`${routing.id}-scale`, scale);
          break;
        }
        case "filter_res": {
          // Filter resonance modulation: scale to ±6 Q range at 100%
          // LFO outputs 0-1, center around 0 and scale by amount
          const center = new Tone.Add(-0.5);
          const scale = new Tone.Multiply(routing.amount * 12); // ±6 Q at full amount
          source.connect(center);
          center.connect(scale);
          scaledSource = scale;

          this.modManager.storeConnection(`${routing.id}-center`, center);
          this.modManager.storeConnection(`${routing.id}-scale`, scale);
          break;
        }
        case "amp_volume": {
          // Amplitude modulation (tremolo): scale to ±0.5 gain at 100%
          // LFO outputs 0-1, center around 0 and scale by amount
          const center = new Tone.Add(-0.5);
          const scale = new Tone.Multiply(routing.amount); // ±0.5 gain at full amount
          source.connect(center);
          center.connect(scale);
          scaledSource = scale;
          this.modManager.storeConnection(`${routing.id}-center`, center);
          this.modManager.storeConnection(`${routing.id}-scale`, scale);
          break;
        }
        default: {
          // Default: just multiply by amount
          const multiply = new Tone.Multiply(routing.amount);
          source.connect(multiply);
          scaledSource = multiply;
          this.modManager.storeConnection(`${routing.id}-multiply`, multiply);
          break;
        }
      }

      // Connect to target
      scaledSource.connect(target);
    }
  }

  /**
   * Trigger note attack
   */
  triggerAttack(note: number, velocity: number = 1): void {
    this.voicePool.triggerAttack(note, velocity);
    this.modManager.setVelocity(velocity);
    this.modManager.setKeytrack(note);
    this.modManager.triggerAttack();
  }

  /**
   * Trigger note release
   */
  triggerRelease(note: number): void {
    this.voicePool.triggerRelease(note);
    this.modManager.triggerRelease();
  }

  /**
   * Release all notes
   */
  releaseAll(): void {
    this.voicePool.releaseAll();
  }

  /**
   * Update single parameter (for live tweaking)
   */
  updateParameter(param: string, value: number): void {
    const parts = param.split(".");

    switch (parts[0]) {
      case "oscMix":
        this.voicePool.setOscMix(value);
        break;

      case "masterVolume":
        this.masterGain.gain.rampTo(value, 0.05);
        break;

      case "lfo1":
        this.modManager.updateLFO(1, parts[1], value);
        break;

      case "lfo2":
        this.modManager.updateLFO(2, parts[1], value);
        break;

      default:
        console.warn(`Unknown parameter: ${param}`);
    }
  }

  /**
   * Update patch parameters live without rebuilding (for continuous playback during editing)
   * Only rebuilds if effects chain structure changes
   */
  updatePatchLive(newPatch: CustomPatch): boolean {
    const oldPatch = this.patch;

    // Check if effects chain structure changed (requires rebuild)
    const effectsChanged =
      oldPatch.effects.length !== newPatch.effects.length ||
      oldPatch.effects.some(
        (e, i) =>
          e.type !== newPatch.effects[i]?.type ||
          e.enabled !== newPatch.effects[i]?.enabled,
      );

    // Check if filter rolloff changed (requires rebuild - can't change live)
    const rolloffChanged = oldPatch.filter.rolloff !== newPatch.filter.rolloff;

    if (effectsChanged || rolloffChanged) {
      // Need full rebuild for effects chain, enabled toggle, or rolloff changes
      return false;
    }

    // Update oscillators
    if (JSON.stringify(oldPatch.osc1) !== JSON.stringify(newPatch.osc1)) {
      this.voicePool.updateOscillator(1, newPatch.osc1);
    }
    if (JSON.stringify(oldPatch.osc2) !== JSON.stringify(newPatch.osc2)) {
      this.voicePool.updateOscillator(2, newPatch.osc2);
    }

    // Update osc mix
    if (oldPatch.oscMix !== newPatch.oscMix) {
      this.voicePool.setOscMix(newPatch.oscMix);
    }

    // Update filter
    const filterFreqChanged =
      oldPatch.filter.frequency !== newPatch.filter.frequency;
    const filterResonanceChanged =
      oldPatch.filter.resonance !== newPatch.filter.resonance;
    const filterTypeChanged = oldPatch.filter.type !== newPatch.filter.type;

    if (filterFreqChanged || filterResonanceChanged || filterTypeChanged) {
      this.voicePool.updateFilter(
        newPatch.filter.frequency,
        newPatch.filter.resonance,
        newPatch.filter.type,
      );
    }

    // Update amp envelope
    if (
      JSON.stringify(oldPatch.ampEnvelope) !==
      JSON.stringify(newPatch.ampEnvelope)
    ) {
      this.voicePool.updateAmpEnvelope(newPatch.ampEnvelope);
    }

    // Update filter envelope - ALSO update when filter frequency changes
    // because the envelope's baseFrequency needs to track the filter frequency
    const filterEnvChanged =
      JSON.stringify(oldPatch.filterEnvelope) !==
      JSON.stringify(newPatch.filterEnvelope);
    const envAmountChanged =
      oldPatch.filter.envelopeAmount !== newPatch.filter.envelopeAmount;

    if (filterEnvChanged || envAmountChanged || filterFreqChanged) {
      this.voicePool.updateFilterEnvelope(
        newPatch.filterEnvelope,
        newPatch.filter.frequency,
        newPatch.filter.envelopeAmount,
      );
    }

    // Update master volume
    if (oldPatch.masterVolume !== newPatch.masterVolume) {
      this.masterGain.gain.rampTo(newPatch.masterVolume, 0.05);
    }

    // Update LFOs - track if enabled state changed so we can re-apply routings
    let lfoEnabledChanged = false;

    if (
      JSON.stringify(oldPatch.modMatrix.lfo1) !==
      JSON.stringify(newPatch.modMatrix.lfo1)
    ) {
      const lfo1 = newPatch.modMatrix.lfo1;
      const oldLfo1 = oldPatch.modMatrix.lfo1;

      // Handle enabled state changes FIRST (before modifying other params)
      if (lfo1.enabled !== oldLfo1.enabled) {
        lfoEnabledChanged = true;
        try {
          if (lfo1.enabled) {
            this.modManager.lfo1.start();
          } else {
            this.modManager.lfo1.stop();
          }
        } catch {
          // Ignore start/stop errors
        }
      }

      // Only update params if LFO is enabled
      if (lfo1.enabled) {
        try {
          this.modManager.lfo1.type = lfo1.waveform;
        } catch {
          // Some waveform changes may fail
        }
        this.modManager.lfo1.min = lfo1.min;
        this.modManager.lfo1.max = lfo1.max;

        // Handle sync state changes
        if (lfo1.sync !== oldLfo1.sync) {
          try {
            if (lfo1.sync) {
              this.modManager.lfo1.sync();
            } else {
              this.modManager.lfo1.unsync();
            }
          } catch {
            // Ignore sync errors
          }
        }

        // Update frequency based on sync state
        try {
          if (lfo1.sync) {
            // Use syncRate if available, otherwise fall back to frequency conversion
            this.modManager.lfo1.frequency.value =
              lfo1.syncRate || frequencyToSyncedValue(lfo1.frequency);
          } else {
            this.modManager.lfo1.frequency.value = lfo1.frequency;
          }
        } catch {
          // Ignore frequency errors
        }
      }
    }

    if (
      JSON.stringify(oldPatch.modMatrix.lfo2) !==
      JSON.stringify(newPatch.modMatrix.lfo2)
    ) {
      const lfo2 = newPatch.modMatrix.lfo2;
      const oldLfo2 = oldPatch.modMatrix.lfo2;

      // Handle enabled state changes FIRST (before modifying other params)
      if (lfo2.enabled !== oldLfo2.enabled) {
        lfoEnabledChanged = true;
        try {
          if (lfo2.enabled) {
            this.modManager.lfo2.start();
          } else {
            this.modManager.lfo2.stop();
          }
        } catch {
          // Ignore start/stop errors
        }
      }

      // Only update params if LFO is enabled
      if (lfo2.enabled) {
        try {
          this.modManager.lfo2.type = lfo2.waveform;
        } catch {
          // Some waveform changes may fail
        }
        this.modManager.lfo2.min = lfo2.min;
        this.modManager.lfo2.max = lfo2.max;

        // Handle sync state changes
        if (lfo2.sync !== oldLfo2.sync) {
          try {
            if (lfo2.sync) {
              this.modManager.lfo2.sync();
            } else {
              this.modManager.lfo2.unsync();
            }
          } catch {
            // Ignore sync errors
          }
        }

        // Update frequency based on sync state
        try {
          if (lfo2.sync) {
            // Use syncRate if available, otherwise fall back to frequency conversion
            this.modManager.lfo2.frequency.value =
              lfo2.syncRate || frequencyToSyncedValue(lfo2.frequency);
          } else {
            this.modManager.lfo2.frequency.value = lfo2.frequency;
          }
        } catch {
          // Ignore frequency errors
        }
      }
    }

    // Re-apply modulation routings if LFO enabled state changed
    // (disabled LFOs should have their routings disconnected)
    if (lfoEnabledChanged) {
      this.modManager.clearModConnections();
      this.voicePool.resetFilterModConnection();
      this.patch = newPatch;
      this.applyModulationRoutings();
    }

    // Update effect parameters (without rebuilding chain)
    for (
      let i = 0;
      i < this.effectsChain.length && i < newPatch.effects.length;
      i++
    ) {
      const effect = this.effectsChain[i];
      const config = newPatch.effects[i];
      const params = config.params;

      // Update wet/dry
      if ("wet" in effect) {
        (effect as { wet: { value: number } }).wet.value = config.wet;
      }

      // Update type-specific parameters
      try {
        switch (config.type) {
          case "chorus": {
            const chorus = effect as Tone.Chorus;
            chorus.frequency.value = params.frequency as number;
            chorus.delayTime = params.delayTime as number;
            chorus.depth = params.depth as number;
            break;
          }
          case "phaser": {
            const phaser = effect as Tone.Phaser;
            phaser.frequency.value = params.frequency as number;
            phaser.octaves = params.octaves as number;
            phaser.baseFrequency = params.baseFrequency as number;
            break;
          }
          case "vibrato": {
            const vibrato = effect as Tone.Vibrato;
            vibrato.frequency.value = params.frequency as number;
            vibrato.depth.value = params.depth as number;
            break;
          }
          case "tremolo": {
            const tremolo = effect as Tone.Tremolo;
            tremolo.frequency.value = params.frequency as number;
            tremolo.depth.value = params.depth as number;
            break;
          }
          case "delay": {
            const delay = effect as Tone.FeedbackDelay;
            delay.delayTime.value = params.delayTime as number;
            delay.feedback.value = params.feedback as number;
            break;
          }
          case "pingpong": {
            const pingpong = effect as Tone.PingPongDelay;
            pingpong.delayTime.value = params.delayTime as number;
            pingpong.feedback.value = params.feedback as number;
            break;
          }
          case "distortion": {
            const distortion = effect as Tone.Distortion;
            distortion.distortion = params.distortion as number;
            distortion.oversample = params.oversample as "none" | "2x" | "4x";
            break;
          }
          case "bitcrusher": {
            const bitcrusher = effect as Tone.BitCrusher;
            bitcrusher.bits.value = params.bits as number;
            break;
          }
          case "compressor": {
            // Effect is the mixer node, get actual compressor from it
            const compressor = (effect as any)._compressor as Tone.Compressor;
            if (compressor) {
              compressor.threshold.value = params.threshold as number;
              compressor.ratio.value = params.ratio as number;
              compressor.attack.value = params.attack as number;
              compressor.release.value = params.release as number;
            }
            break;
          }
          case "autofilter": {
            const autofilter = effect as Tone.AutoFilter;
            autofilter.frequency.value = params.frequency as number;
            autofilter.depth.value = params.depth as number;
            autofilter.baseFrequency = params.baseFrequency as number;
            break;
          }
          case "autopanner": {
            const autopanner = effect as Tone.AutoPanner;
            autopanner.frequency.value = params.frequency as number;
            autopanner.depth.value = params.depth as number;
            break;
          }
          case "autowah": {
            const autowah = effect as Tone.AutoWah;
            autowah.baseFrequency = params.baseFrequency as number;
            autowah.octaves = params.octaves as number;
            autowah.sensitivity = params.sensitivity as number;
            break;
          }
          case "reverb":
            // Reverb decay/preDelay can't be changed live - requires rebuild
            break;
        }
      } catch {
        // Some parameter updates may fail, ignore
      }
    }

    // Update modulation routings if changed
    const routingsChanged =
      JSON.stringify(oldPatch.modMatrix.routings) !==
      JSON.stringify(newPatch.modMatrix.routings);

    if (routingsChanged) {
      // Clear existing modulation connections and re-apply
      this.modManager.clearModConnections();
      this.voicePool.resetFilterModConnection();
      this.patch = newPatch; // Update patch first so applyModulationRoutings uses new routings
      this.applyModulationRoutings();
    } else {
      this.patch = newPatch;
    }

    return true; // Successfully updated live
  }

  /**
   * Update entire patch (full rebuild) - use when live update isn't possible
   */
  updatePatch(patch: CustomPatch): void {
    this.releaseAll();

    // Disconnect master from destination first
    this.masterGain.disconnect();

    // Dispose of old resources in proper order (voices first, then effects, then master)
    this.modManager.dispose();
    this.voicePool.dispose();

    for (const effect of this.effectsChain) {
      try {
        effect.disconnect();
      } catch {
        // Ignore disconnection errors
      }
      effect.dispose();
    }
    this.effectsChain = [];

    this.masterGain.dispose();

    this.patch = patch;

    // Rebuild everything
    this.masterGain = new Tone.Gain(patch.masterVolume);
    this.effectsChain = createEffectsChain(patch.effects);

    const voiceDestination =
      this.effectsChain.length > 0 ? this.effectsChain[0] : this.masterGain;

    this.voicePool = new VoicePool(patch, voiceDestination);

    if (this.effectsChain.length > 0) {
      this.effectsChain[this.effectsChain.length - 1].connect(this.masterGain);
    }

    this.masterGain.toDestination();
    this.modManager = new ModulationManager(patch);
    this.applyModulationRoutings();
  }

  /**
   * Get current patch
   */
  getPatch(): CustomPatch {
    return this.patch;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.voicePool.dispose();
    this.modManager.dispose();

    for (const effect of this.effectsChain) {
      effect.dispose();
    }
    this.effectsChain = [];

    this.masterGain.dispose();
  }
}
