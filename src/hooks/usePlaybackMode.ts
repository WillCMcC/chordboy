/**
 * Playback Mode Hook
 * Manages playback mode state and provides rhythmic chord scheduling.
 *
 * @module hooks/usePlaybackMode
 */

import { useCallback, useRef } from "react";
import { usePersistentState } from "./usePersistence";
import { applyPlaybackMode, modeRequiresBpm } from "../lib/playbackModes";
import { createHumanizeManager } from "../lib/humanize";
import type { MIDINote, MIDIVelocity, PlaybackMode, HumanizeManager } from "../types";

/** Dependencies for usePlaybackMode hook */
export interface PlaybackModeDeps {
  /** Current BPM for timing calculations */
  bpm: number;
  /** Play a chord with smart diffing (applies strum/humanize) */
  playChord: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  /** Retrigger a chord (full re-articulation) */
  retriggerChord: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  /** Stop all playing notes */
  stopAllNotes: () => void;
}

/** Return type for usePlaybackMode hook */
export interface UsePlaybackModeReturn {
  /** Current playback mode */
  mode: PlaybackMode;
  /** Set the playback mode */
  setMode: (mode: PlaybackMode) => void;
  /** Play a chord with the current mode applied */
  playChordWithMode: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  /** Stop all scheduled playback */
  stopPlayback: () => void;
  /** Clear scheduled notes (for cleanup) */
  clearScheduled: () => void;
}

/**
 * Hook for managing playback modes and rhythmic chord scheduling.
 *
 * Playback modes transform how chords are played:
 * - Instant modes (block, root-only, shell) modify which notes play
 * - Rhythmic modes (vamp, charleston, stride, etc.) schedule notes over time
 *
 * @param deps - Dependencies (BPM, playback functions)
 * @returns Mode state and playback functions
 *
 * @example
 * const { mode, setMode, playChordWithMode } = usePlaybackMode({
 *   bpm: 120,
 *   playChord,
 *   retriggerChord,
 *   stopAllNotes,
 * });
 *
 * // Play with current mode
 * playChordWithMode([60, 64, 67]);
 */
export function usePlaybackMode(deps: PlaybackModeDeps): UsePlaybackModeReturn {
  const { bpm, playChord, retriggerChord, stopAllNotes } = deps;

  // Persisted mode state
  const [mode, setMode] = usePersistentState<PlaybackMode>(
    "chordboy-playback-mode",
    "block"
  );

  // Scheduler for timed note groups
  const schedulerRef = useRef<HumanizeManager>(createHumanizeManager());

  // Sequence ID to cancel pending scheduled notes on chord change
  const sequenceIdRef = useRef(0);

  // Keep deps in refs to avoid stale closures in scheduled callbacks
  const depsRef = useRef(deps);
  depsRef.current = deps;

  /**
   * Clear all scheduled notes.
   */
  const clearScheduled = useCallback((): void => {
    schedulerRef.current.clear();
  }, []);

  /**
   * Stop all playback and clear scheduled notes.
   */
  const stopPlayback = useCallback((): void => {
    clearScheduled();
    stopAllNotes();
  }, [clearScheduled, stopAllNotes]);

  /**
   * Play a chord with the current playback mode applied.
   * For rhythmic modes, this schedules note groups over time.
   */
  const playChordWithMode = useCallback(
    (notes: MIDINote[], vel?: MIDIVelocity): void => {
      // Increment sequence ID to invalidate any pending scheduled notes
      const currentSequence = ++sequenceIdRef.current;

      // Clear previously scheduled notes
      clearScheduled();

      // Get current deps from ref (avoids stale closure)
      const currentBpm = depsRef.current.bpm;

      // Apply the playback mode
      const result = applyPlaybackMode(notes, mode, currentBpm);

      // Play sustained notes immediately (with strum/humanize via playChord)
      if (result.sustainedNotes.length > 0) {
        playChord(result.sustainedNotes, vel);
      }

      // Schedule future note groups
      for (const group of result.scheduledGroups) {
        schedulerRef.current.schedule(() => {
          // Guard: only execute if this is still the current sequence
          if (sequenceIdRef.current !== currentSequence) return;

          // Use retrigger if specified, otherwise normal playChord
          if (group.retrigger) {
            depsRef.current.retriggerChord(group.notes, vel);
          } else {
            depsRef.current.playChord(group.notes, vel);
          }
        }, group.delayMs);
      }
    },
    [mode, playChord, clearScheduled]
  );

  return {
    mode,
    setMode,
    playChordWithMode,
    stopPlayback,
    clearScheduled,
  };
}

/**
 * Check if the current mode is instant (non-rhythmic).
 * Instant modes don't schedule notes - they just filter/transform.
 */
export function isInstantMode(mode: PlaybackMode): boolean {
  return !modeRequiresBpm(mode);
}
