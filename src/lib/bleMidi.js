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
 * Delay helper for connection timing.
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Connect to a BLE MIDI device and get the MIDI characteristic.
 * Also starts notifications, which some hosts (like macOS) require
 * to recognize the connection as a valid MIDI connection.
 *
 * Includes retry logic with exponential backoff for Android compatibility.
 *
 * @param {BluetoothDevice} device - The BLE device to connect to
 * @param {number} maxRetries - Maximum connection attempts (default: 3)
 * @returns {Promise<{server: BluetoothRemoteGATTServer, characteristic: BluetoothRemoteGATTCharacteristic}>}
 */
export async function connectToBLEMidiDevice(device, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`BLE MIDI connection attempt ${attempt}/${maxRetries}`);

      const server = await device.gatt.connect();

      // Delay before service discovery - Android needs time after GATT connect
      await delay(attempt === 1 ? 500 : 800);

      // Try service discovery with retries - Android sometimes needs multiple attempts
      let service;
      for (let serviceAttempt = 1; serviceAttempt <= 3; serviceAttempt++) {
        try {
          service = await server.getPrimaryService(BLE_MIDI_SERVICE_UUID);
          break;
        } catch (serviceErr) {
          if (serviceAttempt === 3) throw serviceErr;
          console.log(`Service discovery attempt ${serviceAttempt} failed, retrying...`);
          await delay(500 * serviceAttempt);
        }
      }

      // Small delay before characteristic access
      await delay(100);

      const characteristic = await service.getCharacteristic(BLE_MIDI_CHARACTERISTIC_UUID);

      // Start notifications - required by some hosts (macOS) to recognize as MIDI
      try {
        await characteristic.startNotifications();
      } catch (err) {
        console.warn("Could not start BLE MIDI notifications:", err.message);
      }

      console.log("BLE MIDI connected successfully");
      return { server, characteristic };
    } catch (err) {
      lastError = err;
      console.warn(`BLE MIDI connection attempt ${attempt} failed:`, err.message);

      // Disconnect if partially connected
      if (device.gatt?.connected) {
        try {
          device.gatt.disconnect();
        } catch (disconnectErr) {
          // Ignore disconnect errors
        }
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
 * Create a BLE MIDI packet with multiple messages batched together.
 * This is more efficient and reliable than sending separate packets.
 * Uses running status when consecutive messages have the same status byte.
 *
 * @param {number[][]} midiMessages - Array of MIDI messages (e.g., [[0x90, 60, 80], [0x90, 64, 80]])
 * @returns {Uint8Array} BLE MIDI packet with all messages
 */
export function createBatchedBLEMidiPacket(midiMessages) {
  if (!midiMessages.length) return new Uint8Array(0);

  const timestamp = Date.now() & 0x1fff;
  const timestampHigh = (timestamp >> 7) & 0x3f;
  const timestampLow = timestamp & 0x7f;

  const header = 0x80 | timestampHigh;
  const tsByte = 0x80 | timestampLow;

  // Build packet: header + (timestamp + message) for each, using running status
  const bytes = [header];
  let lastStatus = null;

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

/**
 * Send multiple Note On messages as a single batched BLE MIDI packet.
 * Much more reliable than sending individual packets for chords.
 *
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - The MIDI characteristic
 * @param {number} channel - MIDI channel (0-15)
 * @param {number[]} notes - Array of MIDI note numbers
 * @param {number} velocity - Note velocity (0-127)
 */
export async function sendBLEChordOn(characteristic, channel, notes, velocity) {
  const status = 0x90 | (channel & 0x0f);
  const messages = notes.map((note) => [status, note, velocity]);
  const packet = createBatchedBLEMidiPacket(messages);
  await characteristic.writeValueWithoutResponse(packet);
}

/**
 * Send multiple Note Off messages as a single batched BLE MIDI packet.
 *
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - The MIDI characteristic
 * @param {number} channel - MIDI channel (0-15)
 * @param {number[]} notes - Array of MIDI note numbers
 */
export async function sendBLEChordOff(characteristic, channel, notes) {
  const status = 0x80 | (channel & 0x0f);
  const messages = notes.map((note) => [status, note, 0]);
  const packet = createBatchedBLEMidiPacket(messages);
  await characteristic.writeValueWithoutResponse(packet);
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
 * @param {DataView} dataView - The raw BLE MIDI packet data
 * @returns {number[][]} Array of MIDI messages (e.g., [[0xf8], [0x90, 60, 80]])
 */
export function parseBLEMidiPacket(dataView) {
  const messages = [];
  const length = dataView.byteLength;

  if (length < 3) return messages; // Minimum: header + timestamp + 1 midi byte

  let i = 0;

  // Read and validate header (must be 10xxxxxx = 0x80-0xBF)
  const header = dataView.getUint8(i++);
  if ((header & 0xc0) !== 0x80) return messages;

  let runningStatus = null;

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
    let status;
    if ((midiStart & 0x80) !== 0) {
      // New status byte (0x80-0xEF)
      status = midiStart;
      runningStatus = status;
      i++;
    } else {
      // Running status - midiStart is actually first data byte
      status = runningStatus;
      if (status === null) {
        // No running status available, skip this byte
        i++;
        continue;
      }
    }

    // Read data bytes based on message type
    const dataCount = getDataByteCount(status);
    const msg = [status];

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

/**
 * Get the number of data bytes for a channel message.
 * @param {number} status - MIDI status byte (0x80-0xEF)
 * @returns {number} Number of data bytes (1 or 2)
 */
function getDataByteCount(status) {
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
 * Set up a listener for incoming BLE MIDI messages.
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - The MIDI characteristic
 * @param {function(number[]): void} onMessage - Callback for each MIDI message received
 * @returns {function(): void} Cleanup function to remove the listener
 */
export function addBLEMidiListener(characteristic, onMessage) {
  const handleNotification = (event) => {
    const messages = parseBLEMidiPacket(event.target.value);
    for (const msg of messages) {
      onMessage(msg);
    }
  };

  characteristic.addEventListener("characteristicvaluechanged", handleNotification);

  return () => {
    characteristic.removeEventListener("characteristicvaluechanged", handleNotification);
  };
}
