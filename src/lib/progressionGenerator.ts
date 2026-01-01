/**
 * Progression Generator
 * Jazz-informed chord progression generator that analyzes existing chords
 * and generates musically appropriate next chords.
 *
 * Implements common jazz patterns:
 * - ii-V-I (major and minor)
 * - Tritone substitution
 * - Backdoor progression
 * - Turnarounds
 * - Deceptive resolution
 * - Circle of fifths
 */

import { parseKeys } from "./parseKeys";
import { LEFT_HAND_KEYS, RIGHT_HAND_MODIFIERS } from "./keyboardMappings";
import type { NoteName, ModifierType, Preset, Octave } from "../types";

// ============================================================================
// Progression Type Definitions (for Prog Wizard)
// ============================================================================

/** Named progression types for the wizard */
export type ProgressionType =
  | "ii-V-I"
  | "ii-V-i"
  | "I-vi-ii-V"
  | "tritone-sub"
  | "backdoor"
  | "descending-ii-V"
  | "rhythm-changes-A";

/** Progression type metadata */
export interface ProgressionTypeInfo {
  id: ProgressionType;
  name: string;
  description: string;
}

/** Available progression types for the wizard */
export const PROGRESSION_TYPES: ProgressionTypeInfo[] = [
  { id: "ii-V-I", name: "ii-V-I", description: "Classic jazz resolution (major)" },
  { id: "ii-V-i", name: "ii-V-i", description: "Minor key resolution" },
  { id: "I-vi-ii-V", name: "Turnaround", description: "I-vi-ii-V cycle" },
  { id: "tritone-sub", name: "Tritone Sub", description: "ii-bII7-I substitution" },
  { id: "backdoor", name: "Backdoor", description: "iv-bVII7-I progression" },
  { id: "descending-ii-V", name: "Descending ii-V", description: "Chain of ii-Vs down in whole steps" },
  { id: "rhythm-changes-A", name: "Rhythm Changes", description: "I-vi-ii-V pattern (A section)" },
];

/** Generated chord with metadata */
export interface GeneratedProgressionChord {
  keys: Set<string>;
  octave: Octave;
  function: string; // e.g., "ii", "V7", "Imaj7"
}

// ============================================================================
// Types
// ============================================================================

/** Chord quality categories for progression analysis */
export type ChordQualityCategory =
  | "major"
  | "minor"
  | "dominant"
  | "half-dim"
  | "dim"
  | "aug"
  | "sus";

/** Analysis of a chord's harmonic function */
export interface ChordAnalysis {
  /** Root note name */
  root: NoteName;
  /** Root as pitch class (0-11, C=0) */
  rootPitchClass: number;
  /** Simplified quality category */
  quality: ChordQualityCategory;
  /** Whether chord has extensions (9, 11, 13) */
  hasExtensions: boolean;
  /** Whether chord has a seventh */
  isSeventh: boolean;
  /** Whether chord has alterations (b9, #9, #11, b13) */
  hasAlterations: boolean;
  /** Original keys for reconstruction */
  keys: Set<string>;
}

/** Detected progression pattern */
export type ProgressionPattern =
  | "ii-V-needs-I"
  | "ii-V-minor-needs-i"
  | "ii-needs-V"
  | "ii-minor-needs-V"
  | "V-needs-resolution"
  | "I-start-turnaround"
  | "turnaround-vi-needs-ii"
  | "turnaround-ii-needs-V"
  | "backdoor-iv-needs-bVII"
  | "continue-circle"
  | "none";

/** Generated chord result */
export interface GeneratedChord {
  /** Keys to save as preset */
  keys: Set<string>;
  /** Suggested octave for voicing */
  suggestedOctave: Octave;
  /** Human-readable reasoning */
  reasoning: string;
}

/** Option for weighted random chord selection */
interface ChordOption {
  /** Interval from current root (in semitones) */
  interval: number;
  /** Modifiers to apply */
  mods: ModifierType[];
  /** Selection weight (higher = more likely) */
  weight: number;
  /** Reasoning string */
  reason: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Note name to pitch class mapping */
const NOTE_TO_PITCH_CLASS: Record<NoteName, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

/** Pitch class to note name mapping */
const PITCH_CLASS_TO_NOTE: NoteName[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/** Reverse lookup: key character to root note */
const KEY_TO_ROOT: Record<string, NoteName> = Object.fromEntries(
  Object.entries(LEFT_HAND_KEYS).map(([key, note]) => [key, note])
) as Record<string, NoteName>;

/** Reverse lookup: modifier to key character */
const MODIFIER_TO_KEY: Record<ModifierType, string> = Object.fromEntries(
  Object.entries(RIGHT_HAND_MODIFIERS).map(([key, mod]) => [mod, key])
) as Record<ModifierType, string>;

/** Root note to key character */
const ROOT_TO_KEY: Record<NoteName, string> = Object.fromEntries(
  Object.entries(LEFT_HAND_KEYS).map(([key, note]) => [note, key])
) as Record<NoteName, string>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transpose a root note by a number of semitones
 */
function transposeRoot(root: NoteName, semitones: number): NoteName {
  const pitchClass = NOTE_TO_PITCH_CLASS[root];
  const newPitchClass = ((pitchClass + semitones) % 12 + 12) % 12;
  return PITCH_CLASS_TO_NOTE[newPitchClass];
}

/**
 * Calculate interval between two roots (in semitones, 0-11)
 */
function getInterval(from: NoteName, to: NoteName): number {
  const fromPc = NOTE_TO_PITCH_CLASS[from];
  const toPc = NOTE_TO_PITCH_CLASS[to];
  return ((toPc - fromPc) % 12 + 12) % 12;
}

/**
 * Build a Set of keys from a root note and modifiers
 */
function buildChordKeys(
  root: NoteName,
  modifiers: ModifierType[],
  reasoning: string
): GeneratedChord {
  const keys = new Set<string>();

  // Add root key
  const rootKey = ROOT_TO_KEY[root];
  if (rootKey) {
    keys.add(rootKey);
  }

  // Add modifier keys
  for (const mod of modifiers) {
    const modKey = MODIFIER_TO_KEY[mod];
    if (modKey) {
      keys.add(modKey);
    }
  }

  return {
    keys,
    suggestedOctave: 4,
    reasoning,
  };
}

/**
 * Select from weighted options
 */
function weightedRandomChoice(
  currentRoot: NoteName,
  options: ChordOption[]
): GeneratedChord {
  // Calculate total weight
  const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);

  // Random selection
  let random = Math.random() * totalWeight;
  for (const option of options) {
    random -= option.weight;
    if (random <= 0) {
      const targetRoot = transposeRoot(currentRoot, option.interval);
      return buildChordKeys(targetRoot, option.mods, option.reason);
    }
  }

  // Fallback to first option
  const first = options[0];
  const targetRoot = transposeRoot(currentRoot, first.interval);
  return buildChordKeys(targetRoot, first.mods, first.reason);
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Analyze a chord from its keyboard keys to determine harmonic function.
 * @param keys - Set of pressed keyboard keys
 * @returns ChordAnalysis or null if no valid chord
 */
export function analyzeChordFunction(keys: Set<string>): ChordAnalysis | null {
  const parsed = parseKeys(keys);
  if (!parsed.root) return null;

  const root = parsed.root;
  const modifiers = parsed.modifiers;
  const rootPitchClass = NOTE_TO_PITCH_CLASS[root];

  // Determine quality category
  let quality: ChordQualityCategory;

  if (modifiers.includes("half-dim")) {
    quality = "half-dim";
  } else if (modifiers.includes("diminished")) {
    quality = "dim";
  } else if (modifiers.includes("augmented")) {
    quality = "aug";
  } else if (modifiers.includes("sus2") || modifiers.includes("sus4")) {
    quality = "sus";
  } else if (modifiers.includes("minor")) {
    quality = "minor";
  } else if (
    modifiers.includes("dom7") &&
    !modifiers.includes("minor") &&
    !modifiers.includes("maj7")
  ) {
    // Dominant 7 without minor or maj7 = dominant chord
    quality = "dominant";
  } else if (modifiers.includes("maj7")) {
    quality = "major";
  } else {
    // Default: major triad or unspecified
    quality = "major";
  }

  // Check for seventh
  const isSeventh =
    modifiers.includes("dom7") ||
    modifiers.includes("maj7") ||
    modifiers.includes("6") ||
    modifiers.includes("half-dim");

  // Check for extensions
  const hasExtensions =
    modifiers.includes("9") ||
    modifiers.includes("11") ||
    modifiers.includes("13");

  // Check for alterations
  const hasAlterations =
    modifiers.includes("flat9") ||
    modifiers.includes("sharp9") ||
    modifiers.includes("sharp11") ||
    modifiers.includes("flat13") ||
    modifiers.includes("flat5");

  return {
    root,
    rootPitchClass,
    quality,
    hasExtensions,
    isSeventh,
    hasAlterations,
    keys,
  };
}

/**
 * Detect the current progression pattern from a sequence of chords.
 * Looks at the last 1-3 chords to identify common jazz patterns.
 *
 * @param chords - Array of chord analyses in order
 * @returns Detected pattern type
 */
export function detectProgressionPattern(
  chords: ChordAnalysis[]
): ProgressionPattern {
  if (chords.length === 0) return "none";

  const last = chords[chords.length - 1];
  const secondLast = chords.length >= 2 ? chords[chords.length - 2] : null;
  const thirdLast = chords.length >= 3 ? chords[chords.length - 3] : null;

  // Check for ii-V pattern (needs resolution to I)
  if (last.quality === "dominant" && secondLast) {
    const interval = getInterval(secondLast.root, last.root);

    // ii-V in major: m7 up P5 to dom7
    if (interval === 7 && secondLast.quality === "minor") {
      return "ii-V-needs-I";
    }

    // ii-V in minor: half-dim up P5 to dom7
    if (interval === 7 && secondLast.quality === "half-dim") {
      return "ii-V-minor-needs-i";
    }
  }

  // Check for turnaround patterns
  if (thirdLast && secondLast && last) {
    // I-vi pattern: check if we're in a turnaround
    const interval1 = getInterval(thirdLast.root, secondLast.root);
    const interval2 = getInterval(secondLast.root, last.root);

    // I -> vi -> ? (expecting ii)
    if (
      thirdLast.quality === "major" &&
      thirdLast.isSeventh &&
      interval1 === 9 && // Up M6 to vi
      (secondLast.quality === "dominant" || secondLast.quality === "minor")
    ) {
      if (last.quality === "minor" && interval2 === 5) {
        // Already at ii, needs V
        return "turnaround-ii-needs-V";
      }
    }
  }

  // Check for vi chord after I (turnaround continues)
  if (secondLast && last.quality === "dominant") {
    const interval = getInterval(secondLast.root, last.root);
    // I -> vi (vi as dominant chord in turnaround)
    if (interval === 9 && secondLast.quality === "major" && secondLast.isSeventh) {
      return "turnaround-vi-needs-ii";
    }
  }

  // Check for ii chord (needs V)
  if (last.quality === "minor" && last.isSeventh) {
    return "ii-needs-V";
  }

  // Check for half-dim (minor ii chord, needs V)
  if (last.quality === "half-dim") {
    return "ii-minor-needs-V";
  }

  // Check for backdoor: iv-7 needs bVII7
  if (last.quality === "minor" && last.isSeventh && secondLast) {
    // Check if this could be a iv chord (4 semitones up from a previous I)
    const interval = getInterval(secondLast.root, last.root);
    if (interval === 5 && secondLast.quality === "major") {
      return "backdoor-iv-needs-bVII";
    }
  }

  // Check for I chord (start turnaround or new progression)
  if (last.quality === "major" && last.isSeventh) {
    return "I-start-turnaround";
  }

  // Check for dominant (needs resolution)
  if (last.quality === "dominant") {
    return "V-needs-resolution";
  }

  // Default: continue circle of fifths
  return "continue-circle";
}

/**
 * Generate the next chord in a jazz progression.
 * Analyzes the preset sequence and returns a musically appropriate next chord.
 *
 * @param presets - Array of presets in sequential order
 * @returns Generated chord with keys, octave, and reasoning
 */
export function generateNextChord(presets: Preset[]): GeneratedChord {
  // Analyze all presets
  const analyses = presets
    .map((p) => analyzeChordFunction(p.keys))
    .filter((a): a is ChordAnalysis => a !== null);

  // If no valid chords, fall back to random
  if (analyses.length === 0) {
    return generateTrueRandomChord();
  }

  const pattern = detectProgressionPattern(analyses);
  const last = analyses[analyses.length - 1];

  switch (pattern) {
    case "ii-V-needs-I": {
      // Resolve down P5 to major 7
      const targetRoot = transposeRoot(last.root, -7);
      return buildChordKeys(targetRoot, ["maj7"], "completing ii-V-I to " + targetRoot + "maj7");
    }

    case "ii-V-minor-needs-i": {
      // Resolve down P5 to minor 7
      const targetRoot = transposeRoot(last.root, -7);
      return buildChordKeys(
        targetRoot,
        ["minor", "dom7"],
        "completing minor ii-V-i to " + targetRoot + "m7"
      );
    }

    case "ii-needs-V": {
      // Move up P5 to dominant
      const targetRoot = transposeRoot(last.root, 7);
      // Randomly add extensions for flavor
      const mods: ModifierType[] = ["dom7"];
      if (Math.random() > 0.5) mods.push("9");
      return buildChordKeys(targetRoot, mods, "ii to V: " + targetRoot + "7");
    }

    case "ii-minor-needs-V": {
      // Move up P5 to altered dominant
      const targetRoot = transposeRoot(last.root, 7);
      // Altered dominants for minor ii-V
      const alterations: ModifierType[] = ["dom7"];
      const altChoice = Math.random();
      if (altChoice < 0.4) {
        alterations.push("flat9");
      } else if (altChoice < 0.7) {
        alterations.push("sharp9");
      } else {
        alterations.push("flat9", "flat13");
      }
      return buildChordKeys(
        targetRoot,
        alterations,
        "ii to V (altered): " + targetRoot + "7alt"
      );
    }

    case "V-needs-resolution": {
      // Multiple resolution options with weights
      const options: ChordOption[] = [
        { interval: -7, mods: ["maj7"], weight: 5, reason: "V to I: standard resolution" },
        {
          interval: -7,
          mods: ["minor", "dom7"],
          weight: 2,
          reason: "V to vi: deceptive cadence",
        },
        { interval: -1, mods: ["maj7"], weight: 2, reason: "tritone sub resolution" },
        { interval: -7, mods: ["maj7", "9"], weight: 2, reason: "V to Imaj9" },
      ];
      return weightedRandomChoice(last.root, options);
    }

    case "I-start-turnaround": {
      // Start I-vi-ii-V turnaround
      // Go to vi chord (up M6), typically played as a dominant for more tension
      const targetRoot = transposeRoot(last.root, 9);
      // Can be vi7 (minor) or VI7 (dominant for more drive)
      const options: ChordOption[] = [
        { interval: 9, mods: ["dom7"], weight: 3, reason: "turnaround: I to VI7" },
        { interval: 9, mods: ["minor", "dom7"], weight: 2, reason: "turnaround: I to vi7" },
        // Backdoor option: go to iv instead
        { interval: 5, mods: ["minor", "dom7"], weight: 1, reason: "backdoor: I to iv7" },
      ];
      return weightedRandomChoice(last.root, options);
    }

    case "turnaround-vi-needs-ii": {
      // vi -> ii in turnaround
      const targetRoot = transposeRoot(last.root, 5); // Up P4 to ii
      return buildChordKeys(
        targetRoot,
        ["minor", "dom7"],
        "turnaround: VI to ii: " + targetRoot + "m7"
      );
    }

    case "turnaround-ii-needs-V": {
      // ii -> V in turnaround
      const targetRoot = transposeRoot(last.root, 7); // Up P5 to V
      return buildChordKeys(targetRoot, ["dom7"], "turnaround: ii to V: " + targetRoot + "7");
    }

    case "backdoor-iv-needs-bVII": {
      // iv -> bVII7 -> I (backdoor)
      const targetRoot = transposeRoot(last.root, 7); // Up P5 to bVII
      return buildChordKeys(targetRoot, ["dom7"], "backdoor: iv to bVII7: " + targetRoot + "7");
    }

    case "continue-circle":
    default: {
      // Circle of fifths movement with variety
      const options: ChordOption[] = [
        { interval: -7, mods: ["dom7"], weight: 4, reason: "circle of fifths" },
        { interval: -7, mods: ["minor", "dom7"], weight: 2, reason: "circle: to m7" },
        { interval: -7, mods: ["maj7"], weight: 2, reason: "circle: to maj7" },
        // Occasionally try something more adventurous
        { interval: -5, mods: ["dom7"], weight: 1, reason: "down P4" },
        { interval: 3, mods: ["maj7"], weight: 1, reason: "up m3: Coltrane-esque" },
      ];
      return weightedRandomChoice(last.root, options);
    }
  }
}

/**
 * Generate a completely random chord (no jazz theory).
 * Used as fallback when no presets exist or in true random mode.
 */
export function generateTrueRandomChord(): GeneratedChord {
  const rootKeys = Object.keys(LEFT_HAND_KEYS);
  const modifierKeys = Object.keys(RIGHT_HAND_MODIFIERS);

  const randomRoot = rootKeys[Math.floor(Math.random() * rootKeys.length)];
  const numModifiers = Math.floor(Math.random() * 5);
  const keys = new Set<string>([randomRoot]);

  for (let i = 0; i < numModifiers; i++) {
    const randomModifier =
      modifierKeys[Math.floor(Math.random() * modifierKeys.length)];
    keys.add(randomModifier);
  }

  return {
    keys,
    suggestedOctave: 4,
    reasoning: "random chord",
  };
}

/**
 * Get presets in sequential order (1, 2, 3, ... 9, 0).
 * This is the assumed progression order for analysis.
 */
export function getPresetsInSequentialOrder(
  presets: Map<string, Preset>
): Preset[] {
  const order = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  return order.filter((slot) => presets.has(slot)).map((slot) => presets.get(slot)!);
}

/**
 * Get filled slot numbers in sequential order.
 */
export function getFilledSlotNumbers(presets: Map<string, Preset>): string[] {
  const order = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  return order.filter((slot) => presets.has(slot));
}

// ============================================================================
// Explicit Progression Builder (for Prog Wizard)
// ============================================================================

/**
 * Build a complete progression from a starting chord and progression type.
 * Used by the Prog Wizard for explicit progression generation.
 *
 * @param startingKeys - Keys of the starting chord
 * @param progressionType - Type of progression to build
 * @param octave - Base octave for the progression
 * @returns Array of generated chords with function labels
 */
export function buildProgression(
  startingKeys: Set<string>,
  progressionType: ProgressionType,
  octave: Octave = 4
): GeneratedProgressionChord[] {
  const parsed = parseKeys(startingKeys);
  if (!parsed.root) return [];

  const startRoot = parsed.root;
  const result: GeneratedProgressionChord[] = [];

  // Helper to create a chord entry
  const makeChord = (
    root: NoteName,
    mods: ModifierType[],
    func: string
  ): GeneratedProgressionChord => ({
    keys: buildChordKeysSimple(root, mods),
    octave,
    function: func,
  });

  switch (progressionType) {
    case "ii-V-I": {
      // Starting chord IS the ii - generate V and I
      // From ii: V is P4 up (5 semitones), I is M2 down (-2 semitones)
      const V = transposeRoot(startRoot, 5);   // Up P4 to V
      const I = transposeRoot(startRoot, -2);  // Down M2 to I
      result.push(makeChord(V, ["dom7"], "V7"));
      result.push(makeChord(I, ["maj7"], "Imaj7"));
      break;
    }

    case "ii-V-i": {
      // Starting chord IS the ii - generate V and i (minor)
      const V = transposeRoot(startRoot, 5);   // Up P4 to V
      const i = transposeRoot(startRoot, -2);  // Down M2 to i
      result.push(makeChord(V, ["dom7", "flat9"], "V7(b9)"));
      result.push(makeChord(i, ["minor", "dom7"], "i7"));
      break;
    }

    case "I-vi-ii-V": {
      // Starting chord IS the I - generate vi, ii, V
      const vi = transposeRoot(startRoot, 9); // Up M6 to vi
      const ii = transposeRoot(startRoot, 2); // Up M2 to ii
      const V = transposeRoot(startRoot, 7);  // Up P5 to V
      result.push(makeChord(vi, ["minor", "dom7"], "vi7"));
      result.push(makeChord(ii, ["minor", "dom7"], "ii7"));
      result.push(makeChord(V, ["dom7"], "V7"));
      break;
    }

    case "tritone-sub": {
      // Starting chord IS the ii - generate bII7 (tritone sub) and I
      const bII = transposeRoot(startRoot, -1); // Down m2 to bII (tritone sub of V)
      const I = transposeRoot(startRoot, -2);   // Down M2 to I
      result.push(makeChord(bII, ["dom7"], "bII7"));
      result.push(makeChord(I, ["maj7"], "Imaj7"));
      break;
    }

    case "backdoor": {
      // Starting chord IS the iv - generate bVII7 and I
      const bVII = transposeRoot(startRoot, 5); // Up P4 to bVII (or down m3 from iv)
      const I = transposeRoot(startRoot, 7);    // Up P5 to I
      result.push(makeChord(bVII, ["dom7"], "bVII7"));
      result.push(makeChord(I, ["maj7"], "Imaj7"));
      break;
    }

    case "descending-ii-V": {
      // Starting chord IS the first ii - generate chain
      // ii1 -> V1 -> ii2 -> V2 -> I
      const V1 = transposeRoot(startRoot, 5);      // Up P4 to V1
      const I = transposeRoot(startRoot, -2);      // Down M2 to I (target)
      const ii2 = transposeRoot(I, -2 + 2);        // ii of a whole step down = same as startRoot - 2
      const target2 = transposeRoot(I, -2);        // Down whole step from I
      const ii2Root = transposeRoot(target2, 2);   // ii of that key
      const V2 = transposeRoot(target2, 7);        // V of that key
      result.push(makeChord(V1, ["dom7"], "V7"));
      result.push(makeChord(ii2Root, ["minor", "dom7"], "ii7"));
      result.push(makeChord(V2, ["dom7"], "V7"));
      result.push(makeChord(I, ["maj7"], "Imaj7"));
      break;
    }

    case "rhythm-changes-A": {
      // Starting chord IS the I - generate vi, ii, V (like turnaround but with VI7)
      const vi = transposeRoot(startRoot, 9);
      const ii = transposeRoot(startRoot, 2);
      const V = transposeRoot(startRoot, 7);
      result.push(makeChord(vi, ["dom7"], "VI7"));
      result.push(makeChord(ii, ["minor", "dom7"], "ii7"));
      result.push(makeChord(V, ["dom7"], "V7"));
      break;
    }

    default:
      break;
  }

  return result;
}

/**
 * Simple helper to build chord keys without the reasoning field.
 */
function buildChordKeysSimple(root: NoteName, modifiers: ModifierType[]): Set<string> {
  const keys = new Set<string>();

  const rootKey = ROOT_TO_KEY[root];
  if (rootKey) {
    keys.add(rootKey);
  }

  for (const mod of modifiers) {
    const modKey = MODIFIER_TO_KEY[mod];
    if (modKey) {
      keys.add(modKey);
    }
  }

  return keys;
}
