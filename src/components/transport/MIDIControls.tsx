import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type { MIDIInputInfoDisplay } from "../../types";

/** Props for MIDIControls component */
export interface MIDIControlsProps {
  /** Available MIDI inputs */
  midiInputs: MIDIInputInfoDisplay[];
  /** Currently selected input ID */
  selectedInputId: string | null;
  /** Callback to select a MIDI input */
  onSelectInput: (inputId: string | null) => void;
  /** Whether BLE is connected */
  bleConnected: boolean;
  /** BLE device info */
  bleDevice: { name?: string } | null;
  /** Whether BLE sync is enabled */
  bleSyncEnabled: boolean;
  /** Whether sync is enabled */
  syncEnabled: boolean;
}

/**
 * MIDIControls - MIDI input/output selection dropdown
 */
export function MIDIControls({
  midiInputs,
  selectedInputId,
  onSelectInput,
  bleConnected,
  bleDevice,
  bleSyncEnabled,
  syncEnabled,
}: MIDIControlsProps) {
  // Handle MIDI input selection
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>): void => {
      const value = e.target.value;
      onSelectInput(value || null);
    },
    [onSelectInput]
  );

  // Prevent letter keys from changing dropdown selections
  const handleDropdownKeyDown = useCallback((e: KeyboardEvent<HTMLSelectElement>) => {
    const allowedKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab', ' '];
    if (allowedKeys.includes(e.key)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (!syncEnabled) {
    return null;
  }

  if (midiInputs.length === 0 && !bleConnected) {
    return <span className="no-inputs">No MIDI inputs</span>;
  }

  return (
    <select
      className="midi-input-select"
      value={bleSyncEnabled ? "ble" : (selectedInputId || "")}
      onChange={handleInputChange}
      onKeyDown={handleDropdownKeyDown}
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
  );
}
