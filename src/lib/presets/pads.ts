/**
 * Pad Category Synth Presets
 * Atmospheric pads and ambient textures
 *
 * @module lib/presets/pads
 */

import * as Tone from "tone";
import { SynthPreset } from "../synthPresets";

/**
 * Poly Saw - Lush detuned sawtooth waves
 * Perfect for rich jazz chord voicings with that classic analog warmth
 */
export const polySaw: SynthPreset = {
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
 * Warm Pad - Slow attack lush synthesizer pad
 * Ethereal background texture for atmospheric voicings
 */
export const warmPad: SynthPreset = {
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
 * Alien Chorus - Ethereal spread sine pad
 * From Tone.js Presets - Synth
 * Fat sine with wide spread, otherworldly texture
 */
export const alienChorus: SynthPreset = {
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
export const delicateWindPart: SynthPreset = {
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
export const coolGuy: SynthPreset = {
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
export const thinSaws: SynthPreset = {
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
