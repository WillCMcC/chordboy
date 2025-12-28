/**
 * ChordWizardModal Component
 * Modal for building chord progressions with jazz theory assistance.
 * User selects a starting chord and progression type, then confirms to generate.
 *
 * @module components/ChordWizardModal
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import type { Preset, Octave } from "../types";
import { parseKeys } from "../lib/parseKeys";
import { getChordName } from "../lib/chordNamer";
import { buildChord } from "../lib/chordBuilder";
import {
  buildProgression,
  PROGRESSION_TYPES,
  type ProgressionType,
} from "../lib/progressionGenerator";
import "./ChordWizardModal.css";

/** Preset slot identifiers in display order */
const SLOT_ORDER: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/** Props for ChordWizardModal */
interface ChordWizardModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Saved presets map */
  savedPresets: Map<string, Preset>;
  /** Currently playing chord keys (for "play in" mode) */
  currentChordKeys: Set<string> | null;
  /** Current octave setting */
  currentOctave: Octave;
  /** Callback to save generated presets */
  onSavePresets: (presets: Array<{ keys: Set<string>; octave: Octave }>) => void;
  /** Function to find next available slot */
  findNextAvailableSlot: () => string | null;
}

/**
 * Get display name for a chord from its keys
 */
function getChordDisplayName(keys: Set<string>, octave: Octave = 4): string {
  const parsed = parseKeys(keys);
  if (!parsed.root) return "—";
  const chord = buildChord(parsed.root, parsed.modifiers, { octave });
  if (!chord || !chord.root) return parsed.root;
  return getChordName(chord.root, chord.modifiers);
}

/**
 * Modal wizard for building chord progressions
 */
export function ChordWizardModal({
  isOpen,
  onClose,
  savedPresets,
  currentChordKeys,
  currentOctave,
  onSavePresets,
  findNextAvailableSlot,
}: ChordWizardModalProps) {
  // Source selection: "preset" or "play-in"
  const [sourceType, setSourceType] = useState<"preset" | "play-in">("preset");

  // Selected preset slot (when source is "preset")
  const [selectedPresetSlot, setSelectedPresetSlot] = useState<string | null>(null);

  // Captured "play-in" chord
  const [capturedChord, setCapturedChord] = useState<{
    keys: Set<string>;
    octave: Octave;
  } | null>(null);

  // Selected progression type
  const [progressionType, setProgressionType] = useState<ProgressionType>("ii-V-I");

  // Error and success messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSourceType("preset");
      setSelectedPresetSlot(null);
      setCapturedChord(null);
      setProgressionType("ii-V-I");
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // Get the starting chord based on selection
  const startingChord = useMemo(() => {
    if (sourceType === "preset" && selectedPresetSlot) {
      const preset = savedPresets.get(selectedPresetSlot);
      if (preset) {
        return { keys: preset.keys, octave: preset.octave };
      }
    } else if (sourceType === "play-in" && capturedChord) {
      return capturedChord;
    }
    return null;
  }, [sourceType, selectedPresetSlot, savedPresets, capturedChord]);

  // Generate preview of the progression
  const progressionPreview = useMemo(() => {
    if (!startingChord) return null;
    return buildProgression(startingChord.keys, progressionType, startingChord.octave);
  }, [startingChord, progressionType]);

  // Count available slots
  const availableSlots = useMemo(() => {
    let count = 0;
    for (const slot of SLOT_ORDER) {
      if (!savedPresets.has(slot)) count++;
    }
    return count;
  }, [savedPresets]);

  // Capture current chord for "play-in" mode
  const handleCaptureChord = useCallback(() => {
    if (currentChordKeys && currentChordKeys.size > 0) {
      setCapturedChord({
        keys: new Set(currentChordKeys),
        octave: currentOctave,
      });
    }
  }, [currentChordKeys, currentOctave]);

  // Handle confirmation
  const handleConfirm = useCallback(() => {
    if (!startingChord || !progressionPreview || progressionPreview.length === 0) return;

    // Clear any previous messages
    setErrorMessage(null);
    setSuccessMessage(null);

    // If starting from a preset, don't duplicate it - just save the progression
    // If played in, save the captured chord first, then the progression
    const includeStartingChord = sourceType === "play-in";
    const totalNeeded = includeStartingChord
      ? 1 + progressionPreview.length
      : progressionPreview.length;

    // Check we have enough slots
    if (totalNeeded > availableSlots) {
      setErrorMessage(
        `Not enough preset slots! Need ${totalNeeded} slots but only ${availableSlots} available.`
      );
      return;
    }

    // Build the chord list
    const allChords = includeStartingChord
      ? [
          { keys: startingChord.keys, octave: startingChord.octave },
          ...progressionPreview.map((p) => ({ keys: p.keys, octave: p.octave })),
        ]
      : progressionPreview.map((p) => ({ keys: p.keys, octave: p.octave }));

    onSavePresets(allChords);

    // Show success message briefly before closing
    setSuccessMessage(`Generated ${totalNeeded} chord${totalNeeded > 1 ? 's' : ''} to presets!`);
    setTimeout(() => {
      onClose();
    }, 800);
  }, [startingChord, sourceType, progressionPreview, availableSlots, onSavePresets, onClose]);

  if (!isOpen) return null;

  const hasValidStart = startingChord !== null;
  const includeStartingChord = sourceType === "play-in";
  const totalChordsNeeded = progressionPreview
    ? (includeStartingChord ? 1 : 0) + progressionPreview.length
    : 0;
  const canGenerate =
    hasValidStart &&
    progressionPreview &&
    progressionPreview.length > 0 &&
    totalChordsNeeded <= availableSlots;

  return (
    <div className="wizard-overlay" onClick={onClose} data-testid="wizard-overlay">
      <div className="wizard-modal" onClick={(e) => e.stopPropagation()} data-testid="chord-wizard-modal">
        <div className="wizard-header">
          <h2>Chord Wizard</h2>
          <button className="wizard-close" onClick={onClose} data-testid="wizard-close">
            x
          </button>
        </div>

        <div className="wizard-content">
          {/* Step 1: Choose starting chord */}
          <div className="wizard-section">
            <h3>1. Starting Chord</h3>

            <div className="source-tabs">
              <button
                className={`source-tab ${sourceType === "preset" ? "active" : ""}`}
                onClick={() => setSourceType("preset")}
              >
                From Preset
              </button>
              <button
                className={`source-tab ${sourceType === "play-in" ? "active" : ""}`}
                onClick={() => setSourceType("play-in")}
              >
                Play In
              </button>
            </div>

            {sourceType === "preset" && (
              <div className="preset-selector">
                {SLOT_ORDER.filter((slot) => savedPresets.has(slot)).length === 0 ? (
                  <p className="empty-message">No presets saved. Save a chord first or use "Play In".</p>
                ) : (
                  <div className="preset-buttons">
                    {SLOT_ORDER.filter((slot) => savedPresets.has(slot)).map((slot) => {
                      const preset = savedPresets.get(slot)!;
                      const name = getChordDisplayName(preset.keys, preset.octave);
                      return (
                        <button
                          key={slot}
                          className={`preset-btn ${selectedPresetSlot === slot ? "selected" : ""}`}
                          onClick={() => setSelectedPresetSlot(slot)}
                        >
                          <span className="preset-slot-num">{slot}</span>
                          <span className="preset-chord-name">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {sourceType === "play-in" && (
              <div className="play-in-section">
                <p className="play-in-hint">
                  Play a chord on your keyboard, then click "Capture" to use it as the starting point.
                </p>
                <div className="play-in-controls">
                  <div className="current-chord-display">
                    {currentChordKeys && currentChordKeys.size > 0 ? (
                      <span className="current-chord-name">
                        {getChordDisplayName(currentChordKeys, currentOctave)}
                      </span>
                    ) : (
                      <span className="no-chord">No chord playing</span>
                    )}
                  </div>
                  <button
                    className="capture-btn"
                    onClick={handleCaptureChord}
                    disabled={!currentChordKeys || currentChordKeys.size === 0}
                  >
                    Capture
                  </button>
                </div>
                {capturedChord && (
                  <div className="captured-chord">
                    Captured: <strong>{getChordDisplayName(capturedChord.keys, capturedChord.octave)}</strong>
                  </div>
                )}
              </div>
            )}

            {hasValidStart && (
              <div className="starting-chord-summary">
                Starting from: <strong>{getChordDisplayName(startingChord!.keys, startingChord!.octave)}</strong>
              </div>
            )}
          </div>

          {/* Step 2: Choose progression type */}
          <div className="wizard-section">
            <h3>2. Progression Type</h3>
            <div className="progression-options">
              {PROGRESSION_TYPES.map((prog) => (
                <button
                  key={prog.id}
                  className={`progression-btn ${progressionType === prog.id ? "selected" : ""}`}
                  onClick={() => setProgressionType(prog.id)}
                  disabled={!hasValidStart}
                  title={!hasValidStart ? "Select a starting chord first" : prog.description}
                >
                  <span className="prog-name">{prog.name}</span>
                  <span className="prog-desc">{prog.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Preview */}
          <div className="wizard-section">
            <h3>3. Preview</h3>
            {startingChord && progressionPreview && progressionPreview.length > 0 ? (
              <div className="progression-preview">
                <div className="preview-chords">
                  {/* Show starting chord only if playing in (presets already saved) */}
                  {sourceType === "play-in" && (
                    <div className="preview-chord">
                      <span className="preview-chord-name">
                        {getChordDisplayName(startingChord.keys, startingChord.octave)}
                      </span>
                      <span className="preview-chord-function">start</span>
                    </div>
                  )}
                  {/* The progression chords */}
                  {progressionPreview.map((chord, i) => (
                    <div key={i} className="preview-chord">
                      <span className="preview-chord-name">
                        {getChordDisplayName(chord.keys, chord.octave)}
                      </span>
                      <span className="preview-chord-function">{chord.function}</span>
                    </div>
                  ))}
                </div>
                <p className="slots-info">
                  Will save to {totalChordsNeeded} slots ({availableSlots} available)
                </p>
              </div>
            ) : (
              <p className="preview-placeholder">
                Select a starting chord and progression type to preview.
              </p>
            )}
          </div>
        </div>

        <div className="wizard-footer">
          {errorMessage && (
            <div className="wizard-message wizard-error">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="wizard-message wizard-success">
              {successMessage}
            </div>
          )}
          <div className="wizard-actions">
            <button className="wizard-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className="wizard-confirm"
              onClick={handleConfirm}
              disabled={!canGenerate}
              title={
                !canGenerate
                  ? totalChordsNeeded > availableSlots
                    ? "Not enough preset slots available"
                    : "Select a starting chord and progression type"
                  : "Generate and save progression to presets"
              }
            >
              Generate Progression
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
