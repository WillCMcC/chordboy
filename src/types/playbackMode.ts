/**
 * Playback Mode Type Definitions
 * Types for chord playback patterns and rhythmic modes.
 *
 * @module types/playbackMode
 */

import type { MIDINote } from "./music";

/**
 * Available playback modes.
 * - Instant modes: block, root-only, shell
 * - BPM-synced modes: vamp, charleston, stride, two-feel, bossa, tremolo, custom
 */
export type PlaybackMode =
  | "block"
  | "root-only"
  | "shell"
  | "vamp"
  | "charleston"
  | "stride"
  | "two-feel"
  | "bossa"
  | "tremolo"
  | "custom";

/** Configuration for a playback mode */
export interface PlaybackModeConfig {
  /** Mode identifier */
  id: PlaybackMode;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Whether this mode uses BPM for timing */
  requiresBpm: boolean;
}

/** All playback mode configurations */
export const PLAYBACK_MODES: PlaybackModeConfig[] = [
  { id: "block", name: "Block", description: "All notes together", requiresBpm: false },
  { id: "root-only", name: "Root Only", description: "Just the root note", requiresBpm: false },
  { id: "shell", name: "Shell", description: "Root + 3rd + 7th", requiresBpm: false },
  { id: "vamp", name: "Vamp", description: "Root then upper notes", requiresBpm: true },
  { id: "charleston", name: "Charleston", description: "Swing anticipation", requiresBpm: true },
  { id: "stride", name: "Stride", description: "Bass and chord alternating", requiresBpm: true },
  { id: "two-feel", name: "Two-Feel", description: "Walking bass feel", requiresBpm: true },
  { id: "bossa", name: "Bossa", description: "Bossa nova pattern", requiresBpm: true },
  { id: "tremolo", name: "Tremolo", description: "Rapid retrigger", requiresBpm: true },
  { id: "custom", name: "Custom", description: "User-defined pattern", requiresBpm: true },
];

/** A note scheduled for future playback */
export interface ScheduledNoteGroup {
  /** Notes to play together */
  notes: MIDINote[];
  /** Delay in ms from chord trigger */
  delayMs: number;
  /** Whether to retrigger (stop previous notes first) */
  retrigger?: boolean;
}

/** Result of applying a playback mode to a chord */
export interface PlaybackModeResult {
  /** Groups of notes to play at different times */
  scheduledGroups: ScheduledNoteGroup[];
  /** Notes that should sustain until chord changes (played immediately) */
  sustainedNotes: MIDINote[];
}

/** Extracted chord components for mode logic */
export interface ChordComponents {
  /** Root/bass note (lowest) */
  root: MIDINote;
  /** Third of the chord (if identifiable) */
  third: MIDINote | null;
  /** Fifth of the chord (if identifiable) */
  fifth: MIDINote | null;
  /** Seventh of the chord (if identifiable) */
  seventh: MIDINote | null;
  /** All notes above the root */
  upperNotes: MIDINote[];
  /** All notes in original order */
  allNotes: MIDINote[];
}

/** Grid pattern for custom playback mode (16 columns x 8 rows max) */
export interface CustomPlaybackPattern {
  /** 2D grid: [rowIndex][columnIndex] = active (true/false) */
  grid: boolean[][];
  /** Number of active rows (adapts to chord size) */
  rows: number;
  /** Number of columns (16th notes in a bar) */
  cols: number;
}
