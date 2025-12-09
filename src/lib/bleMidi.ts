/**
 * BLE MIDI Utility Functions
 * Handles Bluetooth Low Energy MIDI connections using Web Bluetooth API.
 *
 * BLE MIDI uses a specific GATT service and characteristic for MIDI data.
 * Messages are wrapped with timestamps per the BLE MIDI specification.
 *
 * @module lib/bleMidi
 */

import type { MIDINote, MIDIChannel, MIDIVelocity, BLEMIDIConnection } from "../types";

// BLE MIDI Service and Characteristic UUIDs (standard)
export const BLE_MIDI_SERVICE_UUID = "03b80e5a-ede8-4b33-a751-6ce34ec4c700";
export const BLE_MIDI_CHARACTERISTIC_UUID = "7772e5db-3868-4112-a1a9-f2669d106bf3";

/**
 * Check if Web Bluetooth is supported in this browser.
 * @returns True if supported
 */
export function isBLESupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Scan for and select a BLE MIDI device.
 * Opens the browser's Bluetooth device picker filtered to MIDI devices.
 *
 * @returns The selected device
 * @throws If user cancels or Bluetooth unavailable
 */
export async function scanForBLEMidiDevice(): Promise<BluetoothDevice> {
  if (!isBLESupported()) {
    throw new Error("Web Bluetooth is not supported in this browser");
  }

  console.log("Scanning for BLE MIDI devices...");
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [BLE_MIDI_SERVICE_UUID] }],
    optionalServices: [BLE_MIDI_SERVICE_UUID],
  });

  console.log(`Selected device: ${device.name || "unnamed"} (${device.id})`);
  return device;
}

/**
 * Delay helper for connection timing.
 * @param ms - Milliseconds to wait
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Connect to a BLE MIDI device and get the MIDI characteristic.
 * Also starts notifications, which some hosts (like macOS) require
 * to recognize the connection as a valid MIDI connection.
 *
 * Includes retry logic with exponential backoff for Android compatibility.
 *
 * @param device - The BLE device to connect to
 * @param maxRetries - Maximum connection attempts (default: 3)
 * @returns Connection object with server and characteristic
 */
export async function connectToBLEMidiDevice(
  device: BluetoothDevice,
  maxRetries: number = 3
): Promise<BLEMIDIConnection> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`BLE MIDI connection attempt ${attempt}/${maxRetries} to ${device.name || "unnamed"}`);

      if (!device.gatt) {
        throw new Error("Device does not have GATT server");
      }

      console.log("Connecting to GATT server...");
      const server = await device.gatt.connect();
      console.log(`GATT connected: ${server.connected}`);

      // Delay before service discovery - Android needs time after GATT connect
      // Use longer delays as Android BLE stack can take 800-1200ms to populate services
      const serviceDelay = attempt === 1 ? 800 : 1000 + attempt * 200;
      console.log(`Waiting ${serviceDelay}ms before service discovery...`);
      await delay(serviceDelay);

      // Try service discovery with retries - Android sometimes needs multiple attempts
      let service: BluetoothRemoteGATTService | undefined;
      console.log("Starting service discovery...");
      for (let serviceAttempt = 1; serviceAttempt <= 5; serviceAttempt++) {
        try {
          service = await server.getPrimaryService(BLE_MIDI_SERVICE_UUID);
          console.log("MIDI service found!");
          break;
        } catch (serviceErr) {
          const errMsg = (serviceErr as Error).message;
          console.log(`Service discovery attempt ${serviceAttempt}/5 failed: ${errMsg}`);
          if (serviceAttempt === 5) throw serviceErr;
          await delay(400 * serviceAttempt); // 400, 800, 1200, 1600ms
        }
      }

      if (!service) {
        throw new Error("Failed to get MIDI service");
      }

      // Small delay before characteristic access
      await delay(100);

      const characteristic = await service.getCharacteristic(BLE_MIDI_CHARACTERISTIC_UUID);

      // Start notifications - required by some hosts (macOS) to recognize as MIDI
      try {
        await characteristic.startNotifications();
      } catch (err) {
        console.warn("Could not start BLE MIDI notifications:", (err as Error).message);
      }

      console.log("BLE MIDI connected successfully");
      return { server, characteristic };
    } catch (err) {
      lastError = err as Error;
      console.warn(`BLE MIDI connection attempt ${attempt} failed:`, lastError.message);

      // Disconnect if partially connected and allow BLE stack to reset
      if (device.gatt?.connected) {
        try {
          device.gatt.disconnect();
        } catch (_disconnectErr) {
          // Ignore disconnect errors
        }
        // Wait for BLE stack to fully release the connection
        await delay(300);
      }

      // Exponential backoff before retry (skip delay on last attempt)
      if (attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        console.log(`Retrying in ${backoffMs}ms...`);
        await delay(backoffMs);
      }
    }
  }

  throw new Error(`BLE MIDI connection failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Disconnect from a BLE MIDI device.
 *
 * @param server - The GATT server to disconnect
 */
export function disconnectBLEMidiDevice(server: BluetoothRemoteGATTServer | null | undefined): void {
  if (server && server.connected) {
    server.disconnect();
  }
}

/**
 * Create a BLE MIDI packet from a MIDI message.
 * BLE MIDI format: [header, timestamp, ...midiBytes]
 *
 * Header byte: 1ttttttt (high bit set, 7 bits of timestamp high)
 * Timestamp byte: 1ttttttt (high bit set, 7 bits of timestamp low)
 *
 * @param midiMessage - Raw MIDI message bytes (e.g., [0x90, 60, 80])
 * @returns BLE MIDI packet
 */
export function createBLEMidiPacket(midiMessage: number[]): Uint8Array {
  // Get timestamp in milliseconds, use lower 13 bits
  const timestamp = Date.now() & 0x1fff;
  const timestampHigh = (timestamp >> 7) & 0x3f;
  const timestampLow = timestamp & 0x7f;

  // Header: high bit set + 6 bits of timestamp high
  const header = 0x80 | timestampHigh;
  // Timestamp byte: high bit set + 7 bits of timestamp low
  const tsByte = 0x80 | timestampLow;

  return new Uint8Array([header, tsByte, ...midiMessage]);
}

/**
 * Create a BLE MIDI packet with multiple messages batched together.
 * This is more efficient and reliable than sending separate packets.
 * Uses running status when consecutive messages have the same status byte.
 *
 * @param midiMessages - Array of MIDI messages (e.g., [[0x90, 60, 80], [0x90, 64, 80]])
 * @returns BLE MIDI packet with all messages
 */
export function createBatchedBLEMidiPacket(midiMessages: number[][]): Uint8Array {
  if (!midiMessages.length) return new Uint8Array(0);

  const timestamp = Date.now() & 0x1fff;
  const timestampHigh = (timestamp >> 7) & 0x3f;
  const timestampLow = timestamp & 0x7f;

  const header = 0x80 | timestampHigh;
  const tsByte = 0x80 | timestampLow;

  // Build packet: header + (timestamp + message) for each, using running status
  const bytes: number[] = [header];
  let lastStatus: number | null = null;

  for (const msg of midiMessages) {
    const [status, ...data] = msg;
    bytes.push(tsByte);

    // Use running status if same as previous
    if (status === lastStatus) {
      bytes.push(...data);
    } else {
      bytes.push(status, ...data);
      lastStatus = status;
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Send a MIDI message over BLE.
 * Wraps the write operation in try-catch to prevent unhandled promise rejections
 * when the BLE connection is lost or the device becomes unavailable.
 *
 * @param characteristic - The MIDI characteristic
 * @param midiMessage - Raw MIDI message bytes
 * @throws Logs error and re-throws if write fails (allows caller to handle disconnection)
 */
export async function sendBLEMidiMessage(
  characteristic: BluetoothRemoteGATTCharacteristic,
  midiMessage: number[]
): Promise<void> {
  const packet = createBLEMidiPacket(midiMessage);
  try {
    await characteristic.writeValueWithoutResponse(packet as unknown as BufferSource);
  } catch (err) {
    console.error("BLE MIDI write failed:", (err as Error).message);
    throw err; // Re-throw to allow callers to handle disconnection
  }
}

/**
 * Send a Note On message over BLE MIDI.
 *
 * @param characteristic - The MIDI characteristic
 * @param channel - MIDI channel (0-15)
 * @param note - MIDI note number (0-127)
 * @param velocity - Note velocity (0-127)
 */
export async function sendBLENoteOn(
  characteristic: BluetoothRemoteGATTCharacteristic,
  channel: MIDIChannel,
  note: MIDINote,
  velocity: MIDIVelocity
): Promise<void> {
  const status = 0x90 | (channel & 0x0f);
  await sendBLEMidiMessage(characteristic, [status, note, velocity]);
}

/**
 * Send a Note Off message over BLE MIDI.
 *
 * @param characteristic - The MIDI characteristic
 * @param channel - MIDI channel (0-15)
 * @param note - MIDI note number (0-127)
 * @param velocity - Release velocity (usually 0)
 */
export async function sendBLENoteOff(
  characteristic: BluetoothRemoteGATTCharacteristic,
  channel: MIDIChannel,
  note: MIDINote,
  velocity: MIDIVelocity = 0
): Promise<void> {
  const status = 0x80 | (channel & 0x0f);
  await sendBLEMidiMessage(characteristic, [status, note, velocity]);
}

/**
 * Send All Notes Off (CC 123) over BLE MIDI.
 *
 * @param characteristic - The MIDI characteristic
 * @param channel - MIDI channel (0-15)
 */
export async function sendBLEAllNotesOff(
  characteristic: BluetoothRemoteGATTCharacteristic,
  channel: MIDIChannel
): Promise<void> {
  const status = 0xb0 | (channel & 0x0f);
  await sendBLEMidiMessage(characteristic, [status, 123, 0]);
}

/**
 * Send All Notes Off to all channels over BLE MIDI.
 *
 * @param characteristic - The MIDI characteristic
 */
export async function sendBLEPanic(
  characteristic: BluetoothRemoteGATTCharacteristic
): Promise<void> {
  for (let channel = 0; channel < 16; channel++) {
    await sendBLEAllNotesOff(characteristic, channel);
  }
}

/**
 * Send multiple Note On messages as a single batched BLE MIDI packet.
 * Much more reliable than sending individual packets for chords.
 *
 * @param characteristic - The MIDI characteristic
 * @param channel - MIDI channel (0-15)
 * @param notes - Array of MIDI note numbers
 * @param velocity - Note velocity (0-127)
 */
export async function sendBLEChordOn(
  characteristic: BluetoothRemoteGATTCharacteristic,
  channel: MIDIChannel,
  notes: MIDINote[],
  velocity: MIDIVelocity
): Promise<void> {
  const status = 0x90 | (channel & 0x0f);
  const messages = notes.map((note) => [status, note, velocity]);
  const packet = createBatchedBLEMidiPacket(messages);
  await characteristic.writeValueWithoutResponse(packet as unknown as BufferSource);
}

/**
 * Send multiple Note Off messages as a single batched BLE MIDI packet.
 *
 * @param characteristic - The MIDI characteristic
 * @param channel - MIDI channel (0-15)
 * @param notes - Array of MIDI note numbers
 */
export async function sendBLEChordOff(
  characteristic: BluetoothRemoteGATTCharacteristic,
  channel: MIDIChannel,
  notes: MIDINote[]
): Promise<void> {
  const status = 0x80 | (channel & 0x0f);
  const messages = notes.map((note) => [status, note, 0]);
  const packet = createBatchedBLEMidiPacket(messages);
  await characteristic.writeValueWithoutResponse(packet as unknown as BufferSource);
}

/**
 * Get the number of data bytes for a channel message.
 * @param status - MIDI status byte (0x80-0xEF)
 * @returns Number of data bytes (1 or 2)
 */
function getDataByteCount(status: number): number {
  const type = status & 0xf0;
  switch (type) {
    case 0xc0: // Program change
    case 0xd0: // Channel pressure
      return 1;
    default: // Note off, Note on, Poly pressure, CC, Pitch bend
      return 2;
  }
}

/**
 * Parse a BLE MIDI packet and extract MIDI messages.
 *
 * BLE MIDI format uses a state machine:
 * - Header byte: 10xxxxxx (0x80-0xBF, 6 bits of timestamp high)
 * - Each MIDI message is preceded by a timestamp: 1xxxxxxx (0x80-0xFF)
 * - MIDI data bytes have high bit clear: 0xxxxxxx
 *
 * Key insight: After header, the next byte MUST be a timestamp (even if it's 0xF8).
 * After each complete MIDI message, the next byte is another timestamp.
 * This is how we distinguish timestamp 0xF8 from MIDI clock 0xF8.
 *
 * @param dataView - The raw BLE MIDI packet data
 * @returns Array of MIDI messages (e.g., [[0xf8], [0x90, 60, 80]])
 */
export function parseBLEMidiPacket(dataView: DataView): number[][] {
  const messages: number[][] = [];
  const length = dataView.byteLength;

  if (length < 3) return messages; // Minimum: header + timestamp + 1 midi byte

  let i = 0;

  // Read and validate header (must be 10xxxxxx = 0x80-0xBF)
  const header = dataView.getUint8(i++);
  if ((header & 0xc0) !== 0x80) return messages;

  let runningStatus: number | null = null;

  while (i < length) {
    // STATE: EXPECT_TIMESTAMP
    // After header or after each MIDI message, we expect a timestamp byte
    const timestamp = dataView.getUint8(i++);

    // Timestamp must have high bit set (1xxxxxxx = 0x80-0xFF)
    if ((timestamp & 0x80) === 0) {
      // Invalid - not a timestamp. Could be malformed packet.
      break;
    }

    if (i >= length) break;

    // STATE: EXPECT_MIDI
    // Now read the MIDI message that follows this timestamp
    const midiStart = dataView.getUint8(i);

    // System realtime (0xF8-0xFF) - single byte messages
    if (midiStart >= 0xf8) {
      messages.push([midiStart]);
      i++;
      continue;
    }

    // System common (0xF0-0xF7) - SysEx etc, skip for now
    if (midiStart >= 0xf0) {
      // Skip until we find another timestamp (high bit set) or end
      i++;
      while (i < length && (dataView.getUint8(i) & 0x80) === 0) {
        i++;
      }
      continue;
    }

    // Channel message - check for status byte or running status
    let status: number;
    if ((midiStart & 0x80) !== 0) {
      // New status byte (0x80-0xEF)
      status = midiStart;
      runningStatus = status;
      i++;
    } else {
      // Running status - midiStart is actually first data byte
      if (runningStatus === null) {
        // No running status available, skip this byte
        i++;
        continue;
      }
      status = runningStatus;
    }

    // Read data bytes based on message type
    const dataCount = getDataByteCount(status);
    const msg: number[] = [status];

    // If we used running status, midiStart is already the first data byte
    if ((midiStart & 0x80) === 0) {
      msg.push(midiStart & 0x7f);
    }

    // Read remaining data bytes
    while (msg.length < dataCount + 1 && i < length) {
      const dataByte = dataView.getUint8(i);
      // Data bytes must have high bit clear
      if ((dataByte & 0x80) !== 0) {
        // Hit a timestamp - stop reading data
        break;
      }
      msg.push(dataByte & 0x7f);
      i++;
    }

    // Only add complete messages
    if (msg.length === dataCount + 1) {
      messages.push(msg);
    }
  }

  return messages;
}

/** BLE MIDI notification event handler type */
type BLEMidiNotificationHandler = (event: Event) => void;

/**
 * Set up a listener for incoming BLE MIDI messages.
 * @param characteristic - The MIDI characteristic
 * @param onMessage - Callback for each MIDI message received
 * @returns Cleanup function to remove the listener
 */
export function addBLEMidiListener(
  characteristic: BluetoothRemoteGATTCharacteristic,
  onMessage: (message: number[]) => void
): () => void {
  const handleNotification: BLEMidiNotificationHandler = (event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (target.value) {
      const messages = parseBLEMidiPacket(target.value);
      for (const msg of messages) {
        onMessage(msg);
      }
    }
  };

  characteristic.addEventListener("characteristicvaluechanged", handleNotification);

  return () => {
    characteristic.removeEventListener("characteristicvaluechanged", handleNotification);
  };
}
