/**
 * Synth Keys Category Presets
 * Synthetic keyboard sounds - glass keys, synth bells, etc.
 *
 * @module lib/presets/keys-synth
 */

import * as Tone from "tone";
import { SynthPreset } from "../synthPresets";

/**
 * Mellow Sine - Pure warm sine tones
 * Clean and intimate, perfect for ballads and sparse voicings
 */
export const mellowSine: SynthPreset = {
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
 * Glass Keys - Crystalline FM bell tones
 * Sparkling upper-register clarity for chord extensions
 */
export const glassKeys: SynthPreset = {
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
 * Drop Pulse - Bouncy release pulse wave
 * From Tone.js Presets - Synth
 * Unique bounce curve release, punchy
 */
export const dropPulse: SynthPreset = {
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

/**
 * Tiny - Delicate AM bell tones
 * From Tone.js Presets - AMSynth
 * Complex AM for shimmering texture
 */
export const tiny: SynthPreset = {
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
