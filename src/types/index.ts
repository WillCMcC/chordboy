/**
 * Core Type Definitions for ChordBoy
 * Domain types for music theory, MIDI, and application state.
 */

// ============================================================================
// Music Theory Types
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

/** MIDI channel (0-15) */
export type MIDIChannel = number;

/** MIDI velocity (0-127) */
export type MIDIVelocity = number;

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

/** All possible modifier types */
export type ModifierType =
  | ChordQuality
  | SeventhType
  | ExtensionType
  | AlterationType;

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

/** Drop voicing types */
export type DropType = "none" | "drop2" | "drop3" | "drop24";

/** Voicing state for a chord */
export interface VoicingState {
  /** Current inversion (0 = root position) */
  inversion: number;
  /** Drop voicing type */
  drop: DropType;
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
  /** Number of dropped notes */
  droppedNotes: number;
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
  /** Number of dropped notes */
  droppedNotes?: number;
}

/** Serialized preset for storage (keys as array) */
export interface SerializedPreset {
  keys: string[];
  octave: Octave;
  inversionIndex?: number;
  spreadAmount?: number;
  droppedNotes?: number;
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
// MIDI Types
// ============================================================================

/** MIDI output device info */
export interface MIDIOutputDevice {
  /** Device ID */
  id: string;
  /** Device name */
  name: string;
  /** Manufacturer name */
  manufacturer: string;
  /** Connection state */
  state: MIDIPortDeviceState;
  /** Connection status */
  connection: MIDIPortConnectionState;
  /** The actual MIDIOutput object */
  output: MIDIOutput;
}

/** MIDI input device info */
export interface MIDIInputDevice {
  /** Device ID */
  id: string;
  /** Device name */
  name: string;
  /** Manufacturer name */
  manufacturer: string;
  /** Connection state */
  state: MIDIPortDeviceState;
  /** Connection status */
  connection: MIDIPortConnectionState;
  /** The actual MIDIInput object */
  input: MIDIInput;
}

/** MIDI output info for hooks (simplified) */
export interface MIDIOutputInfo {
  id: string;
  name: string | null;
  output: MIDIOutput;
}

/** MIDI input info for hooks (simplified) */
export interface MIDIInputInfo {
  id: string;
  name: string | null;
  input: MIDIInput;
}

// ============================================================================
// Event Bus Types
// ============================================================================

/** Chord changed event payload */
export interface ChordChangedPayload {
  /** MIDI notes in the chord */
  notes: MIDINote[];
  /** Chord display name */
  name: string;
  /** Event source identifier */
  source?: string;
  /** Whether to retrigger (full chord restart vs smart diffing) */
  retrigger?: boolean;
}

/** Chord changed event (alias for use in components) */
export type ChordChangedEvent = ChordChangedPayload;

/** Chord cleared event payload */
export interface ChordClearedPayload {
  /** Event source identifier */
  source?: string;
}

/** Voicing changed event payload */
export interface VoicingChangedPayload {
  /** Current inversion */
  inversion: number;
  /** Drop voicing type */
  drop: DropType;
  /** Spread amount */
  spread: number;
  /** Octave shift */
  octave: number;
}

/** Preset saved event payload */
export interface PresetSavedPayload {
  /** Slot number (0-9) */
  slot: number;
  /** Saved keys */
  keys: Set<string>;
  /** Voicing settings */
  voicing: VoicingState;
}

/** Preset recalled event payload */
export interface PresetRecalledPayload {
  /** Slot number (0-9) */
  slot: number;
  /** The preset data */
  preset: Preset;
}

/** Preset cleared event payload */
export interface PresetClearedPayload {
  /** Slot number (0-9) */
  slot: number;
}

/** All keys released event payload */
export interface KeysAllUpPayload {
  // Empty payload
}

/** Map of event types to their payloads */
export interface AppEventMap {
  "chord:changed": ChordChangedPayload;
  "chord:cleared": ChordClearedPayload;
  "voicing:changed": VoicingChangedPayload;
  "preset:saved": PresetSavedPayload;
  "preset:recalled": PresetRecalledPayload;
  "preset:cleared": PresetClearedPayload;
  "keys:allUp": KeysAllUpPayload;
}

/** App event type (union of all event names) */
export type AppEventType = keyof AppEventMap;

/** Event handler function type */
export type EventHandler<T> = (payload: T) => void;

/** Generic event handler for any event type */
export type AnyEventHandler = EventHandler<AppEventMap[AppEventType]>;

// ============================================================================
// Event Bus Interface
// ============================================================================

/** Event bus interface */
export interface EventBus {
  /** Subscribe to an event */
  on<K extends AppEventType>(event: K, handler: EventHandler<AppEventMap[K]>): () => void;
  /** Subscribe to an event once */
  once<K extends AppEventType>(event: K, handler: EventHandler<AppEventMap[K]>): () => void;
  /** Unsubscribe from an event */
  off<K extends AppEventType>(event: K, handler: EventHandler<AppEventMap[K]>): void;
  /** Emit an event */
  emit<K extends AppEventType>(event: K, payload: AppEventMap[K]): void;
  /** Clear listeners */
  clear(event?: AppEventType): void;
  /** Get listener count for an event */
  listenerCount(event: AppEventType): number;
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
// BLE MIDI Types
// ============================================================================

/** BLE MIDI connection result */
export interface BLEMIDIConnection {
  /** GATT server */
  server: BluetoothRemoteGATTServer;
  /** MIDI characteristic */
  characteristic: BluetoothRemoteGATTCharacteristic;
}
