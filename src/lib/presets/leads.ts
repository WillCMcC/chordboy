/**
 * Lead Category Synth Presets
 * Lead synth and melodic instrument presets
 *
 * @module lib/presets/leads
 */

import * as Tone from "tone";
import { SynthPreset } from "../synthPresets";

/**
 * Analog Brass - Warm brass-like synth
 * Great for punchy chord stabs and section hits
 */
export const analogBrass: SynthPreset = {
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

/**
 * Super Saw - Classic trance/EDM lead
 * From Tone.js Presets - Synth
 * Fat detuned sawtooth stack
 */
export const superSaw: SynthPreset = {
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
export const brassCircuit: SynthPreset = {
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
export const electricCello: SynthPreset = {
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
export const harmonics: SynthPreset = {
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
export const lectric: SynthPreset = {
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

/**
 * Bah - Staccato sawtooth
 * From Tone.js Presets - MonoSynth
 * Short punchy sound with bandpass filter
 */
export const bah: SynthPreset = {
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
