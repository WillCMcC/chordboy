/**
 * ChordDisplay Component
 * Main display showing current chord name, notes, and voicing information.
 * Includes aurora glow effect based on chord notes.
 *
 * @module components/ChordDisplay
 */

import type { CSSProperties } from "react";
import type { MIDINote, VoicingStyle } from "../types";
import { VOICING_STYLE_LABELS } from "../types";
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
  /** Current voicing style */
  voicingStyle: VoicingStyle;
  /** Whether to show keyboard hints */
  showHints?: boolean;
  /** Compact mode for mobile keyboard header */
  compact?: boolean;
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
  voicingStyle,
  showHints = true,
  compact = false,
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
    <div className={`chord-display-wrapper ${compact ? "compact" : ""}`}>
      {/* Aurora glow layer */}
      <div
        className={`aurora-glow ${currentChord ? "active" : ""}`}
        style={auroraStyle}
      />

      <div className="chord-display">
        <p className="chord-name" data-testid="chord-name">
          {hasChord ? displayChord.name : "Press keys to play chords"}
        </p>

        {!compact && (
          <div className="chord-info" style={{ opacity: hasChord ? 1 : 0 }}>
            <p>
              <strong>Notes:</strong>{" "}
              <span data-testid="chord-notes">
                {hasChord ? displayChord.notes.join(", ") : "C, E, G"}
              </span>{" "}
              <span style={{ opacity: 0.5 }}>|</span> <strong>Octave:</strong>{" "}
              <span data-testid="chord-octave">{octave}</span>
            </p>
            <p>
              <strong>Voicing:</strong>{" "}
              <span data-testid="voicing-style">
                {VOICING_STYLE_LABELS[voicingStyle]}
              </span>{" "}
              <span style={{ opacity: 0.5 }}>|</span> <strong>Inv:</strong>{" "}
              <span data-testid="inversion-index">{inversionIndex}</span>{" "}
              <span style={{ opacity: 0.5 }}>|</span>{" "}
              <strong>Spread:</strong>{" "}
              <span data-testid="spread-amount">{spreadAmount}</span>
            </p>
          </div>
        )}

        {showHints && (
          <div className="keyboard-hints" style={{ opacity: hasChord ? 1 : 0 }}>
            <span className="keyboard-hint">
              <kbd>L-Shift</kbd> Inversion
            </span>
            <span className="keyboard-hint">
              <kbd>R-Shift</kbd> Voicing
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
              <kbd>Space</kbd> Save
            </span>
            <span className="keyboard-hint">
              <kbd>1-9</kbd> Presets
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
