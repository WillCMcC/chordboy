import "./PianoKey.css";

/**
 * PianoKey Component
 * Renders a single piano key (white or black) with active state
 */
export function PianoKey({
  midiNumber,
  noteName,
  isBlack,
  isActive,
  style,
  isMobile = false,
}) {
  const className = `piano-key ${isBlack ? "black" : "white"} ${
    isActive ? "active" : ""
  } ${isMobile ? "mobile" : ""}`;

  // Mobile-specific dimensions
  const mobileStyles = isMobile
    ? isBlack
      ? { width: "14px", height: "60px" }
      : { width: "22px", height: "100px" }
    : {};

  return (
    <div
      className={className}
      data-midi={midiNumber}
      title={noteName}
      style={{ ...style, ...mobileStyles }}
    >
      {/* Optional: Show note name on white keys */}
      {!isBlack && (
        <span
          className="note-label"
          style={isMobile ? { fontSize: "7px" } : {}}
        >
          {noteName}
        </span>
      )}
    </div>
  );
}
