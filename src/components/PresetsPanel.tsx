/**
 * PresetsPanel Component
 * Desktop panel for viewing and managing chord presets.
 * Supports multi-select mode for voice leading solving.
 *
 * @module components/PresetsPanel
 */

import { useState, useCallback } from "react";
import type { MouseEvent } from "react";
import type { Preset } from "../types";
import "./PresetsPanel.css";

/** Preset slot identifiers in display order */
const SLOT_ORDER: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** Props for PresetsPanel component */
interface PresetsPanelProps {
  /** Map of slot IDs to preset data */
  savedPresets: Map<string, Preset>;
  /** Callback to clear a preset slot */
  onClearPreset: (slot: string) => void;
  /** Callback to solve voicings for selected presets, returns true on success */
  onSolvePresets: (slots: string[], spreadPreference?: number) => boolean;
}

/**
 * Panel displaying saved chord presets with selection and solving capabilities.
 */
export function PresetsPanel({
  savedPresets,
  onClearPreset,
  onSolvePresets,
}: PresetsPanelProps) {
  /** Currently selected preset slots */
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

  /** Whether multi-select mode is active */
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);

  /** Spread preference for solver: -1 (close) to 1 (wide) */
  const [spreadPreference, setSpreadPreference] = useState<number>(0);

  /**
   * Toggle a preset's selection state.
   */
  const togglePresetSelection = useCallback((slot: string): void => {
    setSelectedPresets((prev) => {
      if (prev.includes(slot)) {
        return prev.filter((s) => s !== slot);
      }
      return [...prev, slot];
    });
  }, []);

  /**
   * Execute voice leading solve on selected presets.
   */
  const handleSolveChords = useCallback((): void => {
    if (selectedPresets.length >= 2) {
      const success = onSolvePresets(selectedPresets, spreadPreference);
      if (success) {
        setSelectedPresets([]);
        setIsSelectMode(false);
      }
    }
  }, [selectedPresets, onSolvePresets, spreadPreference]);

  /**
   * Cancel selection mode and clear selections.
   */
  const cancelSelectMode = useCallback((): void => {
    setSelectedPresets([]);
    setIsSelectMode(false);
  }, []);

  /**
   * Format preset data for tooltip display.
   */
  const formatPresetTooltip = (preset: Preset): string => {
    const keys = Array.from(preset.keys).join(" + ");
    return `${keys} | Oct: ${preset.octave} | Inv: ${preset.inversionIndex ?? 0} | Spr: ${preset.spreadAmount ?? 0}`;
  };

  return (
    <div className="presets-panel">
      <div className="presets-header">
        <h3>Saved Presets</h3>
        <div className="presets-actions">
          {!isSelectMode ? (
            <button
              onClick={() => setIsSelectMode(true)}
              className="solve-mode-btn"
              disabled={savedPresets.size < 2}
              data-testid="select-to-solve"
            >
              Select to Solve
            </button>
          ) : (
            <>
              <span className="select-hint">
                Select{" "}
                {selectedPresets.length < 2
                  ? `${2 - selectedPresets.length} more`
                  : selectedPresets.length}{" "}
                chords
              </span>
              <div className="spread-slider-container">
                <label className="spread-label">
                  <span className="spread-label-text">
                    {spreadPreference < -0.3 ? "Close" : spreadPreference > 0.3 ? "Wide" : "Balanced"}
                  </span>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={spreadPreference}
                    onChange={(e) => setSpreadPreference(parseFloat(e.target.value))}
                    className="spread-slider"
                  />
                </label>
              </div>
              <button
                onClick={handleSolveChords}
                className="solve-btn"
                disabled={selectedPresets.length < 2}
                data-testid="solve-voicings"
              >
                Solve Voicings
              </button>
              <button onClick={cancelSelectMode} className="cancel-btn" data-testid="cancel-solve">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      <div className="preset-slots">
        {SLOT_ORDER.map((slot) => {
          const preset = savedPresets.get(slot);
          const hasPreset = !!preset;
          const isSelected = selectedPresets.includes(slot);

          return (
            <div
              key={slot}
              className={`preset-slot compact ${hasPreset ? "filled" : "empty"} ${isSelectMode && hasPreset ? "selectable" : ""} ${isSelected ? "selected" : ""}`}
              data-testid={`preset-${slot}`}
              onClick={
                isSelectMode && hasPreset
                  ? () => togglePresetSelection(slot)
                  : undefined
              }
              title={
                hasPreset
                  ? formatPresetTooltip(preset)
                  : `Slot ${slot} - Empty`
              }
            >
              {isSelectMode && isSelected && (
                <span className="selection-order-badge">
                  {selectedPresets.indexOf(slot) + 1}
                </span>
              )}
              <span className={`preset-number ${hasPreset ? "" : "empty"}`}>
                {slot}
              </span>
              {!isSelectMode && hasPreset && (
                <button
                  onClick={(e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    onClearPreset(slot);
                  }}
                  className="clear-btn-mini"
                  data-testid={`clear-preset-${slot}`}
                >
                  x
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
