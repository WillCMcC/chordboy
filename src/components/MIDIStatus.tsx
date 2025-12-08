import type { ChangeEvent } from "react";
import type { MIDIOutputInfo } from "../types";
import { useMIDI } from "../hooks/useMIDI";
import "./MIDIStatus.css";

/**
 * MIDIStatus Component
 * Displays MIDI connection status and allows device selection
 */
export function MIDIStatus() {
  const {
    isLoading,
    error,
    outputs,
    selectedOutput,
    selectOutput,
    connectMIDI,
    // BLE
    bleSupported,
    bleDevice,
    bleConnected,
    bleConnecting,
    bleError,
    connectBLE,
    disconnectBLE,
  } = useMIDI();

  // Get display name for selected output
  const selectedOutputName = (outputs as MIDIOutputInfo[]).find(
    (o) => o.output === selectedOutput
  )?.name;

  const hasWiredConnection = outputs.length > 0;

  const handleOutputChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    selectOutput(e.target.value);
  };

  return (
    <div className="midi-status">
      {/* Wired MIDI Section */}
      <div className="midi-section">
        <div className="midi-section-label">Wired/USB</div>
        {isLoading ? (
          <div className="midi-status-content">
            <span className="status-indicator loading"></span>
            <span>Connecting to MIDI...</span>
          </div>
        ) : error ? (
          <div className="midi-status-content error">
            <span className="status-indicator error"></span>
            <span className="error-message">{error}</span>
            <button onClick={connectMIDI} className="retry-button">
              Retry
            </button>
          </div>
        ) : hasWiredConnection ? (
          <div className="midi-status-content connected">
            <span className="status-indicator connected"></span>
            {outputs.length > 1 ? (
              <select
                value={selectedOutput?.id || ""}
                onChange={handleOutputChange}
                className="device-selector"
              >
                {(outputs as MIDIOutputInfo[]).map((output) => (
                  <option key={output.id} value={output.id}>
                    {output.name}
                  </option>
                ))}
              </select>
            ) : (
              <span>{selectedOutputName || "MIDI Connected"}</span>
            )}
          </div>
        ) : (
          <div className="midi-status-content">
            <span className="status-indicator disconnected"></span>
            <span>No Devices</span>
            <button onClick={connectMIDI} className="connect-button">
              Rescan
            </button>
          </div>
        )}
      </div>

      {/* BLE MIDI Section */}
      {bleSupported && (
        <div className="midi-section">
          <div className="midi-section-label">Bluetooth</div>
          {bleConnecting ? (
            <div className="midi-status-content">
              <span className="status-indicator loading"></span>
              <span>Scanning...</span>
            </div>
          ) : bleError ? (
            <div className="midi-status-content error">
              <span className="status-indicator error"></span>
              <span className="error-message">{bleError}</span>
              <button onClick={connectBLE} className="retry-button">
                Retry
              </button>
            </div>
          ) : bleConnected ? (
            <div className="midi-status-content connected">
              <span className="status-indicator connected"></span>
              <span className="ble-device-name">{bleDevice?.name || "BLE Device"}</span>
              <button onClick={disconnectBLE} className="disconnect-button">
                Disconnect
              </button>
            </div>
          ) : (
            <div className="midi-status-content">
              <span className="status-indicator disconnected"></span>
              <span>Not Connected</span>
              <button onClick={connectBLE} className="connect-button">
                Scan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
