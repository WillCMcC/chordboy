import "./PianoKey.css";

/**
 * PianoKey Component
 * Renders a single piano key (white or black) with active state
 */
export function PianoKey({ midiNumber, noteName, isBlack, isActive, style }) {
  const className = `piano-key ${isBlack ? "black" : "white"} ${
    isActive ? "active" : ""
  }`;

  return (
    <div
      className={className}
      data-midi={midiNumber}
      title={noteName}
      style={style}
    >
      {/* Optional: Show note name on white keys */}
      {!isBlack && <span className="note-label">{noteName}</span>}
    </div>
  );
}
