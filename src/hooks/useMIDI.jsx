import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  requestMIDIAccess,
  getMIDIOutputs,
  sendNoteOn,
  sendNoteOff,
  sendPanic,
  isMIDISupported,
} from "../lib/midi";

const MIDIContext = createContext(null);

/**
 * MIDIProvider - Manages MIDI connection state and provides MIDI functions
 */
export function MIDIProvider({ children }) {
  const [midiAccess, setMidiAccess] = useState(null);
  const [outputs, setOutputs] = useState([]);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [channel, setChannel] = useState(0); // MIDI channel (0-15, where 0 = channel 1)
  const [velocity, setVelocity] = useState(80); // Default velocity
  const [currentNotes, setCurrentNotes] = useState([]); // Track currently playing notes

  /**
   * Connect to MIDI and enumerate devices
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
      setOutputs(availableOutputs);

      // Auto-select first available output
      if (availableOutputs.length > 0) {
        setSelectedOutput(availableOutputs[0].output);
        setIsConnected(true);
        console.log("Auto-selected MIDI output:", availableOutputs[0].name);
      } else {
        setError(
          "No MIDI output devices found. Please connect a MIDI device or virtual MIDI port."
        );
      }

      // Listen for device changes
      access.onstatechange = (event) => {
        console.log(
          "MIDI device state changed:",
          event.port.name,
          event.port.state
        );
        const updatedOutputs = getMIDIOutputs(access);
        setOutputs(updatedOutputs);

        // If current device was disconnected, try to reconnect to first available
        if (
          event.port.state === "disconnected" &&
          selectedOutput?.id === event.port.id
        ) {
          if (updatedOutputs.length > 0) {
            setSelectedOutput(updatedOutputs[0].output);
            console.log("Switched to:", updatedOutputs[0].name);
          } else {
            setSelectedOutput(null);
            setIsConnected(false);
            setError("All MIDI devices disconnected");
          }
        }
      };
    } catch (err) {
      setError(err.message);
      setIsConnected(false);
      console.error("MIDI connection error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOutput?.id]);

  /**
   * Select a specific MIDI output device
   */
  const selectOutput = useCallback(
    (outputId) => {
      const output = outputs.find((o) => o.id === outputId);
      if (output) {
        setSelectedOutput(output.output);
        setIsConnected(true);
        console.log("Selected MIDI output:", output.name);
      }
    },
    [outputs]
  );

  /**
   * Play a single note
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
   * Stop a single note
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
   * Play multiple notes (chord)
   */
  const playChord = useCallback(
    (notes, vel = velocity) => {
      if (!selectedOutput || !notes || notes.length === 0) return;

      // Stop any currently playing notes first
      currentNotes.forEach((note) => {
        sendNoteOff(selectedOutput, channel, note);
      });

      // Play new chord
      notes.forEach((note) => {
        sendNoteOn(selectedOutput, channel, note, vel);
      });

      setCurrentNotes(notes);
    },
    [selectedOutput, channel, velocity, currentNotes]
  );

  /**
   * Stop all currently playing notes
   */
  const stopAllNotes = useCallback(() => {
    if (!selectedOutput) return;

    currentNotes.forEach((note) => {
      sendNoteOff(selectedOutput, channel, note);
    });

    setCurrentNotes([]);
  }, [selectedOutput, channel, currentNotes]);

  /**
   * MIDI panic - stop all notes on all channels
   */
  const panic = useCallback(() => {
    if (!selectedOutput) return;
    sendPanic(selectedOutput);
    setCurrentNotes([]);
  }, [selectedOutput]);

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    connectMIDI();
  }, []);

  // Cleanup on unmount and page refresh/navigation
  useEffect(() => {
    // Handle beforeunload (refresh, close, navigation)
    const handleBeforeUnload = () => {
      if (selectedOutput) {
        sendPanic(selectedOutput);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // Also cleanup when component unmounts
      if (selectedOutput && currentNotes.length > 0) {
        currentNotes.forEach((note) => {
          sendNoteOff(selectedOutput, channel, note);
        });
      }
    };
  }, [selectedOutput, currentNotes, channel]);

  const value = {
    // State
    midiAccess,
    outputs,
    selectedOutput,
    isConnected,
    error,
    isLoading,
    channel,
    velocity,
    currentNotes,

    // Actions
    connectMIDI,
    selectOutput,
    playNote,
    stopNote,
    playChord,
    stopAllNotes,
    panic,
    setChannel,
    setVelocity,
  };

  return <MIDIContext.Provider value={value}>{children}</MIDIContext.Provider>;
}

/**
 * Hook to use MIDI context
 */
export function useMIDI() {
  const context = useContext(MIDIContext);
  if (!context) {
    throw new Error("useMIDI must be used within a MIDIProvider");
  }
  return context;
}
