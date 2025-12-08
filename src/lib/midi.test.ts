import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendNoteOn,
  sendNoteOff,
  sendAllNotesOff,
  sendPanic,
  sendMIDIClock,
  sendMIDIStart,
  sendMIDIStop,
  sendMIDIContinue,
  sendPitchBend,
  semitonesToPitchBend,
  resetPitchBend,
  getMIDIOutputs,
  getMIDIInputs,
  isMIDISupported,
  MIDI_CLOCK,
  MIDI_START,
  MIDI_STOP,
  MIDI_CONTINUE,
} from "./midi";

// Create a mock MIDIOutput
function createMockMIDIOutput(): MIDIOutput {
  return {
    id: "test-output-1",
    name: "Test MIDI Output",
    manufacturer: "Test Manufacturer",
    state: "connected",
    connection: "open",
    type: "output",
    version: "1.0",
    send: vi.fn(),
    clear: vi.fn(),
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
    onstatechange: null,
  } as unknown as MIDIOutput;
}

// Create a mock MIDIInput
function createMockMIDIInput(): MIDIInput {
  return {
    id: "test-input-1",
    name: "Test MIDI Input",
    manufacturer: "Test Input Manufacturer",
    state: "connected",
    connection: "open",
    type: "input",
    version: "1.0",
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
    onstatechange: null,
    onmidimessage: null,
  } as unknown as MIDIInput;
}

// Create a mock MIDIAccess
function createMockMIDIAccess(
  outputs: MIDIOutput[] = [],
  inputs: MIDIInput[] = []
): MIDIAccess {
  const outputMap = new Map<string, MIDIOutput>();
  outputs.forEach((output) => outputMap.set(output.id, output));

  const inputMap = new Map<string, MIDIInput>();
  inputs.forEach((input) => inputMap.set(input.id, input));

  return {
    inputs: inputMap,
    outputs: outputMap,
    sysexEnabled: false,
    onstatechange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
  } as unknown as MIDIAccess;
}

describe("midi", () => {
  let mockOutput: MIDIOutput;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockOutput = createMockMIDIOutput();
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // MIDI Constants
  // ============================================================================

  describe("MIDI Constants", () => {
    it("should have correct MIDI clock constant (0xF8 = 248)", () => {
      expect(MIDI_CLOCK).toBe(0xf8);
      expect(MIDI_CLOCK).toBe(248);
    });

    it("should have correct MIDI start constant (0xFA = 250)", () => {
      expect(MIDI_START).toBe(0xfa);
      expect(MIDI_START).toBe(250);
    });

    it("should have correct MIDI stop constant (0xFC = 252)", () => {
      expect(MIDI_STOP).toBe(0xfc);
      expect(MIDI_STOP).toBe(252);
    });

    it("should have correct MIDI continue constant (0xFB = 251)", () => {
      expect(MIDI_CONTINUE).toBe(0xfb);
      expect(MIDI_CONTINUE).toBe(251);
    });
  });

  // ============================================================================
  // Note On Messages
  // ============================================================================

  describe("sendNoteOn", () => {
    it("should send correct Note On message for middle C", () => {
      sendNoteOn(mockOutput, 0, 60, 80);

      expect(mockOutput.send).toHaveBeenCalledWith([0x90, 60, 80]); // 144, 60, 80
    });

    it("should send correct Note On message with default channel 0", () => {
      sendNoteOn(mockOutput, undefined, 60, 100);

      expect(mockOutput.send).toHaveBeenCalledWith([0x90, 60, 100]);
    });

    it("should send correct Note On message with default velocity 80", () => {
      sendNoteOn(mockOutput, 0, 60);

      expect(mockOutput.send).toHaveBeenCalledWith([0x90, 60, 80]);
    });

    it("should use correct status byte for different MIDI channels", () => {
      // Channel 0 = status 0x90 (144)
      sendNoteOn(mockOutput, 0, 60, 80);
      expect(mockOutput.send).toHaveBeenCalledWith([0x90, 60, 80]);

      // Channel 1 = status 0x91 (145)
      sendNoteOn(mockOutput, 1, 60, 80);
      expect(mockOutput.send).toHaveBeenCalledWith([0x91, 60, 80]);

      // Channel 9 = status 0x99 (153) - typically drums
      sendNoteOn(mockOutput, 9, 60, 80);
      expect(mockOutput.send).toHaveBeenCalledWith([0x99, 60, 80]);

      // Channel 15 = status 0x9F (159)
      sendNoteOn(mockOutput, 15, 60, 80);
      expect(mockOutput.send).toHaveBeenCalledWith([0x9f, 60, 80]);
    });

    it("should handle boundary note values", () => {
      // Lowest MIDI note
      sendNoteOn(mockOutput, 0, 0, 80);
      expect(mockOutput.send).toHaveBeenCalledWith([0x90, 0, 80]);

      // Highest MIDI note
      sendNoteOn(mockOutput, 0, 127, 80);
      expect(mockOutput.send).toHaveBeenCalledWith([0x90, 127, 80]);
    });

    it("should handle boundary velocity values", () => {
      // Minimum velocity (note barely audible)
      sendNoteOn(mockOutput, 0, 60, 1);
      expect(mockOutput.send).toHaveBeenCalledWith([0x90, 60, 1]);

      // Maximum velocity
      sendNoteOn(mockOutput, 0, 60, 127);
      expect(mockOutput.send).toHaveBeenCalledWith([0x90, 60, 127]);
    });

    it("should warn and not crash when output is null", () => {
      sendNoteOn(null, 0, 60, 80);

      expect(consoleWarnSpy).toHaveBeenCalledWith("No MIDI output device selected");
      expect(mockOutput.send).not.toHaveBeenCalled();
    });

    it("should warn and not crash when output is undefined", () => {
      sendNoteOn(undefined, 0, 60, 80);

      expect(consoleWarnSpy).toHaveBeenCalledWith("No MIDI output device selected");
    });

    it("should handle send errors gracefully", () => {
      const errorOutput = createMockMIDIOutput();
      (errorOutput.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("MIDI send failed");
      });

      // Should not throw
      expect(() => sendNoteOn(errorOutput, 0, 60, 80)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send Note On:",
        expect.any(Error)
      );
    });
  });

  // ============================================================================
  // Note Off Messages
  // ============================================================================

  describe("sendNoteOff", () => {
    it("should send correct Note Off message for middle C", () => {
      sendNoteOff(mockOutput, 0, 60, 0);

      expect(mockOutput.send).toHaveBeenCalledWith([0x80, 60, 0]); // 128, 60, 0
    });

    it("should send correct Note Off message with default channel 0", () => {
      sendNoteOff(mockOutput, undefined, 60, 64);

      expect(mockOutput.send).toHaveBeenCalledWith([0x80, 60, 64]);
    });

    it("should send correct Note Off message with default velocity 0", () => {
      sendNoteOff(mockOutput, 0, 60);

      expect(mockOutput.send).toHaveBeenCalledWith([0x80, 60, 0]);
    });

    it("should use correct status byte for different MIDI channels", () => {
      // Channel 0 = status 0x80 (128)
      sendNoteOff(mockOutput, 0, 60, 0);
      expect(mockOutput.send).toHaveBeenCalledWith([0x80, 60, 0]);

      // Channel 1 = status 0x81 (129)
      sendNoteOff(mockOutput, 1, 60, 0);
      expect(mockOutput.send).toHaveBeenCalledWith([0x81, 60, 0]);

      // Channel 15 = status 0x8F (143)
      sendNoteOff(mockOutput, 15, 60, 0);
      expect(mockOutput.send).toHaveBeenCalledWith([0x8f, 60, 0]);
    });

    it("should handle boundary note values", () => {
      sendNoteOff(mockOutput, 0, 0, 0);
      expect(mockOutput.send).toHaveBeenCalledWith([0x80, 0, 0]);

      sendNoteOff(mockOutput, 0, 127, 0);
      expect(mockOutput.send).toHaveBeenCalledWith([0x80, 127, 0]);
    });

    it("should warn and not crash when output is null", () => {
      sendNoteOff(null, 0, 60, 0);

      expect(consoleWarnSpy).toHaveBeenCalledWith("No MIDI output device selected");
    });

    it("should handle send errors gracefully", () => {
      const errorOutput = createMockMIDIOutput();
      (errorOutput.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("MIDI send failed");
      });

      expect(() => sendNoteOff(errorOutput, 0, 60, 0)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send Note Off:",
        expect.any(Error)
      );
    });
  });

  // ============================================================================
  // Control Change Messages (All Notes Off)
  // ============================================================================

  describe("sendAllNotesOff", () => {
    it("should send CC 123 (All Notes Off) message", () => {
      sendAllNotesOff(mockOutput, 0);

      // 0xB0 + channel = Control Change, CC# 123 = All Notes Off, value 0
      expect(mockOutput.send).toHaveBeenCalledWith([0xb0, 123, 0]); // 176, 123, 0
    });

    it("should send to correct channel", () => {
      sendAllNotesOff(mockOutput, 5);

      expect(mockOutput.send).toHaveBeenCalledWith([0xb5, 123, 0]); // 181, 123, 0
    });

    it("should use default channel 0", () => {
      sendAllNotesOff(mockOutput);

      expect(mockOutput.send).toHaveBeenCalledWith([0xb0, 123, 0]);
    });

    it("should warn and not crash when output is null", () => {
      sendAllNotesOff(null, 0);

      expect(consoleWarnSpy).toHaveBeenCalledWith("No MIDI output device selected");
    });

    it("should handle send errors gracefully", () => {
      const errorOutput = createMockMIDIOutput();
      (errorOutput.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("MIDI send failed");
      });

      expect(() => sendAllNotesOff(errorOutput, 0)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send All Notes Off:",
        expect.any(Error)
      );
    });
  });

  describe("sendPanic", () => {
    it("should send All Notes Off to all 16 MIDI channels", () => {
      sendPanic(mockOutput);

      expect(mockOutput.send).toHaveBeenCalledTimes(16);

      // Verify all channels were called
      for (let channel = 0; channel < 16; channel++) {
        expect(mockOutput.send).toHaveBeenCalledWith([0xb0 + channel, 123, 0]);
      }
    });

    it("should warn and not crash when output is null", () => {
      sendPanic(null);

      expect(consoleWarnSpy).toHaveBeenCalledWith("No MIDI output device selected");
    });
  });

  // ============================================================================
  // MIDI Clock/Transport Messages
  // ============================================================================

  describe("sendMIDIClock", () => {
    it("should send MIDI clock message (0xF8)", () => {
      sendMIDIClock(mockOutput);

      expect(mockOutput.send).toHaveBeenCalledWith([0xf8]);
    });

    it("should not crash when output is null", () => {
      expect(() => sendMIDIClock(null)).not.toThrow();
    });

    it("should handle send errors gracefully", () => {
      const errorOutput = createMockMIDIOutput();
      (errorOutput.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("MIDI send failed");
      });

      expect(() => sendMIDIClock(errorOutput)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send MIDI Clock:",
        expect.any(Error)
      );
    });
  });

  describe("sendMIDIStart", () => {
    it("should send MIDI start message (0xFA)", () => {
      sendMIDIStart(mockOutput);

      expect(mockOutput.send).toHaveBeenCalledWith([0xfa]);
    });

    it("should not crash when output is null", () => {
      expect(() => sendMIDIStart(null)).not.toThrow();
    });

    it("should handle send errors gracefully", () => {
      const errorOutput = createMockMIDIOutput();
      (errorOutput.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("MIDI send failed");
      });

      expect(() => sendMIDIStart(errorOutput)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send MIDI Start:",
        expect.any(Error)
      );
    });
  });

  describe("sendMIDIStop", () => {
    it("should send MIDI stop message (0xFC)", () => {
      sendMIDIStop(mockOutput);

      expect(mockOutput.send).toHaveBeenCalledWith([0xfc]);
    });

    it("should not crash when output is null", () => {
      expect(() => sendMIDIStop(null)).not.toThrow();
    });

    it("should handle send errors gracefully", () => {
      const errorOutput = createMockMIDIOutput();
      (errorOutput.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("MIDI send failed");
      });

      expect(() => sendMIDIStop(errorOutput)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send MIDI Stop:",
        expect.any(Error)
      );
    });
  });

  describe("sendMIDIContinue", () => {
    it("should send MIDI continue message (0xFB)", () => {
      sendMIDIContinue(mockOutput);

      expect(mockOutput.send).toHaveBeenCalledWith([0xfb]);
    });

    it("should not crash when output is null", () => {
      expect(() => sendMIDIContinue(null)).not.toThrow();
    });

    it("should handle send errors gracefully", () => {
      const errorOutput = createMockMIDIOutput();
      (errorOutput.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("MIDI send failed");
      });

      expect(() => sendMIDIContinue(errorOutput)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send MIDI Continue:",
        expect.any(Error)
      );
    });
  });

  // ============================================================================
  // Pitch Bend Messages
  // ============================================================================

  describe("sendPitchBend", () => {
    it("should send center pitch bend (8192) correctly", () => {
      sendPitchBend(mockOutput, 0, 8192);

      // Status: 0xE0 + channel = 224
      // 8192 = 0x2000 -> LSB = 0x00, MSB = 0x40
      expect(mockOutput.send).toHaveBeenCalledWith([0xe0, 0x00, 0x40]);
    });

    it("should send minimum pitch bend (0) correctly", () => {
      sendPitchBend(mockOutput, 0, 0);

      // 0 = LSB 0, MSB 0
      expect(mockOutput.send).toHaveBeenCalledWith([0xe0, 0x00, 0x00]);
    });

    it("should send maximum pitch bend (16383) correctly", () => {
      sendPitchBend(mockOutput, 0, 16383);

      // 16383 = 0x3FFF -> LSB = 0x7F, MSB = 0x7F
      expect(mockOutput.send).toHaveBeenCalledWith([0xe0, 0x7f, 0x7f]);
    });

    it("should clamp values above 16383", () => {
      sendPitchBend(mockOutput, 0, 20000);

      // Should be clamped to 16383
      expect(mockOutput.send).toHaveBeenCalledWith([0xe0, 0x7f, 0x7f]);
    });

    it("should clamp negative values to 0", () => {
      sendPitchBend(mockOutput, 0, -100);

      // Should be clamped to 0
      expect(mockOutput.send).toHaveBeenCalledWith([0xe0, 0x00, 0x00]);
    });

    it("should use correct status byte for different channels", () => {
      sendPitchBend(mockOutput, 5, 8192);

      // Status: 0xE0 + 5 = 0xE5 (229)
      expect(mockOutput.send).toHaveBeenCalledWith([0xe5, 0x00, 0x40]);
    });

    it("should use default value of 8192 (center)", () => {
      sendPitchBend(mockOutput, 0);

      expect(mockOutput.send).toHaveBeenCalledWith([0xe0, 0x00, 0x40]);
    });

    it("should not crash when output is null", () => {
      expect(() => sendPitchBend(null, 0, 8192)).not.toThrow();
    });

    it("should handle send errors gracefully", () => {
      const errorOutput = createMockMIDIOutput();
      (errorOutput.send as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("MIDI send failed");
      });

      expect(() => sendPitchBend(errorOutput, 0, 8192)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send Pitch Bend:",
        expect.any(Error)
      );
    });
  });

  describe("semitonesToPitchBend", () => {
    it("should return center (8192) for 0 semitones", () => {
      expect(semitonesToPitchBend(0)).toBe(8192);
    });

    it("should return maximum (16383) for +2 semitones with default range", () => {
      expect(semitonesToPitchBend(2)).toBe(16383);
    });

    it("should return minimum (1) for -2 semitones with default range", () => {
      // -2 semitones with range 2 = -1 normalized = 8192 - 8191 = 1
      expect(semitonesToPitchBend(-2)).toBe(1);
    });

    it("should calculate correct value for +1 semitone", () => {
      // +1 semitone with range 2 = 0.5 normalized = 8192 + 4095.5 = 12288 (rounded)
      const result = semitonesToPitchBend(1);
      expect(result).toBeGreaterThan(8192);
      expect(result).toBeLessThan(16383);
      expect(result).toBe(12288); // 8192 + 0.5 * 8191 = 12287.5 -> 12288
    });

    it("should calculate correct value for -1 semitone", () => {
      const result = semitonesToPitchBend(-1);
      expect(result).toBeLessThan(8192);
      expect(result).toBeGreaterThan(0);
      expect(result).toBe(4097); // 8192 + (-0.5) * 8191 = 4096.5 -> 4097 (rounded)
    });

    it("should work with custom pitch bend range", () => {
      // +12 semitones with range 12 (octave) = max
      expect(semitonesToPitchBend(12, 12)).toBe(16383);

      // +6 semitones with range 12 = 0.5 normalized
      const result = semitonesToPitchBend(6, 12);
      expect(result).toBe(12288);
    });

    it("should clamp values beyond range", () => {
      // +5 semitones with range 2 should clamp to max
      expect(semitonesToPitchBend(5, 2)).toBe(16383);

      // -5 semitones with range 2 should clamp to min
      expect(semitonesToPitchBend(-5, 2)).toBe(1);
    });

    it("should handle fractional semitones", () => {
      // 0.5 semitone = quarter tone
      const result = semitonesToPitchBend(0.5);
      expect(result).toBeGreaterThan(8192);
      expect(result).toBe(10240); // 8192 + 0.25 * 8191 = 10239.75 -> 10240
    });
  });

  describe("resetPitchBend", () => {
    it("should send center pitch bend value", () => {
      resetPitchBend(mockOutput, 0);

      // Should send 8192 (center)
      expect(mockOutput.send).toHaveBeenCalledWith([0xe0, 0x00, 0x40]);
    });

    it("should reset on correct channel", () => {
      resetPitchBend(mockOutput, 10);

      expect(mockOutput.send).toHaveBeenCalledWith([0xea, 0x00, 0x40]);
    });
  });

  // ============================================================================
  // Device Enumeration
  // ============================================================================

  describe("getMIDIOutputs", () => {
    it("should return empty array when midiAccess is null", () => {
      const outputs = getMIDIOutputs(null);
      expect(outputs).toEqual([]);
    });

    it("should return array of MIDI output devices", () => {
      const output1 = createMockMIDIOutput();
      const output2 = {
        ...createMockMIDIOutput(),
        id: "test-output-2",
        name: "Second Output",
      } as unknown as MIDIOutput;

      const midiAccess = createMockMIDIAccess([output1, output2]);
      const outputs = getMIDIOutputs(midiAccess);

      expect(outputs).toHaveLength(2);
      expect(outputs[0].id).toBe("test-output-1");
      expect(outputs[0].name).toBe("Test MIDI Output");
      expect(outputs[1].id).toBe("test-output-2");
      expect(outputs[1].name).toBe("Second Output");
    });

    it("should filter out outputs with empty names", () => {
      const output1 = createMockMIDIOutput();
      const emptyNameOutput = {
        ...createMockMIDIOutput(),
        id: "empty-output",
        name: "",
      } as unknown as MIDIOutput;
      const whitespaceNameOutput = {
        ...createMockMIDIOutput(),
        id: "whitespace-output",
        name: "   ",
      } as unknown as MIDIOutput;

      const midiAccess = createMockMIDIAccess([
        output1,
        emptyNameOutput,
        whitespaceNameOutput,
      ]);
      const outputs = getMIDIOutputs(midiAccess);

      expect(outputs).toHaveLength(1);
      expect(outputs[0].id).toBe("test-output-1");
    });

    it("should include all device metadata", () => {
      const output = createMockMIDIOutput();
      const midiAccess = createMockMIDIAccess([output]);
      const outputs = getMIDIOutputs(midiAccess);

      expect(outputs[0]).toMatchObject({
        id: "test-output-1",
        name: "Test MIDI Output",
        manufacturer: "Test Manufacturer",
        state: "connected",
        connection: "open",
      });
      expect(outputs[0].output).toBe(output);
    });

    it("should handle missing manufacturer", () => {
      const output = {
        ...createMockMIDIOutput(),
        manufacturer: undefined,
      } as unknown as MIDIOutput;
      const midiAccess = createMockMIDIAccess([output]);
      const outputs = getMIDIOutputs(midiAccess);

      expect(outputs[0].manufacturer).toBe("");
    });
  });

  describe("getMIDIInputs", () => {
    it("should return empty array when midiAccess is null", () => {
      const inputs = getMIDIInputs(null);
      expect(inputs).toEqual([]);
    });

    it("should return array of MIDI input devices", () => {
      const input1 = createMockMIDIInput();
      const input2 = {
        ...createMockMIDIInput(),
        id: "test-input-2",
        name: "Second Input",
      } as unknown as MIDIInput;

      const midiAccess = createMockMIDIAccess([], [input1, input2]);
      const inputs = getMIDIInputs(midiAccess);

      expect(inputs).toHaveLength(2);
      expect(inputs[0].id).toBe("test-input-1");
      expect(inputs[0].name).toBe("Test MIDI Input");
      expect(inputs[1].id).toBe("test-input-2");
      expect(inputs[1].name).toBe("Second Input");
    });

    it("should filter out inputs with empty names", () => {
      const input1 = createMockMIDIInput();
      const emptyNameInput = {
        ...createMockMIDIInput(),
        id: "empty-input",
        name: "",
      } as unknown as MIDIInput;

      const midiAccess = createMockMIDIAccess([], [input1, emptyNameInput]);
      const inputs = getMIDIInputs(midiAccess);

      expect(inputs).toHaveLength(1);
      expect(inputs[0].id).toBe("test-input-1");
    });

    it("should include all device metadata", () => {
      const input = createMockMIDIInput();
      const midiAccess = createMockMIDIAccess([], [input]);
      const inputs = getMIDIInputs(midiAccess);

      expect(inputs[0]).toMatchObject({
        id: "test-input-1",
        name: "Test MIDI Input",
        manufacturer: "Test Input Manufacturer",
        state: "connected",
        connection: "open",
      });
      expect(inputs[0].input).toBe(input);
    });
  });

  // ============================================================================
  // Browser API Support Check
  // ============================================================================

  describe("isMIDISupported", () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      // Restore original navigator
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });

    it("should return true when requestMIDIAccess is available", () => {
      Object.defineProperty(global, "navigator", {
        value: {
          requestMIDIAccess: vi.fn(),
        },
        writable: true,
      });

      expect(isMIDISupported()).toBe(true);
    });

    it("should return false when requestMIDIAccess is not available", () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
      });

      expect(isMIDISupported()).toBe(false);
    });
  });

  // ============================================================================
  // Edge Cases and Integration Scenarios
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle rapid successive note on/off messages", () => {
      // Simulate rapid chord changes
      sendNoteOn(mockOutput, 0, 60, 80);
      sendNoteOn(mockOutput, 0, 64, 80);
      sendNoteOn(mockOutput, 0, 67, 80);
      sendNoteOff(mockOutput, 0, 60);
      sendNoteOff(mockOutput, 0, 64);
      sendNoteOff(mockOutput, 0, 67);

      expect(mockOutput.send).toHaveBeenCalledTimes(6);
    });

    it("should handle all 16 MIDI channels", () => {
      for (let channel = 0; channel < 16; channel++) {
        sendNoteOn(mockOutput, channel, 60, 80);
      }

      expect(mockOutput.send).toHaveBeenCalledTimes(16);

      // Verify each channel has correct status byte
      for (let channel = 0; channel < 16; channel++) {
        expect(mockOutput.send).toHaveBeenCalledWith([0x90 + channel, 60, 80]);
      }
    });

    it("should handle full velocity range", () => {
      // Test velocity 0 (used in some Note Off implementations)
      sendNoteOn(mockOutput, 0, 60, 0);
      expect(mockOutput.send).toHaveBeenCalledWith([0x90, 60, 0]);

      // Test maximum velocity
      sendNoteOn(mockOutput, 0, 60, 127);
      expect(mockOutput.send).toHaveBeenCalledWith([0x90, 60, 127]);
    });
  });
});

/**
 * NOTE: The following functions require browser APIs and are best tested
 * through integration/E2E testing:
 *
 * - requestMIDIAccess(): Requires navigator.requestMIDIAccess
 *   - Tests would need to mock the entire Web MIDI API
 *   - Should be tested in browser environment with real MIDI devices
 *
 * Manual/Integration Test Checklist:
 * 1. Connect a MIDI output device
 * 2. Call requestMIDIAccess() - verify it resolves
 * 3. Use getMIDIOutputs() - verify device appears in list
 * 4. Select device and send notes - verify sound output
 * 5. Test sendPanic() - verify all notes stop
 * 6. Test in Chrome/Edge/Opera (supported browsers)
 * 7. Test error handling in Firefox/Safari (unsupported)
 */
