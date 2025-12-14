/**
 * Synth Patch Type Definitions
 * Types for custom synth patches, oscillators, modulators, and effects
 *
 * @module types/synth
 */

// ============================================================================
// Oscillator Types
// ============================================================================

/** Oscillator waveform types available in Tone.js */
export type OscillatorWaveform =
  | "sine"
  | "square"
  | "triangle"
  | "sawtooth"
  | "fatsine"
  | "fatsquare"
  | "fattriangle"
  | "fatsawtooth"
  | "fmsine"
  | "fmsquare"
  | "fmtriangle"
  | "fmsawtooth"
  | "amsine"
  | "amsquare"
  | "amtriangle"
  | "amsawtooth"
  | "pulse"
  | "pwm";

/** Configuration for a single oscillator */
export interface OscillatorConfig {
  enabled: boolean;
  waveform: OscillatorWaveform;
  octave: number; // -2 to +2
  detune: number; // -100 to +100 cents
  volume: number; // 0 to 1
  pan: number; // -1 to 1
  /** Unison spread for fat oscillators (0 to 100) */
  spread?: number;
  /** Number of voices for fat oscillators (1-8) */
  count?: number;
}

// ============================================================================
// Filter Types
// ============================================================================

/** Filter types available */
export type FilterType =
  | "lowpass"
  | "highpass"
  | "bandpass"
  | "lowshelf"
  | "highshelf"
  | "notch"
  | "allpass"
  | "peaking";

/** Filter rolloff options (dB/octave) */
export type FilterRolloff = -12 | -24 | -48 | -96;

/** Configuration for the filter section */
export interface FilterConfig {
  enabled: boolean;
  type: FilterType;
  frequency: number; // 20 to 20000 Hz
  resonance: number; // 0 to 30 (Q factor)
  rolloff: FilterRolloff;
  envelopeAmount: number; // -1 to 1 (bipolar)
  keyTracking: number; // 0 to 1
}

// ============================================================================
// Envelope Types
// ============================================================================

/** ADSR envelope configuration */
export interface EnvelopeConfig {
  attack: number; // 0.001 to 5 seconds
  decay: number; // 0.001 to 5 seconds
  sustain: number; // 0 to 1
  release: number; // 0.001 to 10 seconds
  attackCurve?: "linear" | "exponential";
  releaseCurve?: "linear" | "exponential";
}

/** Filter envelope with octave range */
export interface FilterEnvelopeConfig extends EnvelopeConfig {
  octaves: number; // Range in octaves (0-8)
}

// ============================================================================
// Modulation Types
// ============================================================================

/** LFO waveform types */
export type LFOWaveform = "sine" | "square" | "triangle" | "sawtooth";

/** LFO sync rate options (Tone.js notation) */
export type LFOSyncRate =
  | "1m"   // 1 bar (whole measure)
  | "2n"   // half note
  | "1n"   // whole note
  | "4n"   // quarter note
  | "8n"   // 8th note
  | "16n" // 16th note
  | "32n"; // 32nd note

/** LFO configuration */
export interface LFOConfig {
  enabled: boolean;
  waveform: LFOWaveform;
  frequency: number; // 0.01 to 50 Hz (used when sync is off)
  syncRate: LFOSyncRate; // Note length (used when sync is on)
  min: number; // Minimum output value
  max: number; // Maximum output value
  phase: number; // 0 to 360 degrees
  sync: boolean; // Sync to transport
}

/** Modulation sources */
export type ModSource =
  | "lfo1"
  | "lfo2"
  | "env1"
  | "env2"
  | "velocity"
  | "keytrack"
  | "modwheel"
  | "aftertouch";

/** Modulation destinations */
export type ModDestination =
  | "osc1_pitch"
  | "osc1_detune"
  | "osc1_volume"
  | "osc1_pan"
  | "osc2_pitch"
  | "osc2_detune"
  | "osc2_volume"
  | "osc2_pan"
  | "filter_freq"
  | "filter_res"
  | "amp_volume"
  | "amp_pan"
  | "lfo1_rate"
  | "lfo2_rate"
  | "fx_mix";

/** Single modulation routing */
export interface ModRouting {
  id: string;
  source: ModSource;
  destination: ModDestination;
  amount: number; // -1 to 1 (bipolar)
  enabled: boolean;
}

/** Full modulation matrix */
export interface ModMatrix {
  routings: ModRouting[];
  lfo1: LFOConfig;
  lfo2: LFOConfig;
  modEnv1: EnvelopeConfig;
  modEnv2: EnvelopeConfig;
}

// ============================================================================
// Effects Types
// ============================================================================

/** Effect type identifiers */
export type EffectType =
  | "chorus"
  | "phaser"
  | "vibrato"
  | "tremolo"
  | "reverb"
  | "delay"
  | "pingpong"
  | "distortion"
  | "bitcrusher"
  | "compressor"
  | "autofilter"
  | "autopanner"
  | "autowah";

/** Effect parameter types */
export interface ChorusParams {
  frequency: number;
  delayTime: number;
  depth: number;
}

export interface ReverbParams {
  decay: number;
  preDelay: number;
}

export interface DelayParams {
  delayTime: number;
  feedback: number;
}

export interface PingPongParams {
  delayTime: number;
  feedback: number;
}

export interface PhaserParams {
  frequency: number;
  octaves: number;
  baseFrequency: number;
}

export interface DistortionParams {
  distortion: number;
  oversample: "none" | "2x" | "4x";
}

export interface BitcrusherParams {
  bits: number;
}

export interface CompressorParams {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
}

export interface TremoloParams {
  frequency: number;
  depth: number;
}

export interface VibratoParams {
  frequency: number;
  depth: number;
}

export interface AutoFilterParams {
  frequency: number;
  depth: number;
  baseFrequency: number;
}

export interface AutoPannerParams {
  frequency: number;
  depth: number;
}

export interface AutoWahParams {
  baseFrequency: number;
  octaves: number;
  sensitivity: number;
}

/** Union of all effect params */
export type EffectParams =
  | ChorusParams
  | ReverbParams
  | DelayParams
  | PingPongParams
  | PhaserParams
  | DistortionParams
  | BitcrusherParams
  | CompressorParams
  | TremoloParams
  | VibratoParams
  | AutoFilterParams
  | AutoPannerParams
  | AutoWahParams;

/** Base effect configuration */
export interface EffectConfig {
  type: EffectType;
  enabled: boolean;
  wet: number; // 0 to 1
  params: Record<string, number | string | boolean>;
}

// ============================================================================
// Custom Patch Types
// ============================================================================

/** Patch category */
export type PatchCategory = "keys" | "pad" | "lead" | "bass" | "fx" | "custom";

/** Complete custom synth patch */
export interface CustomPatch {
  id: string;
  name: string;
  description: string;
  category: PatchCategory;
  createdAt: number;
  updatedAt: number;

  // Oscillators
  osc1: OscillatorConfig;
  osc2: OscillatorConfig;
  oscMix: number; // 0 = all OSC1, 1 = all OSC2

  // Filter
  filter: FilterConfig;

  // Envelopes
  ampEnvelope: EnvelopeConfig;
  filterEnvelope: FilterEnvelopeConfig;

  // Modulation
  modMatrix: ModMatrix;

  // Effects chain (order matters)
  effects: EffectConfig[];

  // Master
  masterVolume: number; // 0 to 1
  glide: number; // Portamento time in ms (0 = off)
}

/** Serialized patch for storage (same as CustomPatch, all fields are serializable) */
export type SerializedCustomPatch = CustomPatch;

/** Patch library entry for listing */
export interface PatchLibraryEntry {
  id: string;
  name: string;
  category: PatchCategory;
  isFactory: boolean;
  updatedAt: number;
}

// ============================================================================
// Default Values
// ============================================================================

/** Default oscillator configuration */
export const DEFAULT_OSCILLATOR: OscillatorConfig = {
  enabled: true,
  waveform: "sawtooth",
  octave: 0,
  detune: 0,
  volume: 0.8,
  pan: 0,
};

/** Default filter configuration */
export const DEFAULT_FILTER: FilterConfig = {
  enabled: true,
  type: "lowpass",
  frequency: 2000,
  resonance: 1,
  rolloff: -24,
  envelopeAmount: 0,
  keyTracking: 0,
};

/** Default envelope */
export const DEFAULT_ENVELOPE: EnvelopeConfig = {
  attack: 0.01,
  decay: 0.3,
  sustain: 0.7,
  release: 0.5,
  attackCurve: "linear",
  releaseCurve: "exponential",
};

/** Default filter envelope */
export const DEFAULT_FILTER_ENVELOPE: FilterEnvelopeConfig = {
  ...DEFAULT_ENVELOPE,
  octaves: 2,
};

/** Default LFO */
export const DEFAULT_LFO: LFOConfig = {
  enabled: false,
  waveform: "sine",
  frequency: 2,
  syncRate: "4n",
  min: 0,
  max: 1,
  phase: 0,
  sync: false,
};

/** Default mod matrix */
export const DEFAULT_MOD_MATRIX: ModMatrix = {
  routings: [],
  lfo1: { ...DEFAULT_LFO },
  lfo2: { ...DEFAULT_LFO, frequency: 0.5 },
  modEnv1: { ...DEFAULT_ENVELOPE },
  modEnv2: { ...DEFAULT_ENVELOPE },
};
