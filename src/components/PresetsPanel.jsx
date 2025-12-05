/**
 * PresetsPanel Component
 * Desktop panel for viewing and managing chord presets.
 * Supports multi-select mode for voice leading solving.
 *
 * @module components/PresetsPanel
 */

import { useState, useCallback } from "react";
import "./PresetsPanel.css";

/** @type {string[]} Preset slot identifiers in display order */
const SLOT_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/**
 * Panel displaying saved chord presets with selection and solving capabilities.
 *
 * @param {Object} props - Component props
 * @param {Map} props.savedPresets - Map of slot IDs to preset data
 * @param {Function} props.onClearPreset - Callback to clear a preset slot
 * @param {Function} props.onSolvePresets - Callback to solve voicings for selected presets
 * @returns {JSX.Element} The presets panel
 *
 * @example
 * <PresetsPanel
 *   savedPresets={savedPresets}
 *   onClearPreset={clearPreset}
 *   onSolvePresets={solvePresets}
 * />
 */
export function PresetsPanel({ savedPresets, onClearPreset, onSolvePresets }) {
  /** @type {[string[], Function]} Currently selected preset slots */
  const [selectedPresets, setSelectedPresets] = useState([]);

  /** @type {[boolean, Function]} Whether multi-select mode is active */
  const [isSelectMode, setIsSelectMode] = useState(false);

  /**
   * Toggle a preset's selection state.
   * @param {string} slot - Slot identifier
   */
  const togglePresetSelection = useCallback((slot) => {
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
  const handleSolveChords = useCallback(() => {
    if (selectedPresets.length >= 2) {
      const success = onSolvePresets(selectedPresets);
      if (success) {
        setSelectedPresets([]);
        setIsSelectMode(false);
      }
    }
  }, [selectedPresets, onSolvePresets]);

  /**
   * Cancel selection mode and clear selections.
   */
  const cancelSelectMode = useCallback(() => {
    setSelectedPresets([]);
    setIsSelectMode(false);
  }, []);

  /**
   * Format preset data for tooltip display.
   * @param {Object} preset - Preset data
   * @returns {string} Formatted tooltip text
   */
  const formatPresetTooltip = (preset) => {
    const keys = Array.from(preset.keys).join(" + ");
    return `${keys} | Oct: ${preset.octave} | Inv: ${preset.inversionIndex} | Spr: ${preset.spreadAmount} | Drp: ${preset.droppedNotes}`;
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
              <button
                onClick={handleSolveChords}
                className="solve-btn"
                disabled={selectedPresets.length < 2}
              >
                Solve Voicings
              </button>
              <button onClick={cancelSelectMode} className="cancel-btn">
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearPreset(slot);
                  }}
                  className="clear-btn-mini"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
