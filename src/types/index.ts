/**
 * Core Type Definitions for ChordBoy
 * Centralized type exports - re-exports from domain-specific modules.
 */

// Music theory types
export type {
  NoteName,
  NoteNameWithFlats,
  MIDINote,
  Interval,
  Octave,
  ChordQuality,
  SeventhType,
  ExtensionType,
  AlterationType,
  HalfDimType,
  ModifierType,
  Chord,
  ParsedKeys,
  DropType,
  VoicingStyle,
  VoicingState,
  VoicingSettings,
  Preset,
  SerializedPreset,
  StepAction,
  StepResult,
  StrumDirection,
  StrumOffsetsResult,
  SequencerState,
  TutorialState,
  TutorialStep,
  LeftHandKeyMap,
  RightHandModifierMap,
  SpecialKeyMap,
  PianoKey,
  HumanizeManager,
} from "./music";

export { VOICING_STYLES, VOICING_STYLE_LABELS } from "./music";

// MIDI types
export type {
  MIDIChannel,
  MIDIVelocity,
  MIDIOutputDevice,
  MIDIInputDevice,
  MIDIOutputInfo,
  MIDIInputInfo,
  MIDIInputInfoDisplay,
  BLEMIDIConnection,
} from "./midi";

// Event bus types
export type {
  ChordChangedPayload,
  ChordChangedEvent,
  ChordClearedPayload,
  VoicingChangedPayload,
  PresetSavedPayload,
  PresetRecalledPayload,
  PresetClearedPayload,
  KeysAllUpPayload,
  GraceNotePayload,
  AppEventMap,
  AppEventType,
  EventHandler,
  AnyEventHandler,
  EventBus,
} from "./events";

// Playback mode types
export type {
  PlaybackMode,
  PlaybackModeConfig,
  ScheduledNoteGroup,
  PlaybackModeResult,
  ChordComponents,
} from "./playbackMode";

export { PLAYBACK_MODES } from "./playbackMode";
