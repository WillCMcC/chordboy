import { useMemo } from "react";
import type { MIDINote, Octave, PianoKey as PianoKeyData } from "../types";
import { PianoKey } from "./PianoKey";
import { generateKeyboard, getBlackKeyOffset } from "../lib/pianoLayout";
import "./PianoKeyboard.css";

/** Props for PianoKeyboard component */
interface PianoKeyboardProps {
  /** Array of currently active/playing MIDI note numbers */
  activeNotes?: MIDINote[];
  /** Starting octave for the keyboard display */
  startOctave?: Octave;
  /** Ending octave for the keyboard display */
  endOctave?: Octave;
  /** Whether rendering for mobile layout */
  isMobile?: boolean;
  /** Optional function to get color for a specific MIDI note */
  getNoteColor?: ((midiNote: MIDINote) => string | null) | null;
}

/**
 * PianoKeyboard Component
 * Renders a visual piano keyboard spanning multiple octaves
 * Highlights currently playing notes
 */
export function PianoKeyboard({
  activeNotes = [],
  startOctave = 3,
  endOctave = 5,
  isMobile = false,
  getNoteColor = null,
}: PianoKeyboardProps) {
  // Key dimensions based on mobile or desktop
  const whiteKeyWidth = isMobile ? 22 : 25;
  const blackKeyOffset = isMobile ? 5 : 8;

  // Generate keyboard layout
  const keys = useMemo((): PianoKeyData[] => {
    return generateKeyboard(startOctave, endOctave);
  }, [startOctave, endOctave]);

  // Separate white and black keys for layering
  const whiteKeys = keys.filter((key) => !key.isBlack);
  const blackKeys = keys.filter((key) => key.isBlack);

  return (
    <div className="piano-keyboard">
      <div className="piano-container">
        {/* Render white keys first */}
        <div className="white-keys">
          {whiteKeys.map((key) => (
            <PianoKey
              key={key.midi}
              midiNumber={key.midi}
              noteName={key.noteName}
              isBlack={false}
              isActive={activeNotes.includes(key.midi)}
              isMobile={isMobile}
              activeColor={getNoteColor ? getNoteColor(key.midi) : null}
            />
          ))}
        </div>

        {/* Render black keys on top */}
        <div className="black-keys">
          {blackKeys.map((key) => {
            const offset = getBlackKeyOffset(key.midi);
            const leftPosition =
              key.whiteKeyIndex * whiteKeyWidth +
              whiteKeyWidth * offset -
              blackKeyOffset;

            return (
              <PianoKey
                key={key.midi}
                midiNumber={key.midi}
                noteName={key.noteName}
                isBlack={true}
                isActive={activeNotes.includes(key.midi)}
                style={{ left: `${leftPosition}px` }}
                isMobile={isMobile}
                activeColor={getNoteColor ? getNoteColor(key.midi) : null}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
