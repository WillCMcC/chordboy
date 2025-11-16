import { useEffect, useState } from "react";
import { MIDIStatus } from "./components/MIDIStatus";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { useKeyboard } from "./hooks/useKeyboard";
import { useChordEngine } from "./hooks/useChordEngine";
import { useMIDI } from "./hooks/useMIDI";
import "./App.css";

function App() {
  const { playChord, stopAllNotes, isConnected } = useMIDI();
  const { pressedKeys } = useKeyboard(stopAllNotes);
  const {
    currentChord,
    inversionIndex,
    octave,
    droppedNotes,
    spreadAmount,
    savedPresets,
    clearPreset,
  } = useChordEngine(pressedKeys);

  // Track the last chord played
  const [lastChord, setLastChord] = useState(null);

  // Play chord when it changes
  useEffect(() => {
    if (currentChord && currentChord.notes && isConnected) {
      console.log("Playing chord:", currentChord.name, currentChord.notes);
      playChord(currentChord.notes);
      setLastChord(currentChord); // Store the last chord
    } else if (isConnected) {
      // No chord, stop all notes
      stopAllNotes();
    }
  }, [currentChord, isConnected]);

  // Determine which chord to display
  const displayChord = currentChord || lastChord;

  return (
    <div className="app">
      <header className="header">
        <h1>ChordBoy</h1>
        <MIDIStatus />
      </header>

      <main className="main">
        <div className="chord-display">
          <p className="chord-name">
            {displayChord ? displayChord.name : "Press keys to play chords"}
          </p>
          <div style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>
            <p style={{ visibility: displayChord ? "visible" : "hidden" }}>
              Notes:{" "}
              {displayChord ? displayChord.notes.map((n) => n).join(", ") : "—"}{" "}
              | Octave: {octave}
            </p>
            <p style={{ visibility: displayChord ? "visible" : "hidden" }}>
              Inversion: {inversionIndex} | Dropped: {droppedNotes} | Spread:{" "}
              {spreadAmount}
            </p>
            <p
              style={{
                fontSize: "0.9rem",
                marginTop: "0.5rem",
                visibility: displayChord ? "visible" : "hidden",
              }}
            >
              <strong>Left Shift</strong> = inversions |{" "}
              <strong>Caps Lock</strong> = drop top note |{" "}
              <strong>Space</strong> = spread | <strong>← →</strong> = octave
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                marginTop: "0.5rem",
                visibility: displayChord ? "visible" : "hidden",
              }}
            >
              <strong>Presets:</strong> <strong>Cmd/Ctrl</strong> = save to next
              open slot (random if no chord) | Hold chord + press empty number
              to save | Press number alone to recall
            </p>
          </div>
        </div>

        <div className="presets-panel">
          <div className="preset-slots">
            {Array.from(savedPresets.entries()).map(([slot, preset]) => (
              <div key={slot} className="preset-slot">
                <span className="preset-number">{slot}</span>
                <span className="preset-keys">
                  {Array.from(preset.keys).join(" + ")} (oct {preset.octave})
                </span>
                <button onClick={() => clearPreset(slot)} className="clear-btn">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <PianoKeyboard
          activeNotes={currentChord ? currentChord.notes : []}
          startOctave={1}
          endOctave={7}
        />
      </main>

      <footer className="footer">
        <p>MIDI Chord Controller for Jazz Performance</p>
      </footer>
    </div>
  );
}

export default App;
