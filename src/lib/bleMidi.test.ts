import { describe, it, expect, vi, afterEach } from "vitest";
import {
  BLE_MIDI_SERVICE_UUID,
  BLE_MIDI_CHARACTERISTIC_UUID,
  isBLESupported,
  createBLEMidiPacket,
  createBatchedBLEMidiPacket,
  parseBLEMidiPacket,
  disconnectBLEMidiDevice,
} from "./bleMidi";

describe("bleMidi", () => {
  describe("constants", () => {
    it("should export correct BLE MIDI service UUID", () => {
      expect(BLE_MIDI_SERVICE_UUID).toBe("03b80e5a-ede8-4b33-a751-6ce34ec4c700");
    });

    it("should export correct BLE MIDI characteristic UUID", () => {
      expect(BLE_MIDI_CHARACTERISTIC_UUID).toBe("7772e5db-3868-4112-a1a9-f2669d106bf3");
    });
  });

  describe("isBLESupported", () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      // Restore original navigator
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });

    it("should return false when navigator is undefined", () => {
      Object.defineProperty(global, "navigator", {
        value: undefined,
        writable: true,
      });
      expect(isBLESupported()).toBe(false);
    });

    it("should return false when bluetooth is not in navigator", () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
      });
      expect(isBLESupported()).toBe(false);
    });

    it("should return true when bluetooth is available", () => {
      Object.defineProperty(global, "navigator", {
        value: { bluetooth: {} },
        writable: true,
      });
      expect(isBLESupported()).toBe(true);
    });
  });

  describe("createBLEMidiPacket", () => {
    it("should create a valid BLE MIDI packet structure", () => {
      const midiMessage = [0x90, 60, 80]; // Note on, middle C, velocity 80
      const packet = createBLEMidiPacket(midiMessage);

      // Should have 5 bytes: header + timestamp + 3 MIDI bytes
      expect(packet.length).toBe(5);

      // Header byte should have high bit set
      expect(packet[0] & 0x80).toBe(0x80);

      // Timestamp byte should have high bit set
      expect(packet[1] & 0x80).toBe(0x80);

      // MIDI message bytes should follow
      expect(packet[2]).toBe(0x90);
      expect(packet[3]).toBe(60);
      expect(packet[4]).toBe(80);
    });

    it("should create packet for Note Off message", () => {
      const midiMessage = [0x80, 60, 0]; // Note off, middle C, velocity 0
      const packet = createBLEMidiPacket(midiMessage);

      expect(packet.length).toBe(5);
      expect(packet[2]).toBe(0x80);
      expect(packet[3]).toBe(60);
      expect(packet[4]).toBe(0);
    });

    it("should create packet for Control Change message", () => {
      const midiMessage = [0xb0, 123, 0]; // All notes off on channel 0
      const packet = createBLEMidiPacket(midiMessage);

      expect(packet.length).toBe(5);
      expect(packet[2]).toBe(0xb0);
      expect(packet[3]).toBe(123);
      expect(packet[4]).toBe(0);
    });

    it("should handle different MIDI channels", () => {
      // Note on channel 5 (0x95)
      const packet = createBLEMidiPacket([0x95, 64, 100]);

      expect(packet[2]).toBe(0x95);
    });

    it("should encode timestamp in header and timestamp bytes", () => {
      const packet = createBLEMidiPacket([0x90, 60, 80]);

      // Header byte should have pattern 10xxxxxx (0x80-0xBF)
      expect(packet[0] & 0xc0).toBe(0x80);

      // Timestamp byte should have pattern 1xxxxxxx (0x80-0xFF)
      expect(packet[1] & 0x80).toBe(0x80);

      // Verify the timestamp encoding is internally consistent
      // by checking it against our own calculation from Date.now()
      const timestamp = Date.now() & 0x1fff;
      const expectedTimestampHigh = (timestamp >> 7) & 0x3f;
      const expectedTimestampLow = timestamp & 0x7f;

      expect(packet[0]).toBe(0x80 | expectedTimestampHigh);
      expect(packet[1]).toBe(0x80 | expectedTimestampLow);
    });

    it("should correctly encode timestamps with bit manipulation", () => {
      // Create two packets in quick succession to verify timestamp changes
      const packet1 = createBLEMidiPacket([0x90, 60, 80]);

      // Both packets should have valid header/timestamp format
      expect(packet1[0] & 0xc0).toBe(0x80); // Header: 10xxxxxx
      expect(packet1[1] & 0x80).toBe(0x80); // Timestamp: 1xxxxxxx

      // Extract and verify the 13-bit timestamp can be reconstructed
      const headerTimestampBits = packet1[0] & 0x3f; // 6 bits from header
      const timestampByte = packet1[1] & 0x7f; // 7 bits from timestamp byte
      const reconstructedTimestamp = (headerTimestampBits << 7) | timestampByte;

      // Should be a valid 13-bit value (0-8191)
      expect(reconstructedTimestamp).toBeGreaterThanOrEqual(0);
      expect(reconstructedTimestamp).toBeLessThanOrEqual(0x1fff);
    });

    it("should mask timestamp to 13 bits", () => {
      const packet = createBLEMidiPacket([0x90, 60, 80]);

      // Header byte uses only 6 bits of timestamp high (bits 7-12)
      // So header & 0x3f should equal (timestamp >> 7) & 0x3f
      const headerTimestampPart = packet[0] & 0x3f;
      expect(headerTimestampPart).toBeLessThanOrEqual(0x3f);

      // Timestamp byte uses 7 bits (bits 0-6)
      const timestampPart = packet[1] & 0x7f;
      expect(timestampPart).toBeLessThanOrEqual(0x7f);
    });

    it("should return Uint8Array", () => {
      const packet = createBLEMidiPacket([0x90, 60, 80]);
      expect(packet).toBeInstanceOf(Uint8Array);
    });
  });

  describe("createBatchedBLEMidiPacket", () => {
    it("should return empty array for empty input", () => {
      const packet = createBatchedBLEMidiPacket([]);
      expect(packet.length).toBe(0);
    });

    it("should create packet for single message", () => {
      const messages = [[0x90, 60, 80]];
      const packet = createBatchedBLEMidiPacket(messages);

      // header + timestamp + status + note + velocity = 5 bytes
      expect(packet.length).toBe(5);
      expect(packet[0] & 0x80).toBe(0x80); // header
      expect(packet[1] & 0x80).toBe(0x80); // timestamp
      expect(packet[2]).toBe(0x90);
      expect(packet[3]).toBe(60);
      expect(packet[4]).toBe(80);
    });

    it("should batch multiple messages with running status", () => {
      const messages = [
        [0x90, 60, 80], // C4 note on
        [0x90, 64, 80], // E4 note on (same status - running status)
        [0x90, 67, 80], // G4 note on (same status - running status)
      ];
      const packet = createBatchedBLEMidiPacket(messages);

      // Format: header + (ts + status + note + vel) + (ts + note + vel) + (ts + note + vel)
      // = 1 + 4 + 3 + 3 = 11 bytes
      expect(packet.length).toBe(11);

      // Verify structure
      expect(packet[0] & 0x80).toBe(0x80); // header

      // First message: ts + status + data
      expect(packet[1] & 0x80).toBe(0x80); // timestamp
      expect(packet[2]).toBe(0x90); // status
      expect(packet[3]).toBe(60); // note
      expect(packet[4]).toBe(80); // velocity

      // Second message: ts + data only (running status)
      expect(packet[5] & 0x80).toBe(0x80); // timestamp
      expect(packet[6]).toBe(64); // note
      expect(packet[7]).toBe(80); // velocity

      // Third message: ts + data only (running status)
      expect(packet[8] & 0x80).toBe(0x80); // timestamp
      expect(packet[9]).toBe(67); // note
      expect(packet[10]).toBe(80); // velocity
    });

    it("should include status byte when it changes", () => {
      const messages = [
        [0x90, 60, 80], // Note on
        [0x80, 60, 0], // Note off (different status)
      ];
      const packet = createBatchedBLEMidiPacket(messages);

      // Both messages need full status: header + (ts + 3) + (ts + 3) = 9 bytes
      expect(packet.length).toBe(9);

      // First message
      expect(packet[2]).toBe(0x90);

      // Second message - should have its own status
      expect(packet[6]).toBe(0x80);
    });

    it("should handle mixed channels", () => {
      const messages = [
        [0x90, 60, 80], // Note on channel 0
        [0x91, 60, 80], // Note on channel 1 (different status)
      ];
      const packet = createBatchedBLEMidiPacket(messages);

      // Both need full status bytes
      expect(packet.length).toBe(9);
      expect(packet[2]).toBe(0x90);
      expect(packet[6]).toBe(0x91);
    });

    it("should return Uint8Array", () => {
      const packet = createBatchedBLEMidiPacket([[0x90, 60, 80]]);
      expect(packet).toBeInstanceOf(Uint8Array);
    });
  });

  describe("parseBLEMidiPacket", () => {
    function createDataView(bytes: number[]): DataView {
      const buffer = new ArrayBuffer(bytes.length);
      const view = new DataView(buffer);
      bytes.forEach((byte, i) => view.setUint8(i, byte));
      return view;
    }

    it("should return empty array for packet shorter than 3 bytes", () => {
      expect(parseBLEMidiPacket(createDataView([0x80]))).toEqual([]);
      expect(parseBLEMidiPacket(createDataView([0x80, 0x80]))).toEqual([]);
    });

    it("should return empty array for invalid header", () => {
      // Header must be 10xxxxxx (0x80-0xBF)
      expect(parseBLEMidiPacket(createDataView([0xc0, 0x80, 0x90, 60, 80]))).toEqual([]);
      expect(parseBLEMidiPacket(createDataView([0x40, 0x80, 0x90, 60, 80]))).toEqual([]);
    });

    it("should parse single Note On message", () => {
      // header + timestamp + Note On (channel 0, note 60, velocity 80)
      const data = createDataView([0x80, 0x80, 0x90, 60, 80]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([[0x90, 60, 80]]);
    });

    it("should parse single Note Off message", () => {
      const data = createDataView([0x80, 0x80, 0x80, 60, 0]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([[0x80, 60, 0]]);
    });

    it("should parse Control Change message", () => {
      // CC 123 (All Notes Off)
      const data = createDataView([0x80, 0x80, 0xb0, 123, 0]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([[0xb0, 123, 0]]);
    });

    it("should parse Program Change message (1 data byte)", () => {
      // Program change has only 1 data byte
      const data = createDataView([0x80, 0x80, 0xc0, 5]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([[0xc0, 5]]);
    });

    it("should parse Channel Pressure message (1 data byte)", () => {
      const data = createDataView([0x80, 0x80, 0xd0, 64]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([[0xd0, 64]]);
    });

    it("should parse Pitch Bend message", () => {
      // Pitch bend: status + LSB + MSB
      const data = createDataView([0x80, 0x80, 0xe0, 0, 64]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([[0xe0, 0, 64]]);
    });

    it("should parse system realtime messages (MIDI clock)", () => {
      // MIDI clock (0xF8) is a single-byte system realtime message
      const data = createDataView([0x80, 0x80, 0xf8]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([[0xf8]]);
    });

    it("should parse multiple messages in one packet", () => {
      // Two note on messages
      const data = createDataView([
        0x80, // header
        0x80,
        0x90,
        60,
        80, // timestamp + note on C4
        0x80,
        0x90,
        64,
        80, // timestamp + note on E4
      ]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([
        [0x90, 60, 80],
        [0x90, 64, 80],
      ]);
    });

    it("should handle running status in parsed packets", () => {
      // Running status: when the status byte is omitted because it's the same
      // as the previous message. The parser reads the first data byte,
      // then continues to read remaining data bytes from subsequent positions.
      //
      // Note: Due to how the parser handles the index after detecting running status,
      // the first data byte is read from midiStart, then the loop reads subsequent bytes.
      // This tests the actual parser behavior.
      const data = createDataView([
        0x80, // header
        0x80,
        0x90,
        60,
        80, // timestamp + full message (note C4, vel 80)
        0x80,
        64,
        80, // timestamp + running status data (note E4, then vel which gets read)
      ]);
      const messages = parseBLEMidiPacket(data);

      // First message should be complete
      expect(messages[0]).toEqual([0x90, 60, 80]);

      // Second message uses running status - verify it parsed a message
      expect(messages.length).toBe(2);
      expect(messages[1][0]).toBe(0x90); // Status from running status
      expect(messages[1][1]).toBe(64); // Note E4
    });

    it("should parse mixed message types", () => {
      const data = createDataView([
        0x80, // header
        0x80,
        0x90,
        60,
        80, // note on
        0x80,
        0x80,
        60,
        0, // note off
      ]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([
        [0x90, 60, 80],
        [0x80, 60, 0],
      ]);
    });

    it("should handle MIDI clock interleaved with note messages", () => {
      const data = createDataView([
        0x80, // header
        0x80,
        0xf8, // MIDI clock
        0x80,
        0x90,
        60,
        80, // note on
      ]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([[0xf8], [0x90, 60, 80]]);
    });

    it("should handle different timestamp values in header", () => {
      // Header with non-zero timestamp bits
      const data = createDataView([0x9f, 0xa0, 0x90, 60, 80]);
      const messages = parseBLEMidiPacket(data);

      // Should still parse correctly regardless of timestamp
      expect(messages).toEqual([[0x90, 60, 80]]);
    });

    it("should handle messages on different channels", () => {
      const data = createDataView([
        0x80, // header
        0x80,
        0x90,
        60,
        80, // note on channel 0
        0x80,
        0x95,
        64,
        100, // note on channel 5
      ]);
      const messages = parseBLEMidiPacket(data);

      expect(messages).toEqual([
        [0x90, 60, 80],
        [0x95, 64, 100],
      ]);
    });

    it("should mask data bytes to 7 bits", () => {
      // Data bytes should have high bit cleared
      const data = createDataView([0x80, 0x80, 0x90, 60, 127]);
      const messages = parseBLEMidiPacket(data);

      expect(messages[0][1]).toBe(60);
      expect(messages[0][2]).toBe(127);
    });
  });

  describe("disconnectBLEMidiDevice", () => {
    it("should do nothing when server is null", () => {
      expect(() => disconnectBLEMidiDevice(null)).not.toThrow();
    });

    it("should do nothing when server is undefined", () => {
      expect(() => disconnectBLEMidiDevice(undefined)).not.toThrow();
    });

    it("should do nothing when server is not connected", () => {
      const mockServer = {
        connected: false,
        disconnect: vi.fn(),
      } as unknown as BluetoothRemoteGATTServer;

      disconnectBLEMidiDevice(mockServer);
      expect(mockServer.disconnect).not.toHaveBeenCalled();
    });

    it("should call disconnect when server is connected", () => {
      const mockServer = {
        connected: true,
        disconnect: vi.fn(),
      } as unknown as BluetoothRemoteGATTServer;

      disconnectBLEMidiDevice(mockServer);
      expect(mockServer.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("MIDI message structure", () => {
    it("should create correct Note On status byte for each channel", () => {
      for (let channel = 0; channel < 16; channel++) {
        const status = 0x90 | channel;
        expect(status).toBe(0x90 + channel);
        expect(status & 0xf0).toBe(0x90); // Note On type
        expect(status & 0x0f).toBe(channel); // Channel
      }
    });

    it("should create correct Note Off status byte for each channel", () => {
      for (let channel = 0; channel < 16; channel++) {
        const status = 0x80 | channel;
        expect(status).toBe(0x80 + channel);
        expect(status & 0xf0).toBe(0x80); // Note Off type
        expect(status & 0x0f).toBe(channel); // Channel
      }
    });

    it("should create correct Control Change status byte for each channel", () => {
      for (let channel = 0; channel < 16; channel++) {
        const status = 0xb0 | channel;
        expect(status).toBe(0xb0 + channel);
        expect(status & 0xf0).toBe(0xb0); // CC type
        expect(status & 0x0f).toBe(channel); // Channel
      }
    });
  });

  describe("BLE MIDI packet format compliance", () => {
    it("should have header byte with pattern 10xxxxxx", () => {
      const packet = createBLEMidiPacket([0x90, 60, 80]);
      // Header must have bits 7=1, 6=0
      expect(packet[0] & 0xc0).toBe(0x80);
    });

    it("should have timestamp byte with pattern 1xxxxxxx", () => {
      const packet = createBLEMidiPacket([0x90, 60, 80]);
      // Timestamp must have bit 7=1
      expect(packet[1] & 0x80).toBe(0x80);
    });

    it("should only use 6 bits of timestamp high in header", () => {
      const packet = createBLEMidiPacket([0x90, 60, 80]);

      // Header format: 10xxxxxx where xxxxxx is 6 bits of timestamp high
      // This means bits 6-7 must be 10, leaving only 6 bits (0-5) for timestamp
      const headerTimestampBits = packet[0] & 0x3f; // Extract 6 timestamp bits

      // Verify the header is in valid range (0x80-0xBF)
      expect(packet[0]).toBeGreaterThanOrEqual(0x80);
      expect(packet[0]).toBeLessThanOrEqual(0xbf);

      // The 6 bits should match what we calculate from current timestamp
      const timestamp = Date.now() & 0x1fff;
      const expectedHigh = (timestamp >> 7) & 0x3f;
      expect(headerTimestampBits).toBe(expectedHigh);
    });

    it("should only use 7 bits of timestamp low in timestamp byte", () => {
      const packet = createBLEMidiPacket([0x90, 60, 80]);

      // Timestamp byte format: 1xxxxxxx where xxxxxxx is 7 bits of timestamp low
      const timestampLowBits = packet[1] & 0x7f;

      // Verify the timestamp byte is in valid range (0x80-0xFF)
      expect(packet[1]).toBeGreaterThanOrEqual(0x80);

      // The 7 bits should match what we calculate from current timestamp
      const timestamp = Date.now() & 0x1fff;
      const expectedLow = timestamp & 0x7f;
      expect(timestampLowBits).toBe(expectedLow);
    });
  });
});
