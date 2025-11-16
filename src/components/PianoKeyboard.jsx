import { useMemo } from "react";
import { PianoKey } from "./PianoKey";
import { generateKeyboard, getBlackKeyOffset } from "../lib/pianoLayout";
import "./PianoKeyboard.css";

/**
 * PianoKeyboard Component
 * Renders a visual piano keyboard spanning multiple octaves
 * Highlights currently playing notes
 */
export function PianoKeyboard({
  activeNotes = [],
  startOctave = 3,
  endOctave = 5,
}) {
  // Generate keyboard layout
  const keys = useMemo(() => {
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
            />
          ))}
        </div>

        {/* Render black keys on top */}
        <div className="black-keys">
          {blackKeys.map((key) => {
            const offset = getBlackKeyOffset(key.midi);
            const leftPosition = key.whiteKeyIndex * 40 + 40 * offset - 14;

            return (
              <PianoKey
                key={key.midi}
                midiNumber={key.midi}
                noteName={key.noteName}
                isBlack={true}
                isActive={activeNotes.includes(key.midi)}
                style={{ left: `${leftPosition}px` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
