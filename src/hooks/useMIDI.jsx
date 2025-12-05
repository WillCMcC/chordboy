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

const MIDIContext = createContext(null);

/**
 * MIDIProvider - Manages MIDI connection state and provides MIDI functions
 */
export function MIDIProvider({ children }) {
  const [midiAccess, setMidiAccess] = useState(null);
  const [outputs, setOutputs] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [selectedInput, setSelectedInput] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [channel, setChannel] = useState(0); // MIDI channel (0-15, where 0 = channel 1)
  const [velocity, setVelocity] = useState(80); // Default velocity
  const [currentNotes, setCurrentNotes] = useState([]); // Track currently playing notes
  const [humanize, setHumanize] = useState(0); // Humanization amount (0-100)
  const currentNoteRef = useRef(currentNotes);
  const humanizeTimeoutsRef = useRef([]); // Track pending humanize timeouts

  // MIDI clock callbacks (set by useTransport when sync is enabled)
  const onMidiClockRef = useRef(null);
  const onMidiStartRef = useRef(null);
  const onMidiStopRef = useRef(null);

  // Maximum delay in ms at 100% humanization
  // At 100%, notes can be staggered up to 150ms apart for audible arpeggiation
  const MAX_HUMANIZE_DELAY = 150;
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
      const availableInputs = getMIDIInputs(access);
      setOutputs(availableOutputs);
      setInputs(availableInputs);

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

      // Auto-select first available input (for clock sync)
      if (availableInputs.length > 0) {
        console.log("Available MIDI inputs:", availableInputs.map(i => i.name).join(", "));
      }

      // Listen for device changes
      access.onstatechange = (event) => {
        console.log(
          "MIDI device state changed:",
          event.port.name,
          event.port.state
        );
        const updatedOutputs = getMIDIOutputs(access);
        const updatedInputs = getMIDIInputs(access);
        setOutputs(updatedOutputs);
        setInputs(updatedInputs);

        // If current output device was disconnected, try to reconnect to first available
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

        // If current input device was disconnected, clear it
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
   * Select a specific MIDI input device (for clock sync)
   */
  const selectInput = useCallback(
    (inputId) => {
      // If null/undefined, clear the selection
      if (!inputId) {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(null);
        console.log("Cleared MIDI input selection");
        return;
      }

      const input = inputs.find((i) => i.id === inputId);
      if (input) {
        // Clear old input listener
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(input.input);
        console.log("Selected MIDI input:", input.name);
      }
    },
    [inputs, selectedInput]
  );

  /**
   * Set up MIDI clock callbacks (called by useTransport)
   */
  const setClockCallbacks = useCallback(({ onClock, onStart, onStop }) => {
    onMidiClockRef.current = onClock;
    onMidiStartRef.current = onStart;
    onMidiStopRef.current = onStop;
  }, []);

  /**
   * Handle incoming MIDI messages on selected input
   */
  useEffect(() => {
    if (!selectedInput) return;

    const handleMidiMessage = (event) => {
      const [status] = event.data;

      switch (status) {
        case MIDI_CLOCK:
          if (onMidiClockRef.current) {
            onMidiClockRef.current();
          }
          break;
        case MIDI_START:
          console.log("MIDI Start received");
          if (onMidiStartRef.current) {
            onMidiStartRef.current();
          }
          break;
        case MIDI_STOP:
          console.log("MIDI Stop received");
          if (onMidiStopRef.current) {
            onMidiStopRef.current();
          }
          break;
        case MIDI_CONTINUE:
          console.log("MIDI Continue received");
          // Treat continue like start for now
          if (onMidiStartRef.current) {
            onMidiStartRef.current();
          }
          break;
      }
    };

    selectedInput.onmidimessage = handleMidiMessage;
    console.log("Listening for MIDI clock on:", selectedInput.name);

    return () => {
      selectedInput.onmidimessage = null;
    };
  }, [selectedInput]);

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
   * Generate humanization offsets for notes
   * Uses triangular distribution for natural feel
   */
  const getHumanizeOffsets = useCallback(
    (noteCount) => {
      if (humanize === 0 || noteCount <= 1) {
        return new Array(noteCount).fill(0);
      }

      const maxDelay = (humanize / 100) * MAX_HUMANIZE_DELAY;

      // Generate random offsets with triangular distribution
      return Array.from({ length: noteCount }, () => {
        const r1 = Math.random();
        const r2 = Math.random();
        const triangular = (r1 + r2) / 2;
        return triangular * maxDelay;
      });
    },
    [humanize]
  );

  /**
   * Clear any pending humanize timeouts
   */
  const clearHumanizeTimeouts = useCallback(() => {
    humanizeTimeoutsRef.current.forEach((t) => clearTimeout(t));
    humanizeTimeoutsRef.current = [];
  }, []);

  /**
   * Play multiple notes (chord)
   * Smart diff: only stops notes that are being removed, only starts notes that are new
   * Notes that remain the same continue sustaining without re-triggering
   * Supports humanization for staggered note timing
   */
  const playChord = useCallback(
    (notes, vel = velocity) => {
      if (!selectedOutput || !notes || notes.length === 0) return;

      // Clear any pending humanize timeouts from previous chord
      clearHumanizeTimeouts();

      const newNotesSet = new Set(notes);
      const currentNotesSet = new Set(currentNotes);

      // Find notes to stop (in current but not in new)
      const notesToStop = currentNotes.filter((note) => !newNotesSet.has(note));

      // Find notes to start (in new but not in current)
      const notesToStart = notes.filter((note) => !currentNotesSet.has(note));

      // Stop removed notes immediately
      notesToStop.forEach((note) => {
        sendNoteOff(selectedOutput, channel, note);
      });

      // Start new notes with optional humanization
      if (humanize > 0 && notesToStart.length > 1) {
        const offsets = getHumanizeOffsets(notesToStart.length);
        notesToStart.forEach((note, index) => {
          const delay = offsets[index];
          if (delay === 0) {
            sendNoteOn(selectedOutput, channel, note, vel);
          } else {
            const timeout = setTimeout(() => {
              sendNoteOn(selectedOutput, channel, note, vel);
            }, delay);
            humanizeTimeoutsRef.current.push(timeout);
          }
        });
      } else {
        // No humanization, play all notes immediately
        notesToStart.forEach((note) => {
          sendNoteOn(selectedOutput, channel, note, vel);
        });
      }

      setCurrentNotes(notes);
    },
    [selectedOutput, channel, velocity, currentNotes, humanize, getHumanizeOffsets, clearHumanizeTimeouts]
  );

  /**
   * Retrigger a chord - forces all notes to stop and restart
   * Used by sequencer in retrig mode to ensure notes are re-articulated
   */
  const retriggerChord = useCallback(
    (notes, vel = velocity) => {
      if (!selectedOutput || !notes || notes.length === 0) return;

      // Clear any pending humanize timeouts
      clearHumanizeTimeouts();

      // Stop ALL current notes first
      currentNotes.forEach((note) => {
        sendNoteOff(selectedOutput, channel, note);
      });

      // Small delay to ensure note-off is processed before note-on
      // This creates a clear re-articulation
      setTimeout(() => {
        // Start all notes with optional humanization
        if (humanize > 0 && notes.length > 1) {
          const offsets = getHumanizeOffsets(notes.length);
          notes.forEach((note, index) => {
            const delay = offsets[index];
            if (delay === 0) {
              sendNoteOn(selectedOutput, channel, note, vel);
            } else {
              const timeout = setTimeout(() => {
                sendNoteOn(selectedOutput, channel, note, vel);
              }, delay);
              humanizeTimeoutsRef.current.push(timeout);
            }
          });
        } else {
          notes.forEach((note) => {
            sendNoteOn(selectedOutput, channel, note, vel);
          });
        }

        setCurrentNotes(notes);
      }, 5); // 5ms gap for clear re-articulation
    },
    [selectedOutput, channel, velocity, currentNotes, humanize, getHumanizeOffsets, clearHumanizeTimeouts]
  );

  /**
   * Stop all currently playing notes
   */
  const stopAllNotes = useCallback(() => {
    if (!selectedOutput) return;

    // Clear any pending humanize timeouts
    clearHumanizeTimeouts();

    currentNotes.forEach((note) => {
      sendNoteOff(selectedOutput, channel, note);
    });

    setCurrentNotes([]);
  }, [selectedOutput, channel, currentNotes, clearHumanizeTimeouts]);

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
        currentNoteRef.current.forEach((note) => {
          sendNoteOff(selectedOutput, channel, note);
        });
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
    // MIDI Clock functions (for external use - sending)
    sendMIDIClock: () => sendMIDIClock(selectedOutput),
    sendMIDIStart: () => sendMIDIStart(selectedOutput),
    sendMIDIStop: () => sendMIDIStop(selectedOutput),
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
