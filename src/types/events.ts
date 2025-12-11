/**
 * Event Bus Type Definitions
 * Types for the application event system and event payloads.
 */

import type { MIDINote } from "./music";
import type { DropType, VoicingState, Preset } from "./music";

// ============================================================================
// Event Payload Types
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

/** Grace note event payload - retrigger subset of notes while holding preset */
export interface GraceNotePayload {
  /** MIDI notes to retrigger */
  notes: MIDINote[];
  /** Which note indices from the chord (for UI feedback) */
  indices: number[];
  /** Type of grace note pattern */
  pattern: "single" | "pair" | "interval" | "full";
  /** Octave shift applied to the grace notes (0 = no shift, -1 = down, +1 = up) */
  octaveShift?: number;
}

// ============================================================================
// Event Map and Bus Interface
// ============================================================================

/** Map of event types to their payloads */
export interface AppEventMap {
  "chord:changed": ChordChangedPayload;
  "chord:cleared": ChordClearedPayload;
  "voicing:changed": VoicingChangedPayload;
  "preset:saved": PresetSavedPayload;
  "preset:recalled": PresetRecalledPayload;
  "preset:cleared": PresetClearedPayload;
  "keys:allUp": KeysAllUpPayload;
  "grace:note": GraceNotePayload;
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
