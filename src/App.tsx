/**
 * App Component
 * Main application component for ChordBoy MIDI chord controller.
 * Orchestrates keyboard input, chord engine, MIDI output, and UI components.
 *
 * @module App
 */

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import type {
  MIDINote,
  StrumDirection,
  GraceNotePayload,
  MIDIInputInfoDisplay,
  Octave,
} from "./types";
import type { VoicedChord } from "./hooks/useChordEngine";
import { usePlaybackModeDisplay } from "./hooks/usePlaybackModeDisplay";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { MobileControls } from "./components/MobileControls";
import { TransportControls } from "./components/TransportControls";
import { SequencerModal } from "./components/SequencerModal";
import { GridSequencerModal } from "./components/GridSequencerModal";
import { SettingsPanel } from "./components/SettingsPanel";
import { PresetsPanel } from "./components/PresetsPanel";
import { ChordWizardModal } from "./components/ChordWizardModal";
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
import { useToneSynth } from "./hooks/useToneSynth";
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
    // Playback mode
    playbackMode,
    setPlaybackMode,
    setBpmForPlayback,
  } = useMIDI();

  // Synth state (for patch builder)
  const { isPatchBuilderOpen } = useToneSynth();

  // Keyboard input
  const { pressedKeys: keyboardKeys } = useKeyboard(stopAllNotes);
  const [mobileKeys, setMobileKeys] = useState<Set<string>>(new Set());

  // UI state
  const [showMobileKeyboard, setShowMobileKeyboard] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showSequencer, setShowSequencer] = useState<boolean>(false);
  const [showGridSequencer, setShowGridSequencer] = useState<boolean>(false);
  const [showWizard, setShowWizard] = useState<boolean>(false);
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
    trueRandomMode,
    setTrueRandomMode,
    savePreset,
    findNextAvailableSlot,
  } = useChordEngine(allPressedKeys, { isMobile });

  // Enable grace notes when holding preset keys (ghjkl = single notes, yuiop = pairs, vbnm,. = intervals)
  // Pass activePresetSlot to ensure grace notes only fire when a preset is actually recalled,
  // not during chord building with overlapping modifier keys (j, u, k, i, etc.)
  useGraceNotes({
    currentChordNotes: currentChord?.notes ?? null,
    enabled: !isMobile, // Only on desktop
    activePresetSlot,
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
    [getChordNotesFromPreset, retriggerChord],
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

  // Sync BPM from transport to MIDI for playback mode timing
  useEffect(() => {
    setBpmForPlayback(bpm);
  }, [bpm, setBpmForPlayback]);

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

  // Calculate which notes to show on keyboard based on playback mode
  // For rhythmic modes, updates in real-time as the pattern progresses
  const displayNotes = usePlaybackModeDisplay({
    chordNotes: currentChord?.notes ?? null,
    playbackMode,
    bpm,
  });

  // Filter and map midiInputs to display type (handles null names safely)
  const typedMidiInputs: MIDIInputInfoDisplay[] = midiInputs
    .filter(
      (input): input is typeof input & { name: string } => input.name !== null,
    )
    .map(({ id, name }) => ({ id, name }));

  // Find the next available preset slot for floating save button
  const nextAvailableSlot = useMemo((): string | null => {
    const slots = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    for (const slot of slots) {
      if (!savedPresets.has(slot)) {
        return slot;
      }
    }
    return null;
  }, [savedPresets]);

  // Handle floating save button tap
  const handleFloatingSave = useCallback((): void => {
    if (nextAvailableSlot) {
      const success = saveCurrentChordToSlot(nextAvailableSlot);
      if (success) {
        // Provide haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }
  }, [nextAvailableSlot, saveCurrentChordToSlot]);

  // Handle saving presets from chord wizard
  const handleSaveWizardPresets = useCallback(
    (presets: Array<{ keys: Set<string>; octave: Octave }>): void => {
      // Pre-calculate all available slots (since findNextAvailableSlot uses a ref
      // that doesn't update synchronously during the loop)
      const slots = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
      const availableSlots = slots.filter((s) => !savedPresets.has(s));

      // Save each preset to the next available slot
      presets.forEach((preset, index) => {
        if (index < availableSlots.length) {
          savePreset(availableSlots[index], {
            keys: preset.keys,
            octave: preset.octave,
            inversionIndex: 0,
            spreadAmount: 0,
            voicingStyle: "close",
          });
        }
      });
    },
    [savedPresets, savePreset]
  );

  return (
    <div className="app">
      {/* Synth / MIDI mode selector - fixed at top */}
      <SynthPanel onOpenSettings={() => setShowSettings(true)} />

      {/* Header buttons - hidden on mobile */}
      {!isMobile && (
        <div className="header-buttons">
          <button
            className="header-btn"
            onClick={() => setShowTutorial(true)}
            aria-label="Help"
            data-testid="open-tutorial"
          >
            ?
          </button>
          <button
            className="header-btn"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Settings"
            data-testid="open-settings"
          >
            ⚙️
          </button>
        </div>
      )}

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
        trueRandomMode={trueRandomMode}
        onTrueRandomModeChange={setTrueRandomMode}
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
        <div data-testid="chord-display">
          <ChordDisplay
            currentChord={currentChord}
            displayChord={displayChord}
            octave={octave}
            inversionIndex={inversionIndex}
            spreadAmount={spreadAmount}
            voicingStyle={voicingStyle}
            showHints={!isMobile}
          />
        </div>

        {/* Grace note strip OR piano keyboard for mobile */}
        {isMobile && !showMobileKeyboard && currentChord && (
          <GraceNoteStrip notes={currentChord.notes} />
        )}

        {/* Mobile piano keyboard - replaces grace notes when visible */}
        {isMobile && showMobileKeyboard && (
          <div className="mobile-keyboard-inline" ref={mobileKeyboardRef}>
            <PianoKeyboard
              activeNotes={displayNotes}
              triggeredNotes={triggeredNotes}
              startOctave={2}
              endOctave={6}
              isMobile={true}
              getNoteColor={getNoteColor}
            />
          </div>
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
            playbackMode={playbackMode}
            onPlaybackModeChange={setPlaybackMode}
            onOpenGridSequencer={() => setShowGridSequencer(true)}
          />
        )}

        {/* Desktop presets panel */}
        {!isMobile && (
          <PresetsPanel
            savedPresets={savedPresets}
            onClearPreset={clearPreset}
            onSolvePresets={solvePresets}
            onOpenWizard={() => setShowWizard(true)}
          />
        )}

        {/* Desktop piano keyboard */}
        {!isMobile && (
          <div data-testid="piano-keyboard">
            <PianoKeyboard
              activeNotes={displayNotes}
              triggeredNotes={triggeredNotes}
              startOctave={1}
              endOctave={7}
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
            isPatchBuilderOpen={isPatchBuilderOpen}
            playbackMode={playbackMode}
            onPlaybackModeChange={setPlaybackMode}
            onOpenGridSequencer={() => setShowGridSequencer(true)}
          />
        )}

        {/* Floating save preset button for mobile - outside MobileControls to avoid clipping */}
        {/* Hide when playing a saved chord (activePresetSlot is set) */}
        {isMobile && currentChord && nextAvailableSlot && !activePresetSlot && (
          <button
            className="floating-save-btn"
            onClick={handleFloatingSave}
            aria-label={`Save to preset ${nextAvailableSlot}`}
          >
            Save to {nextAvailableSlot}
          </button>
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

      {/* Chord Wizard modal */}
      <ChordWizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        savedPresets={savedPresets}
        currentChordKeys={allPressedKeys.size > 0 ? allPressedKeys : null}
        currentOctave={octave}
        onSavePresets={handleSaveWizardPresets}
        findNextAvailableSlot={findNextAvailableSlot}
      />

      {/* Grid Sequencer modal */}
      <GridSequencerModal
        isOpen={showGridSequencer}
        onClose={() => setShowGridSequencer(false)}
      />
    </div>
  );
}

export default App;
