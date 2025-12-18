/**
 * Factory Synth Creation
 * Creates and manages Tone.js PolySynth instances with presets.
 *
 * @module lib/synthFactory
 */

import * as Tone from "tone";
import type { SynthPreset, ADSREnvelope } from "./synthPresets";

/**
 * Create a factory synth with effects chain
 * Returns the synth, effects, and a disposal function
 */
export function createFactorySynth(
  preset: SynthPreset,
  envelope: ADSREnvelope,
  volume: number,
  volumeNode: Tone.Volume
): {
  synth: Tone.PolySynth;
  effects: Tone.ToneAudioNode[];
  dispose: () => void;
} {
  // Create new synth
  const synth = preset.createSynth(envelope);

  // Create effects chain
  const effects = preset.effects?.() ?? [];

  // Connect: synth -> effects -> volume -> destination
  if (effects.length > 0) {
    synth.connect(effects[0]);
    for (let i = 0; i < effects.length - 1; i++) {
      effects[i].connect(effects[i + 1]);
    }
    effects[effects.length - 1].connect(volumeNode);
  } else {
    synth.connect(volumeNode);
  }

  // Disposal function
  const dispose = () => {
    synth.releaseAll();
    synth.disconnect();
    synth.dispose();

    effects.forEach((effect) => {
      effect.disconnect();
      effect.dispose();
    });
  };

  return { synth, effects, dispose };
}

/**
 * Create or retrieve volume node
 */
export function createVolumeNode(volume: number): Tone.Volume {
  return new Tone.Volume(Tone.gainToDb(volume)).toDestination();
}
