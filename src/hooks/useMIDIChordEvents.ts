/**
 * MIDI Chord Events Hook
 * Subscribes to chord events and triggers MIDI playback.
 *
 * @module hooks/useMIDIChordEvents
 */

import { appEvents } from "../lib/eventBus";
import { useEventSubscription } from "./useEventSubscription";
import type { ChordChangedEvent, MIDINote, MIDIVelocity } from "../types";
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
  playChord: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  retriggerChord: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  playChordWithGlide: (notes: MIDINote[]) => void;
  stopAllNotes: () => void;
}

/**
 * Hook to subscribe to chord events and trigger MIDI playback.
 * Handles chord:changed and chord:cleared events from useChordEngine.
 *
 * @param props - MIDI connection state and playback functions
 *
 * @example
 * useMIDIChordEvents({
 *   isConnected,
 *   bleConnected,
 *   triggerMode,
 *   playChord,
 *   retriggerChord,
 *   playChordWithGlide,
 *   stopAllNotes
 * });
 */
export function useMIDIChordEvents(props: MIDIChordEventsProps): void {
  const {
    isConnected,
    bleConnected,
    triggerMode,
    playChord,
    retriggerChord,
    playChordWithGlide,
    stopAllNotes,
  } = props;

  // Subscribe to chord events from useChordEngine
  // This replaces the useEffect in App.jsx that watched currentChord
  // Note: useEventSubscription uses a ref pattern, so no useCallback needed
  useEventSubscription(appEvents, "chord:changed", (event: ChordChangedEvent) => {
    // Check if MIDI output is enabled (not in synth-only mode)
    if (!isMidiOutputEnabled()) return;

    if (isConnected || bleConnected) {
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
  });

  useEventSubscription(appEvents, "chord:cleared", () => {
    // Check if MIDI output is enabled (not in synth-only mode)
    if (!isMidiOutputEnabled()) return;

    if (isConnected || bleConnected) {
      stopAllNotes();
    }
  });
}
