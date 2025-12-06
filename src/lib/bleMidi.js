/**
 * BLE MIDI Utility Functions
 * Handles Bluetooth Low Energy MIDI connections using Web Bluetooth API.
 *
 * BLE MIDI uses a specific GATT service and characteristic for MIDI data.
 * Messages are wrapped with timestamps per the BLE MIDI specification.
 *
 * @module lib/bleMidi
 */

// BLE MIDI Service and Characteristic UUIDs (standard)
export const BLE_MIDI_SERVICE_UUID = "03b80e5a-ede8-4b33-a751-6ce34ec4c700";
export const BLE_MIDI_CHARACTERISTIC_UUID = "7772e5db-3868-4112-a1a9-f2669d106bf3";

/**
 * Check if Web Bluetooth is supported in this browser.
 * @returns {boolean} True if supported
 */
export function isBLESupported() {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Scan for and select a BLE MIDI device.
 * Opens the browser's Bluetooth device picker filtered to MIDI devices.
 *
 * @returns {Promise<BluetoothDevice>} The selected device
 * @throws {Error} If user cancels or Bluetooth unavailable
 */
export async function scanForBLEMidiDevice() {
  if (!isBLESupported()) {
    throw new Error("Web Bluetooth is not supported in this browser");
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [BLE_MIDI_SERVICE_UUID] }],
    optionalServices: [BLE_MIDI_SERVICE_UUID],
  });

  return device;
}

/**
 * Connect to a BLE MIDI device and get the MIDI characteristic.
 * Also starts notifications, which some hosts (like macOS) require
 * to recognize the connection as a valid MIDI connection.
 *
 * @param {BluetoothDevice} device - The BLE device to connect to
 * @returns {Promise<{server: BluetoothRemoteGATTServer, characteristic: BluetoothRemoteGATTCharacteristic}>}
 */
export async function connectToBLEMidiDevice(device) {
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(BLE_MIDI_SERVICE_UUID);
  const characteristic = await service.getCharacteristic(BLE_MIDI_CHARACTERISTIC_UUID);

  // Start notifications - required by some hosts (macOS) to recognize as MIDI
  try {
    await characteristic.startNotifications();
  } catch (err) {
    console.warn("Could not start BLE MIDI notifications:", err.message);
  }

  return { server, characteristic };
}

/**
 * Disconnect from a BLE MIDI device.
 *
 * @param {BluetoothRemoteGATTServer} server - The GATT server to disconnect
 */
export function disconnectBLEMidiDevice(server) {
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
 * @param {number[]} midiMessage - Raw MIDI message bytes (e.g., [0x90, 60, 80])
 * @returns {Uint8Array} BLE MIDI packet
 */
export function createBLEMidiPacket(midiMessage) {
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
 * Send a MIDI message over BLE.
 *
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - The MIDI characteristic
 * @param {number[]} midiMessage - Raw MIDI message bytes
 */
export async function sendBLEMidiMessage(characteristic, midiMessage) {
  const packet = createBLEMidiPacket(midiMessage);
  await characteristic.writeValueWithoutResponse(packet);
}

/**
 * Send a Note On message over BLE MIDI.
 *
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - The MIDI characteristic
 * @param {number} channel - MIDI channel (0-15)
 * @param {number} note - MIDI note number (0-127)
 * @param {number} velocity - Note velocity (0-127)
 */
export async function sendBLENoteOn(characteristic, channel, note, velocity) {
  const status = 0x90 | (channel & 0x0f);
  await sendBLEMidiMessage(characteristic, [status, note, velocity]);
}

/**
 * Send a Note Off message over BLE MIDI.
 *
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - The MIDI characteristic
 * @param {number} channel - MIDI channel (0-15)
 * @param {number} note - MIDI note number (0-127)
 * @param {number} velocity - Release velocity (usually 0)
 */
export async function sendBLENoteOff(characteristic, channel, note, velocity = 0) {
  const status = 0x80 | (channel & 0x0f);
  await sendBLEMidiMessage(characteristic, [status, note, velocity]);
}

/**
 * Send All Notes Off (CC 123) over BLE MIDI.
 *
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - The MIDI characteristic
 * @param {number} channel - MIDI channel (0-15)
 */
export async function sendBLEAllNotesOff(characteristic, channel) {
  const status = 0xb0 | (channel & 0x0f);
  await sendBLEMidiMessage(characteristic, [status, 123, 0]);
}

/**
 * Send All Notes Off to all channels over BLE MIDI.
 *
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - The MIDI characteristic
 */
export async function sendBLEPanic(characteristic) {
  for (let channel = 0; channel < 16; channel++) {
    await sendBLEAllNotesOff(characteristic, channel);
  }
}
