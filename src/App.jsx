/**
 * App Component
 * Main application component for ChordBoy MIDI chord controller.
 * Orchestrates keyboard input, chord engine, MIDI output, and UI components.
 *
 * @module App
 */

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { MobileControls } from "./components/MobileControls";
import { TransportControls } from "./components/TransportControls";
import { SequencerModal } from "./components/SequencerModal";
import { SettingsPanel } from "./components/SettingsPanel";
import { PresetsPanel } from "./components/PresetsPanel";
import { ChordDisplay } from "./components/ChordDisplay";
import { TutorialModal } from "./components/TutorialModal";
import { useTransport } from "./hooks/useTransport";
import { useKeyboard } from "./hooks/useKeyboard";
import { useChordEngine } from "./hooks/useChordEngine";
import { useMIDI } from "./hooks/useMIDI";
import { useIsMobile } from "./hooks/useIsMobile";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { getNoteColor } from "./lib/noteColors";
import "./App.css";

const TUTORIAL_SEEN_KEY = "chordboy-tutorial-seen";

/**
 * Main application component.
 * @returns {JSX.Element} The app component
 */
function App() {
  const isMobile = useIsMobile();
  const { isInstallable, install } = usePWAInstall();

  // MIDI connection and playback
  const {
    playChord,
    retriggerChord,
    stopAllNotes,
    isConnected,
    humanize,
    setHumanize,
    inputs: midiInputs,
    selectedInput,
    selectInput,
    setClockCallbacks,
  } = useMIDI();

  // Keyboard input
  const { pressedKeys: keyboardKeys } = useKeyboard(stopAllNotes);
  const [mobileKeys, setMobileKeys] = useState(new Set());

  // UI state
  const [showMobileKeyboard, setShowMobileKeyboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSequencer, setShowSequencer] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [lastChord, setLastChord] = useState(null);
  const mobileKeyboardRef = useRef(null);

  // Show tutorial on first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
  }, []);

  // Combine keyboard and mobile keys
  const allPressedKeys = useMemo(() => {
    return new Set([...keyboardKeys, ...mobileKeys]);
  }, [keyboardKeys, mobileKeys]);

  // Chord engine
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

  /**
   * Retrigger a preset's chord notes (for sequencer retrig mode).
   */
  const handleRetriggerPreset = useCallback(
    (slotNumber) => {
      const notes = getChordNotesFromPreset(slotNumber);
      if (notes?.length > 0) {
        retriggerChord(notes);
      }
    },
    [getChordNotesFromPreset, retriggerChord]
  );

  /**
   * Stop notes and clear recalled preset (for sequencer empty steps).
   * This ensures the next trigger will re-trigger even if it's the same preset.
   */
  const handleSequencerStop = useCallback(() => {
    stopAllNotes();
    stopRecallingPreset();
  }, [stopAllNotes, stopRecallingPreset]);

  // Transport and sequencer
  const {
    bpm,
    isPlaying,
    currentBeat,
    syncEnabled,
    toggle: toggleTransport,
    setBpm,
    setSyncEnabled,
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
    onStopNotes: handleSequencerStop,
    setClockCallbacks,
  });

  /**
   * Play chord when it changes.
   */
  useEffect(() => {
    if (currentChord?.notes && isConnected) {
      playChord(currentChord.notes);
      setLastChord(currentChord);
    } else if (isConnected) {
      stopAllNotes();
    }
  }, [currentChord, isConnected, playChord, stopAllNotes]);

  /**
   * Auto-scroll mobile keyboard to show active notes.
   */
  useEffect(() => {
    if (!showMobileKeyboard || !mobileKeyboardRef.current || !currentChord?.notes?.length) {
      return;
    }

    const container = mobileKeyboardRef.current;
    const notes = currentChord.notes;
    const minNote = Math.min(...notes);
    const maxNote = Math.max(...notes);
    const centerNote = Math.round((minNote + maxNote) / 2);

    // Calculate scroll position based on white keys
    const startMidi = 36; // C2
    const whiteKeyWidth = 22;

    const getWhiteKeyIndex = (midiNote) => {
      let whiteKeyCount = 0;
      for (let m = startMidi; m < midiNote; m++) {
        const noteInOctave = m % 12;
        if ([0, 2, 4, 5, 7, 9, 11].includes(noteInOctave)) {
          whiteKeyCount++;
        }
      }
      return whiteKeyCount;
    };

    const centerWhiteKeyIndex = getWhiteKeyIndex(centerNote);
    const targetScrollPosition =
      centerWhiteKeyIndex * whiteKeyWidth - container.clientWidth / 2 + whiteKeyWidth;

    container.scrollTo({
      left: Math.max(0, targetScrollPosition),
      behavior: "smooth",
    });
  }, [currentChord?.notes, showMobileKeyboard]);

  // Determine which chord to display (current or last)
  const displayChord = currentChord || lastChord;

  return (
    <div className="app">
      {/* Header buttons */}
      <div className="header-buttons">
        <button
          className="header-btn"
          onClick={() => setShowTutorial(true)}
          aria-label="Help"
        >
          ?
        </button>
        <button
          className="header-btn"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Settings panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isInstallable={isInstallable}
        onInstall={install}
      />

      {/* Tutorial modal */}
      <TutorialModal
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
        currentChord={currentChord}
        inversionIndex={inversionIndex}
        octave={octave}
        spreadAmount={spreadAmount}
        savedPresets={savedPresets}
      />

      <main className="main" style={{ paddingBottom: isMobile ? "50vh" : "2rem" }}>
        {/* Chord display with aurora glow */}
        <ChordDisplay
          currentChord={currentChord}
          displayChord={displayChord}
          octave={octave}
          inversionIndex={inversionIndex}
          droppedNotes={droppedNotes}
          spreadAmount={spreadAmount}
          showHints={!isMobile}
        />

        {/* Transport controls */}
        <TransportControls
          bpm={bpm}
          isPlaying={isPlaying}
          currentBeat={currentBeat}
          syncEnabled={syncEnabled}
          onBpmChange={setBpm}
          onTogglePlay={toggleTransport}
          onSyncEnabledChange={setSyncEnabled}
          midiInputs={midiInputs}
          selectedInputId={selectedInput?.id}
          onSelectInput={selectInput}
          humanize={humanize}
          onHumanizeChange={setHumanize}
          sequencerEnabled={sequencerEnabled}
          onOpenSequencer={() => setShowSequencer(true)}
        />

        {/* Desktop presets panel */}
        {!isMobile && (
          <PresetsPanel
            savedPresets={savedPresets}
            onClearPreset={clearPreset}
            onSolvePresets={solvePresets}
          />
        )}

        {/* Desktop piano keyboard */}
        {!isMobile && (
          <PianoKeyboard
            activeNotes={currentChord ? currentChord.notes : []}
            startOctave={1}
            endOctave={7}
            getNoteColor={getNoteColor}
          />
        )}

        {/* Mobile piano keyboard */}
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

        {/* Mobile controls */}
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

      {/* Sequencer modal */}
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
