/**
 * Synth Presets for ChordBoy
 * Jazz-appropriate synthesizer configurations using Tone.js
 *
 * NOTE: This file now imports from category-based preset files for better organization.
 * Individual presets are split into: keys.ts, pads.ts, leads.ts, bass.ts
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

// Re-export all presets from category files
export * from "./presets/keys-acoustic";
export * from "./presets/keys-synth";
export * from "./presets/pads";
export * from "./presets/leads";
export * from "./presets/bass";

// Import the combined preset array
import { allPresets } from "./presets";

/** All available synth presets */
export const synthPresets: SynthPreset[] = allPresets;

/** Get a preset by ID */
export function getPresetById(id: string): SynthPreset | undefined {
  return synthPresets.find((p) => p.id === id);
}

/** Default preset ID */
export const DEFAULT_PRESET_ID = "electric-piano";
