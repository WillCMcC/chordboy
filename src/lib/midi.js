/**
 * Web MIDI API Utility Functions
 * Handles MIDI connection, device enumeration, and message sending
 */

/**
 * Request access to MIDI devices
 * @returns {Promise<MIDIAccess|null>} MIDI access object or null if unsupported/denied
 */
export async function requestMIDIAccess() {
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
 * @param {MIDIAccess} midiAccess - The MIDI access object
 * @returns {Array} Array of MIDI output devices
 */
export function getMIDIOutputs(midiAccess) {
  if (!midiAccess) return [];

  const outputs = [];
  midiAccess.outputs.forEach((output) => {
    outputs.push({
      id: output.id,
      name: output.name,
      manufacturer: output.manufacturer,
      state: output.state,
      connection: output.connection,
      output: output, // Store the actual MIDIOutput object
    });
  });

  return outputs;
}

/**
 * Get all available MIDI input devices
 * @param {MIDIAccess} midiAccess - The MIDI access object
 * @returns {Array} Array of MIDI input devices
 */
export function getMIDIInputs(midiAccess) {
  if (!midiAccess) return [];

  const inputs = [];
  midiAccess.inputs.forEach((input) => {
    inputs.push({
      id: input.id,
      name: input.name,
      manufacturer: input.manufacturer,
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
 * @param {MIDIOutput} output - The MIDI output device
 * @param {number} channel - MIDI channel (0-15, where 0 = channel 1)
 * @param {number} note - MIDI note number (0-127)
 * @param {number} velocity - Note velocity (0-127)
 */
export function sendNoteOn(output, channel = 0, note, velocity = 80) {
  if (!output) {
    console.warn("No MIDI output device selected");
    return;
  }

  // MIDI Note On: 0x90 + channel (144 + channel)
  const status = 0x90 + channel;
  const message = [status, note, velocity];

  try {
    output.send(message);
    console.log(
      `MIDI Note On: Ch${channel + 1}, Note ${note}, Vel ${velocity}`
    );
  } catch (error) {
    console.error("Failed to send Note On:", error);
  }
}

/**
 * Send a MIDI Note Off message
 * @param {MIDIOutput} output - The MIDI output device
 * @param {number} channel - MIDI channel (0-15, where 0 = channel 1)
 * @param {number} note - MIDI note number (0-127)
 * @param {number} velocity - Release velocity (usually 0 or 64)
 */
export function sendNoteOff(output, channel = 0, note, velocity = 0) {
  if (!output) {
    console.warn("No MIDI output device selected");
    return;
  }

  // MIDI Note Off: 0x80 + channel (128 + channel)
  const status = 0x80 + channel;
  const message = [status, note, velocity];

  try {
    output.send(message);
    console.log(`MIDI Note Off: Ch${channel + 1}, Note ${note}`);
  } catch (error) {
    console.error("Failed to send Note Off:", error);
  }
}

/**
 * Send All Notes Off message (CC 123)
 * This is a "panic" button to stop all currently playing notes
 * @param {MIDIOutput} output - The MIDI output device
 * @param {number} channel - MIDI channel (0-15, where 0 = channel 1)
 */
export function sendAllNotesOff(output, channel = 0) {
  if (!output) {
    console.warn("No MIDI output device selected");
    return;
  }

  // MIDI Control Change: 0xB0 + channel (176 + channel)
  // CC 123 = All Notes Off
  const status = 0xb0 + channel;
  const message = [status, 123, 0];

  try {
    output.send(message);
    console.log(`MIDI All Notes Off: Ch${channel + 1}`);
  } catch (error) {
    console.error("Failed to send All Notes Off:", error);
  }
}

/**
 * Send All Notes Off to all channels
 * @param {MIDIOutput} output - The MIDI output device
 */
export function sendPanic(output) {
  if (!output) {
    console.warn("No MIDI output device selected");
    return;
  }

  // Send All Notes Off to all 16 MIDI channels
  for (let channel = 0; channel < 16; channel++) {
    sendAllNotesOff(output, channel);
  }

  console.log("MIDI Panic: All notes off on all channels");
}

/**
 * Check if Web MIDI API is supported
 * @returns {boolean} True if supported, false otherwise
 */
export function isMIDISupported() {
  return typeof navigator.requestMIDIAccess === "function";
}

/**
 * Send MIDI Clock pulse
 * @param {MIDIOutput} output - The MIDI output device
 */
export function sendMIDIClock(output) {
  if (!output) return;
  try {
    output.send([MIDI_CLOCK]);
  } catch (error) {
    console.error("Failed to send MIDI Clock:", error);
  }
}

/**
 * Send MIDI Start message
 * @param {MIDIOutput} output - The MIDI output device
 */
export function sendMIDIStart(output) {
  if (!output) return;
  try {
    output.send([MIDI_START]);
    console.log("MIDI Start");
  } catch (error) {
    console.error("Failed to send MIDI Start:", error);
  }
}

/**
 * Send MIDI Stop message
 * @param {MIDIOutput} output - The MIDI output device
 */
export function sendMIDIStop(output) {
  if (!output) return;
  try {
    output.send([MIDI_STOP]);
    console.log("MIDI Stop");
  } catch (error) {
    console.error("Failed to send MIDI Stop:", error);
  }
}

/**
 * Send MIDI Continue message
 * @param {MIDIOutput} output - The MIDI output device
 */
export function sendMIDIContinue(output) {
  if (!output) return;
  try {
    output.send([MIDI_CONTINUE]);
    console.log("MIDI Continue");
  } catch (error) {
    console.error("Failed to send MIDI Continue:", error);
  }
}
