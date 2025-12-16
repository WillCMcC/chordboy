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
import { usePersistentState } from "./usePersistence";
import { appEvents } from "../lib/eventBus";
import { useEventSubscription } from "./useEventSubscription";
import {
  requestMIDIAccess,
  getMIDIOutputs,
  getMIDIInputs,
  sendNoteOn,
  sendNoteOff,
  sendMIDIClock,
  sendMIDIStart,
  sendMIDIStop,
  isMIDISupported,
  MIDI_CLOCK,
  MIDI_START,
  MIDI_STOP,
  MIDI_CONTINUE,
} from "../lib/midi";
import {
  sendBLEChordOn,
  sendBLEChordOff,
} from "../lib/bleMidi";
import { STRUM_UP } from "../lib/strum";
import type {
  MIDINote,
  MIDIChannel,
  MIDIVelocity,
  StrumDirection,
  MIDIOutputInfo,
  MIDIInputInfo,
  ChordChangedEvent,
  GraceNotePayload,
} from "../types";
import type { ClockCallbacks } from "./useTransport";
import { useMIDIPlayback } from "./useMIDIPlayback";
import { useMIDIExpression } from "./useMIDIExpression";
import { useBLEMidi } from "./useBLEMidi";

/**
 * Grace note delays - different for BLE vs USB MIDI connections.
 * BLE needs longer gaps for reliable note re-articulation due to connection interval latency.
 * USB MIDI can use minimal delay since the transport is much faster.
 */
const GRACE_NOTE_DELAY_BLE_MS = 20; // BLE needs this for reliable re-articulation
const GRACE_NOTE_DELAY_USB_MS = 5;  // USB MIDI is fast, minimal gap needed
const GRACE_NOTE_DELAY_LOW_LATENCY_MS = 2; // Absolute minimum for performance mode

/** Check if MIDI output should be enabled based on audio mode setting */
function isMidiOutputEnabled(): boolean {
  try {
    const settings = localStorage.getItem("chordboy-synth-settings");
    if (settings) {
      const parsed = JSON.parse(settings);
      // MIDI is enabled in "midi" or "both" mode, disabled in "synth" only mode
      return parsed.audioMode !== "synth";
    }
  } catch {
    // Ignore parse errors
  }
  return true; // Default to MIDI enabled
}

/** Trigger mode options: new (smart diff), all (retrigger), glide (pitch bend) */
export type TriggerMode = "new" | "all" | "glide";

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
  triggerMode: TriggerMode;
  glideTime: number;
  lowLatencyMode: boolean;

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
  setTriggerMode: Dispatch<SetStateAction<TriggerMode>>;
  setGlideTime: Dispatch<SetStateAction<number>>;
  setLowLatencyMode: Dispatch<SetStateAction<boolean>>;

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

  // Playback settings
  const [channel, setChannel] = useState<MIDIChannel>(0);
  const [velocity, setVelocity] = useState<MIDIVelocity>(80);
  const [humanize, setHumanize] = useState<number>(0);

  // Strum settings
  const [strumEnabled, setStrumEnabled] = useState<boolean>(false);
  const [strumSpread, setStrumSpread] = useState<number>(50);
  const [strumDirection, setStrumDirection] = useState<StrumDirection>(STRUM_UP);

  // Trigger mode: "new" = only new notes, "all" = retrigger entire chord, "glide" = pitch bend transition
  const [triggerMode, setTriggerMode] = useState<TriggerMode>("all");

  // Glide time for pitch bend transitions (when triggerMode === "glide")
  const [glideTime, setGlideTime] = useState<number>(100); // ms

  // Low latency mode - minimizes grace note delays for tighter timing
  // Tradeoff: may cause issues with BLE MIDI reliability
  const [lowLatencyMode, setLowLatencyMode] = usePersistentState<boolean>(
    "chordboy-low-latency-mode",
    false
  );

  // Currently playing notes
  const [currentNotes, setCurrentNotes] = useState<MIDINote[]>([]);
  const currentNotesRef = useRef<MIDINote[]>(currentNotes);

  // Track pending grace note timeouts PER NOTE to allow rapid different-note taps
  // Using a Map keyed by note number ensures tapping note A doesn't cancel note B's pending on
  const graceNoteTimeoutsRef = useRef<Map<MIDINote, ReturnType<typeof setTimeout>>>(new Map());

  // Keep ref updated
  useEffect(() => {
    currentNotesRef.current = currentNotes;
  }, [currentNotes]);

  // MIDI clock callbacks (set by useTransport)
  const clockCallbacksRef = useRef<{
    onClock: (() => void) | null;
    onStart: (() => void) | null;
    onStop: (() => void) | null;
  }>({
    onClock: null,
    onStart: null,
    onStop: null,
  });

  // Refs for onstatechange handler to avoid stale closures
  const selectedOutputIdRef = useRef<string | null>(null);
  const selectedInputIdRef = useRef<string | null>(null);

  // Keep refs in sync with state
  selectedOutputIdRef.current = selectedOutput?.id ?? null;
  selectedInputIdRef.current = selectedInput?.id ?? null;

  // BLE MIDI hook
  const ble = useBLEMidi(clockCallbacksRef);

  // MIDI Playback hook
  const playback = useMIDIPlayback(
    {
      selectedOutput,
      bleConnected: ble.bleConnected,
      bleCharacteristic: ble.bleCharacteristic,
      channel,
      velocity,
      humanize,
      strumEnabled,
      strumSpread,
      strumDirection,
    },
    currentNotesRef,
    setCurrentNotes
  );

  // MIDI Expression hook (glide)
  const expression = useMIDIExpression(
    {
      selectedOutput,
      bleConnected: ble.bleConnected,
      bleCharacteristic: ble.bleCharacteristic,
      channel,
      velocity,
      glideTime,
    },
    currentNotesRef,
    setCurrentNotes,
    playback.playChord
  );

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
        ble.disableBLESync();
        return;
      }

      // Handle BLE selection
      if (inputId === "ble") {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(null);
        ble.enableBLESync();
        return;
      }

      // Handle regular MIDI input selection
      const input = inputs.find((i) => i.id === inputId);
      if (input) {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(input.input);
        ble.disableBLESync();
      }
    },
    [inputs, selectedInput, ble]
  );

  /**
   * Set MIDI clock callbacks (called by useTransport).
   */
  const setClockCallbacks = useCallback((callbacks: ClockCallbacks): void => {
    clockCallbacksRef.current.onClock = callbacks.onClock;
    clockCallbacksRef.current.onStart = callbacks.onStart;
    clockCallbacksRef.current.onStop = callbacks.onStop;
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
          clockCallbacksRef.current.onClock?.();
          break;
        case MIDI_START:
          clockCallbacksRef.current.onStart?.();
          break;
        case MIDI_STOP:
          clockCallbacksRef.current.onStop?.();
          break;
        case MIDI_CONTINUE:
          clockCallbacksRef.current.onStart?.();
          break;
      }
    };

    selectedInput.onmidimessage = handleMidiMessage;
    return () => {
      selectedInput.onmidimessage = null;
    };
  }, [selectedInput]);

  // Subscribe to chord events from useChordEngine
  // This replaces the useEffect in App.jsx that watched currentChord
  // Note: useEventSubscription uses a ref pattern, so no useCallback needed
  useEventSubscription(appEvents, "chord:changed", (event: ChordChangedEvent) => {
    // Check if MIDI output is enabled (not in synth-only mode)
    if (!isMidiOutputEnabled()) return;

    if (isConnected || ble.bleConnected) {
      // Determine trigger behavior:
      // - Mobile (event.retrigger=true) always retriggers
      // - Desktop respects user's triggerMode setting
      if (event.retrigger || triggerMode === "all") {
        playback.retriggerChord(event.notes);
      } else if (triggerMode === "glide") {
        expression.playChordWithGlide(event.notes);
      } else {
        playback.playChord(event.notes);
      }
    }
  });

  useEventSubscription(appEvents, "chord:cleared", () => {
    // Check if MIDI output is enabled (not in synth-only mode)
    if (!isMidiOutputEnabled()) return;

    if (isConnected || ble.bleConnected) {
      playback.stopAllNotes();
    }
  });

  // Subscribe to grace note events - re-articulate specific notes without changing chord state
  // Uses per-note timeout tracking so rapid taps of different notes don't cancel each other
  useEventSubscription(appEvents, "grace:note", (event: GraceNotePayload) => {
    // Check if MIDI output is enabled (not in synth-only mode)
    if (!isMidiOutputEnabled()) return;
    if (!(isConnected || ble.bleConnected) || !event.notes.length) return;

    // Grace notes play slightly softer for musical expression
    const graceVelocity = Math.max(1, Math.round(velocity * 0.85)) as MIDIVelocity;

    // 1. Cancel any pending timeouts for notes in this event
    event.notes.forEach((note) => {
      const existingTimeout = graceNoteTimeoutsRef.current.get(note);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        graceNoteTimeoutsRef.current.delete(note);
      }
    });

    // 2. Send note-offs - Web MIDI individually, BLE batched for efficiency
    event.notes.forEach((note) => {
      if (selectedOutput) sendNoteOff(selectedOutput, channel, note);
    });
    if (ble.bleConnected && ble.bleCharacteristic) {
      // BLE: batch into single packet to avoid packet dropping
      sendBLEChordOff(ble.bleCharacteristic, channel, event.notes);
    }

    // 3. Determine appropriate grace note delay based on connection type and latency mode
    // Low latency mode: absolute minimum delay for performance (may affect BLE reliability)
    // BLE: needs longer gap for reliable re-articulation due to connection interval
    // USB: can use minimal delay since transport is fast
    const graceNoteDelay = lowLatencyMode
      ? GRACE_NOTE_DELAY_LOW_LATENCY_MS
      : ble.bleConnected
        ? GRACE_NOTE_DELAY_BLE_MS
        : GRACE_NOTE_DELAY_USB_MS;

    // 4. Schedule note-ons with adaptive timeout, BLE batched
    const timeout = setTimeout(() => {
      // Clear timeout refs for all notes
      event.notes.forEach((note) => {
        graceNoteTimeoutsRef.current.delete(note);
      });
      // Web MIDI: send individually
      event.notes.forEach((note) => {
        if (selectedOutput) sendNoteOn(selectedOutput, channel, note, graceVelocity);
      });
      // BLE: batch into single packet
      if (ble.bleConnected && ble.bleCharacteristic) {
        sendBLEChordOn(ble.bleCharacteristic, channel, event.notes, graceVelocity);
      }
    }, graceNoteDelay);

    // Store same timeout ref for all notes (allows cancellation if any note is re-tapped)
    event.notes.forEach((note) => {
      graceNoteTimeoutsRef.current.set(note, timeout);
    });
  });

  // Auto-connect on mount
  useEffect(() => {
    connectMIDI();
  }, [connectMIDI]);

  // Refs for cleanup to avoid stale closures
  const selectedOutputRef = useRef<MIDIOutput | null>(selectedOutput);
  const channelRef = useRef<MIDIChannel>(channel);

  // Keep refs in sync
  selectedOutputRef.current = selectedOutput;
  channelRef.current = channel;

  // Refs for cleanup functions to avoid re-running cleanup on every render
  const playbackRef = useRef(playback);
  const expressionRef = useRef(expression);
  playbackRef.current = playback;
  expressionRef.current = expression;

  // Cleanup on unmount and page refresh - only runs once on unmount
  useEffect(() => {
    const handleBeforeUnload = (): void => {
      if (selectedOutputRef.current) {
        playbackRef.current.panic();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Clean up grace note timeouts
      graceNoteTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      graceNoteTimeoutsRef.current.clear();
      // Clean up expression (glide animation)
      expressionRef.current.cancelGlide();
      // Clean up humanize manager
      playbackRef.current.clearHumanizeManager();
      // Stop all notes
      const notes = currentNotesRef.current;
      if (notes.length > 0) {
        notes.forEach((note) => {
          if (selectedOutputRef.current) sendNoteOff(selectedOutputRef.current, channelRef.current, note);
        });
        if (ble.bleConnected && ble.bleCharacteristic) {
          sendBLEChordOff(ble.bleCharacteristic, channelRef.current, notes);
        }
      }
    };
  }, [ble.bleConnected, ble.bleCharacteristic]);

  const value: MIDIContextValue = {
    // State
    midiAccess,
    outputs,
    inputs,
    selectedOutput,
    selectedInput,
    isConnected: isConnected || ble.bleConnected,
    error,
    isLoading,
    channel,
    velocity,
    currentNotes,
    humanize,
    strumEnabled,
    strumSpread,
    strumDirection,
    triggerMode,
    glideTime,
    lowLatencyMode,

    // BLE State
    bleSupported: ble.bleSupported,
    bleDevice: ble.bleDevice,
    bleConnected: ble.bleConnected,
    bleConnecting: ble.bleConnecting,
    bleError: ble.bleError,
    bleSyncEnabled: ble.bleSyncEnabled,

    // Actions
    connectMIDI,
    selectOutput,
    selectInput,
    setClockCallbacks,
    connectBLE: ble.connectBLE,
    disconnectBLE: ble.disconnectBLE,
    playNote: playback.playNote,
    stopNote: playback.stopNote,
    playChord: playback.playChord,
    retriggerChord: playback.retriggerChord,
    stopAllNotes: playback.stopAllNotes,
    panic: playback.panic,
    setChannel,
    setVelocity,
    setHumanize,
    setStrumEnabled,
    setStrumSpread,
    setStrumDirection,
    setTriggerMode,
    setGlideTime,
    setLowLatencyMode,

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
