/**
 * GridSequencerModal Component
 * Modal for editing custom playback mode grid patterns.
 * Allows users to create 16th note patterns for each note in a chord.
 *
 * @module components/GridSequencerModal
 */

import { useState, useCallback, useEffect, useRef } from "react";
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

  // Drag state: null = not dragging, true = activating cells, false = deactivating cells
  const isDragging = useRef<boolean | null>(null);

  // Load pattern when modal opens
  useEffect(() => {
    if (isOpen) {
      setPattern(getCustomPattern());
    }
  }, [isOpen]);

  // Toggle a cell in the grid (used for initial click)
  const toggleCell = useCallback((row: number, col: number) => {
    setPattern((prev) => {
      const newGrid = prev.grid.map((r) => [...r]);
      newGrid[row][col] = !newGrid[row][col];
      return { ...prev, grid: newGrid };
    });
  }, []);

  // Set a cell to a specific state (used for dragging)
  const setCell = useCallback((row: number, col: number, active: boolean) => {
    setPattern((prev) => {
      if (prev.grid[row]?.[col] === active) return prev; // No change needed
      const newGrid = prev.grid.map((r) => [...r]);
      newGrid[row][col] = active;
      return { ...prev, grid: newGrid };
    });
  }, []);

  // Handle mouse down on a cell - start dragging
  const handleCellMouseDown = useCallback(
    (row: number, col: number) => {
      const currentState = pattern.grid[row]?.[col] ?? false;
      isDragging.current = !currentState; // If cell is off, we're activating; if on, deactivating
      toggleCell(row, col);
    },
    [pattern.grid, toggleCell]
  );

  // Handle mouse enter on a cell - continue dragging
  const handleCellMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isDragging.current !== null) {
        setCell(row, col, isDragging.current);
      }
    },
    [setCell]
  );

  // Handle mouse up - stop dragging
  const handleMouseUp = useCallback(() => {
    isDragging.current = null;
  }, []);

  // Global mouse up listener to stop dragging even when mouse leaves grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = null;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
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

        <div className="sequencer-body" onMouseUp={handleMouseUp}>
          <div className="sequencer-info">
            <p>
              Click or drag to create a pattern. Row 1 is the root note, each
              column is a 16th note.
            </p>
          </div>

          <div className="sequencer-grid-container">
            <div className="sequencer-grid">
              {/* Row labels */}
              <div className="sequencer-row-labels">
                {Array.from({ length: pattern.rows }, (_, row) => (
                  <div key={row} className="sequencer-row-label">
                    {row === 0 ? "R" : row + 1}
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

                {/* Grid rows (root at top) */}
                {Array.from({ length: pattern.rows }, (_, row) => (
                  <div key={row} className="sequencer-grid-row">
                    {Array.from({ length: pattern.cols }, (_, col) => (
                      <button
                        key={col}
                        className={`sequencer-cell ${
                          pattern.grid[row]?.[col] ? "active" : ""
                        } ${col % 4 === 0 ? "beat-marker" : ""} ${
                          row === 0 ? "root-row" : ""
                        }`}
                        onMouseDown={() => handleCellMouseDown(row, col)}
                        onMouseEnter={() => handleCellMouseEnter(row, col)}
                        title={`${row === 0 ? "Root" : `Note ${row + 1}`}, Step ${col + 1}`}
                      />
                    ))}
                  </div>
                ))}
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
