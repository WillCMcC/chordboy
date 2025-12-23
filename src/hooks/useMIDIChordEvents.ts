/**
 * MIDI Chord Events Hook
 * Subscribes to chord events and triggers MIDI playback.
 * Supports playback modes for rhythmic patterns.
 *
 * @module hooks/useMIDIChordEvents
 */

import { useRef } from "react";
import { appEvents } from "../lib/eventBus";
import { useEventSubscription } from "./useEventSubscription";
import { applyPlaybackMode } from "../lib/playbackModes";
import { createHumanizeManager } from "../lib/humanize";
import type { ChordChangedEvent, MIDINote, MIDIVelocity, PlaybackMode, HumanizeManager } from "../types";
import type { TriggerMode } from "./useMIDI";

/** Check if MIDI output should be enabled based on audio mode setting */
function isMidiOutputEnabled(): boolean {
  try {
    const settings = localStorage.getItem("chordboy-synth-settings");
    if (settings) {
      const parsed = JSON.parse(settings);
      // MIDI is enabled in "midi" or "both" mode, disabled in "synth" only mode
      return parsed.audioMode !== "synth";
    }
  } catch {
    // Ignore parse errors
  }
  return true; // Default to MIDI enabled
}

/**
 * Props for useMIDIChordEvents hook
 */
export interface MIDIChordEventsProps {
  isConnected: boolean;
  bleConnected: boolean;
  triggerMode: TriggerMode;
  playbackMode: PlaybackMode;
  bpm: number;
  playChord: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  retriggerChord: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  playChordWithGlide: (notes: MIDINote[]) => void;
  stopAllNotes: () => void;
}

/**
 * Hook to subscribe to chord events and trigger MIDI playback.
 * Handles chord:changed and chord:cleared events from useChordEngine.
 * Supports playback modes for rhythmic chord patterns.
 *
 * @param props - MIDI connection state and playback functions
 *
 * @example
 * useMIDIChordEvents({
 *   isConnected,
 *   bleConnected,
 *   triggerMode,
 *   playbackMode,
 *   bpm,
 *   playChord,
 *   retriggerChord,
 *   playChordWithGlide,
 *   stopAllNotes
 * });
 */
export function useMIDIChordEvents(props: MIDIChordEventsProps): void {
  // Scheduler for playback mode timed note groups
  const schedulerRef = useRef<HumanizeManager>(createHumanizeManager());

  // Sequence ID to cancel pending scheduled notes on chord change
  const sequenceIdRef = useRef(0);

  // Keep deps in refs to avoid stale closures in scheduled callbacks
  const depsRef = useRef(props);
  depsRef.current = props;

  // Subscribe to chord events from useChordEngine
  // This replaces the useEffect in App.jsx that watched currentChord
  // Note: useEventSubscription uses a ref pattern, so we must use depsRef.current
  // to get current values (not the stale closure-captured ones)
  useEventSubscription(appEvents, "chord:changed", (event: ChordChangedEvent) => {
    // Check if MIDI output is enabled (not in synth-only mode)
    if (!isMidiOutputEnabled()) return;

    // Get current values from ref to avoid stale closures
    const {
      isConnected,
      bleConnected,
      playbackMode,
      triggerMode,
      bpm,
      playChord,
      retriggerChord,
      playChordWithGlide,
    } = depsRef.current;

    if (isConnected || bleConnected) {
      // Increment sequence ID to invalidate any pending scheduled notes
      const currentSequence = ++sequenceIdRef.current;

      // Clear any previously scheduled notes
      schedulerRef.current.clear();

      // Handle playback mode
      if (playbackMode !== "block") {
        // Apply playback mode transformation
        const result = applyPlaybackMode(event.notes, playbackMode, bpm);

        // Play sustained notes immediately
        if (result.sustainedNotes.length > 0) {
          if (event.retrigger || triggerMode === "all") {
            retriggerChord(result.sustainedNotes);
          } else if (triggerMode === "glide") {
            playChordWithGlide(result.sustainedNotes);
          } else {
            playChord(result.sustainedNotes);
          }
        }

        // Schedule future note groups
        for (const group of result.scheduledGroups) {
          schedulerRef.current.schedule(() => {
            // Guard: only execute if this is still the current sequence
            if (sequenceIdRef.current !== currentSequence) return;

            // Use retrigger if specified in the group, otherwise normal playChord
            if (group.retrigger) {
              depsRef.current.retriggerChord(group.notes);
            } else {
              depsRef.current.playChord(group.notes);
            }
          }, group.delayMs);
        }
      } else {
        // Block mode: standard behavior
        // Determine trigger behavior:
        // - Mobile (event.retrigger=true) always retriggers
        // - Desktop respects user's triggerMode setting
        if (event.retrigger || triggerMode === "all") {
          retriggerChord(event.notes);
        } else if (triggerMode === "glide") {
          playChordWithGlide(event.notes);
        } else {
          playChord(event.notes);
        }
      }
    }
  });

  useEventSubscription(appEvents, "chord:cleared", () => {
    // Check if MIDI output is enabled (not in synth-only mode)
    if (!isMidiOutputEnabled()) return;

    // Clear any scheduled notes
    schedulerRef.current.clear();

    const { isConnected, bleConnected, stopAllNotes } = depsRef.current;
    if (isConnected || bleConnected) {
      stopAllNotes();
    }
  });
}
