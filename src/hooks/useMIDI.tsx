/**
 * MIDI Hook and Provider
 * Manages MIDI connection, device selection, and note playback.
 * Provides context for MIDI functionality throughout the app.
 *
 * @module hooks/useMIDI
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
import { appEvents } from "../lib/eventBus";
import { useEventSubscription } from "./useEventSubscription";
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
import {
  isBLESupported,
  scanForBLEMidiDevice,
  connectToBLEMidiDevice,
  disconnectBLEMidiDevice,
  sendBLENoteOn,
  sendBLENoteOff,
  sendBLEPanic,
  sendBLEChordOn,
  sendBLEChordOff,
  addBLEMidiListener,
} from "../lib/bleMidi";
import { getHumanizeOffsets, createHumanizeManager } from "../lib/humanize";
import { getStrumOffsets, STRUM_UP } from "../lib/strum";
import type {
  MIDINote,
  MIDIChannel,
  MIDIVelocity,
  StrumDirection,
  HumanizeManager,
  MIDIOutputInfo,
  MIDIInputInfo,
  ChordChangedEvent,
} from "../types";
import type { ClockCallbacks } from "./useTransport";

/** MIDI Context value type */
export interface MIDIContextValue {
  // State
  midiAccess: MIDIAccess | null;
  outputs: MIDIOutputInfo[];
  inputs: MIDIInputInfo[];
  selectedOutput: MIDIOutput | null;
  selectedInput: MIDIInput | null;
  isConnected: boolean;
  error: string | null;
  isLoading: boolean;
  channel: MIDIChannel;
  velocity: MIDIVelocity;
  currentNotes: MIDINote[];
  humanize: number;
  strumEnabled: boolean;
  strumSpread: number;
  strumDirection: StrumDirection;

  // BLE State
  bleSupported: boolean;
  bleDevice: BluetoothDevice | null;
  bleConnected: boolean;
  bleConnecting: boolean;
  bleError: string | null;
  bleSyncEnabled: boolean;

  // Actions
  connectMIDI: () => Promise<void>;
  selectOutput: (outputId: string) => void;
  selectInput: (inputId: string | null) => void;
  setClockCallbacks: (callbacks: ClockCallbacks) => void;
  connectBLE: () => Promise<void>;
  disconnectBLE: () => void;
  playNote: (note: MIDINote, vel?: MIDIVelocity) => void;
  stopNote: (note: MIDINote) => void;
  playChord: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  retriggerChord: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  stopAllNotes: () => void;
  panic: () => void;
  setChannel: Dispatch<SetStateAction<MIDIChannel>>;
  setVelocity: Dispatch<SetStateAction<MIDIVelocity>>;
  setHumanize: Dispatch<SetStateAction<number>>;
  setStrumEnabled: Dispatch<SetStateAction<boolean>>;
  setStrumSpread: Dispatch<SetStateAction<number>>;
  setStrumDirection: Dispatch<SetStateAction<StrumDirection>>;

  // MIDI Clock functions
  sendMIDIClock: () => void;
  sendMIDIStart: () => void;
  sendMIDIStop: () => void;
}

/** MIDI context for provider/consumer pattern */
const MIDIContext = createContext<MIDIContextValue | null>(null);

/** Props for MIDIProvider */
interface MIDIProviderProps {
  children: ReactNode;
}

/**
 * MIDI Provider Component
 * Manages MIDI connection state and provides MIDI functions to children.
 *
 * @example
 * <MIDIProvider>
 *   <App />
 * </MIDIProvider>
 */
export function MIDIProvider({ children }: MIDIProviderProps): React.JSX.Element {
  // Connection state
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [outputs, setOutputs] = useState<MIDIOutputInfo[]>([]);
  const [inputs, setInputs] = useState<MIDIInputInfo[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<MIDIOutput | null>(null);
  const [selectedInput, setSelectedInput] = useState<MIDIInput | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // BLE MIDI state
  const [bleSupported] = useState<boolean>(() => isBLESupported());
  const [bleDevice, setBleDevice] = useState<BluetoothDevice | null>(null);
  const [bleConnected, setBleConnected] = useState<boolean>(false);
  const [bleConnecting, setBleConnecting] = useState<boolean>(false);
  const [bleError, setBleError] = useState<string | null>(null);
  const [bleSyncEnabled, setBleSyncEnabled] = useState<boolean>(false);
  const bleServerRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const bleCharacteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const bleSyncCleanupRef = useRef<(() => void) | null>(null);

  // Playback settings
  const [channel, setChannel] = useState<MIDIChannel>(0);
  const [velocity, setVelocity] = useState<MIDIVelocity>(80);
  const [humanize, setHumanize] = useState<number>(0);

  // Strum settings
  const [strumEnabled, setStrumEnabled] = useState<boolean>(false);
  const [strumSpread, setStrumSpread] = useState<number>(50);
  const [strumDirection, setStrumDirection] = useState<StrumDirection>(STRUM_UP);
  const strumLastDirectionRef = useRef<StrumDirection>(STRUM_UP);

  // Currently playing notes
  const [currentNotes, setCurrentNotes] = useState<MIDINote[]>([]);
  const currentNotesRef = useRef<MIDINote[]>(currentNotes);

  // Keep ref updated
  useEffect(() => {
    currentNotesRef.current = currentNotes;
  }, [currentNotes]);

  // Humanization timeout manager
  const humanizeManager = useRef<HumanizeManager>(createHumanizeManager());

  // MIDI clock callbacks (set by useTransport)
  const onMidiClockRef = useRef<(() => void) | null>(null);
  const onMidiStartRef = useRef<(() => void) | null>(null);
  const onMidiStopRef = useRef<(() => void) | null>(null);

  // Refs for onstatechange handler to avoid stale closures
  const selectedOutputIdRef = useRef<string | null>(null);
  const selectedInputIdRef = useRef<string | null>(null);

  // Keep refs in sync with state
  selectedOutputIdRef.current = selectedOutput?.id ?? null;
  selectedInputIdRef.current = selectedInput?.id ?? null;

  /**
   * Connect to MIDI and enumerate devices.
   */
  const connectMIDI = useCallback(async (): Promise<void> => {
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
      access.onstatechange = (event: Event) => {
        const midiEvent = event as MIDIConnectionEvent;
        const updatedOutputs = getMIDIOutputs(access);
        const updatedInputs = getMIDIInputs(access);
        setOutputs(updatedOutputs);
        setInputs(updatedInputs);

        // Handle output device disconnection (use refs for current values)
        if (
          midiEvent.port?.state === "disconnected" &&
          selectedOutputIdRef.current === midiEvent.port?.id
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
          midiEvent.port?.state === "disconnected" &&
          selectedInputIdRef.current === midiEvent.port?.id
        ) {
          setSelectedInput(null);
        }
      };
    } catch (err) {
      setError((err as Error).message);
      setIsConnected(false);
      console.error("MIDI connection error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Select a MIDI output device.
   */
  const selectOutput = useCallback(
    (outputId: string): void => {
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
   * Supports both regular MIDI inputs and BLE device.
   */
  const selectInput = useCallback(
    (inputId: string | null): void => {
      // Handle clearing selection
      if (!inputId) {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(null);
        setBleSyncEnabled(false);
        return;
      }

      // Handle BLE selection
      if (inputId === "ble") {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(null);
        setBleSyncEnabled(true);
        return;
      }

      // Handle regular MIDI input selection
      const input = inputs.find((i) => i.id === inputId);
      if (input) {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(input.input);
        setBleSyncEnabled(false);
      }
    },
    [inputs, selectedInput]
  );

  /**
   * Set MIDI clock callbacks (called by useTransport).
   */
  const setClockCallbacks = useCallback(({ onClock, onStart, onStop }: ClockCallbacks): void => {
    onMidiClockRef.current = onClock;
    onMidiStartRef.current = onStart;
    onMidiStopRef.current = onStop;
  }, []);

  /**
   * Scan for and connect to a BLE MIDI device.
   */
  const connectBLE = useCallback(async (): Promise<void> => {
    if (!bleSupported) {
      setBleError("Bluetooth is not supported in this browser");
      return;
    }

    setBleConnecting(true);
    setBleError(null);

    try {
      const device = await scanForBLEMidiDevice();
      setBleDevice(device);

      const { server, characteristic } = await connectToBLEMidiDevice(device);
      bleServerRef.current = server;
      bleCharacteristicRef.current = characteristic;
      setBleConnected(true);

      // Listen for disconnection AFTER successful connection
      device.addEventListener("gattserverdisconnected", () => {
        setBleConnected(false);
        bleServerRef.current = null;
        bleCharacteristicRef.current = null;
      });
    } catch (err) {
      const error = err as Error & { name?: string };
      if (error.name !== "NotFoundError") {
        // NotFoundError means user cancelled the picker
        setBleError(error.message || error.toString() || "Connection failed");
        console.error("BLE MIDI connection error:", err);
      }
      setBleDevice(null);
      setBleConnected(false);
    } finally {
      setBleConnecting(false);
    }
  }, [bleSupported]);

  /**
   * Disconnect from the current BLE MIDI device.
   */
  const disconnectBLE = useCallback((): void => {
    if (bleServerRef.current) {
      disconnectBLEMidiDevice(bleServerRef.current);
    }
    bleServerRef.current = null;
    bleCharacteristicRef.current = null;
    setBleDevice(null);
    setBleConnected(false);
    setBleError(null);
  }, []);

  /**
   * Handle incoming MIDI messages on selected input.
   */
  useEffect(() => {
    if (!selectedInput) return;

    const handleMidiMessage = (event: MIDIMessageEvent): void => {
      const [status] = event.data as Uint8Array;

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
   * Handle incoming MIDI messages from BLE device when BLE sync is enabled.
   */
  useEffect(() => {
    // Clean up any existing listener
    if (bleSyncCleanupRef.current) {
      bleSyncCleanupRef.current();
      bleSyncCleanupRef.current = null;
    }

    if (!bleSyncEnabled || !bleConnected || !bleCharacteristicRef.current) {
      return;
    }

    const handleBleMessage = (msg: number[]): void => {
      const [status] = msg;

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

    bleSyncCleanupRef.current = addBLEMidiListener(
      bleCharacteristicRef.current,
      handleBleMessage
    );

    return () => {
      if (bleSyncCleanupRef.current) {
        bleSyncCleanupRef.current();
        bleSyncCleanupRef.current = null;
      }
    };
  }, [bleSyncEnabled, bleConnected]);

  /**
   * Play a single note.
   */
  const playNote = useCallback(
    (note: MIDINote, vel: MIDIVelocity = velocity): void => {
      if (selectedOutput) {
        sendNoteOn(selectedOutput, channel, note, vel);
      }
      if (bleConnected && bleCharacteristicRef.current) {
        sendBLENoteOn(bleCharacteristicRef.current, channel, note, vel);
      }
      if (selectedOutput || bleConnected) {
        setCurrentNotes((prev) => [...prev, note]);
      }
    },
    [selectedOutput, bleConnected, channel, velocity]
  );

  /**
   * Stop a single note.
   */
  const stopNote = useCallback(
    (note: MIDINote): void => {
      if (selectedOutput) {
        sendNoteOff(selectedOutput, channel, note);
      }
      if (bleConnected && bleCharacteristicRef.current) {
        sendBLENoteOff(bleCharacteristicRef.current, channel, note);
      }
      setCurrentNotes((prev) => prev.filter((n) => n !== note));
    },
    [selectedOutput, bleConnected, channel]
  );

  /**
   * Play a chord with smart diffing.
   * Only stops notes being removed, only starts new notes.
   * Supports humanization for staggered timing.
   */
  const playChord = useCallback(
    (notes: MIDINote[], vel: MIDIVelocity = velocity): void => {
      const hasOutput = selectedOutput || bleConnected;
      if (!hasOutput || !notes?.length) return;

      humanizeManager.current.clear();

      const currentNotesSnapshot = currentNotesRef.current;
      const newNotesSet = new Set(notes);
      const currentNotesSet = new Set(currentNotesSnapshot);

      // Stop removed notes immediately
      const notesToStop = currentNotesSnapshot.filter((n) => !newNotesSet.has(n));
      if (notesToStop.length > 0) {
        notesToStop.forEach((note) => {
          if (selectedOutput) sendNoteOff(selectedOutput, channel, note);
        });
        // BLE: batch all note-offs into single packet
        if (bleConnected && bleCharacteristicRef.current) {
          sendBLEChordOff(bleCharacteristicRef.current, channel, notesToStop);
        }
      }

      // Start new notes with optional strum or humanization
      const notesToStart = notes.filter((n) => !currentNotesSet.has(n));

      if (notesToStart.length > 0) {
        if (strumEnabled && strumSpread > 0 && notesToStart.length > 1) {
          // Strum: evenly-spaced delays based on note pitch order
          const { offsets, nextDirection } = getStrumOffsets(
            notesToStart,
            strumSpread,
            strumDirection,
            strumLastDirectionRef.current
          );
          strumLastDirectionRef.current = nextDirection;
          notesToStart.forEach((note, i) => {
            humanizeManager.current.schedule(() => {
              if (selectedOutput) sendNoteOn(selectedOutput, channel, note, vel);
              if (bleConnected && bleCharacteristicRef.current) {
                sendBLENoteOn(bleCharacteristicRef.current, channel, note, vel);
              }
            }, offsets[i]);
          });
        } else if (humanize > 0 && notesToStart.length > 1) {
          // Humanization: stagger notes (works for Web MIDI, less ideal for BLE)
          const offsets = getHumanizeOffsets(notesToStart.length, humanize);
          notesToStart.forEach((note, i) => {
            humanizeManager.current.schedule(() => {
              if (selectedOutput) sendNoteOn(selectedOutput, channel, note, vel);
              if (bleConnected && bleCharacteristicRef.current) {
                sendBLENoteOn(bleCharacteristicRef.current, channel, note, vel);
              }
            }, offsets[i]);
          });
        } else {
          // No humanization: send all notes together
          notesToStart.forEach((note) => {
            if (selectedOutput) sendNoteOn(selectedOutput, channel, note, vel);
          });
          // BLE: batch all note-ons into single packet
          if (bleConnected && bleCharacteristicRef.current) {
            sendBLEChordOn(bleCharacteristicRef.current, channel, notesToStart, vel);
          }
        }
      }

      setCurrentNotes(notes);
    },
    [selectedOutput, bleConnected, channel, velocity, humanize, strumEnabled, strumSpread, strumDirection]
  );

  /**
   * Retrigger a chord - forces all notes to stop and restart.
   * Used by sequencer in retrig mode for clear re-articulation.
   */
  const retriggerChord = useCallback(
    (notes: MIDINote[], vel: MIDIVelocity = velocity): void => {
      const hasOutput = selectedOutput || bleConnected;
      if (!hasOutput || !notes?.length) return;

      humanizeManager.current.clear();

      // Stop all current notes
      const currentNotesVal = currentNotesRef.current;
      if (currentNotesVal.length > 0) {
        currentNotesVal.forEach((note) => {
          if (selectedOutput) sendNoteOff(selectedOutput, channel, note);
        });
        if (bleConnected && bleCharacteristicRef.current) {
          sendBLEChordOff(bleCharacteristicRef.current, channel, currentNotesVal);
        }
      }

      // Small delay for clear re-articulation
      setTimeout(() => {
        if (strumEnabled && strumSpread > 0 && notes.length > 1) {
          // Strum: evenly-spaced delays based on note pitch order
          const { offsets, nextDirection } = getStrumOffsets(
            notes,
            strumSpread,
            strumDirection,
            strumLastDirectionRef.current
          );
          strumLastDirectionRef.current = nextDirection;
          notes.forEach((note, i) => {
            humanizeManager.current.schedule(() => {
              if (selectedOutput) sendNoteOn(selectedOutput, channel, note, vel);
              if (bleConnected && bleCharacteristicRef.current) {
                sendBLENoteOn(bleCharacteristicRef.current, channel, note, vel);
              }
            }, offsets[i]);
          });
        } else if (humanize > 0 && notes.length > 1) {
          const offsets = getHumanizeOffsets(notes.length, humanize);
          notes.forEach((note, i) => {
            humanizeManager.current.schedule(() => {
              if (selectedOutput) sendNoteOn(selectedOutput, channel, note, vel);
              if (bleConnected && bleCharacteristicRef.current) {
                sendBLENoteOn(bleCharacteristicRef.current, channel, note, vel);
              }
            }, offsets[i]);
          });
        } else {
          notes.forEach((note) => {
            if (selectedOutput) sendNoteOn(selectedOutput, channel, note, vel);
          });
          if (bleConnected && bleCharacteristicRef.current) {
            sendBLEChordOn(bleCharacteristicRef.current, channel, notes, vel);
          }
        }

        setCurrentNotes(notes);
      }, 5);
    },
    [selectedOutput, bleConnected, channel, velocity, humanize, strumEnabled, strumSpread, strumDirection]
  );

  /**
   * Stop all currently playing notes.
   */
  const stopAllNotes = useCallback((): void => {
    humanizeManager.current.clear();
    const notes = currentNotesRef.current;
    if (notes.length > 0) {
      notes.forEach((note) => {
        if (selectedOutput) sendNoteOff(selectedOutput, channel, note);
      });
      if (bleConnected && bleCharacteristicRef.current) {
        sendBLEChordOff(bleCharacteristicRef.current, channel, notes);
      }
    }
    setCurrentNotes([]);
  }, [selectedOutput, bleConnected, channel]);

  /**
   * MIDI panic - stop all notes on all channels.
   */
  const panic = useCallback((): void => {
    if (selectedOutput) {
      sendPanic(selectedOutput);
    }
    if (bleConnected && bleCharacteristicRef.current) {
      sendBLEPanic(bleCharacteristicRef.current);
    }
    setCurrentNotes([]);
  }, [selectedOutput, bleConnected]);

  // Subscribe to chord events from useChordEngine
  // This replaces the useEffect in App.jsx that watched currentChord
  // Note: useEventSubscription uses a ref pattern, so no useCallback needed
  useEventSubscription(appEvents, "chord:changed", (event: ChordChangedEvent) => {
    if (isConnected || bleConnected) {
      // On mobile (retrigger=true), use retriggerChord for clear re-articulation
      // On desktop, use playChord for smooth transitions
      if (event.retrigger) {
        retriggerChord(event.notes);
      } else {
        playChord(event.notes);
      }
    }
  });

  useEventSubscription(appEvents, "chord:cleared", () => {
    if (isConnected || bleConnected) {
      stopAllNotes();
    }
  });

  // Auto-connect on mount
  useEffect(() => {
    connectMIDI();
  }, []);

  // Refs for cleanup to avoid stale closures
  const selectedOutputRef = useRef<MIDIOutput | null>(selectedOutput);
  const bleConnectedRef = useRef<boolean>(bleConnected);
  const channelRef = useRef<MIDIChannel>(channel);

  // Keep refs in sync
  selectedOutputRef.current = selectedOutput;
  bleConnectedRef.current = bleConnected;
  channelRef.current = channel;

  // Cleanup on unmount and page refresh
  useEffect(() => {
    const handleBeforeUnload = (): void => {
      if (selectedOutputRef.current) {
        sendPanic(selectedOutputRef.current);
      }
      if (bleConnectedRef.current && bleCharacteristicRef.current) {
        sendBLEPanic(bleCharacteristicRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      const notes = currentNotesRef.current;
      if (notes.length > 0) {
        notes.forEach((note) => {
          if (selectedOutputRef.current) sendNoteOff(selectedOutputRef.current, channelRef.current, note);
        });
        if (bleConnectedRef.current && bleCharacteristicRef.current) {
          sendBLEChordOff(bleCharacteristicRef.current, channelRef.current, notes);
        }
      }
    };
  }, []);

  const value: MIDIContextValue = {
    // State
    midiAccess,
    outputs,
    inputs,
    selectedOutput,
    selectedInput,
    isConnected: isConnected || bleConnected,
    error,
    isLoading,
    channel,
    velocity,
    currentNotes,
    humanize,
    strumEnabled,
    strumSpread,
    strumDirection,

    // BLE State
    bleSupported,
    bleDevice,
    bleConnected,
    bleConnecting,
    bleError,
    bleSyncEnabled,

    // Actions
    connectMIDI,
    selectOutput,
    selectInput,
    setClockCallbacks,
    connectBLE,
    disconnectBLE,
    playNote,
    stopNote,
    playChord,
    retriggerChord,
    stopAllNotes,
    panic,
    setChannel,
    setVelocity,
    setHumanize,
    setStrumEnabled,
    setStrumSpread,
    setStrumDirection,

    // MIDI Clock functions
    sendMIDIClock: () => selectedOutput && sendMIDIClock(selectedOutput),
    sendMIDIStart: () => selectedOutput && sendMIDIStart(selectedOutput),
    sendMIDIStop: () => selectedOutput && sendMIDIStop(selectedOutput),
  };

  return <MIDIContext.Provider value={value}>{children}</MIDIContext.Provider>;
}

/**
 * Hook to access MIDI context.
 * Must be used within a MIDIProvider.
 *
 * @returns MIDI context value
 * @throws {Error} If used outside of MIDIProvider
 *
 * @example
 * const { playChord, stopAllNotes, isConnected } = useMIDI();
 */
export function useMIDI(): MIDIContextValue {
  const context = useContext(MIDIContext);
  if (!context) {
    throw new Error("useMIDI must be used within a MIDIProvider");
  }
  return context;
}
