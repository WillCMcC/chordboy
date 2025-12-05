import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { MIDIStatus } from "./components/MIDIStatus";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { MobileControls } from "./components/MobileControls";
import { TransportControls } from "./components/TransportControls";
import { SequencerModal } from "./components/SequencerModal";
import { useTransport } from "./hooks/useTransport";
import { useKeyboard } from "./hooks/useKeyboard";
import { useChordEngine } from "./hooks/useChordEngine";
import { useMIDI } from "./hooks/useMIDI";
import { useIsMobile } from "./hooks/useIsMobile";
import { usePWAInstall } from "./hooks/usePWAInstall";
import "./App.css";

// ROYGBIV colors mapped to the 12 chromatic notes (C through B)
// Spread across the rainbow with bright, vivid colors
const NOTE_COLORS = {
  0: "#ff3333", // C - Bright Red
  1: "#ff6622", // C# - Red-Orange
  2: "#ff9900", // D - Bright Orange
  3: "#ffcc00", // D# - Gold
  4: "#ffff33", // E - Bright Yellow
  5: "#33ff33", // F - Bright Green
  6: "#00ffcc", // F# - Cyan/Turquoise
  7: "#3399ff", // G - Bright Blue
  8: "#6633ff", // G# - Indigo
  9: "#9933ff", // A - Bright Violet
  10: "#ff33cc", // A# - Magenta
  11: "#ff3399", // B - Hot Pink
};

// Get color for a MIDI note
const getNoteColor = (midiNote) => {
  const noteIndex = midiNote % 12;
  return NOTE_COLORS[noteIndex];
};

// Build northern lights gradient from active notes
const buildNorthernLightsGradient = (notes) => {
  if (!notes || notes.length === 0) {
    return null;
  }

  // Get unique note classes (0-11) from the chord, sorted
  const noteClasses = [...new Set(notes.map((n) => n % 12))].sort(
    (a, b) => a - b
  );

  // Build color stops for the gradient
  const colors = noteClasses.map((nc) => NOTE_COLORS[nc]);

  // Create a flowing gradient with multiple color stops
  if (colors.length === 1) {
    return `radial-gradient(ellipse at 50% 100%, ${colors[0]}40 0%, ${colors[0]}20 40%, transparent 70%)`;
  }

  // For multiple colors, create a flowing horizontal gradient
  const colorStops = colors
    .map((color, i) => {
      const percent = (i / (colors.length - 1)) * 100;
      return `${color}35 ${percent}%`;
    })
    .join(", ");

  return `linear-gradient(90deg, ${colorStops})`;
};

function App() {
  const isMobile = useIsMobile();
  const { isInstallable, install } = usePWAInstall();
  const {
    playChord,
    retriggerChord,
    stopAllNotes,
    isConnected,
    selectedOutput,
    humanize,
    setHumanize,
    // MIDI sync inputs
    inputs: midiInputs,
    selectedInput,
    selectInput,
    setClockCallbacks,
  } = useMIDI();
  const { pressedKeys: keyboardKeys } = useKeyboard(stopAllNotes);
  const [mobileKeys, setMobileKeys] = useState(new Set());
  const [showMobileKeyboard, setShowMobileKeyboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
    cycleInversion,
    cycleDrop,
    cycleSpread,
    changeOctave,
    saveCurrentChordToSlot,
    recallPresetFromSlot,
    stopRecallingPreset,
    activePresetSlot,
    solvePresets,
    getChordNotesFromPreset,
  } = useChordEngine(allPressedKeys);

  // Sequencer modal state
  const [showSequencer, setShowSequencer] = useState(false);

  // Callback to retrigger a preset (for sequencer retrig mode)
  const handleRetriggerPreset = useCallback(
    (slotNumber) => {
      const notes = getChordNotesFromPreset(slotNumber);
      if (notes && notes.length > 0) {
        retriggerChord(notes);
      }
    },
    [getChordNotesFromPreset, retriggerChord]
  );

  // Transport controls (BPM, clock, sequencer, etc.)
  const {
    bpm,
    isPlaying,
    currentBeat,
    syncEnabled,
    toggle: toggleTransport,
    setBpm,
    setSyncEnabled,
    // Sequencer
    sequencerEnabled,
    sequencerSteps,
    currentStep,
    sequence,
    stepsPerBeat,
    retrigMode,
    setSequencerEnabled,
    setSequencerSteps,
    setStepsPerBeat,
    setRetrigMode,
    setStep,
    clearStep,
    clearSequence,
  } = useTransport({
    onTriggerPreset: recallPresetFromSlot,
    onRetriggerPreset: handleRetriggerPreset,
    onStopNotes: stopAllNotes,
    setClockCallbacks,
  });

  // Track the last chord played
  const [lastChord, setLastChord] = useState(null);

  // Multi-select state for chord solving
  const [selectedPresets, setSelectedPresets] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Toggle preset selection
  const togglePresetSelection = useCallback((slot) => {
    setSelectedPresets((prev) => {
      if (prev.includes(slot)) {
        return prev.filter((s) => s !== slot);
      } else {
        return [...prev, slot];
      }
    });
  }, []);

  // Handle solve button click
  const handleSolveChords = useCallback(() => {
    if (selectedPresets.length >= 2) {
      const success = solvePresets(selectedPresets);
      if (success) {
        // Clear selection after successful solve
        setSelectedPresets([]);
        setIsSelectMode(false);
      }
    }
  }, [selectedPresets, solvePresets]);

  // Cancel selection mode
  const cancelSelectMode = useCallback(() => {
    setSelectedPresets([]);
    setIsSelectMode(false);
  }, []);

  // Play chord when it changes
  useEffect(() => {
    if (currentChord && currentChord.notes && isConnected) {
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


  // Determine which chord to display
  const displayChord = currentChord || lastChord;

  return (
    <div className="app">
      {/* Settings button */}
      <button
        className="settings-btn"
        onClick={() => setShowSettings(!showSettings)}
        aria-label="Settings"
      >
        ⚙️
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="settings-overlay"
          onClick={() => setShowSettings(false)}
        >
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2>Settings</h2>
              <button
                className="settings-close"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>
            <div className="settings-content">
              <div className="settings-section">
                <h3>MIDI Interface</h3>
                <MIDIStatus />
              </div>
              {isInstallable && (
                <div className="settings-section">
                  <h3>Install App</h3>
                  <p className="settings-description">
                    Install ChordBoy as a standalone app for the best
                    experience.
                  </p>
                  <button onClick={install} className="install-btn">
                    Install App
                  </button>
                </div>
              )}
              <div className="settings-section">
                <h3>About</h3>
                <p className="settings-description">
                  ChordBoy - MIDI Chord Controller for Jazz Performance
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main
        className="main"
        style={{ paddingBottom: isMobile ? "50vh" : "2rem" }}
      >
        <div className="chord-display-wrapper">
          {/* Aurora glow layer - separate element behind the panel */}
          <div
            className={`aurora-glow ${currentChord ? "active" : ""}`}
            style={
              currentChord
                ? {
                    "--aurora-gradient": buildNorthernLightsGradient(
                      currentChord.notes
                    ),
                    background: buildNorthernLightsGradient(currentChord.notes),
                  }
                : {}
            }
          />
          <div className="chord-display">
            <p className="chord-name">
              {displayChord ? displayChord.name : "Press keys to play chords"}
            </p>
            <div
              className="chord-info"
              style={{ visibility: displayChord ? "visible" : "hidden" }}
            >
              <p>
                <strong>Notes:</strong>{" "}
                {displayChord
                  ? displayChord.notes.map((n) => n).join(", ")
                  : "—"}{" "}
                <span style={{ opacity: 0.5 }}>|</span> <strong>Octave:</strong>{" "}
                {octave}
              </p>
              <p>
                <strong>Inversion:</strong> {inversionIndex}{" "}
                <span style={{ opacity: 0.5 }}>|</span>{" "}
                <strong>Dropped:</strong> {droppedNotes}{" "}
                <span style={{ opacity: 0.5 }}>|</span> <strong>Spread:</strong>{" "}
                {spreadAmount}
              </p>
            </div>
            {!isMobile && (
              <div
                className="keyboard-hints"
                style={{ visibility: displayChord ? "visible" : "hidden" }}
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

        {/* Transport Controls */}
        <TransportControls
          bpm={bpm}
          isPlaying={isPlaying}
          currentBeat={currentBeat}
          syncEnabled={syncEnabled}
          onBpmChange={setBpm}
          onTogglePlay={toggleTransport}
          onSyncEnabledChange={setSyncEnabled}
          // MIDI inputs for sync
          midiInputs={midiInputs}
          selectedInputId={selectedInput?.id}
          onSelectInput={selectInput}
          // Humanize
          humanize={humanize}
          onHumanizeChange={setHumanize}
          // Sequencer
          sequencerEnabled={sequencerEnabled}
          onOpenSequencer={() => setShowSequencer(true)}
        />

        {!isMobile && (
          <div className="presets-panel">
            <div className="presets-header">
              <h3>Saved Presets</h3>
              <div className="presets-actions">
                {!isSelectMode ? (
                  <button
                    onClick={() => setIsSelectMode(true)}
                    className="solve-mode-btn"
                    disabled={savedPresets.size < 2}
                  >
                    Select to Solve
                  </button>
                ) : (
                  <>
                    <span className="select-hint">
                      Select{" "}
                      {selectedPresets.length < 2
                        ? `${2 - selectedPresets.length} more`
                        : selectedPresets.length}{" "}
                      chords
                    </span>
                    <button
                      onClick={handleSolveChords}
                      className="solve-btn"
                      disabled={selectedPresets.length < 2}
                    >
                      Solve Voicings
                    </button>
                    <button onClick={cancelSelectMode} className="cancel-btn">
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="preset-slots">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(
                (slot) => {
                  const preset = savedPresets.get(slot);
                  const hasPreset = !!preset;
                  const isSelected = selectedPresets.includes(slot);

                  return (
                    <div
                      key={slot}
                      className={`preset-slot compact ${hasPreset ? "filled" : "empty"} ${isSelectMode && hasPreset ? "selectable" : ""} ${isSelected ? "selected" : ""}`}
                      onClick={
                        isSelectMode && hasPreset
                          ? () => togglePresetSelection(slot)
                          : undefined
                      }
                      title={
                        hasPreset
                          ? `${Array.from(preset.keys).join(" + ")} | Oct: ${preset.octave} | Inv: ${preset.inversionIndex} | Spr: ${preset.spreadAmount} | Drp: ${preset.droppedNotes}`
                          : `Slot ${slot} - Empty`
                      }
                    >
                      {isSelectMode && isSelected && (
                        <span className="selection-order-badge">
                          {selectedPresets.indexOf(slot) + 1}
                        </span>
                      )}
                      <span
                        className={`preset-number ${hasPreset ? "" : "empty"}`}
                      >
                        {slot}
                      </span>
                      {!isSelectMode && hasPreset && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearPreset(slot);
                          }}
                          className="clear-btn-mini"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {!isMobile && (
          <PianoKeyboard
            activeNotes={currentChord ? currentChord.notes : []}
            startOctave={1}
            endOctave={7}
            getNoteColor={getNoteColor}
          />
        )}

        {isMobile && showMobileKeyboard && (
          <div className="mobile-keyboard-container" ref={mobileKeyboardRef}>
            <PianoKeyboard
              activeNotes={currentChord ? currentChord.notes : []}
              startOctave={2}
              endOctave={6}
              isMobile={true}
              getNoteColor={getNoteColor}
            />
          </div>
        )}

        {isMobile && (
          <MobileControls
            mobileKeys={mobileKeys}
            setMobileKeys={setMobileKeys}
            onInversionChange={cycleInversion}
            onDropChange={cycleDrop}
            onSpreadChange={cycleSpread}
            onOctaveChange={changeOctave}
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
            onSolvePresets={solvePresets}
          />
        )}
      </main>

      {/* Sequencer Modal */}
      <SequencerModal
        isOpen={showSequencer}
        onClose={() => setShowSequencer(false)}
        sequence={sequence}
        sequencerSteps={sequencerSteps}
        currentStep={currentStep}
        stepsPerBeat={stepsPerBeat}
        sequencerEnabled={sequencerEnabled}
        isPlaying={isPlaying}
        retrigMode={retrigMode}
        savedPresets={savedPresets}
        onSetStep={setStep}
        onClearStep={clearStep}
        onClearSequence={clearSequence}
        onSetSequencerSteps={setSequencerSteps}
        onSetStepsPerBeat={setStepsPerBeat}
        onSetSequencerEnabled={setSequencerEnabled}
        onSetRetrigMode={setRetrigMode}
      />
    </div>
  );
}

export default App;
