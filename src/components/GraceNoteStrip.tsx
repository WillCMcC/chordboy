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
  // Track active touches to prevent duplicate triggers
  const activeTouchesRef = useRef<Set<number>>(new Set());
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

  /**
   * Handle touch end to clear tracking.
   */
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touch = e.changedTouches[0];
    if (touch) {
      activeTouchesRef.current.delete(touch.identifier);
    }
  }, []);

  // Set up non-passive touch listeners on note buttons
  useEffect(() => {
    const buttons = buttonRefs.current;
    const handlers = new Map<HTMLButtonElement, (e: TouchEvent) => void>();

    buttons.forEach((button, index) => {
      const handler = (e: TouchEvent) => {
        e.preventDefault(); // Prevent default to maintain chord sustain
        const touch = e.changedTouches[0];
        if (touch && !activeTouchesRef.current.has(touch.identifier)) {
          activeTouchesRef.current.add(touch.identifier);
          emitGraceNote([index], "single");
        }
      };

      handlers.set(button, handler);
      button.addEventListener("touchstart", handler, { passive: false });
      button.addEventListener("touchend", handleTouchEnd);
      button.addEventListener("touchcancel", handleTouchEnd);
    });

    return () => {
      handlers.forEach((handler, button) => {
        button.removeEventListener("touchstart", handler);
        button.removeEventListener("touchend", handleTouchEnd);
        button.removeEventListener("touchcancel", handleTouchEnd);
      });
    };
  }, [notes?.length, emitGraceNote, handleTouchEnd]);

  // Set up non-passive touch listener on ALL button
  useEffect(() => {
    const allButton = allButtonRef.current;
    if (!allButton) return;

    const handleAllTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // Prevent default to maintain chord sustain
      const currentNotes = notesRef.current;
      if (!currentNotes?.length) return;

      const touch = e.changedTouches[0];
      if (touch && !activeTouchesRef.current.has(touch.identifier)) {
        activeTouchesRef.current.add(touch.identifier);
        const allIndices = currentNotes.map((_, i) => i);
        emitGraceNote(allIndices, "full");
      }
    };

    allButton.addEventListener("touchstart", handleAllTouchStart, { passive: false });
    allButton.addEventListener("touchend", handleTouchEnd);
    allButton.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      allButton.removeEventListener("touchstart", handleAllTouchStart);
      allButton.removeEventListener("touchend", handleTouchEnd);
      allButton.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [emitGraceNote, handleTouchEnd]);

  // Don't render if no chord
  if (!notes?.length) {
    return null;
  }

  return (
    <div className="grace-note-strip">
      <div className="grace-note-buttons">
        {notes.map((note, index) => {
          const noteName = getNoteNameOnly(note);
          const interval = getIntervalLabel(index, notes);

          return (
            <button
              key={`${note}-${index}`}
              className="grace-note-btn"
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
          ref={allButtonRef}
        >
          <span className="note-name">ALL</span>
          <span className="note-position">♪</span>
        </button>
      </div>
    </div>
  );
}
