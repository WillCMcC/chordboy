/**
 * SettingsPanel Component
 * Modal panel for app settings including MIDI configuration and PWA install.
 *
 * @module components/SettingsPanel
 */

import { MIDIStatus } from "./MIDIStatus";
import "./SettingsPanel.css";

/**
 * Settings panel overlay with MIDI status and app install options.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the panel is visible
 * @param {Function} props.onClose - Callback to close the panel
 * @param {boolean} props.isInstallable - Whether PWA install is available
 * @param {Function} props.onInstall - Callback to trigger PWA install
 * @param {boolean} props.wakeLockSupported - Whether Wake Lock API is supported
 * @param {boolean} props.wakeLockEnabled - Whether wake lock is enabled
 * @param {boolean} props.wakeLockActive - Whether wake lock is currently active
 * @param {Function} props.onWakeLockChange - Callback to toggle wake lock
 * @returns {JSX.Element|null} The settings panel or null if closed
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
}) {
  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            ×
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
                  onChange={(e) => onWakeLockChange(e.target.checked)}
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
