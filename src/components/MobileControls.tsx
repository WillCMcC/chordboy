import { useMemo, useState, useRef, useCallback } from "react";
import type {
  Dispatch,
  SetStateAction,
  PointerEvent,
  TouchEvent,
  MouseEvent,
} from "react";
import type {
  Preset,
  StrumDirection,
  NoteName,
  MIDIInputInfoDisplay,
  VoicingStyle,
} from "../types";
import { VOICING_STYLE_LABELS } from "../types";
import type { TriggerMode } from "../hooks/useMIDI";
import { LEFT_HAND_KEYS, RIGHT_HAND_MODIFIERS } from "../lib/keyboardMappings";
import { TransportControls } from "./TransportControls";
import "./MobileControls.css";

/** Threshold in pixels for swipe gesture to "lock" a preset */
const SWIPE_LOCK_THRESHOLD = 30;

/** Current voicing settings */
interface VoicingSettings {
  inversionIndex: number;
  spreadAmount: number;
  octave: number;
  voicingStyle: VoicingStyle;
}

/** Touch tracking state for preset swipe-to-lock gesture */
interface PresetTouchState {
  activeSlot: string | null;
  startX: number;
  startY: number;
  isHeld: boolean;
}

/** Props for MobileControls component */
interface MobileControlsProps {
  /** Currently selected keys */
  mobileKeys: Set<string>;
  /** Setter for mobile keys */
  setMobileKeys: Dispatch<SetStateAction<Set<string>>>;
  /** Callback to cycle inversions */
  onInversionChange: () => void;
  /** Callback to cycle spread amount */
  onSpreadChange: () => void;
  /** Callback to shift octave (+1 or -1) */
  onOctaveChange: (delta: number) => void;
  /** Callback to cycle voicing style */
  onVoicingStyleChange: () => void;
  /** Current voicing settings */
  currentSettings: VoicingSettings;
  /** Map of saved presets by slot number */
  savedPresets: Map<string, Preset>;
  /** Callback to save current chord to slot, returns success */
  onSavePreset: (slot: string) => boolean;
  /** Callback to recall preset from slot */
  onRecallPreset: (slot: string) => void;
  /** Callback to clear a preset slot */
  onClearPreset: (slot: string) => void;
  /** Callback when preset recall ends */
  onStopRecall: () => void;
  /** Currently active preset slot */
  activePresetSlot: string | null;
  /** Whether piano keyboard is visible */
  showKeyboard: boolean;
  /** Callback to toggle keyboard visibility */
  onToggleKeyboard: () => void;
  /** Callback to solve voice leading for selected presets */
  onSolvePresets: (slots: string[], spreadPreference?: number) => boolean;
  // Transport props
  bpm: number;
  isPlaying: boolean;
  currentBeat: number;
  syncEnabled: boolean;
  onBpmChange: (bpm: number) => void;
  onTogglePlay: () => void;
  onSyncEnabledChange: (enabled: boolean) => void;
  midiInputs: MIDIInputInfoDisplay[];
  selectedInputId: string | null;
  onSelectInput: (inputId: string | null) => void;
  bleConnected: boolean;
  bleDevice: { name?: string } | null;
  bleSyncEnabled: boolean;
  humanize: number;
  onHumanizeChange: (amount: number) => void;
  strumEnabled: boolean;
  strumSpread: number;
  strumDirection: StrumDirection;
  onStrumEnabledChange: (enabled: boolean) => void;
  onStrumSpreadChange: (spread: number) => void;
  onStrumDirectionChange: (direction: StrumDirection) => void;
  triggerMode: TriggerMode;
  onTriggerModeChange: (mode: TriggerMode) => void;
  glideTime: number;
  onGlideTimeChange: (time: number) => void;
  sequencerEnabled: boolean;
  onOpenSequencer: () => void;
}

/**
 * MobileControls Component
 * Touch-friendly interface for mobile chord input.
 * Provides buttons for root notes, modifiers, voicing controls, and preset management.
 */
export function MobileControls({
  mobileKeys,
  setMobileKeys,
  onInversionChange,
  onSpreadChange,
  onOctaveChange,
  onVoicingStyleChange,
  currentSettings,
  savedPresets,
  onSavePreset,
  onRecallPreset,
  onClearPreset,
  onStopRecall,
  activePresetSlot,
  showKeyboard,
  onToggleKeyboard,
  onSolvePresets,
  // Transport props
  bpm,
  isPlaying,
  currentBeat,
  syncEnabled,
  onBpmChange,
  onTogglePlay,
  onSyncEnabledChange,
  midiInputs,
  selectedInputId,
  onSelectInput,
  bleConnected,
  bleDevice,
  bleSyncEnabled,
  humanize,
  onHumanizeChange,
  strumEnabled,
  strumSpread,
  strumDirection,
  onStrumEnabledChange,
  onStrumSpreadChange,
  onStrumDirectionChange,
  triggerMode,
  onTriggerModeChange,
  glideTime,
  onGlideTimeChange,
  sequencerEnabled,
  onOpenSequencer,
}: MobileControlsProps) {
  const [clearMode, setClearMode] = useState<boolean>(false);
  const [solveMode, setSolveMode] = useState<boolean>(false);
  const [selectedForSolve, setSelectedForSolve] = useState<string[]>([]);
  const [spreadPreference, setSpreadPreference] = useState<number>(0);

  // Track touch/pointer state for preset swipe-to-lock gesture
  const presetTouchRef = useRef<PresetTouchState>({
    activeSlot: null,
    startX: 0,
    startY: 0,
    isHeld: false,
  });
  const [heldPreset, setHeldPreset] = useState<string | null>(null); // Which preset is "held" via drag
  const presetsGridRef = useRef<HTMLDivElement>(null);

  // Sort root notes chromatically
  const sortedRoots = useMemo((): [string, NoteName][] => {
    const orderedNotes: NoteName[] = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const entries = Object.entries(LEFT_HAND_KEYS) as [string, NoteName][];
    return orderedNotes.map((note) => entries.find(([, n]) => n === note)!);
  }, []);

  // Handle root key tap - radio behavior (only one root at a time)
  const handleRootTap = useCallback(
    (key: string): void => {
      const rootKeys = Object.keys(LEFT_HAND_KEYS);
      setMobileKeys((prev) => {
        const next = new Set(prev);
        // If this root is already selected, deselect it
        if (prev.has(key)) {
          next.delete(key);
        } else {
          // Remove any other root keys (radio behavior) and add this one
          rootKeys.forEach((k) => next.delete(k));
          next.add(key);
        }
        return next;
      });
    },
    [setMobileKeys],
  );

  // Handle modifier key tap - toggle behavior
  const handleModifierTap = useCallback(
    (key: string): void => {
      setMobileKeys((prev) => {
        const next = new Set(prev);
        if (prev.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [setMobileKeys],
  );

  // Clear all keys
  const clearAll = useCallback((): void => {
    setMobileKeys(new Set());
  }, [setMobileKeys]);

  // Toggle a preset for solve selection
  const toggleSolveSelection = (slot: number | string): void => {
    const slotStr = slot.toString();
    setSelectedForSolve((prev) => {
      if (prev.includes(slotStr)) {
        return prev.filter((s) => s !== slotStr);
      } else {
        return [...prev, slotStr];
      }
    });
  };

  // Execute solve
  const handleSolve = (): void => {
    if (selectedForSolve.length >= 2 && onSolvePresets) {
      const success = onSolvePresets(selectedForSolve, spreadPreference);
      if (success) {
        setSelectedForSolve([]);
        setSolveMode(false);
        setSpreadPreference(0); // Reset for next solve
      }
    }
  };

  // Cancel solve mode
  const cancelSolveMode = (): void => {
    setSelectedForSolve([]);
    setSolveMode(false);
  };

  const handlePresetDown = useCallback(
    (slot: number, clientX: number, clientY: number): void => {
      const slotStr = slot.toString();

      if (clearMode) {
        onClearPreset(slotStr);
        setClearMode(false);
        return;
      }

      // In solve mode, toggle selection instead of playing
      if (solveMode) {
        if (savedPresets.has(slotStr)) {
          toggleSolveSelection(slot);
        }
        return;
      }

      // If this preset is already held (locked), tap to release
      if (heldPreset === slotStr) {
        setHeldPreset(null);
        onStopRecall();
        presetTouchRef.current = {
          activeSlot: null,
          startX: 0,
          startY: 0,
          isHeld: false,
        };
        return;
      }

      // If another preset is held, release it first (stop its playback)
      if (heldPreset !== null) {
        setHeldPreset(null);
        onStopRecall();
      }

      // Initialize touch tracking
      presetTouchRef.current = {
        activeSlot: slotStr,
        startX: clientX,
        startY: clientY,
        isHeld: false,
      };

      if (savedPresets.has(slotStr)) {
        // Clear mobile keys so preset plays alone
        clearAll();
        onRecallPreset(slotStr);
      } else {
        // Try to save (no hold behavior for saving)
        const success = onSavePreset(slotStr);
        if (success) {
          clearAll();
        }
        // Reset tracking since save doesn't need hold behavior
        presetTouchRef.current = {
          activeSlot: null,
          startX: 0,
          startY: 0,
          isHeld: false,
        };
      }
    },
    [
      clearMode,
      solveMode,
      savedPresets,
      heldPreset,
      onClearPreset,
      onRecallPreset,
      onSavePreset,
      onStopRecall,
      clearAll,
    ],
  );

  const handlePresetMove = useCallback(
    (clientX: number, clientY: number): void => {
      const touch = presetTouchRef.current;
      if (touch.activeSlot === null || touch.isHeld) return;

      const deltaX = Math.abs(clientX - touch.startX);
      const deltaY = Math.abs(clientY - touch.startY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If swiped past threshold, lock the preset
      if (distance > SWIPE_LOCK_THRESHOLD) {
        touch.isHeld = true;
        setHeldPreset(touch.activeSlot);
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    },
    [],
  );

  const handlePresetUp = useCallback((): void => {
    const touch = presetTouchRef.current;
    const slotStr = touch.activeSlot;

    if (!slotStr) return;

    // If not held/locked, stop the recall
    if (!touch.isHeld && heldPreset !== slotStr) {
      onStopRecall();
    }

    // Reset touch tracking
    presetTouchRef.current = {
      activeSlot: null,
      startX: 0,
      startY: 0,
      isHeld: false,
    };
  }, [heldPreset, onStopRecall]);

  return (
    <div className="mobile-controls">
      {/* Transport controls - scrolls with content */}
      <div className="mobile-controls-section transport-section">
        <TransportControls
          bpm={bpm}
          isPlaying={isPlaying}
          currentBeat={currentBeat}
          syncEnabled={syncEnabled}
          onBpmChange={onBpmChange}
          onTogglePlay={onTogglePlay}
          onSyncEnabledChange={onSyncEnabledChange}
          midiInputs={midiInputs}
          selectedInputId={selectedInputId}
          onSelectInput={onSelectInput}
          bleConnected={bleConnected}
          bleDevice={bleDevice}
          bleSyncEnabled={bleSyncEnabled}
          humanize={humanize}
          onHumanizeChange={onHumanizeChange}
          strumEnabled={strumEnabled}
          strumSpread={strumSpread}
          strumDirection={strumDirection}
          onStrumEnabledChange={onStrumEnabledChange}
          onStrumSpreadChange={onStrumSpreadChange}
          onStrumDirectionChange={onStrumDirectionChange}
          triggerMode={triggerMode}
          onTriggerModeChange={onTriggerModeChange}
          glideTime={glideTime}
          onGlideTimeChange={onGlideTimeChange}
          sequencerEnabled={sequencerEnabled}
          onOpenSequencer={onOpenSequencer}
        />
      </div>

      <div className="mobile-controls-section presets-section">
        <div className="mobile-controls-header">
          <span className="mobile-controls-label">Presets</span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {solveMode ? (
              <div className="mobile-solve-controls">
                <div className="mobile-spread-control">
                  <span className="mobile-spread-label">
                    {spreadPreference < -0.3
                      ? "Close"
                      : spreadPreference > 0.3
                        ? "Wide"
                        : "Bal"}
                  </span>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={spreadPreference}
                    onChange={(e) =>
                      setSpreadPreference(parseFloat(e.target.value))
                    }
                    className="mobile-spread-slider"
                  />
                </div>
                <button
                  className="control-btn"
                  style={{ flex: 0, backgroundColor: "#4a148c" }}
                  disabled={selectedForSolve.length < 2}
                  onClick={handleSolve}
                >
                  Solve ({selectedForSolve.length})
                </button>
                <button
                  className="control-btn"
                  style={{ flex: 0 }}
                  onClick={cancelSolveMode}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  className="control-btn solve-mode-btn"
                  style={{ flex: 0 }}
                  onClick={() => setSolveMode(true)}
                >
                  Solve...
                </button>
                <button
                  className={`control-btn ${clearMode ? "active" : ""}`}
                  style={{
                    flex: 0,
                    backgroundColor: clearMode ? "#d32f2f" : "",
                  }}
                  onClick={() => setClearMode(!clearMode)}
                >
                  {clearMode ? "Cancel" : "Clear..."}
                </button>
              </>
            )}
          </div>
        </div>
        <div
          ref={presetsGridRef}
          className="mobile-grid presets-grid"
          style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => {
            const slotStr = num.toString();
            const isSaved = savedPresets.has(slotStr);
            const isActive = activePresetSlot === slotStr;
            const isSelectedForSolve = selectedForSolve.includes(slotStr);
            const solveIndex = selectedForSolve.indexOf(slotStr);

            return (
              <button
                key={num}
                className={`mobile-btn ${isActive ? "active" : ""} ${isSaved ? "saved" : ""} ${heldPreset === slotStr ? "held" : ""} ${isSelectedForSolve ? "solve-selected" : ""}`}
                style={{
                  backgroundColor: isSelectedForSolve
                    ? "#1a237e"
                    : isActive
                      ? "#8b5cf6"
                      : isSaved
                        ? "#4a148c"
                        : "",
                  borderColor: isSelectedForSolve
                    ? "#7c4dff"
                    : isActive
                      ? "white"
                      : isSaved
                        ? "#7c3aed"
                        : "",
                }}
                onTouchStart={(e: TouchEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const touch = e.touches[0];
                  handlePresetDown(num, touch.clientX, touch.clientY);
                }}
                onTouchMove={(e: TouchEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  const touch = e.touches[0];
                  handlePresetMove(touch.clientX, touch.clientY);
                }}
                onTouchEnd={(e: TouchEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePresetUp();
                }}
                onTouchCancel={(e: TouchEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePresetUp();
                }}
                onMouseDown={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  handlePresetDown(num, e.clientX, e.clientY);
                }}
                onMouseMove={(e: MouseEvent<HTMLButtonElement>) => {
                  if (e.buttons === 1) {
                    handlePresetMove(e.clientX, e.clientY);
                  }
                }}
                onMouseUp={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  handlePresetUp();
                }}
                onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  handlePresetUp();
                }}
              >
                {isSelectedForSolve ? solveIndex + 1 : num}
                {heldPreset === slotStr && (
                  <span className="held-indicator">LOCK</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mobile-controls-section">
        <span className="mobile-controls-label">Voicing</span>
        <div className="control-buttons">
          <button
            className="control-btn voicing-style-btn"
            onClick={onVoicingStyleChange}
          >
            Style: {VOICING_STYLE_LABELS[currentSettings.voicingStyle]}
          </button>
        </div>
        <div className="control-buttons">
          <button className="control-btn" onClick={onInversionChange}>
            Inv: {currentSettings.inversionIndex}
          </button>
          <button className="control-btn" onClick={onSpreadChange}>
            Spread: {currentSettings.spreadAmount}
          </button>
        </div>
        <div className="control-buttons">
          <button className="control-btn" onClick={() => onOctaveChange(-1)}>
            - Oct
          </button>
          <button className="control-btn" disabled>
            Oct: {currentSettings.octave}
          </button>
          <button className="control-btn" onClick={() => onOctaveChange(1)}>
            + Oct
          </button>
        </div>
      </div>

      <div className="mobile-controls-header">
        <span className="mobile-controls-label">Roots</span>
        <button onClick={clearAll} className="control-btn" style={{ flex: 0 }}>
          Clear Notes
        </button>
      </div>

      <div className="mobile-grid root-grid">
        {sortedRoots.map(([key, note]) => (
          <button
            key={key}
            className={`mobile-btn ${mobileKeys.has(key) ? "active" : ""}`}
            onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
              e.preventDefault();
              handleRootTap(key);
            }}
          >
            {note}
          </button>
        ))}
      </div>

      <div className="mobile-controls-section">
        <span className="mobile-controls-label">Modifiers</span>
        <div className="mobile-grid modifier-grid">
          {Object.entries(RIGHT_HAND_MODIFIERS).map(([key, label]) => (
            <button
              key={key}
              className={`mobile-btn ${mobileKeys.has(key) ? "active" : ""}`}
              onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                e.preventDefault();
                handleModifierTap(key);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mobile-controls-section">
        <button
          className={`control-btn keyboard-toggle ${showKeyboard ? "active" : ""}`}
          onClick={onToggleKeyboard}
        >
          {showKeyboard ? "Hide Piano" : "Show Piano"}
        </button>
      </div>
    </div>
  );
}
