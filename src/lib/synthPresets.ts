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

// ============================================
// Tone.js Presets - Keys Category
// ============================================

/**
 * Kalimba - African thumb piano
 * From Tone.js Presets - FMSynth
 * Bell-like metallic tones, great for melodic chord voicings
 */
const kalimba: SynthPreset = {
  id: "kalimba",
  name: "Kalimba",
  description: "Metallic bell tones - thumb piano",
  category: "keys",
  defaultEnvelope: {
    attack: 0.001,
    decay: 2,
    sustain: 0.1,
    release: 2,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 8,
      modulationIndex: 2,
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
      volume: -8,
    });
  },
  effects: () => [
    new Tone.Reverb({
      decay: 2.5,
      wet: 0.35,
    }),
  ],
};

/**
 * Pianoetta - Piano-like tone
 * From Tone.js Presets - MonoSynth
 * Square wave with percussive decay
 */
const pianoetta: SynthPreset = {
  id: "pianoetta",
  name: "Pianoetta",
  description: "Square wave piano-like tone",
  category: "keys",
  defaultEnvelope: {
    attack: 0.005,
    decay: 3,
    sustain: 0,
    release: 0.45,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        type: "square",
      },
      filter: {
        Q: 2,
        type: "lowpass",
        rolloff: -12,
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      filterEnvelope: {
        attack: 0.001,
        decay: 0.32,
        sustain: 0.9,
        release: 3,
        baseFrequency: 700,
        octaves: 2.3,
      },
      volume: -8,
    });
  },
  effects: () => [
    new Tone.Reverb({
      decay: 1.5,
      wet: 0.2,
    }),
  ],
};

/**
 * Steelpan - Caribbean steel drum
 * From Tone.js Presets - Synth
 * Bright percussive with metallic overtones
 */
const steelpan: SynthPreset = {
  id: "steelpan",
  name: "Steelpan",
  description: "Caribbean steel drum shimmer",
  category: "keys",
  defaultEnvelope: {
    attack: 0.001,
    decay: 1.6,
    sustain: 0,
    release: 1.6,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "fatcustom",
        partials: [0.2, 1, 0, 0.5, 0.1],
        spread: 40,
        count: 3,
      } as Tone.OmniOscillatorOptions,
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
    new Tone.Reverb({
      decay: 2,
      wet: 0.3,
    }),
  ],
};

/**
 * Marimba - Wooden mallet percussion
 * From Tone.js Presets - Synth
 * Warm woody tones with quick decay
 */
const marimba: SynthPreset = {
  id: "marimba",
  name: "Marimba",
  description: "Warm wooden mallet tones",
  category: "keys",
  defaultEnvelope: {
    attack: 0.001,
    decay: 1.2,
    sustain: 0,
    release: 1.2,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        partials: [1, 0, 2, 0, 3],
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
      decay: 1.8,
      wet: 0.25,
    }),
  ],
};

/**
 * Drop Pulse - Bouncy release pulse wave
 * From Tone.js Presets - Synth
 * Unique bounce curve release, punchy
 */
const dropPulse: SynthPreset = {
  id: "drop-pulse",
  name: "Drop Pulse",
  description: "Punchy pulse with bounce release",
  category: "keys",
  defaultEnvelope: {
    attack: 0.01,
    decay: 0.05,
    sustain: 0.2,
    release: 0.4,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "pulse",
        width: 0.8,
      } as Tone.PulseOscillatorOptions,
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
        releaseCurve: "bounce",
      },
      volume: -10,
    });
  },
  effects: () => [
    new Tone.Reverb({
      decay: 1.2,
      wet: 0.2,
    }),
  ],
};

// ============================================
// Tone.js Presets - Pad Category
// ============================================

/**
 * Alien Chorus - Ethereal spread sine pad
 * From Tone.js Presets - Synth
 * Fat sine with wide spread, otherworldly texture
 */
const alienChorus: SynthPreset = {
  id: "alien-chorus",
  name: "Alien Chorus",
  description: "Ethereal spread sine voices",
  category: "pad",
  defaultEnvelope: {
    attack: 0.4,
    decay: 0.01,
    sustain: 1,
    release: 0.4,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "fatsine4",
        spread: 60,
        count: 10,
      } as Tone.FatOscillatorOptions,
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
        attackCurve: "sine",
        releaseCurve: "sine",
      },
      volume: -12,
    });
  },
  effects: () => [
    new Tone.Reverb({
      decay: 4,
      wet: 0.5,
    }),
  ],
};

/**
 * Delicate Wind Part - Airy square pad
 * From Tone.js Presets - Synth
 * Slow attack ethereal texture
 */
const delicateWindPart: SynthPreset = {
  id: "delicate-wind",
  name: "Delicate Wind",
  description: "Airy slow-attack square pad",
  category: "pad",
  defaultEnvelope: {
    attack: 2,
    decay: 1,
    sustain: 0.2,
    release: 2,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "square4",
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
      frequency: 1500,
      type: "lowpass",
      rolloff: -12,
    }),
    new Tone.Reverb({
      decay: 5,
      wet: 0.6,
    }),
  ],
};

/**
 * Cool Guy - PWM pad with sweep
 * From Tone.js Presets - MonoSynth
 * Classic analog PWM sweep sound
 */
const coolGuy: SynthPreset = {
  id: "cool-guy",
  name: "Cool Guy",
  description: "Classic PWM sweep pad",
  category: "pad",
  defaultEnvelope: {
    attack: 0.025,
    decay: 0.3,
    sustain: 0.9,
    release: 2,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        type: "pwm",
        modulationFrequency: 1,
      } as Tone.PWMOscillatorOptions,
      filter: {
        Q: 6,
        rolloff: -24,
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      filterEnvelope: {
        attack: 0.245,
        decay: 0.131,
        sustain: 0.5,
        release: 2,
        baseFrequency: 20,
        octaves: 7.2,
        exponent: 2,
      },
      volume: -10,
    });
  },
  effects: () => [
    new Tone.Chorus({
      frequency: 0.8,
      delayTime: 3,
      depth: 0.6,
      wet: 0.4,
    }).start(),
    new Tone.Reverb({
      decay: 3,
      wet: 0.35,
    }),
  ],
};

/**
 * Thin Saws - Complex FM sawtooth texture
 * From Tone.js Presets - FMSynth
 * Layered FM saw for rich harmonic content
 */
const thinSaws: SynthPreset = {
  id: "thin-saws",
  name: "Thin Saws",
  description: "Complex FM sawtooth texture",
  category: "pad",
  defaultEnvelope: {
    attack: 0.05,
    decay: 0.3,
    sustain: 0.1,
    release: 1.2,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 0.5,
      modulationIndex: 1.2,
      oscillator: {
        type: "fmsawtooth",
        modulationType: "sine",
        modulationIndex: 20,
        harmonicity: 3,
      } as Tone.FMOscillatorOptions,
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      modulation: {
        volume: 0,
        type: "triangle",
      },
      modulationEnvelope: {
        attack: 0.35,
        decay: 0.1,
        sustain: 1,
        release: 0.01,
      },
      volume: -12,
    });
  },
  effects: () => [
    new Tone.Chorus({
      frequency: 1.2,
      delayTime: 3.5,
      depth: 0.5,
      wet: 0.4,
    }).start(),
    new Tone.Reverb({
      decay: 3,
      wet: 0.4,
    }),
  ],
};

// ============================================
// Tone.js Presets - Lead Category
// ============================================

/**
 * Super Saw - Classic trance/EDM lead
 * From Tone.js Presets - Synth
 * Fat detuned sawtooth stack
 */
const superSaw: SynthPreset = {
  id: "super-saw",
  name: "Super Saw",
  description: "Classic detuned saw stack",
  category: "lead",
  defaultEnvelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.5,
    release: 0.4,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "fatsawtooth",
        count: 3,
        spread: 30,
      } as Tone.FatOscillatorOptions,
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
        attackCurve: "exponential",
      },
      volume: -10,
    });
  },
  effects: () => [
    new Tone.Filter({
      frequency: 4000,
      type: "lowpass",
      rolloff: -12,
    }),
    new Tone.Reverb({
      decay: 1.5,
      wet: 0.2,
    }),
  ],
};

/**
 * Brass Circuit - Analog brass emulation
 * From Tone.js Presets - MonoSynth
 * Sawtooth with filter sweep for brass-like attack
 */
const brassCircuit: SynthPreset = {
  id: "brass-circuit",
  name: "Brass Circuit",
  description: "Analog brass with filter sweep",
  category: "lead",
  defaultEnvelope: {
    attack: 0.1,
    decay: 0.1,
    sustain: 0.6,
    release: 0.5,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.MonoSynth, {
      portamento: 0.01,
      oscillator: {
        type: "sawtooth",
      },
      filter: {
        Q: 2,
        type: "lowpass",
        rolloff: -24,
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      filterEnvelope: {
        attack: 0.05,
        decay: 0.8,
        sustain: 0.4,
        release: 1.5,
        baseFrequency: 2000,
        octaves: 1.5,
      },
      volume: -8,
    });
  },
  effects: () => [
    new Tone.Chorus({
      frequency: 1.5,
      delayTime: 2.5,
      depth: 0.3,
      wet: 0.25,
    }).start(),
    new Tone.Reverb({
      decay: 1.5,
      wet: 0.2,
    }),
  ],
};

/**
 * Electric Cello - Bowed string sound
 * From Tone.js Presets - FMSynth
 * Triangle carrier with slow attack for string-like quality
 */
const electricCello: SynthPreset = {
  id: "electric-cello",
  name: "Electric Cello",
  description: "FM bowed string texture",
  category: "lead",
  defaultEnvelope: {
    attack: 0.2,
    decay: 0.3,
    sustain: 0.1,
    release: 1.2,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 14,
      oscillator: {
        type: "triangle",
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
        attack: 0.01,
        decay: 0.5,
        sustain: 0.2,
        release: 0.1,
      },
      volume: -8,
    });
  },
  effects: () => [
    new Tone.Reverb({
      decay: 2.5,
      wet: 0.35,
    }),
  ],
};

/**
 * Harmonics - AM synthesis with rich overtones
 * From Tone.js Presets - AMSynth
 * Square wave AM for complex harmonics
 */
const harmonics: SynthPreset = {
  id: "harmonics",
  name: "Harmonics",
  description: "AM synthesis rich overtones",
  category: "lead",
  defaultEnvelope: {
    attack: 0.03,
    decay: 0.3,
    sustain: 0.7,
    release: 0.8,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 3.999,
      oscillator: {
        type: "square",
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      modulation: {
        volume: 12,
        type: "square6",
      },
      modulationEnvelope: {
        attack: 2,
        decay: 3,
        sustain: 0.8,
        release: 0.1,
      },
      volume: -12,
    });
  },
  effects: () => [
    new Tone.Filter({
      frequency: 3500,
      type: "lowpass",
      rolloff: -12,
    }),
    new Tone.Reverb({
      decay: 2,
      wet: 0.3,
    }),
  ],
};

/**
 * Lectric - Short staccato lead
 * From Tone.js Presets - Synth
 * Sawtooth with very short release
 */
const lectric: SynthPreset = {
  id: "lectric",
  name: "Lectric",
  description: "Short staccato sawtooth",
  category: "lead",
  defaultEnvelope: {
    attack: 0.03,
    decay: 0.1,
    sustain: 0.2,
    release: 0.02,
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
    new Tone.Filter({
      frequency: 2500,
      type: "lowpass",
      rolloff: -12,
    }),
    new Tone.Reverb({
      decay: 0.8,
      wet: 0.15,
    }),
  ],
};

// ============================================
// Tone.js Presets - Bass Category
// ============================================

/**
 * Bassy - Deep sub bass with partials
 * From Tone.js Presets - MonoSynth
 * Custom partials for rich low end
 */
const bassy: SynthPreset = {
  id: "bassy",
  name: "Bassy",
  description: "Deep sub bass with harmonics",
  category: "bass",
  defaultEnvelope: {
    attack: 0.04,
    decay: 0.06,
    sustain: 0.4,
    release: 1,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        partials: [2, 1, 3, 2, 0.4],
      },
      filter: {
        Q: 4,
        type: "lowpass",
        rolloff: -48,
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.6,
        release: 1.5,
        baseFrequency: 50,
        octaves: 3.4,
      },
      volume: -6,
    });
  },
  effects: () => [
    new Tone.Filter({
      frequency: 600,
      type: "lowpass",
      rolloff: -24,
    }),
  ],
};

/**
 * Bass Guitar - FM bass with pluck
 * From Tone.js Presets - MonoSynth
 * FM square for that bass guitar attack
 */
const bassGuitar: SynthPreset = {
  id: "bass-guitar",
  name: "Bass Guitar",
  description: "FM plucked bass guitar tone",
  category: "bass",
  defaultEnvelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.4,
    release: 2,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        type: "fmsquare5",
        modulationType: "triangle",
        modulationIndex: 2,
        harmonicity: 0.501,
      } as Tone.FMOscillatorOptions,
      filter: {
        Q: 1,
        type: "lowpass",
        rolloff: -24,
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.8,
        release: 1.5,
        baseFrequency: 50,
        octaves: 4.4,
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
 * Pizz - Pizzicato strings
 * From Tone.js Presets - MonoSynth
 * Short plucky string sound
 */
const pizz: SynthPreset = {
  id: "pizz",
  name: "Pizz",
  description: "Plucked pizzicato strings",
  category: "bass",
  defaultEnvelope: {
    attack: 0.01,
    decay: 0.3,
    sustain: 0,
    release: 0.9,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        type: "sawtooth",
      },
      filter: {
        Q: 3,
        type: "highpass",
        rolloff: -12,
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0,
        release: 0.1,
        baseFrequency: 800,
        octaves: -1.2,
      },
      volume: -8,
    });
  },
  effects: () => [
    new Tone.Reverb({
      decay: 1.5,
      wet: 0.25,
    }),
  ],
};

/**
 * Bah - Staccato sawtooth
 * From Tone.js Presets - MonoSynth
 * Short punchy sound with bandpass filter
 */
const bah: SynthPreset = {
  id: "bah",
  name: "Bah",
  description: "Staccato bandpass sawtooth",
  category: "lead",
  defaultEnvelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.2,
    release: 0.6,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: {
        type: "sawtooth",
      },
      filter: {
        Q: 2,
        type: "bandpass",
        rolloff: -24,
      },
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      filterEnvelope: {
        attack: 0.02,
        decay: 0.4,
        sustain: 1,
        release: 0.7,
        releaseCurve: "linear",
        baseFrequency: 20,
        octaves: 5,
      },
      volume: -8,
    });
  },
  effects: () => [
    new Tone.Reverb({
      decay: 1,
      wet: 0.2,
    }),
  ],
};

/**
 * Tree Trunk - Deep sine bass
 * From Tone.js Presets - Synth
 * Pure sine for sub bass
 */
const treeTrunk: SynthPreset = {
  id: "tree-trunk",
  name: "Tree Trunk",
  description: "Pure deep sine sub",
  category: "bass",
  defaultEnvelope: {
    attack: 0.001,
    decay: 0.1,
    sustain: 0.1,
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
      volume: -4,
    });
  },
  effects: () => [
    new Tone.Filter({
      frequency: 400,
      type: "lowpass",
      rolloff: -24,
    }),
  ],
};

/**
 * Tiny - Delicate AM bell tones
 * From Tone.js Presets - AMSynth
 * Complex AM for shimmering texture
 */
const tiny: SynthPreset = {
  id: "tiny",
  name: "Tiny",
  description: "Delicate AM bell shimmer",
  category: "keys",
  defaultEnvelope: {
    attack: 0.006,
    decay: 4,
    sustain: 0.04,
    release: 1.2,
  },
  createSynth: (envelope) => {
    return new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 2,
      oscillator: {
        type: "amsine2",
        modulationType: "sine",
        harmonicity: 1.01,
      } as Tone.AMOscillatorOptions,
      envelope: {
        attack: envelope.attack,
        decay: envelope.decay,
        sustain: envelope.sustain,
        release: envelope.release,
      },
      modulation: {
        volume: 13,
        type: "amsine2",
        modulationType: "sine",
        harmonicity: 12,
      } as Tone.AMOscillatorOptions,
      modulationEnvelope: {
        attack: 0.006,
        decay: 0.2,
        sustain: 0.2,
        release: 0.4,
      },
      volume: -10,
    });
  },
  effects: () => [
    new Tone.Reverb({
      decay: 3,
      wet: 0.4,
    }),
  ],
};

/** All available synth presets */
export const synthPresets: SynthPreset[] = [
  // Original ChordBoy presets
  polySaw,
  mellowSine,
  electricPiano,
  warmPad,
  glassKeys,
  smoothBass,
  analogBrass,
  // Tone.js Keys presets
  kalimba,
  pianoetta,
  steelpan,
  marimba,
  dropPulse,
  tiny,
  // Tone.js Pad presets
  alienChorus,
  delicateWindPart,
  coolGuy,
  thinSaws,
  // Tone.js Lead presets
  superSaw,
  brassCircuit,
  electricCello,
  harmonics,
  lectric,
  bah,
  // Tone.js Bass presets
  bassy,
  bassGuitar,
  pizz,
  treeTrunk,
];

/** Get a preset by ID */
export function getPresetById(id: string): SynthPreset | undefined {
  return synthPresets.find((p) => p.id === id);
}

/** Default preset ID */
export const DEFAULT_PRESET_ID = "electric-piano";
