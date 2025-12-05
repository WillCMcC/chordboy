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
  sendClock,
  onBpmChange,
  onTogglePlay,
  onSendClockChange,
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

  return (
    <div className="transport-controls">
      {/* Humanize Section */}
      <div className="transport-section humanize-section">
        <label className="transport-label">Human</label>
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
      </div>

      {/* Divider */}
      <div className="transport-divider" />

      {/* BPM Section */}
      <div className="transport-section bpm-section">
        <label className="transport-label">BPM</label>
        <div className="bpm-controls">
          <button
            className="bpm-adjust-btn"
            onClick={() => adjustBpm(-1)}
            aria-label="Decrease BPM"
          >
            -
          </button>
          <input
            type="number"
            min="20"
            max="300"
            value={bpm}
            onChange={handleBpmInput}
            className="bpm-input"
          />
          <button
            className="bpm-adjust-btn"
            onClick={() => adjustBpm(1)}
            aria-label="Increase BPM"
          >
            +
          </button>
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

      {/* Play/Stop */}
      <div className="transport-section play-section">
        <button
          className={`transport-btn play-btn ${isPlaying ? "playing" : ""}`}
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Stop" : "Play"}
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

      {/* MIDI Sync Toggle */}
      <div className="transport-section sync-section">
        <label className="transport-label">Sync</label>
        <button
          className={`sync-toggle ${sendClock ? "active" : ""}`}
          onClick={() => onSendClockChange(!sendClock)}
          aria-label={sendClock ? "Disable MIDI sync" : "Enable MIDI sync"}
        >
          MIDI
        </button>
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
