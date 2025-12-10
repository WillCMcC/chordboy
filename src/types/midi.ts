/**
 * MIDI Type Definitions
 * Types for MIDI channels, velocity, devices, and BLE MIDI.
 */

// ============================================================================
// MIDI Basic Types
// ============================================================================

/** MIDI channel (0-15) */
export type MIDIChannel = number;

/** MIDI velocity (0-127) */
export type MIDIVelocity = number;

// ============================================================================
// MIDI Device Types
// ============================================================================

/** MIDI output device info */
export interface MIDIOutputDevice {
  /** Device ID */
  id: string;
  /** Device name */
  name: string;
  /** Manufacturer name */
  manufacturer: string;
  /** Connection state */
  state: MIDIPortDeviceState;
  /** Connection status */
  connection: MIDIPortConnectionState;
  /** The actual MIDIOutput object */
  output: MIDIOutput;
}

/** MIDI input device info */
export interface MIDIInputDevice {
  /** Device ID */
  id: string;
  /** Device name */
  name: string;
  /** Manufacturer name */
  manufacturer: string;
  /** Connection state */
  state: MIDIPortDeviceState;
  /** Connection status */
  connection: MIDIPortConnectionState;
  /** The actual MIDIInput object */
  input: MIDIInput;
}

/** MIDI output info for hooks (simplified) */
export interface MIDIOutputInfo {
  id: string;
  name: string | null;
  output: MIDIOutput;
}

/** MIDI input info for hooks (simplified) */
export interface MIDIInputInfo {
  id: string;
  name: string | null;
  input: MIDIInput;
}

/** MIDI input info for UI components (display only, no MIDIInput object) */
export interface MIDIInputInfoDisplay {
  id: string;
  name: string;
}

// ============================================================================
// BLE MIDI Types
// ============================================================================

/** BLE MIDI connection result */
export interface BLEMIDIConnection {
  /** GATT server */
  server: BluetoothRemoteGATTServer;
  /** MIDI characteristic */
  characteristic: BluetoothRemoteGATTCharacteristic;
}
