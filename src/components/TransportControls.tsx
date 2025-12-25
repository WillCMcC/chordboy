import { useCallback, useState } from "react";
import type { ChangeEvent } from "react";
import type { StrumDirection, MIDIInputInfoDisplay, PlaybackMode } from "../types";
import type { TriggerMode } from "../hooks/useMIDI";
import {
  MIDIControls,
  HumanizeControls,
  PlaybackModeSelector,
  StrumControls,
  TriggerModeSelector,
} from "./transport";
import "./TransportControls.css";

/** Mobile tab identifiers */
type MobileTab = "transport" | "feel" | "sync";

/** Props for TransportControls component */
interface TransportControlsProps {
  // Transport
  /** Current BPM */
  bpm: number;
  /** Whether transport is playing */
  isPlaying: boolean;
  /** Current beat index (0-3) */
  currentBeat: number;
  /** Whether external sync is enabled */
  syncEnabled: boolean;
  /** Callback to change BPM */
  onBpmChange: (bpm: number) => void;
  /** Callback to toggle play/stop */
  onTogglePlay: () => void;
  /** Callback to change sync enabled state */
  onSyncEnabledChange: (enabled: boolean) => void;
  // MIDI inputs for sync
  /** Available MIDI inputs */
  midiInputs: MIDIInputInfoDisplay[];
  /** Currently selected input ID */
  selectedInputId: string | null;
  /** Callback to select a MIDI input */
  onSelectInput: (inputId: string | null) => void;
  // BLE for sync
  /** Whether BLE is connected */
  bleConnected: boolean;
  /** BLE device info */
  bleDevice: { name?: string } | null;
  /** Whether BLE sync is enabled */
  bleSyncEnabled: boolean;
  // Humanize
  /** Humanize amount (0-100) */
  humanize: number;
  /** Callback to change humanize amount */
  onHumanizeChange: (amount: number) => void;
  // Strum
  /** Whether strum is enabled */
  strumEnabled: boolean;
  /** Strum spread in ms */
  strumSpread: number;
  /** Strum direction */
  strumDirection: StrumDirection;
  /** Callback to enable/disable strum */
  onStrumEnabledChange: (enabled: boolean) => void;
  /** Callback to change strum spread */
  onStrumSpreadChange: (spread: number) => void;
  /** Callback to change strum direction */
  onStrumDirectionChange: (direction: StrumDirection) => void;
  // Trigger mode
  /** Trigger mode - "new" (only new notes), "all" (retrigger full chord), or "glide" (pitch bend) */
  triggerMode: TriggerMode;
  /** Callback to change trigger mode */
  onTriggerModeChange: (mode: TriggerMode) => void;
  /** Glide time in ms (when triggerMode is "glide") */
  glideTime: number;
  /** Callback to change glide time */
  onGlideTimeChange: (time: number) => void;
  // Sequencer
  /** Whether sequencer is enabled */
  sequencerEnabled: boolean;
  /** Callback to open sequencer modal */
  onOpenSequencer: () => void;
  // Playback mode
  /** Current playback mode */
  playbackMode: PlaybackMode;
  /** Callback to change playback mode */
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  /** Callback to open grid sequencer modal */
  onOpenGridSequencer: () => void;
}

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
  // Trigger mode
  triggerMode,
  onTriggerModeChange,
  glideTime,
  onGlideTimeChange,
  // Sequencer
  sequencerEnabled,
  onOpenSequencer,
  // Playback mode
  playbackMode,
  onPlaybackModeChange,
  onOpenGridSequencer,
}: TransportControlsProps) {
  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<MobileTab>("transport");

  // Handle BPM input
  const handleBpmInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const value = parseInt(e.target.value, 10);
      if (!isNaN(value)) {
        onBpmChange(value);
      }
    },
    [onBpmChange]
  );

  // Handle BPM increment/decrement
  const adjustBpm = useCallback(
    (delta: number): void => {
      onBpmChange(bpm + delta);
    },
    [bpm, onBpmChange]
  );

  // Cycle strum direction (for mobile tap)
  const cycleStrumDirection = useCallback((): void => {
    const directions: StrumDirection[] = ["up", "down", "alternate"];
    const currentIndex = directions.indexOf(strumDirection);
    const nextIndex = (currentIndex + 1) % directions.length;
    onStrumDirectionChange(directions[nextIndex]);
  }, [strumDirection, onStrumDirectionChange]);

  // Direction display helper (for mobile)
  const getDirectionLabel = (dir: StrumDirection): string => {
    switch (dir) {
      case "up": return "^";
      case "down": return "v";
      case "alternate": return "^v";
      default: return dir;
    }
  };

  // Handle sync toggle - also select first input if none selected
  const handleSyncToggle = useCallback((): void => {
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
  }, [syncEnabled, onSyncEnabledChange, selectedInputId, bleSyncEnabled, bleConnected, midiInputs, onSelectInput]);

  return (
    <div className="transport-controls">
      {/* Desktop Layout */}
      <div className="transport-desktop">
        {/* Humanize Section */}
        <div className="transport-section humanize-section">
          <label className="transport-label">Human</label>
          <HumanizeControls
            humanize={humanize}
            onHumanizeChange={onHumanizeChange}
          />
        </div>

        {/* Divider */}
        <div className="transport-divider" />

        {/* Strum Section */}
        <div className="transport-section strum-section">
          <label className="transport-label">Strum</label>
          <StrumControls
            strumEnabled={strumEnabled}
            strumSpread={strumSpread}
            strumDirection={strumDirection}
            onStrumEnabledChange={onStrumEnabledChange}
            onStrumSpreadChange={onStrumSpreadChange}
            onStrumDirectionChange={onStrumDirectionChange}
          />
        </div>

        {/* Divider */}
        <div className="transport-divider" />

        {/* Trigger Mode Section */}
        <div className="transport-section articulation-section">
          <label className="transport-label">Trigger</label>
          <TriggerModeSelector
            triggerMode={triggerMode}
            onTriggerModeChange={onTriggerModeChange}
            glideTime={glideTime}
            onGlideTimeChange={onGlideTimeChange}
          />
        </div>

        {/* Divider */}
        <div className="transport-divider" />

        {/* Playback Mode Section */}
        <div className="transport-section playback-section">
          <label className="transport-label">Mode</label>
          <PlaybackModeSelector
            mode={playbackMode}
            onModeChange={onPlaybackModeChange}
            inlineAction={
              playbackMode === "custom" ? (
                <button
                  className="edit-pattern-btn"
                  onClick={onOpenGridSequencer}
                  title="Edit custom pattern"
                  aria-label="Edit custom pattern"
                >
                  ⋮⋮
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Divider */}
        <div className="transport-divider" />

        {/* BPM Section */}
        <div className="transport-section bpm-section">
          <label className="transport-label">BPM</label>
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
              <div className="bpm-input synced">EXT</div>
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
            <MIDIControls
              midiInputs={midiInputs}
              selectedInputId={selectedInputId}
              onSelectInput={onSelectInput}
              bleConnected={bleConnected}
              bleDevice={bleDevice}
              bleSyncEnabled={bleSyncEnabled}
              syncEnabled={syncEnabled}
            />
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
            className={`mobile-tab ${mobileTab === "feel" ? "active" : ""} ${(humanize > 0 || strumEnabled) ? "has-value" : ""}`}
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
                  <button className="mobile-adj-btn" onClick={() => adjustBpm(-1)}>-</button>
                )}
                <div className="mobile-bpm-display">
                  {syncEnabled ? (
                    <span className="mobile-bpm-value synced">EXT</span>
                  ) : (
                    <>
                      <span className="mobile-bpm-value">{bpm}</span>
                      <span className="mobile-bpm-label">BPM</span>
                    </>
                  )}
                </div>
                {!syncEnabled && (
                  <button className="mobile-adj-btn" onClick={() => adjustBpm(1)}>+</button>
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
                {isPlaying ? <span className="stop-icon" /> : <span className="play-icon" />}
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

          {/* Feel Tab - Humanize, Strum, Trigger */}
          {mobileTab === "feel" && (
            <div className="mobile-feel-content">
              {/* Top row: Humanize slider & Strum controls */}
              <div className="feel-controls-row">
                {/* Humanize - inline slider */}
                <div className="feel-control-inline">
                  <span className="feel-control-label">Human</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={humanize}
                    onChange={(e) => onHumanizeChange(parseInt(e.target.value, 10))}
                    className="feel-slider"
                  />
                  <span className="feel-control-value">{humanize}%</span>
                </div>

                {/* Strum - toggle + slider + direction */}
                <div className="feel-control-inline strum-control">
                  <button
                    className={`feel-toggle-btn ${strumEnabled ? "active" : ""}`}
                    onClick={() => onStrumEnabledChange(!strumEnabled)}
                  >
                    Strum
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={strumSpread}
                    onChange={(e) => onStrumSpreadChange(parseInt(e.target.value, 10))}
                    className={`feel-slider strum-slider ${!strumEnabled ? "disabled" : ""}`}
                    disabled={!strumEnabled}
                  />
                  <span className={`feel-control-value ${!strumEnabled ? "disabled" : ""}`}>{strumSpread}ms</span>
                  <button
                    className={`feel-direction-btn ${!strumEnabled ? "disabled" : ""}`}
                    onClick={cycleStrumDirection}
                    disabled={!strumEnabled}
                  >
                    {getDirectionLabel(strumDirection)}
                  </button>
                </div>
              </div>

              {/* Bottom row: Trigger segmented control + glide slider */}
              <div className="feel-controls-row trigger-row">
                <div className="trigger-segmented">
                  <button
                    className={`trigger-segment ${triggerMode === "new" ? "active" : ""}`}
                    onClick={() => onTriggerModeChange("new")}
                  >
                    New
                  </button>
                  <button
                    className={`trigger-segment ${triggerMode === "all" ? "active" : ""}`}
                    onClick={() => onTriggerModeChange("all")}
                  >
                    All
                  </button>
                  <button
                    className={`trigger-segment ${triggerMode === "glide" ? "active" : ""}`}
                    onClick={() => onTriggerModeChange("glide")}
                  >
                    Glide
                  </button>
                </div>

                {/* Glide time slider - always visible but disabled when not in glide mode */}
                <div className={`feel-control-inline glide-control ${triggerMode !== "glide" ? "disabled" : ""}`}>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    value={glideTime}
                    onChange={(e) => onGlideTimeChange(parseInt(e.target.value, 10))}
                    className={`feel-slider glide-slider ${triggerMode !== "glide" ? "disabled" : ""}`}
                    disabled={triggerMode !== "glide"}
                  />
                  <span className={`feel-control-value ${triggerMode !== "glide" ? "disabled" : ""}`}>{glideTime}ms</span>
                </div>
              </div>

              {/* Third row: Playback mode */}
              <div className="feel-controls-row playback-row">
                <span className="feel-control-label">Mode</span>
                <PlaybackModeSelector
                  mode={playbackMode}
                  onModeChange={onPlaybackModeChange}
                  inlineAction={
                    playbackMode === "custom" ? (
                      <button
                        className="edit-pattern-btn"
                        onClick={onOpenGridSequencer}
                        title="Edit custom pattern"
                        aria-label="Edit custom pattern"
                      >
                        ⋮⋮
                      </button>
                    ) : undefined
                  }
                />
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
                  value={bleSyncEnabled ? "ble" : (selectedInputId || "")}
                  onChange={(e) => onSelectInput(e.target.value || null)}
                  onKeyDown={(e) => {
                    const allowedKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab', ' '];
                    if (!allowedKeys.includes(e.key)) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  <option value="">Select input...</option>
                  {bleConnected && (
                    <option value="ble">{bleDevice?.name || "Bluetooth MIDI"}</option>
                  )}
                  {midiInputs.map((input) => (
                    <option key={input.id} value={input.id}>{input.name}</option>
                  ))}
                </select>
              )}
              {syncEnabled && midiInputs.length === 0 && !bleConnected && (
                <span className="mobile-sync-hint">No MIDI inputs available</span>
              )}
              {!syncEnabled && (
                <span className="mobile-sync-hint">Sync to external MIDI clock</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
