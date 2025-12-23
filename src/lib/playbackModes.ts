/**
 * Playback Modes Logic
 * Pure functions for transforming chords into rhythmic playback patterns.
 *
 * @module lib/playbackModes
 */

import type {
  MIDINote,
  PlaybackMode,
  PlaybackModeResult,
  ScheduledNoteGroup,
  ChordComponents,
} from "../types";

/**
 * Calculate beat duration from BPM.
 * @param bpm - Beats per minute
 * @returns Duration of one beat in milliseconds
 */
export function beatDuration(bpm: number): number {
  return 60000 / bpm;
}

/**
 * Calculate fraction of a beat duration.
 * @param bpm - Beats per minute
 * @param fraction - Fraction of beat (0.5 = half beat, 0.25 = quarter beat)
 * @returns Duration in milliseconds
 */
export function beatFraction(bpm: number, fraction: number): number {
  return beatDuration(bpm) * fraction;
}

/**
 * Extract chord components from a voiced chord.
 * Uses interval analysis to identify root, 3rd, 5th, 7th.
 *
 * @param notes - Voiced MIDI notes (may be inverted/spread)
 * @returns Extracted chord components
 */
export function extractChordComponents(notes: MIDINote[]): ChordComponents {
  if (notes.length === 0) {
    return {
      root: 60 as MIDINote, // Middle C default
      third: null,
      fifth: null,
      seventh: null,
      upperNotes: [],
      allNotes: [],
    };
  }

  // Sort notes to find lowest (bass)
  const sorted = [...notes].sort((a, b) => a - b);
  const root = sorted[0];

  // Find intervals relative to root (mod 12 for octave equivalence)
  const findNoteByInterval = (targetIntervals: number[]): MIDINote | null => {
    for (const note of sorted) {
      if (note === root) continue;
      const interval = (note - root) % 12;
      if (targetIntervals.includes(interval)) {
        return note;
      }
    }
    return null;
  };

  // Third: minor (3) or major (4) third
  const third = findNoteByInterval([3, 4]);

  // Fifth: diminished (6), perfect (7), or augmented (8)
  const fifth = findNoteByInterval([6, 7, 8]);

  // Seventh: minor (10) or major (11) seventh
  const seventh = findNoteByInterval([10, 11]);

  // Upper notes are everything except root
  const upperNotes = sorted.slice(1) as MIDINote[];

  return {
    root,
    third,
    fifth,
    seventh,
    upperNotes,
    allNotes: notes,
  };
}

/**
 * Block mode - all notes played simultaneously (default behavior).
 */
function applyBlockMode(notes: MIDINote[]): PlaybackModeResult {
  return {
    scheduledGroups: [],
    sustainedNotes: notes,
  };
}

/**
 * Root Only mode - plays only the root/bass note.
 */
function applyRootOnlyMode(notes: MIDINote[]): PlaybackModeResult {
  const { root } = extractChordComponents(notes);
  return {
    scheduledGroups: [],
    sustainedNotes: [root],
  };
}

/**
 * Shell mode - plays root + 3rd + 7th (Bud Powell style).
 */
function applyShellMode(notes: MIDINote[]): PlaybackModeResult {
  const { root, third, seventh } = extractChordComponents(notes);

  const shellNotes: MIDINote[] = [root];
  if (third !== null) shellNotes.push(third);
  if (seventh !== null) shellNotes.push(seventh);

  // If we didn't find a 3rd or 7th, fall back to original notes
  if (shellNotes.length < 2) {
    return { scheduledGroups: [], sustainedNotes: notes };
  }

  return {
    scheduledGroups: [],
    sustainedNotes: shellNotes,
  };
}

/**
 * Vamp mode - root on beat 1, upper notes on beat 2.
 * Classic funk/soul comping pattern.
 */
function applyVampMode(notes: MIDINote[], bpm: number): PlaybackModeResult {
  const { root, upperNotes } = extractChordComponents(notes);
  const beat = beatDuration(bpm);

  return {
    scheduledGroups: [
      { notes: upperNotes, delayMs: beat, retrigger: false },
    ],
    sustainedNotes: [root],
  };
}

/**
 * Charleston mode - chord on beat 1, anticipation on &2.
 * Classic swing comping rhythm.
 */
function applyCharlestonMode(notes: MIDINote[], bpm: number): PlaybackModeResult {
  const beat = beatDuration(bpm);

  return {
    scheduledGroups: [
      // Hit on &2 (beat 1.5)
      { notes, delayMs: beat * 1.5, retrigger: true },
    ],
    sustainedNotes: notes,
  };
}

/**
 * Stride mode - bass low on beats 1,3, chord on beats 2,4.
 * Classic stride piano pattern.
 */
function applyStrideMode(notes: MIDINote[], bpm: number): PlaybackModeResult {
  const { root, upperNotes } = extractChordComponents(notes);
  const beat = beatDuration(bpm);

  // Lower the root by an octave for stride bass
  const bassNote = Math.max(24, root - 12) as MIDINote;

  return {
    scheduledGroups: [
      // Beat 2: upper chord
      { notes: upperNotes.length > 0 ? upperNotes : notes.slice(1), delayMs: beat, retrigger: false },
      // Beat 3: bass again
      { notes: [bassNote], delayMs: beat * 2, retrigger: true },
      // Beat 4: upper chord
      { notes: upperNotes.length > 0 ? upperNotes : notes.slice(1), delayMs: beat * 3, retrigger: false },
    ],
    sustainedNotes: [bassNote],
  };
}

/**
 * Two-Feel mode - bass on beats 1,3, chord stabs on 2,4.
 * Walking bass feel.
 */
function applyTwoFeelMode(notes: MIDINote[], bpm: number): PlaybackModeResult {
  const { root, fifth, upperNotes } = extractChordComponents(notes);
  const beat = beatDuration(bpm);

  // Use fifth for beat 3 bass note if available, otherwise just root
  const beat3Bass = fifth !== null ? fifth : root;

  return {
    scheduledGroups: [
      // Beat 2: chord stab
      { notes: upperNotes.length > 0 ? upperNotes : notes, delayMs: beat, retrigger: true },
      // Beat 3: bass (fifth or root)
      { notes: [beat3Bass], delayMs: beat * 2, retrigger: true },
      // Beat 4: chord stab
      { notes: upperNotes.length > 0 ? upperNotes : notes, delayMs: beat * 3, retrigger: true },
    ],
    sustainedNotes: [root],
  };
}

/**
 * Bossa mode - syncopated bossa nova pattern.
 * Root(1) → 5th(&2) → Chord(3)
 */
function applyBossaMode(notes: MIDINote[], bpm: number): PlaybackModeResult {
  const { root, fifth, upperNotes } = extractChordComponents(notes);
  const beat = beatDuration(bpm);

  // Use fifth if available, otherwise 3rd or upper note
  const secondHit = fifth !== null ? [fifth] : upperNotes.slice(0, 1);

  return {
    scheduledGroups: [
      // &2: fifth (syncopated)
      { notes: secondHit.length > 0 ? secondHit : [root], delayMs: beat * 1.5, retrigger: false },
      // Beat 3: full chord
      { notes: upperNotes.length > 0 ? upperNotes : notes, delayMs: beat * 2, retrigger: false },
    ],
    sustainedNotes: [root],
  };
}

/**
 * Tremolo mode - rapid retriggering at 16th note subdivision.
 * Creates tremolo/trill effect.
 */
function applyTremoloMode(notes: MIDINote[], bpm: number): PlaybackModeResult {
  const sixteenth = beatDuration(bpm) / 4;

  // Schedule 4 retrigs (16th notes for one beat)
  const groups: ScheduledNoteGroup[] = [];
  for (let i = 1; i <= 3; i++) {
    groups.push({
      notes,
      delayMs: sixteenth * i,
      retrigger: true,
    });
  }

  return {
    scheduledGroups: groups,
    sustainedNotes: notes,
  };
}

/**
 * Apply a playback mode to transform chord playback.
 *
 * @param notes - MIDI notes in the chord
 * @param mode - Playback mode to apply
 * @param bpm - Current BPM (for rhythmic modes)
 * @returns Scheduled note groups and sustained notes
 */
export function applyPlaybackMode(
  notes: MIDINote[],
  mode: PlaybackMode,
  bpm: number
): PlaybackModeResult {
  if (notes.length === 0) {
    return { scheduledGroups: [], sustainedNotes: [] };
  }

  switch (mode) {
    case "block":
      return applyBlockMode(notes);
    case "root-only":
      return applyRootOnlyMode(notes);
    case "shell":
      return applyShellMode(notes);
    case "vamp":
      return applyVampMode(notes, bpm);
    case "charleston":
      return applyCharlestonMode(notes, bpm);
    case "stride":
      return applyStrideMode(notes, bpm);
    case "two-feel":
      return applyTwoFeelMode(notes, bpm);
    case "bossa":
      return applyBossaMode(notes, bpm);
    case "tremolo":
      return applyTremoloMode(notes, bpm);
    default:
      return applyBlockMode(notes);
  }
}

/**
 * Check if a playback mode requires BPM timing.
 */
export function modeRequiresBpm(mode: PlaybackMode): boolean {
  return !["block", "root-only", "shell"].includes(mode);
}
