/**
 * Synth Presets for ChordBoy
 * Jazz-appropriate synthesizer configurations using Tone.js
 *
 * @module lib/synthPresets
 */

import * as Tone from "tone";

/** ADSR envelope configuration */
export interface ADSREnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

/** Synth preset configuration */
export interface SynthPreset {
  id: string;
  name: string;
  description: string;
  category: "keys" | "pad" | "lead" | "bass";
  defaultEnvelope: ADSREnvelope;
  /** Factory function to create the synth with given envelope */
  createSynth: (envelope: ADSREnvelope) => Tone.PolySynth;
  /** Optional effects chain */
  effects?: () => Tone.ToneAudioNode[];
}

/**
 * Poly Saw - Lush detuned sawtooth waves
 * Perfect for rich jazz chord voicings with that classic analog warmth
 */
const polySaw: SynthPreset = {
  id: "poly-saw",
  name: "Poly Saw",
  description: "Lush detuned sawtooth - classic analog warmth",
  category: "pad",
  defaultEnvelope: {
    attack: 0.05,
    decay: 0.3,
    sustain: 0.7,
    release: 0.8,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "sawtooth",
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      volume: -8,
    });
  },
  effects: () => [
    new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      wet: 0.5,
    }).start(),
    new Tone.Reverb({
      decay: 2.5,
      wet: 0.3,
    }),
  ],
};

/**
 * Mellow Sine - Pure warm sine tones
 * Clean and intimate, perfect for ballads and sparse voicings
 */
const mellowSine: SynthPreset = {
  id: "mellow-sine",
  name: "Mellow Sine",
  description: "Pure warm sine - intimate ballad tones",
  category: "keys",
  defaultEnvelope: {
    attack: 0.1,
    decay: 0.4,
    sustain: 0.6,
    release: 1.2,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      volume: -6,
    });
  },
  effects: () => [
    new Tone.Reverb({
      decay: 3,
      wet: 0.4,
    }),
  ],
};

/**
 * Electric Piano - FM synthesis Rhodes-style
 * That classic Fender Rhodes bell tone, essential for jazz
 */
const electricPiano: SynthPreset = {
  id: "electric-piano",
  name: "Electric Piano",
  description: "FM Rhodes-style bell tones",
  category: "keys",
  defaultEnvelope: {
    attack: 0.001,
    decay: 1.2,
    sustain: 0.3,
    release: 1.5,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 14,
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      modulation: {
        type: "square",
      },
      modulationEnvelope: {
        attack: 0.002,
        decay: 0.2,
        sustain: 0,
        release: 0.2,
      },
      volume: -10,
    });
  },
  effects: () => [
    new Tone.Tremolo({
      frequency: 4.5,
      depth: 0.3,
      wet: 0.4,
    }).start(),
    new Tone.Reverb({
      decay: 2,
      wet: 0.25,
    }),
  ],
};

/**
 * Warm Pad - Slow attack lush synthesizer pad
 * Ethereal background texture for atmospheric voicings
 */
const warmPad: SynthPreset = {
  id: "warm-pad",
  name: "Warm Pad",
  description: "Slow ethereal synth pad",
  category: "pad",
  defaultEnvelope: {
    attack: 0.8,
    decay: 0.5,
    sustain: 0.8,
    release: 2.0,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      volume: -10,
    });
  },
  effects: () => [
    new Tone.Chorus({
      frequency: 0.5,
      delayTime: 4,
      depth: 0.9,
      wet: 0.7,
    }).start(),
    new Tone.Filter({
      frequency: 2000,
      type: "lowpass",
      rolloff: -24,
    }),
    new Tone.Reverb({
      decay: 4,
      wet: 0.5,
    }),
  ],
};

/**
 * Glass Keys - Crystalline FM bell tones
 * Sparkling upper-register clarity for chord extensions
 */
const glassKeys: SynthPreset = {
  id: "glass-keys",
  name: "Glass Keys",
  description: "Crystalline FM bell shimmer",
  category: "keys",
  defaultEnvelope: {
    attack: 0.001,
    decay: 2.0,
    sustain: 0.1,
    release: 2.5,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 8,
      modulationIndex: 20,
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      modulation: {
        type: "sine",
      },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.5,
        sustain: 0.2,
        release: 0.5,
      },
      volume: -12,
    });
  },
  effects: () => [
    new Tone.Reverb({
      decay: 5,
      wet: 0.6,
    }),
    new Tone.FeedbackDelay({
      delayTime: 0.25,
      feedback: 0.3,
      wet: 0.2,
    }),
  ],
};

/**
 * Smooth Bass - Deep warm bass tones
 * Perfect for rootless voicings when you want that foundation
 */
const smoothBass: SynthPreset = {
  id: "smooth-bass",
  name: "Smooth Bass",
  description: "Deep warm synth bass",
  category: "bass",
  defaultEnvelope: {
    attack: 0.02,
    decay: 0.3,
    sustain: 0.8,
    release: 0.5,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        type: "sine",
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.3,
        baseFrequency: 200,
        octaves: 2,
      },
      volume: -6,
    });
  },
  effects: () => [
    new Tone.Filter({
      frequency: 800,
      type: "lowpass",
      rolloff: -12,
    }),
  ],
};

/**
 * Analog Brass - Warm brass-like synth
 * Great for punchy chord stabs and section hits
 */
const analogBrass: SynthPreset = {
  id: "analog-brass",
  name: "Analog Brass",
  description: "Punchy warm brass section",
  category: "lead",
  defaultEnvelope: {
    attack: 0.08,
    decay: 0.2,
    sustain: 0.6,
    release: 0.4,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "sawtooth",
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      volume: -10,
    });
  },
  effects: () => [
    new Tone.Filter({
      frequency: 3000,
      type: "lowpass",
      rolloff: -24,
    }),
    new Tone.Chorus({
      frequency: 2,
      delayTime: 2,
      depth: 0.4,
      wet: 0.3,
    }).start(),
    new Tone.Reverb({
      decay: 1.5,
      wet: 0.2,
    }),
  ],
};

/** All available synth presets */
export const synthPresets: SynthPreset[] = [
  polySaw,
  mellowSine,
  electricPiano,
  warmPad,
  glassKeys,
  smoothBass,
  analogBrass,
];

/** Get a preset by ID */
export function getPresetById(id: string): SynthPreset | undefined {
  return synthPresets.find((p) => p.id === id);
}

/** Default preset ID */
export const DEFAULT_PRESET_ID = "electric-piano";
