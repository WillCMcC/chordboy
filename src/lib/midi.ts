/**
 * Web MIDI API Utility Functions
 * Handles MIDI connection, device enumeration, and message sending
 */

import type {
  MIDINote,
  MIDIChannel,
  MIDIVelocity,
  MIDIOutputDevice,
  MIDIInputDevice,
} from "../types";

/**
 * Request access to MIDI devices
 * @returns MIDI access object or throws if unsupported/denied
 */
export async function requestMIDIAccess(): Promise<MIDIAccess> {
  if (!navigator.requestMIDIAccess) {
    throw new Error(
      "Web MIDI API is not supported in this browser. Please use Chrome, Edge, or Opera."
    );
  }

  try {
    const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    return midiAccess;
  } catch (error) {
    console.error("Failed to get MIDI access:", error);
    throw new Error(
      "MIDI access denied. Please grant permission in your browser settings."
    );
  }
}

/**
 * Get all available MIDI output devices
 * @param midiAccess - The MIDI access object
 * @returns Array of MIDI output devices
 */
export function getMIDIOutputs(midiAccess: MIDIAccess | null): MIDIOutputDevice[] {
  if (!midiAccess) return [];

  const outputs: MIDIOutputDevice[] = [];
  midiAccess.outputs.forEach((output) => {
    // Filter out outputs with empty names (virtual ports with no real device)
    if (!output.name || output.name.trim() === "") return;

    outputs.push({
      id: output.id,
      name: output.name,
      manufacturer: output.manufacturer || "",
      state: output.state,
      connection: output.connection,
      output: output, // Store the actual MIDIOutput object
    });
  });

  return outputs;
}

/**
 * Get all available MIDI input devices
 * @param midiAccess - The MIDI access object
 * @returns Array of MIDI input devices
 */
export function getMIDIInputs(midiAccess: MIDIAccess | null): MIDIInputDevice[] {
  if (!midiAccess) return [];

  const inputs: MIDIInputDevice[] = [];
  midiAccess.inputs.forEach((input) => {
    // Filter out inputs with empty names (virtual ports with no real device)
    if (!input.name || input.name.trim() === "") return;

    inputs.push({
      id: input.id,
      name: input.name,
      manufacturer: input.manufacturer || "",
      state: input.state,
      connection: input.connection,
      input: input, // Store the actual MIDIInput object
    });
  });

  return inputs;
}

/**
 * MIDI Clock message constants (for receiving)
 */
export const MIDI_CLOCK = 0xf8;
export const MIDI_START = 0xfa;
export const MIDI_STOP = 0xfc;
export const MIDI_CONTINUE = 0xfb;

/**
 * Send a MIDI Note On message
 * @param output - The MIDI output device
 * @param channel - MIDI channel (0-15, where 0 = channel 1)
 * @param note - MIDI note number (0-127)
 * @param velocity - Note velocity (0-127)
 */
export function sendNoteOn(
  output: MIDIOutput | null | undefined,
  channel: MIDIChannel = 0,
  note: MIDINote,
  velocity: MIDIVelocity = 80
): void {
  if (!output) {
    console.warn("No MIDI output device selected");
    return;
  }

  // MIDI Note On: 0x90 + channel (144 + channel)
  const status = 0x90 + channel;
  const message: number[] = [status, note, velocity];

  try {
    output.send(message);
  } catch (error) {
    console.error("Failed to send Note On:", error);
  }
}

/**
 * Send a MIDI Note Off message
 * @param output - The MIDI output device
 * @param channel - MIDI channel (0-15, where 0 = channel 1)
 * @param note - MIDI note number (0-127)
 * @param velocity - Release velocity (usually 0 or 64)
 */
export function sendNoteOff(
  output: MIDIOutput | null | undefined,
  channel: MIDIChannel = 0,
  note: MIDINote,
  velocity: MIDIVelocity = 0
): void {
  if (!output) {
    console.warn("No MIDI output device selected");
    return;
  }

  // MIDI Note Off: 0x80 + channel (128 + channel)
  const status = 0x80 + channel;
  const message: number[] = [status, note, velocity];

  try {
    output.send(message);
  } catch (error) {
    console.error("Failed to send Note Off:", error);
  }
}

/**
 * Send All Notes Off message (CC 123)
 * This is a "panic" button to stop all currently playing notes
 * @param output - The MIDI output device
 * @param channel - MIDI channel (0-15, where 0 = channel 1)
 */
export function sendAllNotesOff(
  output: MIDIOutput | null | undefined,
  channel: MIDIChannel = 0
): void {
  if (!output) {
    console.warn("No MIDI output device selected");
    return;
  }

  // MIDI Control Change: 0xB0 + channel (176 + channel)
  // CC 123 = All Notes Off
  const status = 0xb0 + channel;
  const message: number[] = [status, 123, 0];

  try {
    output.send(message);
  } catch (error) {
    console.error("Failed to send All Notes Off:", error);
  }
}

/**
 * Send All Notes Off to all channels
 * @param output - The MIDI output device
 */
export function sendPanic(output: MIDIOutput | null | undefined): void {
  if (!output) {
    console.warn("No MIDI output device selected");
    return;
  }

  // Send All Notes Off to all 16 MIDI channels
  for (let channel = 0; channel < 16; channel++) {
    sendAllNotesOff(output, channel);
  }
}

/**
 * Check if Web MIDI API is supported
 * @returns True if supported, false otherwise
 */
export function isMIDISupported(): boolean {
  return typeof navigator.requestMIDIAccess === "function";
}

/**
 * Send MIDI Clock pulse
 * @param output - The MIDI output device
 */
export function sendMIDIClock(output: MIDIOutput | null | undefined): void {
  if (!output) return;
  try {
    output.send([MIDI_CLOCK]);
  } catch (error) {
    console.error("Failed to send MIDI Clock:", error);
  }
}

/**
 * Send MIDI Start message
 * @param output - The MIDI output device
 */
export function sendMIDIStart(output: MIDIOutput | null | undefined): void {
  if (!output) return;
  try {
    output.send([MIDI_START]);
  } catch (error) {
    console.error("Failed to send MIDI Start:", error);
  }
}

/**
 * Send MIDI Stop message
 * @param output - The MIDI output device
 */
export function sendMIDIStop(output: MIDIOutput | null | undefined): void {
  if (!output) return;
  try {
    output.send([MIDI_STOP]);
  } catch (error) {
    console.error("Failed to send MIDI Stop:", error);
  }
}

/**
 * Send MIDI Continue message
 * @param output - The MIDI output device
 */
export function sendMIDIContinue(output: MIDIOutput | null | undefined): void {
  if (!output) return;
  try {
    output.send([MIDI_CONTINUE]);
  } catch (error) {
    console.error("Failed to send MIDI Continue:", error);
  }
}

/**
 * Send MIDI Pitch Bend message
 * @param output - The MIDI output device
 * @param channel - MIDI channel (0-15)
 * @param value - Pitch bend value (0-16383, 8192 = center/no bend)
 *
 * Pitch bend range is typically +/- 2 semitones by default.
 * value 0 = max bend down, 8192 = center, 16383 = max bend up
 */
export function sendPitchBend(
  output: MIDIOutput | null | undefined,
  channel: MIDIChannel = 0,
  value: number = 8192
): void {
  if (!output) return;

  // Clamp to valid range
  const clamped = Math.max(0, Math.min(16383, Math.round(value)));

  // MIDI Pitch Bend: 0xE0 + channel
  const status = 0xe0 + channel;
  const lsb = clamped & 0x7f; // Lower 7 bits
  const msb = (clamped >> 7) & 0x7f; // Upper 7 bits

  try {
    output.send([status, lsb, msb]);
  } catch (error) {
    console.error("Failed to send Pitch Bend:", error);
  }
}

/**
 * Convert semitones to pitch bend value.
 * Assumes standard +/- 2 semitone range (can be changed via RPN).
 *
 * @param semitones - Number of semitones to bend (-2 to +2 for standard range)
 * @param range - Pitch bend range in semitones (default: 2)
 * @returns Pitch bend value (0-16383)
 */
export function semitonesToPitchBend(semitones: number, range: number = 2): number {
  // Center is 8192, full range is 0-16383
  // So +range semitones = 16383, -range semitones = 0
  const normalized = semitones / range; // -1 to +1
  const clamped = Math.max(-1, Math.min(1, normalized));
  // Note: MIDI pitch bend is asymmetric - 8192 above center, 8191 below
  // This means full bend down = 0, full bend up = 16383 (not 16384)
  const multiplier = clamped >= 0 ? 8191 : 8192;
  return Math.round(8192 + clamped * multiplier);
}

/**
 * Reset pitch bend to center (no bend)
 * @param output - The MIDI output device
 * @param channel - MIDI channel (0-15)
 */
export function resetPitchBend(
  output: MIDIOutput | null | undefined,
  channel: MIDIChannel = 0
): void {
  sendPitchBend(output, channel, 8192);
}
