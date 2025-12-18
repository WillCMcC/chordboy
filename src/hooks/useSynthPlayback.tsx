/**
 * Synth Playback Hook
 * Handles note and chord playback for both factory and custom synths.
 *
 * @module hooks/useSynthPlayback
 */

import { useCallback, useRef, type MutableRefObject } from "react";
import * as Tone from "tone";
import type { MIDINote, HumanizeManager, StrumDirection } from "../types";
import type { CustomSynthEngine } from "../lib/customSynthEngine";
import {
  midiToFreq,
  midiVelocityToTone,
  applyExpression,
  playNotesCustomSynth,
  playNotesFactorySynth,
  playChordWithGlide,
} from "../lib/synthPlayback";

interface UseSynthPlaybackProps {
  isEnabled: boolean;
  isInitialized: boolean;
  isCustomPatch: boolean;
  customSynthRef: MutableRefObject<CustomSynthEngine | null>;
  synthRef: MutableRefObject<Tone.PolySynth | null>;
  humanizeManagerRef: MutableRefObject<HumanizeManager>;
  strumLastDirectionRef: MutableRefObject<StrumDirection>;
  currentNotesRef: MutableRefObject<Set<string>>;
  strumEnabled: boolean;
  strumSpread: number;
  strumDirection: StrumDirection;
  humanize: boolean;
  glideTime: number;
}

/**
 * Hook to manage synth playback functions
 */
export function useSynthPlayback({
  isEnabled,
  isInitialized,
  isCustomPatch,
  customSynthRef,
  synthRef,
  humanizeManagerRef,
  strumLastDirectionRef,
  currentNotesRef,
  strumEnabled,
  strumSpread,
  strumDirection,
  humanize,
  glideTime,
}: UseSynthPlaybackProps) {
  /**
   * Play a single note
   */
  const playNote = useCallback(
    (note: MIDINote, velocity = 100) => {
      if (!isEnabled || !isInitialized) return;

      if (isCustomPatch && customSynthRef.current) {
        // Use custom synth engine
        customSynthRef.current.triggerAttack(note, midiVelocityToTone(velocity));
      } else if (synthRef.current) {
        // Use factory PolySynth
        const freq = midiToFreq(note);
        const noteKey = note.toString();

        // Stop if already playing
        if (currentNotesRef.current.has(noteKey)) {
          synthRef.current.triggerRelease(freq, Tone.now());
        }

        currentNotesRef.current.add(noteKey);
        synthRef.current.triggerAttack(freq, Tone.now(), midiVelocityToTone(velocity));
      }
    },
    [isEnabled, isInitialized, isCustomPatch, customSynthRef, synthRef, currentNotesRef]
  );

  /**
   * Stop a single note
   */
  const stopNote = useCallback(
    (note: MIDINote) => {
      if (!isInitialized) return;

      if (isCustomPatch && customSynthRef.current) {
        // Use custom synth engine
        customSynthRef.current.triggerRelease(note);
      } else if (synthRef.current) {
        // Use factory PolySynth
        const freq = midiToFreq(note);
        const noteKey = note.toString();

        currentNotesRef.current.delete(noteKey);
        synthRef.current.triggerRelease(freq, Tone.now());
      }
    },
    [isInitialized, isCustomPatch, customSynthRef, synthRef, currentNotesRef]
  );

  /**
   * Apply expression helper (bound to current options)
   */
  const applyExpressionBound = useCallback(
    (
      notesToStart: MIDINote[],
      velocity: number,
      playNoteFn: (note: MIDINote, velocity: number) => void
    ) => {
      applyExpression(
        notesToStart,
        velocity,
        playNoteFn,
        humanizeManagerRef.current,
        strumLastDirectionRef,
        {
          strumEnabled,
          strumSpread,
          strumDirection,
          humanize,
        }
      );
    },
    [strumEnabled, strumSpread, strumDirection, humanize, humanizeManagerRef, strumLastDirectionRef]
  );

  /**
   * Play a chord with expression (strum, humanize)
   */
  const playChord = useCallback(
    (notes: MIDINote[], velocity = 100, retrigger = false) => {
      if (!isEnabled || !isInitialized) return;

      // Clear any pending humanized notes
      humanizeManagerRef.current.clear();

      const newNotesSet = new Set(notes.map((n) => n.toString()));
      const currentSet = currentNotesRef.current;

      if (isCustomPatch && customSynthRef.current) {
        // Use custom synth engine
        playNotesCustomSynth(
          customSynthRef.current,
          notes,
          velocity,
          retrigger,
          currentSet,
          newNotesSet,
          applyExpressionBound
        );
      } else if (synthRef.current) {
        // Use factory PolySynth
        playNotesFactorySynth(
          synthRef.current,
          notes,
          velocity,
          retrigger,
          currentSet,
          newNotesSet,
          applyExpressionBound
        );
      }

      currentNotesRef.current = newNotesSet;
    },
    [isEnabled, isInitialized, isCustomPatch, customSynthRef, synthRef, currentNotesRef, humanizeManagerRef, applyExpressionBound]
  );

  /**
   * Play a chord with glide (portamento-like effect)
   * Smoothly transitions from old chord to new chord
   */
  const playChordWithGlideInternal = useCallback(
    (notes: MIDINote[], velocity = 100) => {
      if (!isEnabled || !synthRef.current || !isInitialized) return;

      humanizeManagerRef.current.clear();

      currentNotesRef.current = playChordWithGlide(
        synthRef.current,
        notes,
        velocity,
        glideTime,
        currentNotesRef.current
      );
    },
    [isEnabled, isInitialized, glideTime, synthRef, humanizeManagerRef, currentNotesRef]
  );

  /**
   * Stop all notes
   */
  const stopAllNotes = useCallback(() => {
    // Clear any pending humanized notes
    humanizeManagerRef.current.clear();

    if (!isInitialized) return;

    if (isCustomPatch && customSynthRef.current) {
      customSynthRef.current.releaseAll();
    } else if (synthRef.current) {
      synthRef.current.releaseAll(Tone.now());
    }

    currentNotesRef.current.clear();
  }, [isInitialized, isCustomPatch, customSynthRef, synthRef, currentNotesRef, humanizeManagerRef]);

  return {
    playNote,
    stopNote,
    playChord,
    playChordWithGlide: playChordWithGlideInternal,
    stopAllNotes,
  };
}
