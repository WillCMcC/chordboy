import { useState, useCallback } from "react";
import "./SequencerModal.css";

/**
 * SequencerModal - Grid-based preset sequencer
 *
 * Allows users to:
 * - Place presets on a step grid
 * - Configure number of steps (4, 8, 16)
 * - Set step resolution (quarter, eighth, sixteenth notes)
 * - Choose retrig vs sustain mode for adjacent same notes
 * - Visual playhead during playback
 * - Runs in background (doesn't pause when closed)
 */
export function SequencerModal({
  isOpen,
  onClose,
  // Sequencer state
  sequence,
  sequencerSteps,
  currentStep,
  stepsPerBeat,
  sequencerEnabled,
  isPlaying,
  retrigMode,
  // Presets
  savedPresets,
  // Actions
  onSetStep,
  onClearStep,
  onClearSequence,
  onSetSequencerSteps,
  onSetStepsPerBeat,
  onSetSequencerEnabled,
  onSetRetrigMode,
}) {
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Get preset name for display
  const getPresetLabel = useCallback(
    (slot) => {
      if (!slot) return null;
      const preset = savedPresets.get(slot);
      if (!preset) return slot;
      return slot;
    },
    [savedPresets]
  );

  // Handle step click (left click)
  const handleStepClick = useCallback(
    (stepIndex, e) => {
      // Prevent context menu default
      if (e.type === 'contextmenu') {
        e.preventDefault();
      }

      const currentValue = sequence[stepIndex];

      if (selectedPreset) {
        // Place selected preset
        onSetStep(stepIndex, selectedPreset);
      } else if (currentValue) {
        // Clear step if clicking on filled step with no preset selected
        onClearStep(stepIndex);
      }
    },
    [selectedPreset, sequence, onSetStep, onClearStep]
  );

  // Handle right-click to clear step
  const handleStepRightClick = useCallback(
    (stepIndex, e) => {
      e.preventDefault();
      onClearStep(stepIndex);
    },
    [onClearStep]
  );

  // Handle preset selection
  const handlePresetSelect = useCallback((slot) => {
    setSelectedPreset((prev) => (prev === slot ? null : slot));
  }, []);

  // Don't render if not open, but component stays mounted
  // This allows sequencer to run in background
  if (!isOpen) return null;

  const presetSlots = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  const filledPresets = presetSlots.filter((slot) => savedPresets.has(slot));

  return (
    <div className="sequencer-overlay" onClick={onClose}>
      <div className="sequencer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sequencer-header">
          <h2>Sequencer</h2>
          <div className="sequencer-header-right">
            {isPlaying && sequencerEnabled && (
              <span className="sequencer-playing-badge">Playing</span>
            )}
            <button className="sequencer-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="sequencer-content">
          {/* Preset palette */}
          <div className="sequencer-section">
            <div className="section-header">
              <h3>Presets</h3>
              <span className="section-hint">
                {selectedPreset
                  ? `Click step to place, right-click to clear`
                  : "Select a preset, or right-click step to clear"}
              </span>
            </div>
            <div className="preset-palette">
              {presetSlots.map((slot) => {
                const hasPreset = savedPresets.has(slot);
                const isSelected = selectedPreset === slot;

                return (
                  <button
                    key={slot}
                    className={`palette-preset ${hasPreset ? "filled" : "empty"} ${isSelected ? "selected" : ""}`}
                    onClick={() => hasPreset && handlePresetSelect(slot)}
                    disabled={!hasPreset}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step grid */}
          <div className="sequencer-section">
            <div className="section-header">
              <h3>Sequence</h3>
              <button className="clear-sequence-btn" onClick={onClearSequence}>
                Clear All
              </button>
            </div>
            <div className="step-grid">
              {sequence.map((presetSlot, index) => {
                const isCurrentStep = isPlaying && sequencerEnabled && currentStep === index;
                const isDownbeat = index % (stepsPerBeat === 1 ? 1 : stepsPerBeat) === 0;
                const isMeasureStart = index % 4 === 0;

                return (
                  <div
                    key={index}
                    className={`step-cell ${presetSlot ? "filled" : "empty"} ${isCurrentStep ? "playing" : ""} ${isMeasureStart ? "measure-start" : ""} ${isDownbeat ? "downbeat" : ""}`}
                    onClick={(e) => handleStepClick(index, e)}
                    onContextMenu={(e) => handleStepRightClick(index, e)}
                  >
                    {presetSlot && (
                      <>
                        <span className="step-preset">{getPresetLabel(presetSlot)}</span>
                        <button
                          className="step-clear-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClearStep(index);
                          }}
                          aria-label="Clear step"
                        >
                          ×
                        </button>
                      </>
                    )}
                    <span className="step-number">{index + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid settings */}
          <div className="sequencer-section settings-row">
            <div className="setting-group">
              <label>Steps</label>
              <div className="button-group">
                {[4, 8, 16].map((steps) => (
                  <button
                    key={steps}
                    className={`setting-btn ${sequencerSteps === steps ? "active" : ""}`}
                    onClick={() => onSetSequencerSteps(steps)}
                  >
                    {steps}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <label>Resolution</label>
              <div className="button-group">
                <button
                  className={`setting-btn ${stepsPerBeat === 1 ? "active" : ""}`}
                  onClick={() => onSetStepsPerBeat(1)}
                >
                  1/4
                </button>
                <button
                  className={`setting-btn ${stepsPerBeat === 2 ? "active" : ""}`}
                  onClick={() => onSetStepsPerBeat(2)}
                >
                  1/8
                </button>
                <button
                  className={`setting-btn ${stepsPerBeat === 4 ? "active" : ""}`}
                  onClick={() => onSetStepsPerBeat(4)}
                >
                  1/16
                </button>
              </div>
            </div>

            <div className="setting-group">
              <label>Mode</label>
              <div className="button-group">
                <button
                  className={`setting-btn ${retrigMode ? "active" : ""}`}
                  onClick={() => onSetRetrigMode(true)}
                  title="Retrigger notes on each step, even if same preset"
                >
                  Retrig
                </button>
                <button
                  className={`setting-btn ${!retrigMode ? "active" : ""}`}
                  onClick={() => onSetRetrigMode(false)}
                  title="Sustain notes across adjacent same presets"
                >
                  Sustain
                </button>
              </div>
            </div>

            <div className="setting-group">
              <label>Enable</label>
              <button
                className={`enable-btn ${sequencerEnabled ? "active" : ""}`}
                onClick={() => onSetSequencerEnabled(!sequencerEnabled)}
              >
                {sequencerEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          {/* Help text */}
          {filledPresets.length === 0 && (
            <div className="sequencer-help">
              <p>No presets saved yet. Save some chords to presets (1-0) first, then sequence them here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
