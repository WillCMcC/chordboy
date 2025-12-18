/**
 * Synth Event Handlers Hook
 * Subscribes to chord and grace note events and manages synth playback.
 *
 * @module hooks/useSynthEventHandlers
 */

import { useEffect, type MutableRefObject } from "react";
import * as Tone from "tone";
import { appEvents } from "../lib/appEvents";
import type { MIDINote } from "../types";
import type { TriggerMode } from "./useMIDI";
import type { CustomSynthEngine } from "../lib/customSynthEngine";

interface UseSynthEventHandlersProps {
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
 * Hook to subscribe to chord events and manage synth playback
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
}: UseSynthEventHandlersProps) {
  useEffect(() => {
    // Handler for chord:changed event
    const handleChordChanged = (event: CustomEvent) => {
      // Don't play synth if patch builder is open
      if (isPatchBuilderOpenRef.current) return;
      if (!isEnabledRef.current || !isInitializedRef.current) return;

      const notes = event.detail.notes as MIDINote[];
      const velocity = event.detail.velocity as number;

      // Use glide mode if enabled (only for factory synth, not custom)
      if (triggerModeRef.current === "glide" && !isCustomPatchRef.current) {
        playChordWithGlide(notes, velocity);
      } else {
        // Retrigger mode: always restart notes even if they're the same
        const retrigger = triggerModeRef.current === "retrigger";
        playChord(notes, velocity, retrigger);
      }
    };

    // Handler for chord:cleared event
    const handleChordCleared = () => {
      if (!isEnabledRef.current || !isInitializedRef.current) return;
      stopAllNotes();
    };

    // Handler for grace:play event
    const handleGracePlay = (event: CustomEvent) => {
      // Don't play synth if patch builder is open
      if (isPatchBuilderOpenRef.current) return;
      if (!isEnabledRef.current || !isInitializedRef.current) return;

      const note = event.detail.note as MIDINote;
      const velocity = event.detail.velocity as number;
      const duration = event.detail.duration as number;

      // Play grace note immediately with short duration
      if (isCustomPatchRef.current && customSynthRef.current) {
        customSynthRef.current.triggerAttackRelease(note, duration / 1000, velocity / 127);
      } else if (synthRef.current) {
        const freq = Tone.Frequency(note, "midi").toFrequency();
        synthRef.current.triggerAttackRelease(freq, duration / 1000, Tone.now(), velocity / 127);
      }
    };

    // Subscribe to events
    appEvents.on("chord:changed", handleChordChanged);
    appEvents.on("chord:cleared", handleChordCleared);
    appEvents.on("grace:play", handleGracePlay);

    // Cleanup
    return () => {
      appEvents.off("chord:changed", handleChordChanged);
      appEvents.off("chord:cleared", handleChordCleared);
      appEvents.off("grace:play", handleGracePlay);
    };
  }, [
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
  ]);
}
