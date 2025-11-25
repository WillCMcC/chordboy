import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { LEFT_HAND_KEYS, RIGHT_HAND_MODIFIERS } from "../lib/keyboardMappings";
import "./MobileControls.css";

// Threshold in pixels for drag-down to "hold" a preset
const DRAG_DOWN_THRESHOLD = 40;

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
}) {
  const [clearMode, setClearMode] = useState(false);

  // Track touch/pointer state for drag-down-to-hold gesture
  const presetTouchRef = useRef({
    activeSlot: null,
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

  const handleRootClick = (key) => {
    setMobileKeys((prev) => {
      const next = new Set(prev);
      // Remove any existing root keys
      Object.keys(LEFT_HAND_KEYS).forEach((k) => next.delete(k));
      // Toggle behavior: if regular click, just set. If already active, maybe keep it?
      // Let's implement standard radio behavior: always set
      next.add(key);
      return next;
    });
  };

  const handleModifierClick = (key) => {
    setMobileKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const clearAll = () => {
    setMobileKeys(new Set());
  };

  const handlePresetDown = (slot, clientY) => {
    const slotStr = slot.toString();

    if (clearMode) {
      onClearPreset(slotStr);
      setClearMode(false);
      return;
    }

    // Initialize touch tracking
    presetTouchRef.current = {
      activeSlot: slotStr,
      startY: clientY,
      isHeld: false,
    };

    if (savedPresets.has(slotStr)) {
      onRecallPreset(slotStr);
    } else {
      // Try to save
      const success = onSavePreset(slotStr);
      if (success) {
        // Clear notes after saving a preset on mobile
        clearAll();
      }
    }
  };

  const handlePresetMove = useCallback((e) => {
    const touch = presetTouchRef.current;
    if (touch.activeSlot === null) return;

    // Get clientY from either pointer event or touch event
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? touch.startY;

    // Check if user has dragged down enough to "hold"
    const deltaY = clientY - touch.startY;

    // If dragging down significantly, prevent default to stop pull-to-refresh
    if (deltaY > 10) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (deltaY > DRAG_DOWN_THRESHOLD && !touch.isHeld) {
      touch.isHeld = true;
      setHeldPreset(touch.activeSlot);
      // Provide haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }, []);

  const handlePresetUp = (slot) => {
    const slotStr = slot.toString();
    const touch = presetTouchRef.current;

    // Only stop recall if this preset wasn't "held" via drag-down
    if (savedPresets.has(slotStr) && activePresetSlot === slotStr) {
      if (!touch.isHeld && heldPreset !== slotStr) {
        onStopRecall();
      }
    }

    // Reset touch tracking
    presetTouchRef.current = {
      activeSlot: null,
      startY: 0,
      isHeld: false,
    };
  };

  // Attach non-passive touch event listener to prevent pull-to-refresh
  useEffect(() => {
    const presetsGrid = presetsGridRef.current;
    if (!presetsGrid) return;

    const handleTouchMoveNonPassive = (e) => {
      const touch = presetTouchRef.current;
      if (touch.activeSlot === null) return;

      // Get touch position
      const clientY = e.touches?.[0]?.clientY ?? touch.startY;
      const deltaY = clientY - touch.startY;

      // If dragging down while touching a preset, prevent default (pull-to-refresh)
      if (deltaY > 5) {
        e.preventDefault();
      }
    };

    // Add non-passive event listener to allow preventDefault
    presetsGrid.addEventListener("touchmove", handleTouchMoveNonPassive, {
      passive: false,
    });

    return () => {
      presetsGrid.removeEventListener("touchmove", handleTouchMoveNonPassive);
    };
  }, []);

  // Release a held preset when tapping it again
  const handleHeldPresetTap = (slot) => {
    const slotStr = slot.toString();
    if (heldPreset === slotStr) {
      setHeldPreset(null);
      onStopRecall();
      return true;
    }
    return false;
  };

  return (
    <div className="mobile-controls">
      <div className="mobile-controls-section presets-section">
        <div className="mobile-controls-header">
          <span className="mobile-controls-label">Presets</span>
          <button
            className={`control-btn ${clearMode ? "active" : ""}`}
            style={{ flex: 0, backgroundColor: clearMode ? "#d32f2f" : "" }}
            onClick={() => setClearMode(!clearMode)}
          >
            {clearMode ? "Cancel Clear" : "Clear..."}
          </button>
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

            return (
              <button
                key={num}
                className={`mobile-btn ${isActive ? "active" : ""} ${isSaved ? "saved" : ""} ${heldPreset === slotStr ? "held" : ""}`}
                style={{
                  backgroundColor: isActive
                    ? "var(--accent-color)"
                    : isSaved
                      ? "#4a148c"
                      : "",
                  borderColor: isActive
                    ? "white"
                    : isSaved
                      ? "var(--accent-color)"
                      : "",
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  // If this preset is already held, tapping releases it
                  if (handleHeldPresetTap(num)) {
                    return;
                  }
                  // If another preset is held, release it first
                  if (heldPreset !== null && heldPreset !== slotStr) {
                    setHeldPreset(null);
                  }
                  handlePresetDown(num, e.clientY);
                }}
                onPointerMove={(e) => {
                  handlePresetMove(e);
                }}
                onTouchMove={(e) => {
                  handlePresetMove(e);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  handlePresetUp(num);
                }}
                onPointerLeave={(e) => {
                  e.preventDefault();
                  handlePresetUp(num);
                }}
              >
                {num}
                {heldPreset === slotStr && (
                  <span className="held-indicator">⬇</span>
                )}
              </button>
            );
          })}
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
              e.preventDefault(); // Prevent scrolling/selection
              handleRootClick(key);
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
                handleModifierClick(key);
              }}
            >
              {label}
            </button>
          ))}
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
