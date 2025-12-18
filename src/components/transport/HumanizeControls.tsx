import { useCallback } from "react";
import type { ChangeEvent } from "react";

/** Props for HumanizeControls component */
export interface HumanizeControlsProps {
  /** Humanize amount (0-100) */
  humanize: number;
  /** Callback to change humanize amount */
  onHumanizeChange: (amount: number) => void;
}

/**
 * HumanizeControls - Humanize settings (timing variation)
 */
export function HumanizeControls({ humanize, onHumanizeChange }: HumanizeControlsProps) {
  // Handle humanize slider
  const handleHumanizeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      onHumanizeChange(parseInt(e.target.value, 10));
    },
    [onHumanizeChange]
  );

  return (
    <div className="humanize-dial">
      <input
        type="range"
        min="0"
        max="100"
        value={humanize}
        onChange={handleHumanizeChange}
        className="humanize-slider"
      />
      <span className="humanize-value">{humanize}%</span>
    </div>
  );
}
