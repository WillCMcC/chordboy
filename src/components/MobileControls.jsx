import { useMemo, useState, useRef, useCallback } from "react";
import { LEFT_HAND_KEYS, RIGHT_HAND_MODIFIERS } from "../lib/keyboardMappings";
import { TransportControls } from "./TransportControls";
import "./MobileControls.css";

/** Threshold in pixels for swipe gesture to "lock" a preset */
const SWIPE_LOCK_THRESHOLD = 30;

/**
 * MobileControls Component
 * Touch-friendly interface for mobile chord input.
 * Provides buttons for root notes, modifiers, voicing controls, and preset management.
 *
 * @param {Object} props
 * @param {Set<string>} props.mobileKeys - Currently selected keys
 * @param {Function} props.setMobileKeys - Setter for mobile keys
 * @param {Function} props.onInversionChange - Callback to cycle inversions
 * @param {Function} props.onDropChange - Callback to cycle drop voicings
 * @param {Function} props.onSpreadChange - Callback to cycle spread amount
 * @param {Function} props.onOctaveChange - Callback to shift octave (+1 or -1)
 * @param {Object} props.currentSettings - Current voicing settings
 * @param {Map} props.savedPresets - Map of saved presets by slot number
 * @param {Function} props.onSavePreset - Callback to save current chord to slot
 * @param {Function} props.onRecallPreset - Callback to recall preset from slot
 * @param {Function} props.onClearPreset - Callback to clear a preset slot
 * @param {Function} props.onStopRecall - Callback when preset recall ends
 * @param {string|null} props.activePresetSlot - Currently active preset slot
 * @param {boolean} props.showKeyboard - Whether piano keyboard is visible
 * @param {Function} props.onToggleKeyboard - Callback to toggle keyboard visibility
 * @param {Function} props.onSolvePresets - Callback to solve voice leading for selected presets
 */
export function MobileControls({
  mobileKeys,
  setMobileKeys,
  onInversionChange,
  onDropChange,
  onSpreadChange,
  onOctaveChange,
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
  sequencerEnabled,
  onOpenSequencer,
}) {
  const [clearMode, setClearMode] = useState(false);
  const [solveMode, setSolveMode] = useState(false);
  const [selectedForSolve, setSelectedForSolve] = useState([]);

  // Track touch/pointer state for preset swipe-to-lock gesture
  const presetTouchRef = useRef({
    activeSlot: null,
    startX: 0,
    startY: 0,
    isHeld: false,
  });
  const [heldPreset, setHeldPreset] = useState(null); // Which preset is "held" via drag
  const presetsGridRef = useRef(null);

  // Sort root notes chromatically
  const sortedRoots = useMemo(() => {
    const orderedNotes = [
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
    const entries = Object.entries(LEFT_HAND_KEYS);
    return orderedNotes.map((note) => entries.find(([, n]) => n === note));
  }, []);

  // Handle root key tap - radio behavior (only one root at a time)
  const handleRootTap = useCallback((key) => {
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
  }, [setMobileKeys]);

  // Handle modifier key tap - toggle behavior
  const handleModifierTap = useCallback((key) => {
    setMobileKeys((prev) => {
      const next = new Set(prev);
      if (prev.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, [setMobileKeys]);

  // Clear all keys
  const clearAll = useCallback(() => {
    setMobileKeys(new Set());
  }, [setMobileKeys]);

  // Toggle a preset for solve selection
  const toggleSolveSelection = (slot) => {
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
  const handleSolve = () => {
    if (selectedForSolve.length >= 2 && onSolvePresets) {
      const success = onSolvePresets(selectedForSolve);
      if (success) {
        setSelectedForSolve([]);
        setSolveMode(false);
      }
    }
  };

  // Cancel solve mode
  const cancelSolveMode = () => {
    setSelectedForSolve([]);
    setSolveMode(false);
  };

  const handlePresetDown = useCallback((slot, clientX, clientY) => {
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
  }, [clearMode, solveMode, savedPresets, heldPreset, onClearPreset, onRecallPreset, onSavePreset, onStopRecall, clearAll]);

  const handlePresetMove = useCallback((clientX, clientY) => {
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
  }, []);

  const handlePresetUp = useCallback(() => {
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
          sequencerEnabled={sequencerEnabled}
          onOpenSequencer={onOpenSequencer}
        />
      </div>

      <div className="mobile-controls-section presets-section">
        <div className="mobile-controls-header">
          <span className="mobile-controls-label">Presets</span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {solveMode ? (
              <>
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
              </>
            ) : (
              <>
                <button
                  className="control-btn"
                  style={{ flex: 0, backgroundColor: "#1a237e" }}
                  onClick={() => setSolveMode(true)}
                >
                  Solve...
                </button>
                <button
                  className={`control-btn ${clearMode ? "active" : ""}`}
                  style={{ flex: 0, backgroundColor: clearMode ? "#d32f2f" : "" }}
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
                      ? "var(--accent-color)"
                      : isSaved
                        ? "#4a148c"
                        : "",
                  borderColor: isSelectedForSolve
                    ? "#7c4dff"
                    : isActive
                      ? "white"
                      : isSaved
                        ? "var(--accent-color)"
                        : "",
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const touch = e.touches[0];
                  handlePresetDown(num, touch.clientX, touch.clientY);
                }}
                onTouchMove={(e) => {
                  e.stopPropagation();
                  const touch = e.touches[0];
                  handlePresetMove(touch.clientX, touch.clientY);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePresetUp();
                }}
                onTouchCancel={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePresetUp();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePresetDown(num, e.clientX, e.clientY);
                }}
                onMouseMove={(e) => {
                  if (e.buttons === 1) {
                    handlePresetMove(e.clientX, e.clientY);
                  }
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  handlePresetUp();
                }}
                onMouseLeave={(e) => {
                  e.preventDefault();
                  handlePresetUp();
                }}
              >
                {isSelectedForSolve ? solveIndex + 1 : num}
                {heldPreset === slotStr && (
                  <span className="held-indicator">🔒</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mobile-controls-section">
        <span className="mobile-controls-label">Voicing</span>
        <div className="control-buttons">
          <button className="control-btn" onClick={onInversionChange}>
            Inv: {currentSettings.inversionIndex}
          </button>
          <button className="control-btn" onClick={onDropChange}>
            Drop: {currentSettings.droppedNotes}
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
            onPointerDown={(e) => {
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
              onPointerDown={(e) => {
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
          {showKeyboard ? "🎹 Hide Piano" : "🎹 Show Piano"}
        </button>
      </div>
    </div>
  );
}
