import { useMIDI } from "../hooks/useMIDI";
import "./MIDIStatus.css";

/**
 * MIDIStatus Component
 * Displays MIDI connection status and allows device selection
 */
export function MIDIStatus() {
  const {
    isConnected,
    isLoading,
    error,
    outputs,
    selectedOutput,
    selectOutput,
    connectMIDI,
  } = useMIDI();

  // Get display name for selected output
  const selectedOutputName = outputs.find(
    (o) => o.output === selectedOutput
  )?.name;

  return (
    <div className="midi-status">
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
      ) : isConnected ? (
        <div className="midi-status-content connected">
          <span className="status-indicator connected"></span>
          {outputs.length > 1 ? (
            <select
              value={selectedOutput?.id || ""}
              onChange={(e) => selectOutput(e.target.value)}
              className="device-selector"
            >
              {outputs.map((output) => (
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
          <span>No Devices Found</span>
          <button onClick={connectMIDI} className="connect-button">
            Rescan
          </button>
        </div>
      )}
    </div>
  );
}
