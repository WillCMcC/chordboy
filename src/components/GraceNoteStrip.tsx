/**
 * GraceNoteStrip Component
 * Mobile touch interface for re-articulating individual chord notes.
 * Shows each note in the current chord as a touchable button.
 *
 * @module components/GraceNoteStrip
 */

import { useCallback, useRef } from "react";
import { appEvents } from "../lib/eventBus";
import { MIDIToNote } from "../lib/chordTheory";
import { getNoteColor } from "../lib/noteColors";
import type { MIDINote } from "../types";
import "./GraceNoteStrip.css";

/** Props for GraceNoteStrip component */
interface GraceNoteStripProps {
  /** Current chord notes (MIDI numbers) */
  notes: MIDINote[] | null;
}

/**
 * Get the scale degree label for a note position in a chord.
 * Simplified: just shows position (1-based index).
 */
function getPositionLabel(index: number): string {
  return String(index + 1);
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
 */
export function GraceNoteStrip({ notes }: GraceNoteStripProps) {
  // Track active touches to prevent duplicate triggers
  const activeTouchesRef = useRef<Set<number>>(new Set());

  /**
   * Emit a grace note event for specific note indices.
   */
  const emitGraceNote = useCallback(
    (indices: number[], pattern: "single" | "full") => {
      if (!notes?.length) return;

      const selectedNotes = indices
        .filter((i) => i >= 0 && i < notes.length)
        .map((i) => notes[i]);

      if (selectedNotes.length > 0) {
        appEvents.emit("grace:note", {
          notes: selectedNotes,
          indices,
          pattern,
        });
      }
    },
    [notes]
  );

  /**
   * Handle touch start on a note button.
   */
  const handleTouchStart = useCallback(
    (index: number, e: React.TouchEvent) => {
      e.preventDefault(); // Prevent default touch behavior

      // Track this touch
      const touch = e.changedTouches[0];
      if (touch && !activeTouchesRef.current.has(touch.identifier)) {
        activeTouchesRef.current.add(touch.identifier);
        emitGraceNote([index], "single");
      }
    },
    [emitGraceNote]
  );

  /**
   * Handle touch end to clear tracking.
   */
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (touch) {
      activeTouchesRef.current.delete(touch.identifier);
    }
  }, []);

  /**
   * Handle "ALL" button touch.
   */
  const handleAllTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!notes?.length) return;

      const touch = e.changedTouches[0];
      if (touch && !activeTouchesRef.current.has(touch.identifier)) {
        activeTouchesRef.current.add(touch.identifier);
        const allIndices = notes.map((_, i) => i);
        emitGraceNote(allIndices, "full");
      }
    },
    [notes, emitGraceNote]
  );

  // Don't render if no chord
  if (!notes?.length) {
    return null;
  }

  return (
    <div className="grace-note-strip">
      <div className="grace-note-buttons">
        {notes.map((note, index) => {
          const noteName = getNoteNameOnly(note);
          const color = getNoteColor(note);
          const position = getPositionLabel(index);

          return (
            <button
              key={`${note}-${index}`}
              className="grace-note-btn"
              style={{
                "--note-color": color,
                "--note-color-dim": `${color}40`,
              } as React.CSSProperties}
              onTouchStart={(e) => handleTouchStart(index, e)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <span className="note-name">{noteName}</span>
              <span className="note-position">{position}</span>
            </button>
          );
        })}

        {/* ALL button to retrigger full chord */}
        <button
          className="grace-note-btn grace-note-all"
          onTouchStart={handleAllTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <span className="note-name">ALL</span>
          <span className="note-position">♪</span>
        </button>
      </div>
    </div>
  );
}
