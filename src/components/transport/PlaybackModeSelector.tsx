/**
 * Playback Mode Selector Component
 * Dropdown for selecting chord playback modes.
 *
 * @module components/transport/PlaybackModeSelector
 */

import type { ChangeEvent } from "react";
import { useCallback } from "react";
import type { PlaybackMode } from "../../types";
import { PLAYBACK_MODES } from "../../types";

/** Props for PlaybackModeSelector component */
export interface PlaybackModeSelectorProps {
  /** Current playback mode */
  mode: PlaybackMode;
  /** Callback when mode changes */
  onModeChange: (mode: PlaybackMode) => void;
}

/**
 * PlaybackModeSelector - Dropdown for selecting playback modes.
 *
 * @example
 * <PlaybackModeSelector
 *   mode={playbackMode}
 *   onModeChange={setPlaybackMode}
 * />
 */
export function PlaybackModeSelector({
  mode,
  onModeChange,
}: PlaybackModeSelectorProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      onModeChange(e.target.value as PlaybackMode);
      // Blur immediately to return focus for keyboard input
      e.target.blur();
    },
    [onModeChange]
  );

  // Prevent keyboard events from bubbling to chord engine
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSelectElement>): void => {
      const allowedKeys = ["ArrowUp", "ArrowDown", "Enter", "Escape", "Tab", " "];
      if (!allowedKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    []
  );

  return (
    <select
      className="playback-mode-select"
      data-testid="playback-mode"
      value={mode}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      title="Select playback mode"
    >
      {PLAYBACK_MODES.map((config) => (
        <option key={config.id} value={config.id}>
          {config.name}
        </option>
      ))}
    </select>
  );
}
