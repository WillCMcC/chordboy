import { useCallback } from "react";
import type { ChangeEvent } from "react";
import type { TriggerMode } from "../../hooks/useMIDI";

/** Props for TriggerModeSelector component */
export interface TriggerModeSelectorProps {
  /** Trigger mode - "new" (only new notes), "all" (retrigger full chord), or "glide" (pitch bend) */
  triggerMode: TriggerMode;
  /** Callback to change trigger mode */
  onTriggerModeChange: (mode: TriggerMode) => void;
  /** Glide time in ms (when triggerMode is "glide") */
  glideTime: number;
  /** Callback to change glide time */
  onGlideTimeChange: (time: number) => void;
}

/**
 * TriggerModeSelector - Trigger mode selection (new/all/glide)
 */
export function TriggerModeSelector({
  triggerMode,
  onTriggerModeChange,
  glideTime,
  onGlideTimeChange,
}: TriggerModeSelectorProps) {
  // Handle trigger mode - cycle through new -> all -> glide
  const cycleTriggerMode = useCallback((): void => {
    const modes: TriggerMode[] = ["new", "all", "glide"];
    const currentIndex = modes.indexOf(triggerMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    onTriggerModeChange(modes[nextIndex]);
  }, [triggerMode, onTriggerModeChange]);

  // Handle glide time slider
  const handleGlideTimeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      onGlideTimeChange(parseInt(e.target.value, 10));
    },
    [onGlideTimeChange]
  );

  // Trigger mode display helper
  const getTriggerLabel = (mode: TriggerMode): string => {
    switch (mode) {
      case "new": return "New";
      case "all": return "All";
      case "glide": return "Glide";
      default: return mode;
    }
  };

  return (
    <div className="articulation-controls">
      <button
        className={`trigger-mode-btn trigger-${triggerMode}`}
        onClick={cycleTriggerMode}
        title={
          triggerMode === "new" ? "Only new notes trigger" :
          triggerMode === "all" ? "All notes retrigger" :
          "Pitch bend glide between chords"
        }
      >
        {getTriggerLabel(triggerMode)}
      </button>
      {triggerMode === "glide" && (
        <>
          <input
            type="range"
            min="20"
            max="500"
            value={glideTime}
            onChange={handleGlideTimeChange}
            className="glide-slider"
          />
          <span className="glide-value">{glideTime}ms</span>
        </>
      )}
    </div>
  );
}
