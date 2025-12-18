/**
 * Bass Category Synth Presets
 * Bass and low-end focused presets
 *
 * @module lib/presets/bass
 */

import * as Tone from "tone";
import { SynthPreset } from "../synthPresets";

/**
 * Smooth Bass - Deep warm bass tones
 * Perfect for rootless voicings when you want that foundation
 */
export const smoothBass: SynthPreset = {
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
 * Bassy - Deep sub bass with partials
 * From Tone.js Presets - MonoSynth
 * Custom partials for rich low end
 */
export const bassy: SynthPreset = {
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
export const bassGuitar: SynthPreset = {
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
export const pizz: SynthPreset = {
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
 * Tree Trunk - Deep sine bass
 * From Tone.js Presets - Synth
 * Pure sine for sub bass
 */
export const treeTrunk: SynthPreset = {
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
