/**
 * ChordHistoryModal Component
 * Modal displaying recently played chords for quick preset assignment.
 * Styled as a vintage jazz musician's chord notebook.
 *
 * @module components/ChordHistoryModal
 */

import { useState, useCallback, useMemo } from "react";
import type { Preset } from "../types";
import type { ChordHistoryEntry } from "../hooks/useChordHistory";
import { historyEntryToPreset } from "../hooks/useChordHistory";
import "./ChordHistoryModal.css";

/** Preset slot identifiers in display order */
const SLOT_ORDER: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** Props for ChordHistoryModal */
interface ChordHistoryModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Chord history entries (most recent first) */
  history: ChordHistoryEntry[];
  /** Saved presets map */
  savedPresets: Map<string, Preset>;
  /** Callback to save a preset to a slot */
  onSavePreset: (slot: string, preset: Preset) => boolean;
  /** Callback to clear history */
  onClearHistory: () => void;
}

/**
 * Format relative time from timestamp
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}

/**
 * Format voicing details for display
 */
function formatVoicingDetails(entry: ChordHistoryEntry): { octave: number; extras: string[] } {
  const extras: string[] = [];
  if (entry.inversionIndex > 0) extras.push(`inv ${entry.inversionIndex}`);
  if (entry.spreadAmount > 0) extras.push(`spread ${entry.spreadAmount}`);
  if (entry.voicingStyle !== "close") extras.push(entry.voicingStyle);
  return { octave: entry.octave, extras };
}

/**
 * Modal displaying chord history for preset assignment
 */
export function ChordHistoryModal({
  isOpen,
  onClose,
  history,
  savedPresets,
  onSavePreset,
  onClearHistory,
}: ChordHistoryModalProps) {
  // Track which entry is being assigned (shows slot selection)
  const [assigningEntry, setAssigningEntry] = useState<string | null>(null);

  // Success message state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get list of open (empty) slots
  const openSlots = useMemo(() => {
    return SLOT_ORDER.filter((slot) => !savedPresets.has(slot));
  }, [savedPresets]);

  // Handle starting assignment
  const handleStartAssign = useCallback((entryId: string) => {
    setAssigningEntry(entryId);
    setSuccessMessage(null);
  }, []);

  // Handle canceling assignment
  const handleCancelAssign = useCallback(() => {
    setAssigningEntry(null);
  }, []);

  // Handle assigning to a slot
  const handleAssignToSlot = useCallback(
    (entry: ChordHistoryEntry, slot: string) => {
      const preset = historyEntryToPreset(entry);
      const success = onSavePreset(slot, preset);
      if (success) {
        setAssigningEntry(null);
        setSuccessMessage(`${entry.name} → Slot ${slot}`);
        // Auto-clear message after a few seconds
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    },
    [onSavePreset]
  );

  // Handle clearing history with confirmation
  const handleClearHistory = useCallback(() => {
    onClearHistory();
    setAssigningEntry(null);
    setSuccessMessage(null);
  }, [onClearHistory]);

  if (!isOpen) return null;

  return (
    <div className="history-overlay" onClick={onClose} data-testid="history-overlay">
      <div
        className="history-modal"
        onClick={(e) => e.stopPropagation()}
        data-testid="chord-history-modal"
      >
        <div className="history-header">
          <div className="history-header-content">
            <div className="history-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div className="history-title-group">
              <h2>Chord History</h2>
              <span className="history-subtitle">Recent voicings</span>
            </div>
          </div>
          <button className="history-close" onClick={onClose} data-testid="history-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="history-content">
          {successMessage && (
            <div className="history-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {successMessage}
            </div>
          )}

          {history.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="24" cy="24" r="20" strokeDasharray="4 4" />
                  <path d="M24 14v10l7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="history-empty-title">No chords yet</p>
              <p className="history-empty-hint">
                Play some chords and they'll appear here
              </p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((entry, index) => {
                const voicing = formatVoicingDetails(entry);
                const isAssigning = assigningEntry === entry.id;

                return (
                  <div
                    key={entry.id}
                    className={`history-entry ${isAssigning ? "history-entry-assigning" : ""}`}
                    data-testid="history-entry"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="history-entry-card">
                      <div className="history-entry-main">
                        <span className="history-chord-name">{entry.name}</span>
                        <div className="history-meta">
                          <span className="history-octave">Oct {voicing.octave}</span>
                          <span className="history-time">{formatRelativeTime(entry.timestamp)}</span>
                        </div>
                      </div>

                      {voicing.extras.length > 0 && (
                        <div className="history-entry-details">
                          {voicing.extras.map((extra, i) => (
                            <span key={i} className="history-tag">{extra}</span>
                          ))}
                        </div>
                      )}

                      {isAssigning ? (
                        <div className="history-slot-selector">
                          <span className="slot-selector-label">Save to slot</span>
                          <div className="slot-buttons">
                            {openSlots.map((slot) => (
                              <button
                                key={slot}
                                className="slot-btn"
                                onClick={() => handleAssignToSlot(entry, slot)}
                                data-testid={`assign-slot-${slot}`}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                          <button className="slot-cancel-btn" onClick={handleCancelAssign}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="history-assign-btn"
                          onClick={() => handleStartAssign(entry.id)}
                          disabled={openSlots.length === 0}
                          title={
                            openSlots.length === 0
                              ? "No open preset slots available"
                              : "Assign to preset slot"
                          }
                          data-testid="assign-btn"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                          </svg>
                          {openSlots.length === 0 ? "No slots" : "Add to Preset"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="history-footer">
          <div className="history-stats">
            <div className="history-stat">
              <span className="history-stat-value">{history.length}</span>
              <span className="history-stat-label">chord{history.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="history-stat-divider" />
            <div className="history-stat">
              <span className="history-stat-value">{openSlots.length}</span>
              <span className="history-stat-label">slot{openSlots.length !== 1 ? "s" : ""} free</span>
            </div>
          </div>
          <button
            className="history-clear-btn"
            onClick={handleClearHistory}
            disabled={history.length === 0}
            data-testid="clear-history"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
