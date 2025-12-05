/**
 * MIDI Hook and Provider
 * Manages MIDI connection, device selection, and note playback.
 * Provides context for MIDI functionality throughout the app.
 *
 * @module hooks/useMIDI
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  requestMIDIAccess,
  getMIDIOutputs,
  getMIDIInputs,
  sendNoteOn,
  sendNoteOff,
  sendPanic,
  isMIDISupported,
  sendMIDIClock,
  sendMIDIStart,
  sendMIDIStop,
  MIDI_CLOCK,
  MIDI_START,
  MIDI_STOP,
  MIDI_CONTINUE,
} from "../lib/midi";
import { getHumanizeOffsets, createHumanizeManager } from "../lib/humanize";

/** @type {React.Context} MIDI context for provider/consumer pattern */
const MIDIContext = createContext(null);

/**
 * MIDI Provider Component
 * Manages MIDI connection state and provides MIDI functions to children.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 *
 * @example
 * <MIDIProvider>
 *   <App />
 * </MIDIProvider>
 */
export function MIDIProvider({ children }) {
  // Connection state
  const [midiAccess, setMidiAccess] = useState(null);
  const [outputs, setOutputs] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [selectedInput, setSelectedInput] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Playback settings
  const [channel, setChannel] = useState(0);
  const [velocity, setVelocity] = useState(80);
  const [humanize, setHumanize] = useState(0);

  // Currently playing notes
  const [currentNotes, setCurrentNotes] = useState([]);
  const currentNotesRef = useRef(currentNotes);

  // Keep ref updated
  useEffect(() => {
    currentNotesRef.current = currentNotes;
  }, [currentNotes]);

  // Humanization timeout manager
  const humanizeManager = useRef(createHumanizeManager());

  // MIDI clock callbacks (set by useTransport)
  const onMidiClockRef = useRef(null);
  const onMidiStartRef = useRef(null);
  const onMidiStopRef = useRef(null);

  /**
   * Connect to MIDI and enumerate devices.
   */
  const connectMIDI = useCallback(async () => {
    if (!isMIDISupported()) {
      setError(
        "Web MIDI API is not supported in this browser. Please use Chrome, Edge, or Opera."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const access = await requestMIDIAccess();
      setMidiAccess(access);

      const availableOutputs = getMIDIOutputs(access);
      const availableInputs = getMIDIInputs(access);
      setOutputs(availableOutputs);
      setInputs(availableInputs);

      // Auto-select first available output
      if (availableOutputs.length > 0) {
        setSelectedOutput(availableOutputs[0].output);
        setIsConnected(true);
      } else {
        setError(
          "No MIDI output devices found. Please connect a MIDI device or virtual MIDI port."
        );
      }

      // Listen for device changes
      access.onstatechange = (event) => {
        const updatedOutputs = getMIDIOutputs(access);
        const updatedInputs = getMIDIInputs(access);
        setOutputs(updatedOutputs);
        setInputs(updatedInputs);

        // Handle output device disconnection
        if (
          event.port.state === "disconnected" &&
          selectedOutput?.id === event.port.id
        ) {
          if (updatedOutputs.length > 0) {
            setSelectedOutput(updatedOutputs[0].output);
          } else {
            setSelectedOutput(null);
            setIsConnected(false);
            setError("All MIDI devices disconnected");
          }
        }

        // Handle input device disconnection
        if (
          event.port.state === "disconnected" &&
          selectedInput?.id === event.port.id
        ) {
          setSelectedInput(null);
        }
      };
    } catch (err) {
      setError(err.message);
      setIsConnected(false);
      console.error("MIDI connection error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOutput?.id, selectedInput?.id]);

  /**
   * Select a MIDI output device.
   * @param {string} outputId - Device ID to select
   */
  const selectOutput = useCallback(
    (outputId) => {
      const output = outputs.find((o) => o.id === outputId);
      if (output) {
        setSelectedOutput(output.output);
        setIsConnected(true);
      }
    },
    [outputs]
  );

  /**
   * Select a MIDI input device (for clock sync).
   * @param {string|null} inputId - Device ID to select, or null to clear
   */
  const selectInput = useCallback(
    (inputId) => {
      if (!inputId) {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(null);
        return;
      }

      const input = inputs.find((i) => i.id === inputId);
      if (input) {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(input.input);
      }
    },
    [inputs, selectedInput]
  );

  /**
   * Set MIDI clock callbacks (called by useTransport).
   * @param {Object} callbacks - Clock callback functions
   */
  const setClockCallbacks = useCallback(({ onClock, onStart, onStop }) => {
    onMidiClockRef.current = onClock;
    onMidiStartRef.current = onStart;
    onMidiStopRef.current = onStop;
  }, []);

  /**
   * Handle incoming MIDI messages on selected input.
   */
  useEffect(() => {
    if (!selectedInput) return;

    const handleMidiMessage = (event) => {
      const [status] = event.data;

      switch (status) {
        case MIDI_CLOCK:
          onMidiClockRef.current?.();
          break;
        case MIDI_START:
          onMidiStartRef.current?.();
          break;
        case MIDI_STOP:
          onMidiStopRef.current?.();
          break;
        case MIDI_CONTINUE:
          onMidiStartRef.current?.();
          break;
      }
    };

    selectedInput.onmidimessage = handleMidiMessage;
    return () => {
      selectedInput.onmidimessage = null;
    };
  }, [selectedInput]);

  /**
   * Play a single note.
   * @param {number} note - MIDI note number
   * @param {number} [vel] - Velocity (0-127)
   */
  const playNote = useCallback(
    (note, vel = velocity) => {
      if (!selectedOutput) return;
      sendNoteOn(selectedOutput, channel, note, vel);
      setCurrentNotes((prev) => [...prev, note]);
    },
    [selectedOutput, channel, velocity]
  );

  /**
   * Stop a single note.
   * @param {number} note - MIDI note number
   */
  const stopNote = useCallback(
    (note) => {
      if (!selectedOutput) return;
      sendNoteOff(selectedOutput, channel, note);
      setCurrentNotes((prev) => prev.filter((n) => n !== note));
    },
    [selectedOutput, channel]
  );

  /**
   * Play a chord with smart diffing.
   * Only stops notes being removed, only starts new notes.
   * Supports humanization for staggered timing.
   *
   * @param {number[]} notes - Array of MIDI note numbers
   * @param {number} [vel] - Velocity (0-127)
   */
  const playChord = useCallback(
    (notes, vel = velocity) => {
      if (!selectedOutput || !notes?.length) return;

      humanizeManager.current.clear();

      const currentNotesSnapshot = currentNotesRef.current;
      const newNotesSet = new Set(notes);
      const currentNotesSet = new Set(currentNotesSnapshot);

      // Stop removed notes immediately
      const notesToStop = currentNotesSnapshot.filter((n) => !newNotesSet.has(n));
      notesToStop.forEach((note) => sendNoteOff(selectedOutput, channel, note));

      // Start new notes with optional humanization
      const notesToStart = notes.filter((n) => !currentNotesSet.has(n));

      if (humanize > 0 && notesToStart.length > 1) {
        const offsets = getHumanizeOffsets(notesToStart.length, humanize);
        notesToStart.forEach((note, i) => {
          humanizeManager.current.schedule(
            () => sendNoteOn(selectedOutput, channel, note, vel),
            offsets[i]
          );
        });
      } else {
        notesToStart.forEach((note) =>
          sendNoteOn(selectedOutput, channel, note, vel)
        );
      }

      setCurrentNotes(notes);
    },
    [selectedOutput, channel, velocity, humanize]
  );

  /**
   * Retrigger a chord - forces all notes to stop and restart.
   * Used by sequencer in retrig mode for clear re-articulation.
   *
   * @param {number[]} notes - Array of MIDI note numbers
   * @param {number} [vel] - Velocity (0-127)
   */
  const retriggerChord = useCallback(
    (notes, vel = velocity) => {
      if (!selectedOutput || !notes?.length) return;

      humanizeManager.current.clear();

      // Stop all current notes
      currentNotesRef.current.forEach((note) =>
        sendNoteOff(selectedOutput, channel, note)
      );

      // Small delay for clear re-articulation
      setTimeout(() => {
        if (humanize > 0 && notes.length > 1) {
          const offsets = getHumanizeOffsets(notes.length, humanize);
          notes.forEach((note, i) => {
            humanizeManager.current.schedule(
              () => sendNoteOn(selectedOutput, channel, note, vel),
              offsets[i]
            );
          });
        } else {
          notes.forEach((note) =>
            sendNoteOn(selectedOutput, channel, note, vel)
          );
        }

        setCurrentNotes(notes);
      }, 5);
    },
    [selectedOutput, channel, velocity, humanize]
  );

  /**
   * Stop all currently playing notes.
   */
  const stopAllNotes = useCallback(() => {
    if (!selectedOutput) return;

    humanizeManager.current.clear();
    currentNotesRef.current.forEach((note) => sendNoteOff(selectedOutput, channel, note));
    setCurrentNotes([]);
  }, [selectedOutput, channel]);

  /**
   * MIDI panic - stop all notes on all channels.
   */
  const panic = useCallback(() => {
    if (!selectedOutput) return;
    sendPanic(selectedOutput);
    setCurrentNotes([]);
  }, [selectedOutput]);

  // Auto-connect on mount
  useEffect(() => {
    connectMIDI();
  }, []);

  // Cleanup on unmount and page refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (selectedOutput) {
        sendPanic(selectedOutput);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (selectedOutput && currentNotesRef.current.length > 0) {
        currentNotesRef.current.forEach((note) =>
          sendNoteOff(selectedOutput, channel, note)
        );
      }
    };
  }, [selectedOutput, channel]);

  const value = {
    // State
    midiAccess,
    outputs,
    inputs,
    selectedOutput,
    selectedInput,
    isConnected,
    error,
    isLoading,
    channel,
    velocity,
    currentNotes,
    humanize,

    // Actions
    connectMIDI,
    selectOutput,
    selectInput,
    setClockCallbacks,
    playNote,
    stopNote,
    playChord,
    retriggerChord,
    stopAllNotes,
    panic,
    setChannel,
    setVelocity,
    setHumanize,

    // MIDI Clock functions
    sendMIDIClock: () => sendMIDIClock(selectedOutput),
    sendMIDIStart: () => sendMIDIStart(selectedOutput),
    sendMIDIStop: () => sendMIDIStop(selectedOutput),
  };

  return <MIDIContext.Provider value={value}>{children}</MIDIContext.Provider>;
}

/**
 * Hook to access MIDI context.
 * Must be used within a MIDIProvider.
 *
 * @returns {Object} MIDI context value
 * @throws {Error} If used outside of MIDIProvider
 *
 * @example
 * const { playChord, stopAllNotes, isConnected } = useMIDI();
 */
export function useMIDI() {
  const context = useContext(MIDIContext);
  if (!context) {
    throw new Error("useMIDI must be used within a MIDIProvider");
  }
  return context;
}
