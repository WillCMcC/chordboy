import { useCallback, useState } from "react";
import "./TransportControls.css";

/**
 * TransportControls - BPM, beat grid, humanize dial, strum, and MIDI sync controls
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
  // BLE for sync
  bleConnected,
  bleDevice,
  bleSyncEnabled,
  // Humanize
  humanize,
  onHumanizeChange,
  // Strum
  strumEnabled,
  strumSpread,
  strumDirection,
  onStrumEnabledChange,
  onStrumSpreadChange,
  onStrumDirectionChange,
  // Sequencer
  sequencerEnabled,
  onOpenSequencer,
}) {
  // Mobile tab state: 'transport' | 'feel' | 'sync'
  const [mobileTab, setMobileTab] = useState("transport");

  // Handle BPM input
  const handleBpmInput = useCallback(
    (e) => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value)) {
        onBpmChange(value);
      }
    },
    [onBpmChange],
  );

  // Handle BPM increment/decrement
  const adjustBpm = useCallback(
    (delta) => {
      onBpmChange(bpm + delta);
    },
    [bpm, onBpmChange],
  );

  // Handle humanize slider
  const handleHumanizeChange = useCallback(
    (e) => {
      onHumanizeChange(parseInt(e.target.value, 10));
    },
    [onHumanizeChange],
  );

  // Handle humanize increment/decrement (for mobile)
  const adjustHumanize = useCallback(
    (delta) => {
      const newValue = Math.max(0, Math.min(100, humanize + delta));
      onHumanizeChange(newValue);
    },
    [humanize, onHumanizeChange],
  );

  // Handle strum toggle
  const handleStrumToggle = useCallback(() => {
    onStrumEnabledChange(!strumEnabled);
  }, [strumEnabled, onStrumEnabledChange]);

  // Handle strum spread slider
  const handleStrumSpreadChange = useCallback(
    (e) => {
      onStrumSpreadChange(parseInt(e.target.value, 10));
    },
    [onStrumSpreadChange],
  );

  // Handle strum spread increment/decrement
  const adjustStrumSpread = useCallback(
    (delta) => {
      const newValue = Math.max(0, Math.min(200, strumSpread + delta));
      onStrumSpreadChange(newValue);
    },
    [strumSpread, onStrumSpreadChange],
  );

  // Handle strum direction change
  const handleStrumDirectionChange = useCallback(
    (e) => {
      onStrumDirectionChange(e.target.value);
    },
    [onStrumDirectionChange],
  );

  // Cycle strum direction (for mobile tap)
  const cycleStrumDirection = useCallback(() => {
    const directions = ["up", "down", "alternate"];
    const currentIndex = directions.indexOf(strumDirection);
    const nextIndex = (currentIndex + 1) % directions.length;
    onStrumDirectionChange(directions[nextIndex]);
  }, [strumDirection, onStrumDirectionChange]);

  // Handle MIDI input selection
  const handleInputChange = useCallback(
    (e) => {
      const value = e.target.value;
      onSelectInput(value || null);
    },
    [onSelectInput],
  );

  // Handle sync toggle - also select first input if none selected
  const handleSyncToggle = useCallback(() => {
    const newSyncEnabled = !syncEnabled;
    onSyncEnabledChange(newSyncEnabled);

    // If enabling sync and no input selected, auto-select first available
    if (newSyncEnabled && !selectedInputId && !bleSyncEnabled) {
      // Prefer BLE if connected, otherwise first MIDI input
      if (bleConnected) {
        onSelectInput("ble");
      } else if (midiInputs.length > 0) {
        onSelectInput(midiInputs[0].id);
      }
    }
  }, [
    syncEnabled,
    onSyncEnabledChange,
    selectedInputId,
    bleSyncEnabled,
    bleConnected,
    midiInputs,
    onSelectInput,
  ]);

  // Direction display helper
  const getDirectionLabel = (dir) => {
    switch (dir) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      case "alternate":
        return "↕";
      default:
        return dir;
    }
  };

  return (
    <div className="transport-controls">
      {/* Desktop Layout */}
      <div className="transport-desktop">
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

        {/* Strum Section */}
        <div className="transport-section strum-section">
          <label className="transport-label">Strum</label>
          <div className="strum-controls">
            <button
              className={`strum-toggle ${strumEnabled ? "active" : ""}`}
              onClick={handleStrumToggle}
              aria-label={strumEnabled ? "Disable strum" : "Enable strum"}
            >
              {strumEnabled ? "ON" : "OFF"}
            </button>
            <input
              type="range"
              min="0"
              max="200"
              value={strumSpread}
              onChange={handleStrumSpreadChange}
              className={`strum-slider ${!strumEnabled ? "disabled" : ""}`}
              disabled={!strumEnabled}
            />
            <span className={`strum-value ${!strumEnabled ? "disabled" : ""}`}>
              {strumSpread}ms
            </span>
            <select
              className={`strum-direction-select ${!strumEnabled ? "disabled" : ""}`}
              value={strumDirection}
              onChange={handleStrumDirectionChange}
              disabled={!strumEnabled}
            >
              <option value="up">Up</option>
              <option value="down">Down</option>
              <option value="alternate">Alt</option>
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="transport-divider" />

        {/* BPM Section */}
        <div className="transport-section bpm-section">
          <label className="transport-label">
            {syncEnabled ? "EXT" : "BPM"}
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
            {syncEnabled ? (
              <div className="bpm-input synced">SYNC</div>
            ) : (
              <input
                type="number"
                min="20"
                max="300"
                value={bpm}
                onChange={handleBpmInput}
                className="bpm-input"
              />
            )}
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

        {/* Play/Stop */}
        <div className="transport-section play-section">
          <button
            className={`transport-btn play-btn ${isPlaying ? "playing" : ""} ${syncEnabled ? "synced" : ""}`}
            onClick={onTogglePlay}
            disabled={syncEnabled}
            aria-label={isPlaying ? "Stop" : "Play"}
            title={
              syncEnabled
                ? "Controlled by external MIDI"
                : isPlaying
                  ? "Stop"
                  : "Play"
            }
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
              aria-label={
                syncEnabled ? "Disable MIDI sync" : "Enable MIDI sync"
              }
              title={
                syncEnabled
                  ? "Syncing to external MIDI clock"
                  : "Click to sync to external MIDI clock"
              }
            >
              {syncEnabled ? "ON" : "OFF"}
            </button>
            {syncEnabled && (midiInputs.length > 0 || bleConnected) && (
              <select
                className="midi-input-select"
                value={bleSyncEnabled ? "ble" : selectedInputId || ""}
                onChange={handleInputChange}
              >
                <option value="">Select input...</option>
                {bleConnected && (
                  <option value="ble">
                    {bleDevice?.name || "Bluetooth MIDI"}
                  </option>
                )}
                {midiInputs.map((input) => (
                  <option key={input.id} value={input.id}>
                    {input.name}
                  </option>
                ))}
              </select>
            )}
            {syncEnabled && midiInputs.length === 0 && !bleConnected && (
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

      {/* Mobile Layout - Tabbed Interface */}
      <div className="transport-mobile">
        {/* Tab Bar */}
        <div className="mobile-tab-bar">
          <button
            className={`mobile-tab ${mobileTab === "transport" ? "active" : ""}`}
            onClick={() => setMobileTab("transport")}
          >
            Sequence
          </button>
          <button
            className={`mobile-tab ${mobileTab === "feel" ? "active" : ""} ${humanize > 0 || strumEnabled ? "has-value" : ""}`}
            onClick={() => setMobileTab("feel")}
          >
            Feel
          </button>
          <button
            className={`mobile-tab ${mobileTab === "sync" ? "active" : ""} ${syncEnabled ? "has-value" : ""}`}
            onClick={() => setMobileTab("sync")}
          >
            Sync
          </button>
        </div>

        {/* Tab Content */}
        <div className="mobile-tab-content">
          {/* Transport Tab */}
          {mobileTab === "transport" && (
            <div className="mobile-transport-content">
              {/* BPM */}
              <div className="mobile-bpm">
                {!syncEnabled && (
                  <button
                    className="mobile-adj-btn"
                    onClick={() => adjustBpm(-1)}
                  >
                    -
                  </button>
                )}
                <div className="mobile-bpm-display">
                  <span className="mobile-bpm-value">
                    {syncEnabled ? "EXT" : bpm}
                  </span>
                  <span className="mobile-bpm-label">
                    {syncEnabled ? "SYNC" : "BPM"}
                  </span>
                </div>
                {!syncEnabled && (
                  <button
                    className="mobile-adj-btn"
                    onClick={() => adjustBpm(1)}
                  >
                    +
                  </button>
                )}
              </div>

              {/* Beat Grid */}
              <div className="mobile-beat-grid">
                {[0, 1, 2, 3].map((beat) => (
                  <div
                    key={beat}
                    className={`beat-indicator ${
                      isPlaying && currentBeat === beat ? "active" : ""
                    } ${beat === 0 ? "downbeat" : ""}`}
                  />
                ))}
              </div>

              {/* Play Button */}
              <button
                className={`mobile-play-btn ${isPlaying ? "playing" : ""}`}
                onClick={onTogglePlay}
                disabled={syncEnabled}
              >
                {isPlaying ? (
                  <span className="stop-icon" />
                ) : (
                  <span className="play-icon" />
                )}
              </button>

              {/* Sequencer Button */}
              <button
                className={`mobile-seq-btn ${sequencerEnabled ? "active" : ""}`}
                onClick={onOpenSequencer}
              >
                <span className="seq-icon" />
              </button>
            </div>
          )}

          {/* Feel Tab - Humanize & Strum in single row */}
          {mobileTab === "feel" && (
            <div className="mobile-feel-content">
              {/* Humanize */}
              <div className="mobile-feel-group">
                <span className="mobile-feel-label">Human</span>
                <button
                  className="mobile-adj-btn small"
                  onClick={() => adjustHumanize(-10)}
                >
                  -
                </button>
                <div className="mobile-feel-value">{humanize}%</div>
                <button
                  className="mobile-adj-btn small"
                  onClick={() => adjustHumanize(10)}
                >
                  +
                </button>
              </div>

              <div className="mobile-feel-divider" />

              {/* Strum */}
              <div className="mobile-feel-group">
                <button
                  className={`mobile-strum-toggle ${strumEnabled ? "active" : ""}`}
                  onClick={handleStrumToggle}
                >
                  Strum
                </button>
                <button
                  className="mobile-adj-btn small"
                  onClick={() => adjustStrumSpread(-10)}
                  disabled={!strumEnabled}
                >
                  -
                </button>
                <div
                  className={`mobile-feel-value ${!strumEnabled ? "disabled" : ""}`}
                >
                  {strumSpread}ms
                </div>
                <button
                  className="mobile-adj-btn small"
                  onClick={() => adjustStrumSpread(10)}
                  disabled={!strumEnabled}
                >
                  +
                </button>
                <button
                  className={`mobile-direction-btn ${!strumEnabled ? "disabled" : ""}`}
                  onClick={cycleStrumDirection}
                  disabled={!strumEnabled}
                  title={strumDirection}
                >
                  {getDirectionLabel(strumDirection)}
                </button>
              </div>
            </div>
          )}

          {/* Sync Tab */}
          {mobileTab === "sync" && (
            <div className="mobile-sync-content">
              <button
                className={`mobile-sync-toggle ${syncEnabled ? "active" : ""}`}
                onClick={handleSyncToggle}
              >
                {syncEnabled ? "Sync ON" : "Sync OFF"}
              </button>
              {syncEnabled && (midiInputs.length > 0 || bleConnected) && (
                <select
                  className="mobile-sync-select"
                  value={bleSyncEnabled ? "ble" : selectedInputId || ""}
                  onChange={handleInputChange}
                >
                  <option value="">Select input...</option>
                  {bleConnected && (
                    <option value="ble">
                      {bleDevice?.name || "Bluetooth MIDI"}
                    </option>
                  )}
                  {midiInputs.map((input) => (
                    <option key={input.id} value={input.id}>
                      {input.name}
                    </option>
                  ))}
                </select>
              )}
              {syncEnabled && midiInputs.length === 0 && !bleConnected && (
                <span className="mobile-sync-hint">
                  No MIDI inputs available
                </span>
              )}
              {!syncEnabled && (
                <span className="mobile-sync-hint">
                  Sync to external MIDI clock
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
