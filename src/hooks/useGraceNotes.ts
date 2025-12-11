/**
 * useGraceNotes Hook
 * Enables retriggering individual notes or subsets of a held chord
 * when pressing modifier keys while holding a preset key (0-9).
 *
 * Key mappings:
 * - ghjkl: Single notes (1st through 5th)
 * - yuiop: Pairs (1-2, 2-3, 3-4, 4-5, 5-6)
 * - vbnm,.: Intervals (root+3rd, root+5th, root+7th, 3rd+7th, 5th+root8va)
 * - space: Full chord retrigger
 *
 * Octave shift modifiers:
 * - Command (Meta): Shift grace note DOWN one octave (-12 semitones)
 * - Option (Alt): Shift grace note UP one octave (+12 semitones)
 * - Both held: No shift (they cancel out)
 *
 * @module hooks/useGraceNotes
 */

import { useEffect, useRef, useCallback } from "react";
import { appEvents } from "../lib/eventBus";
import type { MIDINote, GraceNotePayload } from "../types";

/** Grace note key mappings */
const SINGLE_NOTE_KEYS: Record<string, number> = {
  g: 0, // 1st note (root)
  h: 1, // 2nd note
  j: 2, // 3rd note
  k: 3, // 4th note
  l: 4, // 5th note
};

const PAIR_KEYS: Record<string, [number, number]> = {
  y: [0, 1], // notes 1-2
  u: [1, 2], // notes 2-3
  i: [2, 3], // notes 3-4
  o: [3, 4], // notes 4-5
  p: [4, 5], // notes 5-6
};

const INTERVAL_KEYS: Record<string, number[]> = {
  v: [0, 2], // root + 3rd
  b: [0, 3], // root + 5th (or 7th in 4-note chords)
  n: [0, 4], // root + 7th (or 9th)
  m: [1, 3], // 3rd + 7th
  ",": [2, 4], // 5th + 9th
  ".": [0, 1, 2], // root + 3rd + 5th (triad from chord)
};

// Preset keys (0-9)
const PRESET_KEYS = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);

/** Options for useGraceNotes */
export interface UseGraceNotesOptions {
  /** Current chord notes (null if no chord) */
  currentChordNotes: MIDINote[] | null;
  /** Whether grace notes are enabled */
  enabled?: boolean;
}

/**
 * Hook that enables grace note triggering while holding preset keys.
 *
 * @param options - Configuration options
 *
 * @example
 * useGraceNotes({
 *   currentChordNotes: currentChord?.notes ?? null,
 *   enabled: true,
 * });
 */
export function useGraceNotes({
  currentChordNotes,
  enabled = true,
}: UseGraceNotesOptions): void {
  // Track which preset key is being held
  const heldPresetKeyRef = useRef<string | null>(null);
  // Track which grace note keys are currently pressed (to prevent repeat triggers)
  const activeGraceKeysRef = useRef<Set<string>>(new Set());
  // Store current chord notes in ref to avoid stale closures
  const notesRef = useRef<MIDINote[] | null>(null);

  // Keep notes ref in sync
  useEffect(() => {
    notesRef.current = currentChordNotes;
  }, [currentChordNotes]);

  /**
   * Select notes from chord by indices, handling out-of-bounds gracefully.
   */
  const selectNotes = useCallback(
    (indices: number | number[]): { notes: MIDINote[]; validIndices: number[] } => {
      const notes = notesRef.current;
      if (!notes?.length) return { notes: [], validIndices: [] };

      const indexArray = Array.isArray(indices) ? indices : [indices];
      const validIndices: number[] = [];
      const selectedNotes: MIDINote[] = [];

      for (const idx of indexArray) {
        if (idx >= 0 && idx < notes.length) {
          validIndices.push(idx);
          selectedNotes.push(notes[idx]);
        }
      }

      return { notes: selectedNotes, validIndices };
    },
    []
  );

  /**
   * Emit a grace note event.
   */
  const emitGraceNote = useCallback(
    (payload: GraceNotePayload): void => {
      if (payload.notes.length > 0) {
        appEvents.emit("grace:note", payload);
      }
    },
    []
  );

  /**
   * Handle grace note key press.
   */
  const handleGraceKey = useCallback(
    (key: string, octaveShift: number): void => {
      // Check single note keys (ghjkl)
      if (key in SINGLE_NOTE_KEYS) {
        const index = SINGLE_NOTE_KEYS[key];
        const { notes, validIndices } = selectNotes(index);
        const shiftedNotes = notes.map((note) => note + octaveShift);
        emitGraceNote({ notes: shiftedNotes, indices: validIndices, pattern: "single", octaveShift });
        return;
      }

      // Check pair keys (yuiop)
      if (key in PAIR_KEYS) {
        const indices = PAIR_KEYS[key];
        const { notes, validIndices } = selectNotes([...indices]);
        const shiftedNotes = notes.map((note) => note + octaveShift);
        emitGraceNote({ notes: shiftedNotes, indices: validIndices, pattern: "pair", octaveShift });
        return;
      }

      // Check interval keys (vbnm,.)
      if (key in INTERVAL_KEYS) {
        const indices = INTERVAL_KEYS[key];
        const indexArray = Array.isArray(indices) ? indices : [indices];
        const { notes, validIndices } = selectNotes(indexArray);
        const shiftedNotes = notes.map((note) => note + octaveShift);
        emitGraceNote({ notes: shiftedNotes, indices: validIndices, pattern: "interval", octaveShift });
        return;
      }

      // Space triggers full chord
      if (key === " ") {
        const notes = notesRef.current;
        if (notes?.length) {
          const indices = notes.map((_, i) => i);
          const shiftedNotes = notes.map((note) => note + octaveShift);
          emitGraceNote({ notes: shiftedNotes, indices, pattern: "full", octaveShift });
        }
      }
    },
    [selectNotes, emitGraceNote]
  );

  useEffect(() => {
    if (!enabled) return;

    // Use capture phase to intercept events BEFORE useKeyboard sees them
    const handleKeyDown = (event: KeyboardEvent): void => {
      const key = event.key;

      // Track preset key holds
      if (PRESET_KEYS.has(key)) {
        heldPresetKeyRef.current = key;
        return;
      }

      // Only process grace notes if a preset key is being held
      if (!heldPresetKeyRef.current) return;

      // Check if this is a grace note key
      const isGraceKey =
        key in SINGLE_NOTE_KEYS ||
        key in PAIR_KEYS ||
        key in INTERVAL_KEYS ||
        key === " ";

      if (isGraceKey) {
        // Prevent key repeat
        if (activeGraceKeysRef.current.has(key)) return;
        activeGraceKeysRef.current.add(key);

        // CRITICAL: Stop the event from reaching useKeyboard
        // This prevents the key from being added to pressedKeys,
        // which would clear the recalled preset state
        event.stopImmediatePropagation();
        event.preventDefault();

        // Calculate octave shift based on modifier keys
        // Command (Meta) = -12 semitones (down one octave)
        // Option (Alt) = +12 semitones (up one octave)
        // Both held = 0 (they cancel out)
        let octaveShift = 0;
        if (event.metaKey) octaveShift -= 12;
        if (event.altKey) octaveShift += 12;

        handleGraceKey(key, octaveShift);
      }
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      const key = event.key;

      // Clear preset key hold
      if (PRESET_KEYS.has(key)) {
        if (heldPresetKeyRef.current === key) {
          heldPresetKeyRef.current = null;
        }
        return;
      }

      // If this was a grace key while preset was held, also stop propagation on keyup
      if (heldPresetKeyRef.current && activeGraceKeysRef.current.has(key)) {
        event.stopImmediatePropagation();
      }

      // Clear grace key from active set
      activeGraceKeysRef.current.delete(key);
    };

    // Use capture: true to fire before useKeyboard's listeners
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
    };
  }, [enabled, handleGraceKey]);
}
