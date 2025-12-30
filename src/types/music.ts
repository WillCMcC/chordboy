/**
 * Music Theory Type Definitions
 * Types for notes, chords, intervals, voicings, and presets.
 */

// ============================================================================
// Basic Music Types
// ============================================================================

/** Note names in chromatic scale (sharps only) */
export type NoteName =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";

/** Note names including flats for parsing */
export type NoteNameWithFlats =
  | NoteName
  | "Db"
  | "Eb"
  | "Gb"
  | "Ab"
  | "Bb";

/** MIDI note number (0-127) */
export type MIDINote = number;

/** Interval in semitones from root */
export type Interval = number;

/** Octave number (-1 to 9 for MIDI range) */
export type Octave = number;

// ============================================================================
// Chord Quality and Modifier Types
// ============================================================================

/** Basic chord qualities */
export type ChordQuality =
  | "major"
  | "minor"
  | "diminished"
  | "augmented"
  | "sus2"
  | "sus4";

/** Seventh types */
export type SeventhType = "dom7" | "maj7" | "6";

/** Extension types */
export type ExtensionType = "9" | "11" | "13";

/** Alteration types */
export type AlterationType =
  | "flat5"
  | "flat9"
  | "sharp9"
  | "sharp11"
  | "flat13";

/** Half-diminished (m7b5) - common enough to warrant its own modifier */
export type HalfDimType = "half-dim";

/** All possible modifier types */
export type ModifierType =
  | ChordQuality
  | SeventhType
  | ExtensionType
  | AlterationType
  | HalfDimType;

// ============================================================================
// Chord Types
// ============================================================================

/** Chord data structure returned by buildChord */
export interface Chord {
  /** Root note name */
  root: NoteName;
  /** Chord quality (major, minor, etc.) */
  quality: ChordQuality;
  /** Active modifiers */
  modifiers: ModifierType[];
  /** Intervals from root in semitones */
  intervals: Interval[];
  /** MIDI note numbers */
  notes: MIDINote[];
  /** Base octave */
  octave: Octave;
}

/** Parsed keyboard input */
export interface ParsedKeys {
  /** Root note or null if no root pressed */
  root: NoteName | null;
  /** Active chord modifiers */
  modifiers: ModifierType[];
  /** Active special function keys */
  specialFunctions: string[];
}

// ============================================================================
// Voicing Types
// ============================================================================

/** Drop voicing types (legacy, kept for backwards compatibility) */
export type DropType = "none" | "drop2" | "drop3" | "drop24";

/**
 * Jazz voicing styles - determines how chord tones are arranged
 *
 * close     - Standard close position (all notes within one octave)
 * rootless-a - Bill Evans Type A: 3-5-7-9 (3rd on bottom)
 * rootless-b - Bill Evans Type B: 7-9-3-5 (7th on bottom)
 * shell     - Bud Powell shell: root + 3rd + 7th only
 * quartal   - McCoy Tyner style: stacked 4ths (So What chord for m7)
 * drop2     - True drop 2: 2nd note from top dropped an octave
 * drop3     - True drop 3: 3rd note from top dropped an octave
 * drop24    - Drop 2 and 4: both dropped an octave
 * upper-struct - Upper structure triad: major triad m3 above root for altered dominants
 */
export type VoicingStyle =
  | "close"
  | "rootless-a"
  | "rootless-b"
  | "shell"
  | "quartal"
  | "drop2"
  | "drop3"
  | "drop24"
  | "upper-struct";

/** Array of voicing styles for cycling */
export const VOICING_STYLES = [
  "close",
  "drop2",
  "drop3",
  "drop24",
  "rootless-a",
  "rootless-b",
  "shell",
  "quartal",
  "upper-struct",
] as const;

/** Human-readable labels for voicing styles */
export const VOICING_STYLE_LABELS = {
  "close": "Close",
  "rootless-a": "Rootless A",
  "rootless-b": "Rootless B",
  "shell": "Shell",
  "quartal": "Quartal",
  "drop2": "Drop 2",
  "drop3": "Drop 3",
  "drop24": "Drop 2+4",
  "upper-struct": "Upper Struct",
} satisfies Record<VoicingStyle, string>;

/** Voicing state for a chord */
export interface VoicingState {
  /** Current inversion (0 = root position) */
  inversion: number;
  /** Drop voicing type (legacy) */
  drop: DropType;
  /** Jazz voicing style */
  voicingStyle: VoicingStyle;
  /** Spread amount (0-3 octaves) */
  spread: number;
  /** Octave shift from base */
  octaveShift: number;
}

/** Voicing settings from chord solver */
export interface VoicingSettings {
  /** Inversion index */
  inversionIndex: number;
  /** Spread amount */
  spreadAmount: number;
  /** Number of dropped notes (legacy) */
  droppedNotes: number;
  /** Jazz voicing style */
  voicingStyle: VoicingStyle;
  /** Target octave */
  octave: Octave;
}

// ============================================================================
// Preset Types
// ============================================================================

/** Chord preset data */
export interface Preset {
  /** Set of pressed keyboard keys */
  keys: Set<string>;
  /** Base octave */
  octave: Octave;
  /** Inversion index */
  inversionIndex?: number;
  /** Spread amount */
  spreadAmount?: number;
  /** Number of dropped notes (legacy, kept for backwards compat) */
  droppedNotes?: number;
  /** Jazz voicing style */
  voicingStyle?: VoicingStyle;
}

/** Serialized preset for storage (keys as array) */
export interface SerializedPreset {
  keys: string[];
  octave: Octave;
  inversionIndex?: number;
  spreadAmount?: number;
  droppedNotes?: number;
  voicingStyle?: VoicingStyle;
}

// ============================================================================
// Sequencer Types
// ============================================================================

/** Sequencer step action types */
export type StepAction = "trigger" | "retrigger" | "sustain" | "stop";

/** Result of processing a sequencer step */
export interface StepResult {
  /** Action to take */
  action: StepAction;
  /** Preset slot to trigger, or null for stop */
  preset: string | null;
  /** Updated last triggered preset value */
  lastTriggeredPreset: string | null;
}

/** Strum direction */
export type StrumDirection = "up" | "down" | "alternate";

/** Strum offsets result */
export interface StrumOffsetsResult {
  /** Delay offsets in milliseconds for each note */
  offsets: number[];
  /** Next direction for alternate mode */
  nextDirection: StrumDirection;
}

/** Sequencer state for persistence */
export interface SequencerState {
  /** Sequence of preset slots (null = empty) */
  sequence: (string | null)[];
  /** Number of sequencer steps */
  sequencerSteps: number;
  /** Steps per beat (1 = quarter, 2 = eighth, 4 = sixteenth) */
  stepsPerBeat: number;
  /** Whether retrigger mode is enabled */
  retrigMode: boolean;
  /** Whether sequencer is enabled */
  sequencerEnabled: boolean;
  /** BPM */
  bpm: number;
}

// ============================================================================
// Tutorial Types
// ============================================================================

/** Tutorial state for condition checking */
export interface TutorialState {
  /** Has a root note been played */
  hasRoot: boolean;
  /** Is a chord being played */
  hasChord: boolean;
  /** Is it a minor chord */
  isMinor: boolean;
  /** Does it have an extension */
  hasExtension: boolean;
  /** Has voicing been changed */
  hasVoicingChange: boolean;
  /** Has a preset been saved */
  hasPreset: boolean;
}

/** Tutorial step definition */
export interface TutorialStep {
  /** Step identifier */
  id: string;
  /** Display title */
  title: string;
  /** Whether this step has a condition to check */
  hasCondition: boolean;
  /** Condition check function (optional) */
  check?: (state: TutorialState) => boolean;
}

// ============================================================================
// Keyboard Mapping Types
// ============================================================================

/** Left hand key to root note mapping */
export type LeftHandKeyMap = Record<string, NoteName>;

/** Right hand key to modifier mapping */
export type RightHandModifierMap = Record<string, ModifierType>;

/** Special function key mapping */
export type SpecialKeyMap = Record<string, string>;

// ============================================================================
// Piano Layout Types
// ============================================================================

/** Piano key data for visualization */
export interface PianoKey {
  /** MIDI note number */
  midi: MIDINote;
  /** Note name with octave */
  noteName: string;
  /** Whether this is a black key */
  isBlack: boolean;
  /** Index among white keys (for positioning) */
  whiteKeyIndex: number;
}

// ============================================================================
// Humanization Types
// ============================================================================

/** Humanize manager interface */
export interface HumanizeManager {
  /** Schedule a callback with delay */
  schedule(callback: () => void, delay: number): void;
  /** Clear all pending callbacks */
  clear(): void;
}

// ============================================================================
// Progression Generator Types
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

/** Generated chord result from progression generator */
export interface GeneratedChord {
  /** Keys to save as preset */
  keys: Set<string>;
  /** Suggested octave for voicing */
  suggestedOctave: Octave;
  /** Human-readable reasoning */
  reasoning: string;
}

// ============================================================================
// Chord Bank Types
// ============================================================================

/** Chord bank containing a collection of presets (0-9) */
export interface ChordBank {
  /** Unique identifier (UUID) */
  id: string;
  /** User-defined bank name */
  name: string;
  /** Map of preset slot ("0"-"9") to Preset data */
  presets: Map<string, Preset>;
  /** Creation timestamp */
  createdAt: number;
  /** Last modified timestamp */
  updatedAt: number;
}

/** Serialized chord bank for IndexedDB storage */
export interface SerializedChordBank {
  id: string;
  name: string;
  /** Presets as array of [slot, SerializedPreset] tuples */
  presets: [string, SerializedPreset][];
  createdAt: number;
  updatedAt: number;
}

/** Bank metadata for UI display (lightweight) */
export interface ChordBankEntry {
  id: string;
  name: string;
  presetCount: number;
  updatedAt: number;
}
