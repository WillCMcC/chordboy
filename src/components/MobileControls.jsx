import { useMemo, useState } from "react";
import { LEFT_HAND_KEYS, RIGHT_HAND_MODIFIERS } from "../lib/keyboardMappings";
import "./MobileControls.css";

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
}) {
  const [clearMode, setClearMode] = useState(false);

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

  const handlePresetDown = (slot) => {
    const slotStr = slot.toString();

    if (clearMode) {
      onClearPreset(slotStr);
      setClearMode(false);
      return;
    }

    if (savedPresets.has(slotStr)) {
      onRecallPreset(slotStr);
    } else {
      // Try to save
      const success = onSavePreset(slotStr);
      if (!success) {
        // Maybe feedback?
      }
    }
  };

  const handlePresetUp = (slot) => {
    const slotStr = slot.toString();
    if (savedPresets.has(slotStr) && activePresetSlot === slotStr) {
      onStopRecall();
    }
  };

  return (
    <div className="mobile-controls">
      <div className="mobile-controls-section">
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
          className="mobile-grid"
          style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => {
            const slotStr = num.toString();
            const isSaved = savedPresets.has(slotStr);
            const isActive = activePresetSlot === slotStr;

            return (
              <button
                key={num}
                className={`mobile-btn ${isActive ? "active" : ""} ${isSaved ? "saved" : ""}`}
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
                  handlePresetDown(num);
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
    </div>
  );
}
