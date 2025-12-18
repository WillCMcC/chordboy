/**
 * MIDI Connection Hook
 * Manages MIDI device connection, enumeration, and device selection.
 *
 * @module hooks/useMIDIConnection
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  requestMIDIAccess,
  getMIDIOutputs,
  getMIDIInputs,
  isMIDISupported,
} from "../lib/midi";
import type { MIDIOutputInfo, MIDIInputInfo } from "../types";

/**
 * Return type for useMIDIConnection hook
 */
export interface MIDIConnectionResult {
  // State
  midiAccess: MIDIAccess | null;
  outputs: MIDIOutputInfo[];
  inputs: MIDIInputInfo[];
  selectedOutput: MIDIOutput | null;
  selectedInput: MIDIInput | null;
  isConnected: boolean;
  error: string | null;
  isLoading: boolean;

  // Actions
  connectMIDI: () => Promise<void>;
  selectOutput: (outputId: string) => void;
  selectInput: (inputId: string | null) => void;
}

/**
 * Hook to manage MIDI connection and device selection.
 * Handles device enumeration, auto-connection, and hot-plug detection.
 *
 * @returns MIDI connection state and actions
 *
 * @example
 * const { isConnected, outputs, selectOutput } = useMIDIConnection();
 */
export function useMIDIConnection(): MIDIConnectionResult {
  // Connection state
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [outputs, setOutputs] = useState<MIDIOutputInfo[]>([]);
  const [inputs, setInputs] = useState<MIDIInputInfo[]>([]);
  const [selectedOutput, setSelectedOutput] = useState<MIDIOutput | null>(null);
  const [selectedInput, setSelectedInput] = useState<MIDIInput | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
   * Select a MIDI input device.
   * Pass null to clear selection.
   */
  const selectInput = useCallback(
    (inputId: string | null): void => {
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

  // Auto-connect on mount
  useEffect(() => {
    connectMIDI();
  }, [connectMIDI]);

  return {
    midiAccess,
    outputs,
    inputs,
    selectedOutput,
    selectedInput,
    isConnected,
    error,
    isLoading,
    connectMIDI,
    selectOutput,
    selectInput,
  };
}
