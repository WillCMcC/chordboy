/**
 * App Component
 * Main application component for ChordBoy MIDI chord controller.
 * Orchestrates keyboard input, chord engine, MIDI output, and UI components.
 *
 * @module App
 */

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import type { MIDINote, StrumDirection, GraceNotePayload, MIDIInputInfoDisplay } from "./types";
import type { VoicedChord } from "./hooks/useChordEngine";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { MobileControls } from "./components/MobileControls";
import { TransportControls } from "./components/TransportControls";
import { SequencerModal } from "./components/SequencerModal";
import { SettingsPanel } from "./components/SettingsPanel";
import { PresetsPanel } from "./components/PresetsPanel";
import { ChordDisplay } from "./components/ChordDisplay";
import { TutorialModal } from "./components/TutorialModal";
import { GraceNoteStrip } from "./components/GraceNoteStrip";
import { SynthPanel } from "./components/SynthPanel";
import { useTransport } from "./hooks/useTransport";
import { useKeyboard } from "./hooks/useKeyboard";
import { useChordEngine } from "./hooks/useChordEngine";
import { useMIDI } from "./hooks/useMIDI";
import { useGraceNotes } from "./hooks/useGraceNotes";
import { useIsMobile } from "./hooks/useIsMobile";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { useWakeLock } from "./hooks/useWakeLock";
import { useEventSubscription } from "./hooks/useEventSubscription";
import { appEvents } from "./lib/eventBus";
import { getNoteColor } from "./lib/noteColors";
import "./App.css";

const TUTORIAL_SEEN_KEY = "chordboy-tutorial-seen";
const WAKE_LOCK_KEY = "chordboy-wake-lock-enabled";

/**
 * Main application component.
 */
function App() {
  const isMobile = useIsMobile();
  const { isInstallable, install } = usePWAInstall();

  // Wake lock to keep screen on during performance
  const [wakeLockEnabled, setWakeLockEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(WAKE_LOCK_KEY);
    // Default to true on mobile, false on desktop
    return saved !== null ? saved === "true" : isMobile;
  });
  const { isSupported: wakeLockSupported, isActive: wakeLockActive } =
    useWakeLock(wakeLockEnabled);

  // Persist wake lock preference
  const handleWakeLockChange = useCallback((enabled: boolean): void => {
    setWakeLockEnabled(enabled);
    localStorage.setItem(WAKE_LOCK_KEY, String(enabled));
  }, []);

  // MIDI connection and playback
  // Note: chord playback is now handled via event subscription in useMIDI
  const {
    retriggerChord,
    stopAllNotes,
    humanize,
    setHumanize,
    strumEnabled,
    strumSpread,
    strumDirection,
    setStrumEnabled,
    setStrumSpread,
    setStrumDirection,
    triggerMode,
    setTriggerMode,
    glideTime,
    setGlideTime,
    inputs: midiInputs,
    selectedInput,
    selectInput,
    setClockCallbacks,
    // BLE for sync
    bleConnected,
    bleDevice,
    bleSyncEnabled,
  } = useMIDI();

  // Keyboard input
  const { pressedKeys: keyboardKeys } = useKeyboard(stopAllNotes);
  const [mobileKeys, setMobileKeys] = useState<Set<string>>(new Set());

  // UI state
  const [showMobileKeyboard, setShowMobileKeyboard] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showSequencer, setShowSequencer] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [lastChord, setLastChord] = useState<VoicedChord | null>(null);
  const [triggeredNotes, setTriggeredNotes] = useState<MIDINote[]>([]);
  const mobileKeyboardRef = useRef<HTMLDivElement>(null);
  const triggeredTimeoutRef = useRef<number | null>(null);

  // Show tutorial on first visit
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  // Hide mobile browser URL bar by scrolling on mount
  useEffect(() => {
    if (!isMobile) return;
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      window.scrollTo(0, 1);
    }, 100);
    return () => clearTimeout(timer);
  }, [isMobile]);

  const handleCloseTutorial = useCallback((): void => {
    setShowTutorial(false);
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
  }, []);

  // Combine keyboard and mobile keys
  const allPressedKeys = useMemo((): Set<string> => {
    return new Set([...keyboardKeys, ...mobileKeys]);
  }, [keyboardKeys, mobileKeys]);

  // Chord engine - pass isMobile for retrigger behavior
  const {
    currentChord,
    inversionIndex,
    octave,
    spreadAmount,
    voicingStyle,
    savedPresets,
    clearPreset,
    cycleInversion,
    cycleSpread,
    cycleVoicingStyle,
    changeOctave,
    saveCurrentChordToSlot,
    recallPresetFromSlot,
    stopRecallingPreset,
    activePresetSlot,
    solvePresets,
    getChordNotesFromPreset,
  } = useChordEngine(allPressedKeys, { isMobile });

  // Enable grace notes when holding preset keys (ghjkl = single notes, yuiop = pairs, vbnm,. = intervals)
  useGraceNotes({
    currentChordNotes: currentChord?.notes ?? null,
    enabled: !isMobile, // Only on desktop
  });

  /**
   * Retrigger a preset's chord notes (for sequencer retrig mode).
   */
  const handleRetriggerPreset = useCallback(
    (slotNumber: string): void => {
      const notes = getChordNotesFromPreset(slotNumber);
      if (notes && notes.length > 0) {
        retriggerChord(notes);
      }
    },
    [getChordNotesFromPreset, retriggerChord]
  );

  /**
   * Stop notes and clear recalled preset (for sequencer empty steps).
   * This ensures the next trigger will re-trigger even if it's the same preset.
   */
  const handleSequencerStop = useCallback((): void => {
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

  // Chord playback is now handled via event subscription in useMIDI
  // useChordEngine emits 'chord:changed' and 'chord:cleared' events
  // Update lastChord for display purposes
  useEffect(() => {
    if (currentChord) {
      setLastChord(currentChord);
    }
  }, [currentChord]);

  // Subscribe to grace note events for visual feedback on piano
  useEventSubscription(appEvents, "grace:note", (event: GraceNotePayload) => {
    // Clear any pending timeout
    if (triggeredTimeoutRef.current) {
      clearTimeout(triggeredTimeoutRef.current);
    }

    // Set triggered notes for visual feedback
    setTriggeredNotes(event.notes);

    // Clear after animation completes
    triggeredTimeoutRef.current = window.setTimeout(() => {
      setTriggeredNotes([]);
      triggeredTimeoutRef.current = null;
    }, 200);
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (triggeredTimeoutRef.current) {
        clearTimeout(triggeredTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Auto-scroll mobile keyboard to show active notes.
   */
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
    const minNote = Math.min(...notes);
    const maxNote = Math.max(...notes);
    const centerNote = Math.round((minNote + maxNote) / 2);

    // Calculate scroll position based on white keys
    const startMidi = 36; // C2
    const whiteKeyWidth = 22;

    const getWhiteKeyIndex = (midiNote: MIDINote): number => {
      let whiteKeyCount = 0;
      for (let m = startMidi; m < midiNote; m++) {
        const noteInOctave = m % 12;
        if ([0, 2, 4, 5, 7, 9, 11].includes(noteInOctave)) {
          whiteKeyCount++;
        }
      }
      return whiteKeyCount;
    };

    const centerWhiteKeyIndex = getWhiteKeyIndex(centerNote as MIDINote);
    const targetScrollPosition =
      centerWhiteKeyIndex * whiteKeyWidth -
      container.clientWidth / 2 +
      whiteKeyWidth;

    container.scrollTo({
      left: Math.max(0, targetScrollPosition),
      behavior: "smooth",
    });
  }, [currentChord?.notes, showMobileKeyboard]);

  // Determine which chord to display (current or last)
  const displayChord = currentChord || lastChord;

  // Filter and map midiInputs to display type (handles null names safely)
  const typedMidiInputs: MIDIInputInfoDisplay[] = midiInputs
    .filter((input): input is typeof input & { name: string } => input.name !== null)
    .map(({ id, name }) => ({ id, name }));

  return (
    <div className="app">
      {/* Synth / MIDI mode selector - fixed at top */}
      <SynthPanel onOpenSettings={() => setShowSettings(true)} />

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
        wakeLockSupported={wakeLockSupported}
        wakeLockEnabled={wakeLockEnabled}
        wakeLockActive={wakeLockActive}
        onWakeLockChange={handleWakeLockChange}
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
        isMobile={isMobile}
        setMobileKeys={setMobileKeys}
        onInversionChange={cycleInversion}
        onOctaveChange={changeOctave}
        onSpreadChange={cycleSpread}
        onSavePreset={saveCurrentChordToSlot}
      />

      <main
        className="main"
        style={{ paddingBottom: isMobile ? "55dvh" : "2rem" }}
      >
        {/* Chord display with aurora glow */}
        <ChordDisplay
          currentChord={currentChord}
          displayChord={displayChord}
          octave={octave}
          inversionIndex={inversionIndex}
          spreadAmount={spreadAmount}
          voicingStyle={voicingStyle}
          showHints={!isMobile}
        />

        {/* Grace note strip for mobile - tap to re-articulate individual notes */}
        {isMobile && currentChord && (
          <GraceNoteStrip notes={currentChord.notes} />
        )}

        {/* Transport controls - desktop only, mobile is inside MobileControls */}
        {!isMobile && (
          <TransportControls
            bpm={bpm}
            isPlaying={isPlaying}
            currentBeat={currentBeat}
            syncEnabled={syncEnabled}
            onBpmChange={setBpm}
            onTogglePlay={toggleTransport}
            onSyncEnabledChange={setSyncEnabled}
            midiInputs={typedMidiInputs}
            selectedInputId={selectedInput?.id ?? null}
            onSelectInput={selectInput}
            bleConnected={bleConnected}
            bleDevice={bleDevice}
            bleSyncEnabled={bleSyncEnabled}
            humanize={humanize}
            onHumanizeChange={setHumanize}
            strumEnabled={strumEnabled}
            strumSpread={strumSpread}
            strumDirection={strumDirection as StrumDirection}
            onStrumEnabledChange={setStrumEnabled}
            onStrumSpreadChange={setStrumSpread}
            onStrumDirectionChange={setStrumDirection}
            triggerMode={triggerMode}
            onTriggerModeChange={setTriggerMode}
            glideTime={glideTime}
            onGlideTimeChange={setGlideTime}
            sequencerEnabled={sequencerEnabled}
            onOpenSequencer={() => setShowSequencer(true)}
          />
        )}

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
            triggeredNotes={triggeredNotes}
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
              triggeredNotes={triggeredNotes}
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
            onSpreadChange={cycleSpread}
            onOctaveChange={changeOctave}
            onVoicingStyleChange={cycleVoicingStyle}
            currentSettings={{
              inversionIndex,
              spreadAmount,
              octave,
              voicingStyle,
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
            // Transport props for mobile
            bpm={bpm}
            isPlaying={isPlaying}
            currentBeat={currentBeat}
            syncEnabled={syncEnabled}
            onBpmChange={setBpm}
            onTogglePlay={toggleTransport}
            onSyncEnabledChange={setSyncEnabled}
            midiInputs={typedMidiInputs}
            selectedInputId={selectedInput?.id ?? null}
            onSelectInput={selectInput}
            bleConnected={bleConnected}
            bleDevice={bleDevice}
            bleSyncEnabled={bleSyncEnabled}
            humanize={humanize}
            onHumanizeChange={setHumanize}
            strumEnabled={strumEnabled}
            strumSpread={strumSpread}
            strumDirection={strumDirection as StrumDirection}
            onStrumEnabledChange={setStrumEnabled}
            onStrumSpreadChange={setStrumSpread}
            onStrumDirectionChange={setStrumDirection}
            triggerMode={triggerMode}
            onTriggerModeChange={setTriggerMode}
            glideTime={glideTime}
            onGlideTimeChange={setGlideTime}
            sequencerEnabled={sequencerEnabled}
            onOpenSequencer={() => setShowSequencer(true)}
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
