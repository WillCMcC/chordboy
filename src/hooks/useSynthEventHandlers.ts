/**
 * Synth Event Handlers Hook
 * Manages event subscriptions for chord and grace note playback.
 *
 * @module hooks/useSynthEventHandlers
 */

import { useRef, MutableRefObject } from "react";
import * as Tone from "tone";
import { appEvents } from "../lib/eventBus";
import { useEventSubscription } from "./useEventSubscription";
import type { ChordChangedEvent, GraceNotePayload, MIDINote } from "../types";
import type { TriggerMode } from "./useMIDI";
import type { CustomSynthEngine } from "../lib/customSynthEngine";
import { midiToFreq, midiVelocityToTone } from "../lib/synthPlayback";

interface SynthEventHandlersParams {
  isPatchBuilderOpenRef: MutableRefObject<boolean>;
  isEnabledRef: MutableRefObject<boolean>;
  isInitializedRef: MutableRefObject<boolean>;
  isCustomPatchRef: MutableRefObject<boolean>;
  triggerModeRef: MutableRefObject<TriggerMode>;
  customSynthRef: MutableRefObject<CustomSynthEngine | null>;
  synthRef: MutableRefObject<Tone.PolySynth | null>;
  playChordWithGlide: (notes: MIDINote[], velocity?: number) => void;
  playChord: (notes: MIDINote[], velocity?: number, retrigger?: boolean) => void;
  stopAllNotes: () => void;
}

/**
 * Hook that subscribes to chord and grace note events and triggers synth playback
 */
export function useSynthEventHandlers({
  isPatchBuilderOpenRef,
  isEnabledRef,
  isInitializedRef,
  isCustomPatchRef,
  triggerModeRef,
  customSynthRef,
  synthRef,
  playChordWithGlide,
  playChord,
  stopAllNotes,
}: SynthEventHandlersParams): void {
  // Subscribe to chord events (use refs for latest values)
  // Skip playback when patch builder is open (it has its own preview synth)
  useEventSubscription(appEvents, "chord:changed", (event: ChordChangedEvent) => {
    if (isPatchBuilderOpenRef.current) return; // Let patch builder handle preview
    if (!isEnabledRef.current || !isInitializedRef.current) return;

    // Check if we have a valid synth (either custom or factory)
    const hasValidSynth = isCustomPatchRef.current
      ? customSynthRef.current !== null
      : synthRef.current !== null;

    if (!hasValidSynth) return;

    if (triggerModeRef.current === "glide" && !isCustomPatchRef.current) {
      // Use glide mode - smooth transition between chords (factory synth only)
      playChordWithGlide(event.notes);
    } else {
      // Determine if we should retrigger all notes
      const shouldRetrigger = event.retrigger || triggerModeRef.current === "all";
      playChord(event.notes, 100, shouldRetrigger);
    }
  });

  useEventSubscription(appEvents, "chord:cleared", () => {
    if (isPatchBuilderOpenRef.current) return; // Let patch builder handle preview
    if (isEnabledRef.current && isInitializedRef.current) {
      stopAllNotes();
    }
  });

  // Subscribe to grace note events
  useEventSubscription(appEvents, "grace:note", (event: GraceNotePayload) => {
    if (isPatchBuilderOpenRef.current) return; // Let patch builder handle preview
    if (!isEnabledRef.current || !isInitializedRef.current) return;

    // Grace notes: immediate release and re-attack
    // No delay needed - Tone.js handles the envelope transitions natively.
    // The release begins immediately and the new attack starts fresh.
    const graceVelocity = 85; // Slightly softer
    const now = Tone.now();

    if (isCustomPatchRef.current && customSynthRef.current) {
      // Custom synth grace notes - immediate re-trigger
      event.notes.forEach((note) => {
        customSynthRef.current?.triggerRelease(note);
        customSynthRef.current?.triggerAttack(note, midiVelocityToTone(graceVelocity));
      });
    } else if (synthRef.current) {
      // Factory synth grace notes - immediate re-trigger
      event.notes.forEach((note) => {
        const freq = midiToFreq(note);
        synthRef.current?.triggerRelease(freq, now);
        synthRef.current?.triggerAttack(freq, now, midiVelocityToTone(graceVelocity));
      });
    }
  });
}
