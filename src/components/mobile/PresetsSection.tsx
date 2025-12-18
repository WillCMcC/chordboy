import { useState, useRef, useCallback } from "react";
import type {
  Dispatch,
  SetStateAction,
  TouchEvent,
  MouseEvent,
} from "react";
import type { Preset } from "../../types";

/** Threshold in pixels for swipe gesture to "lock" a preset */
const SWIPE_LOCK_THRESHOLD = 30;

/** Touch tracking state for preset swipe-to-lock gesture */
interface PresetTouchState {
  activeSlot: string | null;
  startX: number;
  startY: number;
  isHeld: boolean;
}

interface PresetsSectionProps {
  savedPresets: Map<string, Preset>;
  onSavePreset: (slot: string) => boolean;
  onRecallPreset: (slot: string) => void;
  onClearPreset: (slot: string) => void;
  onStopRecall: () => void;
  activePresetSlot: string | null;
  onSolvePresets: (slots: string[], spreadPreference?: number) => boolean;
  setMobileKeys: Dispatch<SetStateAction<Set<string>>>;
}

export function PresetsSection({
  savedPresets,
  onSavePreset,
  onRecallPreset,
  onClearPreset,
  onStopRecall,
  activePresetSlot,
  onSolvePresets,
  setMobileKeys,
}: PresetsSectionProps) {
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
  const [heldPreset, setHeldPreset] = useState<string | null>(null);
  const presetsGridRef = useRef<HTMLDivElement>(null);

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
        setSpreadPreference(0);
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
  );
}
