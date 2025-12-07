/**
 * SettingsPanel Component
 * Modal panel for app settings including MIDI configuration and PWA install.
 *
 * @module components/SettingsPanel
 */

import type { ChangeEvent } from "react";
import { MIDIStatus } from "./MIDIStatus";
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
}: SettingsPanelProps) {
  if (!isOpen) return null;

  const handleWakeLockChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onWakeLockChange(e.target.checked);
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
