import { useCallback } from "react";
import "./TransportControls.css";

/**
 * TransportControls - BPM, beat grid, humanize dial, and MIDI sync controls
 */
export function TransportControls({
  // Transport
  bpm,
  isPlaying,
  currentBeat,
  syncEnabled,
  onBpmChange,
  onTogglePlay,
  onSyncEnabledChange,
  // MIDI inputs for sync
  midiInputs,
  selectedInputId,
  onSelectInput,
  // Humanize
  humanize,
  onHumanizeChange,
  // Sequencer
  sequencerEnabled,
  onOpenSequencer,
}) {
  // Handle BPM input
  const handleBpmInput = useCallback(
    (e) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value)) {
        onBpmChange(value);
      }
    },
    [onBpmChange]
  );

  // Handle BPM increment/decrement
  const adjustBpm = useCallback(
    (delta) => {
      onBpmChange(bpm + delta);
    },
    [bpm, onBpmChange]
  );

  // Handle humanize slider
  const handleHumanizeChange = useCallback(
    (e) => {
      onHumanizeChange(parseInt(e.target.value, 10));
    },
    [onHumanizeChange]
  );

  // Handle humanize increment/decrement (for mobile)
  const adjustHumanize = useCallback(
    (delta) => {
      const newValue = Math.max(0, Math.min(100, humanize + delta));
      onHumanizeChange(newValue);
    },
    [humanize, onHumanizeChange]
  );

  // Handle MIDI input selection
  const handleInputChange = useCallback(
    (e) => {
      const value = e.target.value;
      onSelectInput(value || null);
    },
    [onSelectInput]
  );

  // Handle sync toggle - also select first input if none selected
  const handleSyncToggle = useCallback(() => {
    const newSyncEnabled = !syncEnabled;
    onSyncEnabledChange(newSyncEnabled);

    // If enabling sync and no input selected, auto-select first one
    if (newSyncEnabled && !selectedInputId && midiInputs.length > 0) {
      onSelectInput(midiInputs[0].id);
    }
  }, [syncEnabled, onSyncEnabledChange, selectedInputId, midiInputs, onSelectInput]);

  return (
    <div className="transport-controls">
      {/* Humanize Section */}
      <div className="transport-section humanize-section">
        <label className="transport-label">Human</label>
        <div className="humanize-dial">
          <button
            className="humanize-adjust-btn"
            onClick={() => adjustHumanize(-10)}
            aria-label="Decrease humanization"
          >
            -
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={humanize}
            onChange={handleHumanizeChange}
            className="humanize-slider"
          />
          <span className="humanize-value">{humanize}%</span>
          <button
            className="humanize-adjust-btn"
            onClick={() => adjustHumanize(10)}
            aria-label="Increase humanization"
          >
            +
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="transport-divider" />

      {/* BPM Section */}
      <div className="transport-section bpm-section">
        <label className="transport-label">
          BPM{syncEnabled && <span className="sync-indicator">•</span>}
        </label>
        <div className="bpm-controls">
          {!syncEnabled && (
            <button
              className="bpm-adjust-btn"
              onClick={() => adjustBpm(-1)}
              aria-label="Decrease BPM"
            >
              -
            </button>
          )}
          <input
            type="number"
            min="20"
            max="300"
            value={bpm}
            onChange={handleBpmInput}
            className={`bpm-input ${syncEnabled ? "synced" : ""}`}
            disabled={syncEnabled}
          />
          {!syncEnabled && (
            <button
              className="bpm-adjust-btn"
              onClick={() => adjustBpm(1)}
              aria-label="Increase BPM"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Beat Grid */}
      <div className="transport-section beat-section">
        <div className="beat-grid">
          {[0, 1, 2, 3].map((beat) => (
            <div
              key={beat}
              className={`beat-indicator ${
                isPlaying && currentBeat === beat ? "active" : ""
              } ${beat === 0 ? "downbeat" : ""}`}
            />
          ))}
        </div>
      </div>

      {/* Play/Stop - disabled when synced */}
      <div className="transport-section play-section">
        <button
          className={`transport-btn play-btn ${isPlaying ? "playing" : ""} ${syncEnabled ? "synced" : ""}`}
          onClick={onTogglePlay}
          disabled={syncEnabled}
          aria-label={isPlaying ? "Stop" : "Play"}
          title={syncEnabled ? "Controlled by external MIDI" : (isPlaying ? "Stop" : "Play")}
        >
          {isPlaying ? (
            <span className="stop-icon" />
          ) : (
            <span className="play-icon" />
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="transport-divider" />

      {/* MIDI Sync Section */}
      <div className="transport-section sync-section">
        <label className="transport-label">Sync</label>
        <div className="sync-controls">
          <button
            className={`sync-toggle ${syncEnabled ? "active" : ""}`}
            onClick={handleSyncToggle}
            aria-label={syncEnabled ? "Disable MIDI sync" : "Enable MIDI sync"}
            title={syncEnabled ? "Syncing to external MIDI clock" : "Click to sync to external MIDI clock"}
          >
            {syncEnabled ? "ON" : "OFF"}
          </button>
          {syncEnabled && midiInputs.length > 0 && (
            <select
              className="midi-input-select"
              value={selectedInputId || ""}
              onChange={handleInputChange}
            >
              <option value="">Select input...</option>
              {midiInputs.map((input) => (
                <option key={input.id} value={input.id}>
                  {input.name}
                </option>
              ))}
            </select>
          )}
          {syncEnabled && midiInputs.length === 0 && (
            <span className="no-inputs">No MIDI inputs</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="transport-divider" />

      {/* Sequencer Button */}
      <div className="transport-section seq-section">
        <label className="transport-label">Seq</label>
        <button
          className={`seq-btn ${sequencerEnabled ? "active" : ""}`}
          onClick={onOpenSequencer}
          aria-label="Open sequencer"
        >
          <span className="seq-icon" />
        </button>
      </div>
    </div>
  );
}
