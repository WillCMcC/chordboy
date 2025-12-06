import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { LEFT_HAND_KEYS, RIGHT_HAND_MODIFIERS } from "../lib/keyboardMappings";
import "./MobileControls.css";

/** Threshold in pixels for drag-down gesture to "hold" a preset */
const DRAG_DOWN_THRESHOLD = 40;

/** Threshold in pixels for swipe gesture to "lock" a key */
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
}) {
  const [clearMode, setClearMode] = useState(false);
  const [solveMode, setSolveMode] = useState(false);
  const [selectedForSolve, setSelectedForSolve] = useState([]);

  // Track which keys are "locked" (sustain after release via swipe gesture)
  const [lockedKeys, setLockedKeys] = useState(new Set());

  // Track touch/pointer state for preset swipe-to-lock gesture
  const presetTouchRef = useRef({
    activeSlot: null,
    startX: 0,
    startY: 0,
    isHeld: false,
  });
  const [heldPreset, setHeldPreset] = useState(null); // Which preset is "held" via drag
  const presetsGridRef = useRef(null);

  // Track touch state for root/modifier keys (for swipe-to-lock gesture)
  const keyTouchRef = useRef({
    activeKey: null,
    startX: 0,
    startY: 0,
    isLocked: false,
  });

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

  // Ref to track current locked keys for use in callbacks (avoids stale closure)
  const lockedKeysRef = useRef(lockedKeys);
  lockedKeysRef.current = lockedKeys;

  // Handle root key press down - adds key, starts tracking for swipe
  const handleRootDown = useCallback((key, clientX, clientY) => {
    // If already locked, tap to release instead
    if (lockedKeysRef.current.has(key)) {
      setLockedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setMobileKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      return;
    }

    // Remove any existing root keys (radio behavior)
    const rootKeys = Object.keys(LEFT_HAND_KEYS);
    setMobileKeys((prev) => {
      const next = new Set(prev);
      rootKeys.forEach((k) => next.delete(k));
      next.add(key);
      return next;
    });
    // Also remove any locked root keys
    setLockedKeys((prev) => {
      const next = new Set(prev);
      rootKeys.forEach((k) => next.delete(k));
      return next;
    });
    // Start tracking for swipe gesture
    keyTouchRef.current = {
      activeKey: key,
      startX: clientX,
      startY: clientY,
      isLocked: false,
    };
  }, [setMobileKeys]);

  // Handle modifier key press down - adds key, starts tracking for swipe
  const handleModifierDown = useCallback((key, clientX, clientY) => {
    // If already locked, tap to release instead
    if (lockedKeysRef.current.has(key)) {
      setLockedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setMobileKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      return;
    }

    setMobileKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    // Start tracking for swipe gesture
    keyTouchRef.current = {
      activeKey: key,
      startX: clientX,
      startY: clientY,
      isLocked: false,
    };
  }, [setMobileKeys]);

  // Handle pointer/touch move for swipe-to-lock detection
  const handleKeyMove = useCallback((clientX, clientY) => {
    const touch = keyTouchRef.current;
    if (!touch.activeKey || touch.isLocked) return;

    const deltaX = Math.abs(clientX - touch.startX);
    const deltaY = Math.abs(clientY - touch.startY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If swiped past threshold, lock the key
    if (distance > SWIPE_LOCK_THRESHOLD) {
      touch.isLocked = true;
      setLockedKeys((prev) => new Set([...prev, touch.activeKey]));
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }, []);

  // Handle key release - removes key unless locked
  const handleKeyUp = useCallback(() => {
    const touch = keyTouchRef.current;
    const key = touch.activeKey;

    if (!key) return;

    // Only remove if it wasn't locked (by swipe or previously)
    if (!touch.isLocked && !lockedKeysRef.current.has(key)) {
      setMobileKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }

    // Reset touch tracking
    keyTouchRef.current = {
      activeKey: null,
      startX: 0,
      startY: 0,
      isLocked: false,
    };
  }, [setMobileKeys]);

  // Clear all keys and locked state
  const clearAll = useCallback(() => {
    setMobileKeys(new Set());
    setLockedKeys(new Set());
    keyTouchRef.current = {
      activeKey: null,
      startX: 0,
      startY: 0,
      isLocked: false,
    };
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

    // If another preset is held, release it first
    if (heldPreset !== null) {
      setHeldPreset(null);
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
                  const touch = e.touches[0];
                  handlePresetDown(num, touch.clientX, touch.clientY);
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  handlePresetMove(touch.clientX, touch.clientY);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handlePresetUp();
                }}
                onTouchCancel={(e) => {
                  e.preventDefault();
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
            className={`mobile-btn ${mobileKeys.has(key) ? "active" : ""} ${lockedKeys.has(key) ? "locked" : ""}`}
            onTouchStart={(e) => {
              e.preventDefault();
              const touch = e.touches[0];
              handleRootDown(key, touch.clientX, touch.clientY);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              handleKeyMove(touch.clientX, touch.clientY);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleKeyUp();
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              handleKeyUp();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              handleRootDown(key, e.clientX, e.clientY);
            }}
            onMouseMove={(e) => {
              if (e.buttons === 1) {
                handleKeyMove(e.clientX, e.clientY);
              }
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              handleKeyUp();
            }}
            onMouseLeave={(e) => {
              e.preventDefault();
              handleKeyUp();
            }}
          >
            {note}
            {lockedKeys.has(key) && <span className="lock-indicator">🔒</span>}
          </button>
        ))}
      </div>

      <div className="mobile-controls-section">
        <span className="mobile-controls-label">Modifiers</span>
        <div className="mobile-grid modifier-grid">
          {Object.entries(RIGHT_HAND_MODIFIERS).map(([key, label]) => (
            <button
              key={key}
              className={`mobile-btn ${mobileKeys.has(key) ? "active" : ""} ${lockedKeys.has(key) ? "locked" : ""}`}
              onTouchStart={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                handleModifierDown(key, touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                handleKeyMove(touch.clientX, touch.clientY);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleKeyUp();
              }}
              onTouchCancel={(e) => {
                e.preventDefault();
                handleKeyUp();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleModifierDown(key, e.clientX, e.clientY);
              }}
              onMouseMove={(e) => {
                if (e.buttons === 1) {
                  handleKeyMove(e.clientX, e.clientY);
                }
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                handleKeyUp();
              }}
              onMouseLeave={(e) => {
                e.preventDefault();
                handleKeyUp();
              }}
            >
              {label}
              {lockedKeys.has(key) && <span className="lock-indicator">🔒</span>}
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
