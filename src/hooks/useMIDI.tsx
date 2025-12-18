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
  useRef,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
import { usePersistentState } from "./usePersistence";
import { sendNoteOff } from "../lib/midi";
import { sendBLEChordOff } from "../lib/bleMidi";
import { STRUM_UP } from "../lib/strum";
import type {
  MIDINote,
  MIDIChannel,
  MIDIVelocity,
  StrumDirection,
  MIDIOutputInfo,
  MIDIInputInfo,
} from "../types";
import type { ClockCallbacks } from "./useTransport";
import { useMIDIPlayback } from "./useMIDIPlayback";
import { useMIDIExpression } from "./useMIDIExpression";
import { useBLEMidi } from "./useBLEMidi";
import { useMIDIConnection } from "./useMIDIConnection";
import { useMIDIClock } from "./useMIDIClock";
import { useMIDIGraceNotes } from "./useMIDIGraceNotes";
import { useMIDIInputSelection } from "./useMIDIInputSelection";
import { useMIDIChordEvents } from "./useMIDIChordEvents";

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

  // Keep ref updated
  useEffect(() => {
    currentNotesRef.current = currentNotes;
  }, [currentNotes]);

  // MIDI Connection hook
  const connection = useMIDIConnection();

  // BLE MIDI hook
  const clockCallbacksRef = useRef<{
    onClock: (() => void) | null;
    onStart: (() => void) | null;
    onStop: (() => void) | null;
  }>({
    onClock: null,
    onStart: null,
    onStop: null,
  });
  const ble = useBLEMidi(clockCallbacksRef);

  // MIDI Playback hook
  const playback = useMIDIPlayback(
    {
      selectedOutput: connection.selectedOutput,
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
      selectedOutput: connection.selectedOutput,
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

  // MIDI Clock hook
  const clock = useMIDIClock(connection.selectedInput, connection.selectedOutput);

  // MIDI Input Selection hook (combines MIDI input + BLE sync)
  const [selectedInputInternal, setSelectedInputInternal] = useState<MIDIInput | null>(null);
  const inputSelection = useMIDIInputSelection({
    selectedInput: selectedInputInternal,
    setSelectedInput: setSelectedInputInternal,
    bleEnableSync: ble.enableBLESync,
    bleDisableSync: ble.disableBLESync,
    inputs: connection.inputs,
  });

  // Update connection's selected input when internal state changes
  useEffect(() => {
    if (selectedInputInternal !== connection.selectedInput) {
      // Sync the connection hook's input state
      // This ensures clock hook receives the correct input
      const input = connection.inputs.find((i) => i.input === selectedInputInternal);
      if (input) {
        connection.selectInput(input.id);
      } else if (!selectedInputInternal) {
        connection.selectInput(null);
      }
    }
  }, [selectedInputInternal, connection]);

  // MIDI Grace Notes hook
  useMIDIGraceNotes({
    selectedOutput: connection.selectedOutput,
    bleConnected: ble.bleConnected,
    bleCharacteristic: ble.bleCharacteristic,
    channel,
    velocity,
    lowLatencyMode,
    isConnected: connection.isConnected,
  });

  // MIDI Chord Events hook
  useMIDIChordEvents({
    isConnected: connection.isConnected,
    bleConnected: ble.bleConnected,
    triggerMode,
    playChord: playback.playChord,
    retriggerChord: playback.retriggerChord,
    playChordWithGlide: expression.playChordWithGlide,
    stopAllNotes: playback.stopAllNotes,
  });

  // Refs for cleanup to avoid stale closures
  const selectedOutputRef = useRef<MIDIOutput | null>(connection.selectedOutput);
  const channelRef = useRef<MIDIChannel>(channel);

  // Keep refs in sync
  selectedOutputRef.current = connection.selectedOutput;
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
    midiAccess: connection.midiAccess,
    outputs: connection.outputs,
    inputs: connection.inputs,
    selectedOutput: connection.selectedOutput,
    selectedInput: selectedInputInternal,
    isConnected: connection.isConnected || ble.bleConnected,
    error: connection.error,
    isLoading: connection.isLoading,
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
    connectMIDI: connection.connectMIDI,
    selectOutput: connection.selectOutput,
    selectInput: inputSelection.selectInput,
    setClockCallbacks: clock.setClockCallbacks,
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
    sendMIDIClock: clock.sendMIDIClock,
    sendMIDIStart: clock.sendMIDIStart,
    sendMIDIStop: clock.sendMIDIStop,
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
