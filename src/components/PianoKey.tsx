import type { CSSProperties } from "react";
import type { MIDINote } from "../types";
import "./PianoKey.css";

/** Custom CSS properties for active key color */
interface PianoKeyStyles extends CSSProperties {
  "--active-color"?: string;
}

/** Props for PianoKey component */
interface PianoKeyProps {
  /** MIDI note number */
  midiNumber: MIDINote;
  /** Display name of the note (e.g., "C4") */
  noteName: string;
  /** Whether this is a black key */
  isBlack: boolean;
  /** Whether the key is currently active/playing */
  isActive: boolean;
  /** Additional inline styles (e.g., positioning for black keys) */
  style?: CSSProperties;
  /** Whether rendering for mobile layout */
  isMobile?: boolean;
  /** Custom color when active */
  activeColor?: string | null;
}

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
  activeColor = null,
}: PianoKeyProps) {
  const className = `piano-key ${isBlack ? "black" : "white"} ${
    isActive ? "active" : ""
  } ${isMobile ? "mobile" : ""}`;

  // Mobile-specific dimensions
  const mobileStyles: CSSProperties = isMobile
    ? isBlack
      ? { width: "14px", height: "60px" }
      : { width: "22px", height: "100px" }
    : {};

  // Apply custom color when active
  const colorStyles: PianoKeyStyles =
    isActive && activeColor
      ? {
          "--active-color": activeColor,
        }
      : {};

  return (
    <div
      className={className}
      data-midi={midiNumber}
      title={noteName}
      style={{ ...style, ...mobileStyles, ...colorStyles }}
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
