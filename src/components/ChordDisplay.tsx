/**
 * ChordDisplay Component
 * Main display showing current chord name, notes, and voicing information.
 * Includes aurora glow effect based on chord notes.
 *
 * @module components/ChordDisplay
 */

import type { CSSProperties } from "react";
import type { MIDINote } from "../types";
import { buildNorthernLightsGradient } from "../lib/noteColors";
import "./ChordDisplay.css";

/** Chord data for display */
interface DisplayChordData {
  /** Display name of the chord */
  name: string;
  /** Note names or MIDI notes */
  notes: (string | MIDINote)[];
}

/** Props for ChordDisplay component */
interface ChordDisplayProps {
  /** The actively playing chord (has notes for gradient) */
  currentChord: { notes: MIDINote[] } | null;
  /** The chord to display (current or last) */
  displayChord: DisplayChordData | null;
  /** Current octave setting */
  octave: number;
  /** Current inversion index */
  inversionIndex: number;
  /** Current spread amount */
  spreadAmount: number;
  /** Whether to show keyboard hints */
  showHints?: boolean;
}

/** Custom CSS properties for aurora gradient */
interface AuroraStyles extends CSSProperties {
  "--aurora-gradient"?: string;
}

/**
 * Display panel for the current chord with aurora glow effect.
 */
export function ChordDisplay({
  currentChord,
  displayChord,
  octave,
  inversionIndex,
  spreadAmount,
  showHints = true,
}: ChordDisplayProps) {
  const hasChord = !!displayChord;
  const gradient = currentChord
    ? buildNorthernLightsGradient(currentChord.notes)
    : null;

  const auroraStyle: AuroraStyles = gradient
    ? {
        "--aurora-gradient": gradient,
        background: gradient,
      }
    : {};

  return (
    <div className="chord-display-wrapper">
      {/* Aurora glow layer */}
      <div
        className={`aurora-glow ${currentChord ? "active" : ""}`}
        style={auroraStyle}
      />

      <div className="chord-display">
        <p className="chord-name">
          {hasChord ? displayChord.name : "Press keys to play chords"}
        </p>

        <div
          className="chord-info"
          style={{ opacity: hasChord ? 1 : 0 }}
        >
          <p>
            <strong>Notes:</strong>{" "}
            {hasChord ? displayChord.notes.join(", ") : "C, E, G"}{" "}
            <span style={{ opacity: 0.5 }}>|</span> <strong>Octave:</strong>{" "}
            {octave}
          </p>
          <p>
            <strong>Inversion:</strong> {inversionIndex}{" "}
            <span style={{ opacity: 0.5 }}>|</span>{" "}
            <strong>Spread:</strong> {spreadAmount}
          </p>
        </div>

        {showHints && (
          <div
            className="keyboard-hints"
            style={{ opacity: hasChord ? 1 : 0 }}
          >
            <span className="keyboard-hint">
              <kbd>Shift</kbd> Inversions
            </span>
            <span className="keyboard-hint">
              <kbd>↑</kbd>
              <kbd>↓</kbd> Spread
            </span>
            <span className="keyboard-hint">
              <kbd>←</kbd>
              <kbd>→</kbd> Octave
            </span>
            <span className="keyboard-hint">
              <kbd>Space</kbd> Save preset
            </span>
            <span className="keyboard-hint">
              <kbd>1-9</kbd> Recall preset
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
