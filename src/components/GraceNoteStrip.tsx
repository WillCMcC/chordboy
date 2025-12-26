/**
 * GraceNoteStrip Component
 * Mobile touch interface for re-articulating individual chord notes.
 * Shows each note in the current chord as a touchable button.
 *
 * @module components/GraceNoteStrip
 */

import { useCallback, useEffect, useRef } from "react";
import { appEvents } from "../lib/eventBus";
import { MIDIToNote } from "../lib/chordTheory";
import type { MIDINote } from "../types";
import "./GraceNoteStrip.css";

/** Props for GraceNoteStrip component */
interface GraceNoteStripProps {
  /** Current chord notes (MIDI numbers) */
  notes: MIDINote[] | null;
}

/**
 * Get the interval label (semitones from root) for a note.
 * Shows "R" for root, otherwise the number of semitones.
 */
function getIntervalLabel(noteIndex: number, notes: MIDINote[]): string {
  if (noteIndex === 0) return "R"; // Root
  const rootNote = notes[0];
  const currentNote = notes[noteIndex];
  const semitones = (currentNote - rootNote) % 12;
  // Handle negative modulo and octave wrapping
  return String(semitones < 0 ? semitones + 12 : semitones);
}

/**
 * Get just the note name without octave (e.g., "C" from "C4").
 */
function getNoteNameOnly(midiNote: MIDINote): string {
  const fullName = MIDIToNote(midiNote);
  // Remove the octave number at the end
  return fullName.replace(/\d+$/, "");
}

/**
 * Touch interface for grace notes on mobile.
 * Displays each note in the chord as a touchable button.
 * Uses non-passive touch listeners to allow preventDefault() for proper sustain behavior.
 */
export function GraceNoteStrip({ notes }: GraceNoteStripProps) {
  // Refs for button elements to attach non-passive listeners
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const allButtonRef = useRef<HTMLButtonElement>(null);
  // Store notes in a ref to access in event listeners without stale closures
  const notesRef = useRef<MIDINote[] | null>(notes);
  notesRef.current = notes;

  /**
   * Emit a grace note event for specific note indices.
   */
  const emitGraceNote = useCallback(
    (indices: number[], pattern: "single" | "full") => {
      const currentNotes = notesRef.current;
      if (!currentNotes?.length) return;

      const selectedNotes = indices
        .filter((i) => i >= 0 && i < currentNotes.length)
        .map((i) => currentNotes[i]);

      if (selectedNotes.length > 0) {
        appEvents.emit("grace:note", {
          notes: selectedNotes,
          indices,
          pattern,
        });
      }
    },
    []
  );

  // Set up non-passive touch listeners on note buttons
  // IMPORTANT: No touch tracking/gating - every touchstart fires unconditionally
  // The per-note timeout logic in useMIDI handles deduplication for rapid same-note taps
  useEffect(() => {
    const buttons = buttonRefs.current;
    const handlers = new Map<HTMLButtonElement, (e: TouchEvent) => void>();

    buttons.forEach((button, index) => {
      const handler = (e: TouchEvent) => {
        e.preventDefault(); // Prevent default to maintain chord sustain
        // Fire for every touch - don't gate or track identifiers
        // This ensures rapid taps are never swallowed
        emitGraceNote([index], "single");
      };

      handlers.set(button, handler);
      button.addEventListener("touchstart", handler, { passive: false });
    });

    return () => {
      handlers.forEach((handler, button) => {
        button.removeEventListener("touchstart", handler);
      });
    };
  }, [notes, emitGraceNote]);

  // Set up non-passive touch listener on ALL button
  useEffect(() => {
    const allButton = allButtonRef.current;
    if (!allButton) return;

    const handleAllTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // Prevent default to maintain chord sustain
      const currentNotes = notesRef.current;
      if (!currentNotes?.length) return;

      // Fire unconditionally - no touch tracking
      const allIndices = currentNotes.map((_, idx) => idx);
      emitGraceNote(allIndices, "full");
    };

    allButton.addEventListener("touchstart", handleAllTouchStart, { passive: false });

    return () => {
      allButton.removeEventListener("touchstart", handleAllTouchStart);
    };
  }, [emitGraceNote]);

  // Don't render if no chord
  if (!notes?.length) {
    return null;
  }

  return (
    <div className="grace-note-strip" data-testid="grace-note-strip">
      <div className="grace-note-buttons">
        {notes.map((note, index) => {
          const noteName = getNoteNameOnly(note);
          const interval = getIntervalLabel(index, notes);

          return (
            <button
              key={`${note}-${index}`}
              className="grace-note-btn"
              data-testid={`grace-note-${index}`}
              ref={(el) => {
                if (el) buttonRefs.current.set(index, el);
                else buttonRefs.current.delete(index);
              }}
            >
              <span className="note-name">{noteName}</span>
              <span className="note-position">{interval}</span>
            </button>
          );
        })}

        {/* ALL button to retrigger full chord */}
        <button
          className="grace-note-btn grace-note-all"
          data-testid="grace-note-all"
          ref={allButtonRef}
        >
          <span className="note-name">ALL</span>
          <span className="note-position">♪</span>
        </button>
      </div>
    </div>
  );
}
