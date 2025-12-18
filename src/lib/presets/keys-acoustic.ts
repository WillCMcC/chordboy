/**
 * Acoustic Keys Category Synth Presets
 * Traditional keyboard instruments - piano, marimba, kalimba, etc.
 *
 * @module lib/presets/keys-acoustic
 */

import * as Tone from "tone";
import { SynthPreset } from "../synthPresets";

/**
 * Electric Piano - FM synthesis Rhodes-style
 * That classic Fender Rhodes bell tone, essential for jazz
 */
export const electricPiano: SynthPreset = {
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
 * Kalimba - African thumb piano
 * From Tone.js Presets - FMSynth
 * Bell-like metallic tones, great for melodic chord voicings
 */
export const kalimba: SynthPreset = {
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
export const pianoetta: SynthPreset = {
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
export const steelpan: SynthPreset = {
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
export const marimba: SynthPreset = {
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
