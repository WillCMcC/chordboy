/**
 * SettingsPanel Component
 * Modal panel for app settings including MIDI configuration and PWA install.
 *
 * @module components/SettingsPanel
 */

import type { ChangeEvent } from "react";
import { MIDIStatus } from "./MIDIStatus";
import { useMIDI } from "../hooks/useMIDI";
import "./SettingsPanel.css";

// Declare build timestamp as a global (set by Vite)
declare const __BUILD_TIMESTAMP__: string;

/** Props for SettingsPanel component */
interface SettingsPanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Whether PWA install is available */
  isInstallable: boolean;
  /** Callback to trigger PWA install */
  onInstall: () => void;
  /** Whether Wake Lock API is supported */
  wakeLockSupported: boolean;
  /** Whether wake lock is enabled */
  wakeLockEnabled: boolean;
  /** Whether wake lock is currently active */
  wakeLockActive: boolean;
  /** Callback to toggle wake lock */
  onWakeLockChange: (enabled: boolean) => void;
  /** Whether true random mode is enabled */
  trueRandomMode: boolean;
  /** Callback to toggle true random mode */
  onTrueRandomModeChange: (enabled: boolean) => void;
}

/**
 * Settings panel overlay with MIDI status and app install options.
 */
export function SettingsPanel({
  isOpen,
  onClose,
  isInstallable,
  onInstall,
  wakeLockSupported,
  wakeLockEnabled,
  wakeLockActive,
  onWakeLockChange,
  trueRandomMode,
  onTrueRandomModeChange,
}: SettingsPanelProps) {
  const { lowLatencyMode, setLowLatencyMode, bleConnected } = useMIDI();

  if (!isOpen) return null;

  const handleWakeLockChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onWakeLockChange(e.target.checked);
  };

  const handleLowLatencyChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setLowLatencyMode(e.target.checked);
  };

  const handleTrueRandomChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onTrueRandomModeChange(e.target.checked);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            x
          </button>
        </div>
        <div className="settings-content">
          <div className="settings-section">
            <h3>MIDI Interface</h3>
            <MIDIStatus />
          </div>
          <div className="settings-section">
            <h3>Performance</h3>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={lowLatencyMode}
                onChange={handleLowLatencyChange}
              />
              <span className="toggle-label">
                Low latency mode
                {lowLatencyMode && bleConnected && (
                  <span className="toggle-status inactive"> (BLE may be unreliable)</span>
                )}
              </span>
            </label>
            <p className="settings-description">
              Minimizes grace note delay for tighter timing when playing along with other instruments.
              {bleConnected
                ? " Warning: May cause missed notes or unreliable re-articulation over Bluetooth MIDI."
                : " Recommended for USB MIDI connections."}
            </p>
          </div>
          <div className="settings-section">
            <h3>Chord Generation</h3>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={trueRandomMode}
                onChange={handleTrueRandomChange}
              />
              <span className="toggle-label">True random mode</span>
            </label>
            <p className="settings-description">
              When enabled, Space generates completely random chords.
              When disabled (default), Space generates jazz-informed progressions based on saved presets
              (ii-V-I, turnarounds, tritone subs, and more).
            </p>
          </div>
          {wakeLockSupported && (
            <div className="settings-section">
              <h3>Display</h3>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={wakeLockEnabled}
                  onChange={handleWakeLockChange}
                />
                <span className="toggle-label">
                  Keep screen on
                  {wakeLockEnabled && (
                    <span className={`toggle-status ${wakeLockActive ? "active" : "inactive"}`}>
                      {wakeLockActive ? " (active)" : " (inactive)"}
                    </span>
                  )}
                </span>
              </label>
              <p className="settings-description">
                Prevents the screen from turning off during performance.
              </p>
            </div>
          )}
          {isInstallable && (
            <div className="settings-section">
              <h3>Install App</h3>
              <p className="settings-description">
                Install ChordBoy as a standalone app for the best experience.
              </p>
              <button onClick={onInstall} className="install-btn">
                Install App
              </button>
            </div>
          )}
          <div className="settings-section">
            <h3>About</h3>
            <p className="settings-description">
              ChordBoy - MIDI Chord Controller for Jazz Performance
            </p>
            <p className="settings-build">
              Build: {__BUILD_TIMESTAMP__}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
