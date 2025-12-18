/**
 * Synth Presets Index
 * Re-exports all preset categories for ChordBoy
 *
 * @module lib/presets
 */

import { SynthPreset } from "../synthPresets";

// Import acoustic keys presets
import {
  electricPiano,
  kalimba,
  pianoetta,
  steelpan,
  marimba,
} from "./keys-acoustic";

// Import synth keys presets
import { mellowSine, glassKeys, dropPulse, tiny } from "./keys-synth";

// Import pad presets
import {
  polySaw,
  warmPad,
  alienChorus,
  delicateWindPart,
  coolGuy,
  thinSaws,
} from "./pads";

// Import lead presets
import {
  analogBrass,
  superSaw,
  brassCircuit,
  electricCello,
  harmonics,
  lectric,
  bah,
} from "./leads";

// Import bass presets
import { smoothBass, bassy, bassGuitar, pizz, treeTrunk } from "./bass";

// Re-export all presets by category
export * from "./keys-acoustic";
export * from "./keys-synth";
export * from "./pads";
export * from "./leads";
export * from "./bass";

/** All available synth presets */
export const allPresets: SynthPreset[] = [
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
