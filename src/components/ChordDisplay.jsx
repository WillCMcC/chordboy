/**
 * ChordDisplay Component
 * Main display showing current chord name, notes, and voicing information.
 * Includes aurora glow effect based on chord notes.
 *
 * @module components/ChordDisplay
 */

import { buildNorthernLightsGradient } from "../lib/noteColors";
import "./ChordDisplay.css";

/**
 * Display panel for the current chord with aurora glow effect.
 *
 * @param {Object} props - Component props
 * @param {Object|null} props.currentChord - The actively playing chord
 * @param {Object|null} props.displayChord - The chord to display (current or last)
 * @param {number} props.octave - Current octave setting
 * @param {number} props.inversionIndex - Current inversion index
 * @param {number} props.droppedNotes - Number of dropped notes
 * @param {number} props.spreadAmount - Current spread amount
 * @param {boolean} props.showHints - Whether to show keyboard hints
 * @returns {JSX.Element} The chord display component
 *
 * @example
 * <ChordDisplay
 *   currentChord={currentChord}
 *   displayChord={displayChord}
 *   octave={4}
 *   inversionIndex={0}
 *   droppedNotes={0}
 *   spreadAmount={0}
 *   showHints={true}
 * />
 */
export function ChordDisplay({
  currentChord,
  displayChord,
  octave,
  inversionIndex,
  droppedNotes,
  spreadAmount,
  showHints = true,
}) {
  const hasChord = !!displayChord;
  const gradient = currentChord
    ? buildNorthernLightsGradient(currentChord.notes)
    : null;

  return (
    <div className="chord-display-wrapper">
      {/* Aurora glow layer */}
      <div
        className={`aurora-glow ${currentChord ? "active" : ""}`}
        style={
          gradient
            ? {
                "--aurora-gradient": gradient,
                background: gradient,
              }
            : {}
        }
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
            <span style={{ opacity: 0.5 }}>|</span> <strong>Dropped:</strong>{" "}
            {droppedNotes} <span style={{ opacity: 0.5 }}>|</span>{" "}
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
              <kbd>Caps</kbd> Drop note
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
