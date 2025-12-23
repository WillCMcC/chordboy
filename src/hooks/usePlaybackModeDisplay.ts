/**
 * Playback Mode Display Hook
 * Tracks which notes should be displayed on keyboard based on playback mode timing.
 * For rhythmic modes, updates display in real-time as scheduled notes trigger.
 *
 * @module hooks/usePlaybackModeDisplay
 */

import { useState, useEffect, useRef, useMemo } from "react";
import type { MIDINote, PlaybackMode } from "../types";
import { applyPlaybackMode, modeRequiresBpm } from "../lib/playbackModes";

interface UsePlaybackModeDisplayParams {
  /** Current chord notes (null if no chord) */
  chordNotes: MIDINote[] | null;
  /** Current playback mode */
  playbackMode: PlaybackMode;
  /** Current BPM for timing calculations */
  bpm: number;
}

/**
 * Hook that returns the notes to display on keyboard based on playback mode.
 * For instant modes (block, root-only, shell), returns transformed notes immediately.
 * For rhythmic modes, updates in real-time as the pattern progresses.
 */
export function usePlaybackModeDisplay({
  chordNotes,
  playbackMode,
  bpm,
}: UsePlaybackModeDisplayParams): MIDINote[] {
  // Track currently active notes for rhythmic modes
  const [activeNotes, setActiveNotes] = useState<MIDINote[]>([]);

  // Sequence ID to cancel pending updates on chord change
  const sequenceIdRef = useRef(0);

  // Track pending timeouts for cleanup
  const timeoutsRef = useRef<number[]>([]);

  // Clear all pending timeouts
  const clearTimeouts = () => {
    for (const id of timeoutsRef.current) {
      clearTimeout(id);
    }
    timeoutsRef.current = [];
  };

  // Compute display notes based on mode
  useEffect(() => {
    // Clear previous timeouts
    clearTimeouts();

    // No chord = no notes
    if (!chordNotes || chordNotes.length === 0) {
      setActiveNotes([]);
      return;
    }

    // Increment sequence to invalidate any pending callbacks
    const currentSequence = ++sequenceIdRef.current;

    // For block mode, show all notes
    if (playbackMode === "block") {
      setActiveNotes(chordNotes);
      return;
    }

    // Apply playback mode transformation
    const result = applyPlaybackMode(chordNotes, playbackMode, bpm);

    // For instant modes, show sustained notes
    if (!modeRequiresBpm(playbackMode)) {
      setActiveNotes(result.sustainedNotes);
      return;
    }

    // For rhythmic modes, start with sustained notes and schedule updates
    setActiveNotes(result.sustainedNotes);

    // Schedule display updates for each group
    for (const group of result.scheduledGroups) {
      const timeoutId = window.setTimeout(() => {
        // Guard: only update if this is still the current sequence
        if (sequenceIdRef.current !== currentSequence) return;

        // Update display to show this group's notes
        // For retrigger groups, briefly show the notes
        // For sustained groups, add to existing notes
        if (group.retrigger) {
          // Retrigger: show these notes (replacing current)
          setActiveNotes(group.notes);
        } else {
          // Add to existing sustained notes
          setActiveNotes(prev => {
            const combined = new Set([...prev, ...group.notes]);
            return Array.from(combined);
          });
        }
      }, group.delayMs);

      timeoutsRef.current.push(timeoutId);
    }

    // Cleanup on unmount or dependency change
    return () => {
      clearTimeouts();
    };
  }, [chordNotes, playbackMode, bpm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, []);

  return activeNotes;
}
