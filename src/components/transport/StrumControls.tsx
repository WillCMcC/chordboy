import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { StrumDirection } from "../../types";

/** Props for StrumControls component */
export interface StrumControlsProps {
  /** Whether strum is enabled */
  strumEnabled: boolean;
  /** Strum spread in ms */
  strumSpread: number;
  /** Strum direction */
  strumDirection: StrumDirection;
  /** Callback to enable/disable strum */
  onStrumEnabledChange: (enabled: boolean) => void;
  /** Callback to change strum spread */
  onStrumSpreadChange: (spread: number) => void;
  /** Callback to change strum direction */
  onStrumDirectionChange: (direction: StrumDirection) => void;
}

/**
 * StrumControls - Strum settings (spread, direction)
 */
export function StrumControls({
  strumEnabled,
  strumSpread,
  strumDirection,
  onStrumEnabledChange,
  onStrumSpreadChange,
  onStrumDirectionChange,
}: StrumControlsProps) {
  // Handle strum toggle
  const handleStrumToggle = useCallback((): void => {
    onStrumEnabledChange(!strumEnabled);
  }, [strumEnabled, onStrumEnabledChange]);

  // Handle strum spread slider
  const handleStrumSpreadChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      onStrumSpreadChange(parseInt(e.target.value, 10));
    },
    [onStrumSpreadChange]
  );

  // Handle strum direction change
  const handleStrumDirectionChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      onStrumDirectionChange(e.target.value as StrumDirection);
    },
    [onStrumDirectionChange]
  );

  // Prevent letter keys from changing dropdown selections
  const handleDropdownKeyDown = useCallback((e: KeyboardEvent<HTMLSelectElement>) => {
    const allowedKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab', ' '];
    if (allowedKeys.includes(e.key)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div className="strum-controls">
      <button
        className={`strum-toggle ${strumEnabled ? "active" : ""}`}
        onClick={handleStrumToggle}
        aria-label={strumEnabled ? "Disable strum" : "Enable strum"}
      >
        {strumEnabled ? "ON" : "OFF"}
      </button>
      <input
        type="range"
        min="0"
        max="200"
        value={strumSpread}
        onChange={handleStrumSpreadChange}
        className={`strum-slider ${!strumEnabled ? "disabled" : ""}`}
        disabled={!strumEnabled}
      />
      <span className={`strum-value ${!strumEnabled ? "disabled" : ""}`}>{strumSpread}ms</span>
      <select
        className={`strum-direction-select ${!strumEnabled ? "disabled" : ""}`}
        value={strumDirection}
        onChange={handleStrumDirectionChange}
        onKeyDown={handleDropdownKeyDown}
        disabled={!strumEnabled}
      >
        <option value="up">Up</option>
        <option value="down">Down</option>
        <option value="alternate">Alt</option>
      </select>
    </div>
  );
}
