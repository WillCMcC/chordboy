/**
 * GridSequencerModal Component
 * Modal for editing custom playback mode grid patterns.
 * Allows users to create 16th note patterns for each note in a chord.
 *
 * @module components/GridSequencerModal
 */

import { useState, useCallback, useEffect } from "react";
import type { CustomPlaybackPattern } from "../types";
import {
  getCustomPattern,
  saveCustomPattern,
  createDefaultPattern,
} from "../lib/playbackModes";
import "./GridSequencerModal.css";

/** Props for GridSequencerModal */
interface GridSequencerModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
}

/**
 * Modal for editing custom playback mode grid patterns
 */
export function GridSequencerModal({
  isOpen,
  onClose,
}: GridSequencerModalProps) {
  const [pattern, setPattern] = useState<CustomPlaybackPattern>(
    getCustomPattern()
  );

  // Load pattern when modal opens
  useEffect(() => {
    if (isOpen) {
      setPattern(getCustomPattern());
    }
  }, [isOpen]);

  // Toggle a cell in the grid
  const toggleCell = useCallback((row: number, col: number) => {
    setPattern((prev) => {
      const newGrid = prev.grid.map((r) => [...r]);
      newGrid[row][col] = !newGrid[row][col];
      return { ...prev, grid: newGrid };
    });
  }, []);

  // Clear the entire grid
  const clearGrid = useCallback(() => {
    setPattern((prev) => ({
      ...prev,
      grid: prev.grid.map((row) => row.map(() => false)),
    }));
  }, []);

  // Reset to default pattern
  const resetToDefault = useCallback(() => {
    setPattern(createDefaultPattern());
  }, []);

  // Save and close
  const handleSave = useCallback(() => {
    saveCustomPattern(pattern);
    onClose();
  }, [pattern, onClose]);

  // Prevent keyboard events from bubbling to chord engine
  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="sequencer-overlay" onClick={onClose}>
      <div
        className="sequencer-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="sequencer-header">
          <h2>Custom Playback Pattern</h2>
          <button
            className="sequencer-close"
            onClick={onClose}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        <div className="sequencer-body">
          <div className="sequencer-info">
            <p>
              Click cells to create a pattern. Each row represents a note (low
              to high), each column is a 16th note.
            </p>
          </div>

          <div className="sequencer-grid-container">
            <div className="sequencer-grid">
              {/* Row labels */}
              <div className="sequencer-row-labels">
                {Array.from({ length: pattern.rows }, (_, i) => (
                  <div key={i} className="sequencer-row-label">
                    {pattern.rows - i}
                  </div>
                ))}
              </div>

              {/* Grid cells */}
              <div className="sequencer-grid-cells">
                {/* Column labels */}
                <div className="sequencer-col-labels">
                  {Array.from({ length: pattern.cols }, (_, i) => (
                    <div
                      key={i}
                      className={`sequencer-col-label ${
                        i % 4 === 0 ? "beat-marker" : ""
                      }`}
                    >
                      {i % 4 === 0 ? i / 4 + 1 : ""}
                    </div>
                  ))}
                </div>

                {/* Grid rows (reversed to show highest note at top) */}
                {Array.from({ length: pattern.rows }, (_, rowIndex) => {
                  const row = pattern.rows - 1 - rowIndex; // Reverse order
                  return (
                    <div key={row} className="sequencer-grid-row">
                      {Array.from({ length: pattern.cols }, (_, col) => (
                        <button
                          key={col}
                          className={`sequencer-cell ${
                            pattern.grid[row]?.[col] ? "active" : ""
                          } ${col % 4 === 0 ? "beat-marker" : ""}`}
                          onClick={() => toggleCell(row, col)}
                          title={`Row ${row + 1}, Step ${col + 1}`}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="sequencer-actions">
            <button
              className="sequencer-btn secondary"
              onClick={resetToDefault}
            >
              Reset to Default
            </button>
            <button className="sequencer-btn secondary" onClick={clearGrid}>
              Clear All
            </button>
            <button className="sequencer-btn primary" onClick={handleSave}>
              Save Pattern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
