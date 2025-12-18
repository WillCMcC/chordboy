/**
 * Synth Playback Helpers
 * Helper functions for playing notes with expression (strum, humanize).
 *
 * @module lib/synthPlayback
 */

import * as Tone from "tone";
import type { MIDINote, HumanizeManager, StrumDirection } from "../types";
import { getHumanizeOffsets } from "./humanize";
import { getStrumOffsets } from "./strum";
import { CustomSynthEngine } from "./customSynthEngine";

/** Convert MIDI note to frequency */
export function midiToFreq(midi: MIDINote): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Convert MIDI velocity (0-127) to Tone.js velocity (0-1) */
export function midiVelocityToTone(velocity: number): number {
  return Math.min(1, Math.max(0, velocity / 127));
}

/**
 * Apply expression (strum or humanize) to notes and schedule playback
 */
export function applyExpression(
  notesToStart: MIDINote[],
  velocity: number,
  playNoteFn: (note: MIDINote, velocity: number) => void,
  humanizeManager: HumanizeManager,
  strumLastDirectionRef: { current: StrumDirection },
  options: {
    strumEnabled: boolean;
    strumSpread: number;
    strumDirection: StrumDirection;
    humanize: number;
  }
): void {
  const { strumEnabled, strumSpread, strumDirection, humanize } = options;

  if (strumEnabled && strumSpread > 0 && notesToStart.length > 1) {
    // Strum: evenly-spaced delays based on note pitch order
    const { offsets, nextDirection } = getStrumOffsets(
      notesToStart,
      strumSpread,
      strumDirection,
      strumLastDirectionRef.current
    );
    strumLastDirectionRef.current = nextDirection;

    notesToStart.forEach((note, i) => {
      humanizeManager.schedule(() => {
        playNoteFn(note, velocity);
      }, offsets[i]);
    });
  } else if (humanize > 0 && notesToStart.length > 1) {
    // Humanization: stagger notes with random timing
    const offsets = getHumanizeOffsets(notesToStart.length, humanize);

    notesToStart.forEach((note, i) => {
      humanizeManager.schedule(() => {
        playNoteFn(note, velocity);
      }, offsets[i]);
    });
  } else {
    // No expression - play all notes immediately
    notesToStart.forEach((note) => {
      playNoteFn(note, velocity);
    });
  }
}

/**
 * Play notes using custom synth engine
 */
export function playNotesCustomSynth(
  customSynth: CustomSynthEngine,
  notes: MIDINote[],
  velocity: number,
  retrigger: boolean,
  currentSet: Set<string>,
  newNotesSet: Set<string>,
  applyExpressionFn: (
    notesToStart: MIDINote[],
    velocity: number,
    playNoteFn: (note: MIDINote, velocity: number) => void
  ) => void
): void {
  // Stop notes that are no longer in the chord
  currentSet.forEach((noteKey) => {
    if (!newNotesSet.has(noteKey)) {
      customSynth.triggerRelease(parseInt(noteKey, 10) as MIDINote);
    }
  });

  // Determine which notes to start
  const notesToStart = retrigger
    ? notes // Retrigger all notes
    : notes.filter((n) => !currentSet.has(n.toString())); // Only new notes

  if (notesToStart.length > 0) {
    // If retriggering, stop current notes first
    if (retrigger) {
      currentSet.forEach((noteKey) => {
        customSynth.triggerRelease(parseInt(noteKey, 10) as MIDINote);
      });
    }

    // Apply expression and play notes
    applyExpressionFn(notesToStart, velocity, (note, vel) => {
      customSynth.triggerAttack(note, midiVelocityToTone(vel));
    });
  }
}

/**
 * Play notes using factory PolySynth
 */
export function playNotesFactorySynth(
  synth: Tone.PolySynth,
  notes: MIDINote[],
  velocity: number,
  retrigger: boolean,
  currentSet: Set<string>,
  newNotesSet: Set<string>,
  applyExpressionFn: (
    notesToStart: MIDINote[],
    velocity: number,
    playNoteFn: (note: MIDINote, velocity: number) => void
  ) => void
): void {
  // Stop notes that are no longer in the chord
  currentSet.forEach((noteKey) => {
    if (!newNotesSet.has(noteKey)) {
      const freq = midiToFreq(parseInt(noteKey, 10) as MIDINote);
      synth.triggerRelease(freq, Tone.now());
    }
  });

  // Determine which notes to start
  const notesToStart = retrigger
    ? notes // Retrigger all notes
    : notes.filter((n) => !currentSet.has(n.toString())); // Only new notes

  if (notesToStart.length > 0) {
    // If retriggering, stop current notes first
    if (retrigger) {
      currentSet.forEach((noteKey) => {
        const freq = midiToFreq(parseInt(noteKey, 10) as MIDINote);
        synth.triggerRelease(freq, Tone.now());
      });
    }

    // Apply expression and play notes
    applyExpressionFn(notesToStart, velocity, (note, vel) => {
      const freq = midiToFreq(note);
      synth.triggerAttack(freq, Tone.now(), midiVelocityToTone(vel));
    });
  }
}

/** Minimum detune threshold in cents - detune animation only runs if abs(detune) exceeds this value */
const MIN_DETUNE_THRESHOLD = 10;

/**
 * Play a chord with glide (portamento-like effect)
 * Smoothly transitions from old chord to new chord
 */
export function playChordWithGlide(
  synth: Tone.PolySynth,
  notes: MIDINote[],
  velocity: number,
  glideTime: number,
  currentNotesRef: Set<string>
): Set<string> {
  const currentSet = currentNotesRef;
  const newNotesSet = new Set(notes.map((n) => n.toString()));

  // If no current notes, just play normally
  if (currentSet.size === 0) {
    notes.forEach((note) => {
      const freq = midiToFreq(note);
      synth.triggerAttack(freq, Tone.now(), midiVelocityToTone(velocity));
    });
    return newNotesSet;
  }

  // Calculate pitch offset for glide effect
  const currentNotes = Array.from(currentSet).map((n) => parseInt(n, 10));
  const currentAvg = currentNotes.reduce((a, b) => a + b, 0) / currentNotes.length;
  const newAvg = notes.reduce((a, b) => a + b, 0) / notes.length;
  const pitchDiff = currentAvg - newAvg;

  // Release old notes
  currentSet.forEach((noteKey) => {
    const freq = midiToFreq(parseInt(noteKey, 10) as MIDINote);
    synth.triggerRelease(freq, Tone.now());
  });

  // Calculate detune in cents (100 cents = 1 semitone)
  const startDetune = pitchDiff * 100;
  const glideMs = glideTime;

  // Start new notes with detune offset
  notes.forEach((note) => {
    const freq = midiToFreq(note);
    synth.triggerAttack(freq, Tone.now(), midiVelocityToTone(velocity));
  });

  // Animate detune from offset back to zero
  if (Math.abs(startDetune) > MIN_DETUNE_THRESHOLD) {
    const startTime = performance.now();

    const animateDetune = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / glideMs);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentDetune = startDetune * (1 - easeOut);

      // Apply detune to all voices
      synth.set({ detune: currentDetune });

      if (progress < 1) {
        requestAnimationFrame(animateDetune);
      } else {
        synth.set({ detune: 0 });
      }
    };

    requestAnimationFrame(animateDetune);
  }

  return newNotesSet;
}
