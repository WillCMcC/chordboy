import { useEffect, useState, useMemo, useRef } from "react";
import { MIDIStatus } from "./components/MIDIStatus";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { MobileControls } from "./components/MobileControls";
import { useKeyboard } from "./hooks/useKeyboard";
import { useChordEngine } from "./hooks/useChordEngine";
import { useMIDI } from "./hooks/useMIDI";
import { useIsMobile } from "./hooks/useIsMobile";
import { usePWAInstall } from "./hooks/usePWAInstall";
import "./App.css";

function App() {
  const isMobile = useIsMobile();
  const { isInstallable, install } = usePWAInstall();
  const { playChord, stopAllNotes, isConnected } = useMIDI();
  const { pressedKeys: keyboardKeys } = useKeyboard(stopAllNotes);
  const [mobileKeys, setMobileKeys] = useState(new Set());
  const [showMobileKeyboard, setShowMobileKeyboard] = useState(false);
  const mobileKeyboardRef = useRef(null);

  const allPressedKeys = useMemo(() => {
    return new Set([...keyboardKeys, ...mobileKeys]);
  }, [keyboardKeys, mobileKeys]);

  const {
    currentChord,
    inversionIndex,
    octave,
    droppedNotes,
    spreadAmount,
    savedPresets,
    clearPreset,
    setInversionIndex,
    setDroppedNotes,
    setSpreadAmount,
    setOctave,
    saveCurrentChordToSlot,
    recallPresetFromSlot,
    stopRecallingPreset,
    activePresetSlot,
  } = useChordEngine(allPressedKeys);

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

  // Auto-scroll mobile keyboard to show active notes
  useEffect(() => {
    if (
      !showMobileKeyboard ||
      !mobileKeyboardRef.current ||
      !currentChord?.notes?.length
    ) {
      return;
    }

    const container = mobileKeyboardRef.current;
    const notes = currentChord.notes;

    // Find the min and max MIDI note numbers
    const minNote = Math.min(...notes);
    const maxNote = Math.max(...notes);

    // Calculate the center MIDI note
    const centerNote = Math.round((minNote + maxNote) / 2);

    // The keyboard starts at octave 2, MIDI note 36 (C2)
    // Each octave has 7 white keys, white key width is 22px
    const startMidi = 36; // C2
    const whiteKeyWidth = 22;

    // Calculate which white key index the center note corresponds to
    // We need to count white keys from the start
    const getWhiteKeyIndex = (midiNote) => {
      let whiteKeyCount = 0;
      for (let m = startMidi; m < midiNote; m++) {
        const noteInOctave = m % 12;
        // White keys: C, D, E, F, G, A, B (0, 2, 4, 5, 7, 9, 11)
        if ([0, 2, 4, 5, 7, 9, 11].includes(noteInOctave)) {
          whiteKeyCount++;
        }
      }
      return whiteKeyCount;
    };

    const centerWhiteKeyIndex = getWhiteKeyIndex(centerNote);
    const targetScrollPosition =
      centerWhiteKeyIndex * whiteKeyWidth -
      container.clientWidth / 2 +
      whiteKeyWidth;

    container.scrollTo({
      left: Math.max(0, targetScrollPosition),
      behavior: "smooth",
    });
  }, [currentChord?.notes, showMobileKeyboard]);

  // Mobile control handlers
  const handleInversionChange = () => {
    if (!currentChord?.notes) return;
    const maxInversions = currentChord.notes.length;
    setInversionIndex((prev) => (prev + 1) % maxInversions);
  };

  const handleDropChange = () => {
    if (!currentChord?.notes) return;
    const maxDrops = currentChord.notes.length - 1;
    setDroppedNotes((prev) => (prev + 1) % (maxDrops + 1));
  };

  const handleSpreadChange = () => {
    setSpreadAmount((prev) => (prev + 1) % 4); // 0-3
  };

  const handleOctaveChange = (direction) => {
    setOctave((prev) => Math.max(0, Math.min(7, prev + direction)));
  };

  // Determine which chord to display
  const displayChord = currentChord || lastChord;

  return (
    <div className="app">
      <header className="header">
        <div className="header-branding">
          <h1>ChordBoy</h1>
        </div>
        <div className="header-controls">
          {isInstallable && (
            <button onClick={install} className="install-btn-header">
              Install App
            </button>
          )}
          <MIDIStatus />
        </div>
      </header>

      <main
        className="main"
        style={{ paddingBottom: isMobile ? "50vh" : "2rem" }}
      >
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
            {!isMobile && (
              <>
                <p
                  style={{
                    fontSize: "0.9rem",
                    marginTop: "0.5rem",
                    visibility: displayChord ? "visible" : "hidden",
                  }}
                >
                  <strong>Left Shift</strong> = inversions |{" "}
                  <strong>Caps Lock</strong> = drop top note |{" "}
                  <strong>↑ ↓</strong> = spread | <strong>← →</strong> = octave
                </p>
                <p
                  style={{
                    fontSize: "0.8rem",
                    marginTop: "0.5rem",
                    visibility: displayChord ? "visible" : "hidden",
                  }}
                >
                  <strong>Presets:</strong> <strong>Space</strong> = save to
                  next open slot (random if no chord) | Hold chord + press empty
                  number to save | Press number alone to recall
                </p>
              </>
            )}
          </div>
        </div>

        {!isMobile && (
          <div className="presets-panel">
            <div className="preset-slots">
              {Array.from(savedPresets.entries()).map(([slot, preset]) => (
                <div key={slot} className="preset-slot">
                  <span className="preset-number">{slot}</span>
                  <span className="preset-keys">
                    {Array.from(preset.keys).join(" + ")} (oct {preset.octave})
                  </span>
                  <button
                    onClick={() => clearPreset(slot)}
                    className="clear-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isMobile && (
          <PianoKeyboard
            activeNotes={currentChord ? currentChord.notes : []}
            startOctave={1}
            endOctave={7}
          />
        )}

        {isMobile && showMobileKeyboard && (
          <div className="mobile-keyboard-container" ref={mobileKeyboardRef}>
            <PianoKeyboard
              activeNotes={currentChord ? currentChord.notes : []}
              startOctave={2}
              endOctave={6}
              isMobile={true}
            />
          </div>
        )}

        {isMobile && (
          <MobileControls
            mobileKeys={mobileKeys}
            setMobileKeys={setMobileKeys}
            onInversionChange={handleInversionChange}
            onDropChange={handleDropChange}
            onSpreadChange={handleSpreadChange}
            onOctaveChange={handleOctaveChange}
            currentSettings={{
              inversionIndex,
              droppedNotes,
              spreadAmount,
              octave,
            }}
            savedPresets={savedPresets}
            onSavePreset={saveCurrentChordToSlot}
            onRecallPreset={recallPresetFromSlot}
            onClearPreset={clearPreset}
            onStopRecall={stopRecallingPreset}
            activePresetSlot={activePresetSlot}
            showKeyboard={showMobileKeyboard}
            onToggleKeyboard={() => setShowMobileKeyboard(!showMobileKeyboard)}
          />
        )}
      </main>

      <footer className="footer">
        <p>MIDI Chord Controller for Jazz Performance</p>
      </footer>
    </div>
  );
}

export default App;
