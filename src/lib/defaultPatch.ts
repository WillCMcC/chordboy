/**
 * Default Patch Templates
 * Factory functions for creating new custom patches with sensible defaults
 *
 * @module lib/defaultPatch
 */

import type {
  CustomPatch,
  OscillatorConfig,
  FilterConfig,
  EnvelopeConfig,
  FilterEnvelopeConfig,
  ModMatrix,
  LFOConfig,
  EffectConfig,
  PatchCategory,
} from "../types/synth";

/** Default oscillator configuration */
const defaultOscillator: OscillatorConfig = {
  enabled: true,
  waveform: "sawtooth",
  octave: 0,
  detune: 0,
  volume: 0.25, // Keep low to avoid clipping with polyphony (8 voices x 2 oscs)
  pan: 0,
};

/** Default filter configuration */
const defaultFilter: FilterConfig = {
  enabled: true,
  type: "lowpass",
  frequency: 2000,
  resonance: 1,
  rolloff: -24,
  envelopeAmount: 0,
  keyTracking: 0,
};

/** Default amplitude envelope */
const defaultAmpEnvelope: EnvelopeConfig = {
  attack: 0.01,
  decay: 0.3,
  sustain: 0.7,
  release: 0.5,
  attackCurve: "linear",
  releaseCurve: "exponential",
};

/** Default filter envelope */
const defaultFilterEnvelope: FilterEnvelopeConfig = {
  attack: 0.01,
  decay: 0.2,
  sustain: 0.3,
  release: 0.5,
  attackCurve: "linear",
  releaseCurve: "exponential",
  octaves: 2,
};

/** Default LFO configuration */
const defaultLFO: LFOConfig = {
  enabled: false,
  waveform: "sine",
  frequency: 2,
  syncRate: "4n",
  min: 0,
  max: 1,
  phase: 0,
  sync: false,
};

/** Default modulation matrix */
const defaultModMatrix: ModMatrix = {
  routings: [],
  lfo1: { ...defaultLFO },
  lfo2: { ...defaultLFO, frequency: 0.5 },
  modEnv1: { ...defaultAmpEnvelope },
  modEnv2: { ...defaultAmpEnvelope },
};

/**
 * Create a new custom patch with default values
 * @param name - Optional name for the patch
 * @param category - Optional category
 * @returns A new CustomPatch with unique ID and timestamps
 */
export function createDefaultPatch(
  name?: string,
  category: PatchCategory = "custom",
): CustomPatch {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: name ?? "New Patch",
    description: "",
    category,
    createdAt: now,
    updatedAt: now,

    osc1: { ...defaultOscillator },
    osc2: {
      ...defaultOscillator,
      enabled: false,
      waveform: "square",
      detune: 7, // Slight detune for thickness
    },
    oscMix: 0.5,

    filter: { ...defaultFilter },
    ampEnvelope: { ...defaultAmpEnvelope },
    filterEnvelope: { ...defaultFilterEnvelope },
    modMatrix: { ...defaultModMatrix },
    effects: [],

    masterVolume: 0.8,
    glide: 0,
  };
}

/**
 * Create a "Init" patch - completely neutral starting point
 */
export function createInitPatch(): CustomPatch {
  const patch = createDefaultPatch("Init", "custom");
  patch.id = "factory-init";
  return patch;
}

/**
 * Create a warm pad patch preset
 */
export function createWarmPadPatch(): CustomPatch {
  const patch = createDefaultPatch("Warm Pad", "pad");
  patch.id = "factory-warm-pad";
  patch.osc1.waveform = "triangle";
  patch.osc2.enabled = true;
  patch.osc2.waveform = "sine";
  patch.osc2.detune = -5;
  patch.oscMix = 0.4;
  patch.ampEnvelope = {
    attack: 0.8,
    decay: 0.5,
    sustain: 0.8,
    release: 2.0,
    attackCurve: "exponential",
    releaseCurve: "exponential",
  };
  patch.filter.frequency = 1500;
  patch.filter.resonance = 0.5;
  patch.effects = [
    {
      type: "chorus",
      enabled: true,
      wet: 0.5,
      params: { frequency: 0.5, delayTime: 4, depth: 0.9 },
    },
    {
      type: "reverb",
      enabled: true,
      wet: 0.4,
      params: { decay: 4, preDelay: 0.01 },
    },
  ];
  return patch;
}

/**
 * Create a plucky keys patch
 */
export function createPluckyKeysPatch(): CustomPatch {
  const patch = createDefaultPatch("Plucky Keys", "keys");
  patch.id = "factory-plucky-keys";
  patch.osc1.waveform = "sawtooth";
  patch.osc2.enabled = true;
  patch.osc2.waveform = "square";
  patch.osc2.octave = 1;
  patch.osc2.volume = 0.15;
  patch.oscMix = 0.7;
  patch.ampEnvelope = {
    attack: 0.001,
    decay: 0.4,
    sustain: 0.2,
    release: 0.3,
    attackCurve: "linear",
    releaseCurve: "exponential",
  };
  patch.filter.frequency = 3000;
  patch.filterEnvelope = {
    attack: 0.001,
    decay: 0.3,
    sustain: 0.1,
    release: 0.2,
    attackCurve: "linear",
    releaseCurve: "exponential",
    octaves: 3,
  };
  patch.filter.envelopeAmount = 0.7;
  return patch;
}

/**
 * Create a fat bass patch
 */
export function createFatBassPatch(): CustomPatch {
  const patch = createDefaultPatch("Fat Bass", "bass");
  patch.id = "factory-fat-bass";
  patch.osc1.waveform = "sawtooth";
  patch.osc1.octave = -1;
  patch.osc2.enabled = true;
  patch.osc2.waveform = "square";
  patch.osc2.octave = -1;
  patch.osc2.detune = -10;
  patch.oscMix = 0.5;
  patch.ampEnvelope = {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.8,
    release: 0.3,
    attackCurve: "linear",
    releaseCurve: "exponential",
  };
  patch.filter.frequency = 800;
  patch.filter.resonance = 2;
  patch.filterEnvelope = {
    attack: 0.01,
    decay: 0.15,
    sustain: 0.3,
    release: 0.2,
    attackCurve: "linear",
    releaseCurve: "exponential",
    octaves: 2,
  };
  patch.filter.envelopeAmount = 0.5;
  return patch;
}

/**
 * Create a PWM lead patch with LFO
 */
export function createPWMLeadPatch(): CustomPatch {
  const patch = createDefaultPatch("PWM Lead", "lead");
  patch.id = "factory-pwm-lead";
  patch.osc1.waveform = "pwm";
  patch.osc2.enabled = true;
  patch.osc2.waveform = "sawtooth";
  patch.osc2.detune = 5;
  patch.osc2.volume = 0.25;
  patch.oscMix = 0.6;
  patch.ampEnvelope = {
    attack: 0.05,
    decay: 0.2,
    sustain: 0.7,
    release: 0.4,
    attackCurve: "linear",
    releaseCurve: "exponential",
  };
  patch.filter.frequency = 4000;
  patch.filter.resonance = 1.5;
  patch.modMatrix.lfo1 = {
    enabled: true,
    waveform: "triangle",
    frequency: 3,
    syncRate: "4n",
    min: 0.3,
    max: 0.7,
    phase: 0,
    sync: false,
  };
  patch.modMatrix.routings = [
    {
      id: "factory-pwm-lead-routing-1",
      source: "lfo1",
      destination: "filter_freq",
      amount: 0.3,
      enabled: true,
    },
  ];
  patch.glide = 50;
  return patch;
}

/**
 * Get all factory patch templates
 */
export function getFactoryPatches(): CustomPatch[] {
  return [
    createInitPatch(),
    createWarmPadPatch(),
    createPluckyKeysPatch(),
    createFatBassPatch(),
    createPWMLeadPatch(),
  ];
}

/** Default effect configurations by type */
export const DEFAULT_EFFECT_PARAMS: Record<string, EffectConfig> = {
  chorus: {
    type: "chorus",
    enabled: true,
    wet: 0.5,
    params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
  },
  reverb: {
    type: "reverb",
    enabled: true,
    wet: 0.3,
    params: { decay: 2.5, preDelay: 0.01 },
  },
  delay: {
    type: "delay",
    enabled: true,
    wet: 0.3,
    params: { delayTime: 0.25, feedback: 0.3 },
  },
  pingpong: {
    type: "pingpong",
    enabled: true,
    wet: 0.3,
    params: { delayTime: 0.25, feedback: 0.4 },
  },
  phaser: {
    type: "phaser",
    enabled: true,
    wet: 0.5,
    params: { frequency: 0.5, octaves: 3, baseFrequency: 1000 },
  },
  distortion: {
    type: "distortion",
    enabled: true,
    wet: 0.5,
    params: { distortion: 0.4, oversample: "2x" },
  },
  bitcrusher: {
    type: "bitcrusher",
    enabled: true,
    wet: 0.5,
    params: { bits: 8 },
  },
  compressor: {
    type: "compressor",
    enabled: true,
    wet: 1,
    params: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
  },
  tremolo: {
    type: "tremolo",
    enabled: true,
    wet: 0.5,
    params: { frequency: 4, depth: 0.5 },
  },
  vibrato: {
    type: "vibrato",
    enabled: true,
    wet: 0.5,
    params: { frequency: 5, depth: 0.1 },
  },
  autofilter: {
    type: "autofilter",
    enabled: true,
    wet: 0.5,
    params: { frequency: 1, depth: 1, baseFrequency: 200 },
  },
  autopanner: {
    type: "autopanner",
    enabled: true,
    wet: 0.5,
    params: { frequency: 1, depth: 1 },
  },
  autowah: {
    type: "autowah",
    enabled: true,
    wet: 0.5,
    params: { baseFrequency: 100, octaves: 6, sensitivity: 0 },
  },
};
