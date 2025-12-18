/**
 * MIDI Clock Hook
 * Manages MIDI clock input handling and callback registration.
 *
 * @module hooks/useMIDIClock
 */

import { useEffect, useCallback, useRef } from "react";
import {
  sendMIDIClock,
  sendMIDIStart,
  sendMIDIStop,
  MIDI_CLOCK,
  MIDI_START,
  MIDI_STOP,
  MIDI_CONTINUE,
} from "../lib/midi";
import type { ClockCallbacks } from "./useTransport";

/**
 * Return type for useMIDIClock hook
 */
export interface MIDIClockResult {
  setClockCallbacks: (callbacks: ClockCallbacks) => void;
  sendMIDIClock: () => void;
  sendMIDIStart: () => void;
  sendMIDIStop: () => void;
}

/**
 * Hook to manage MIDI clock synchronization.
 * Handles incoming MIDI clock messages and provides functions to send clock messages.
 *
 * @param selectedInput - The selected MIDI input device
 * @param selectedOutput - The selected MIDI output device
 * @returns Clock callback setters and send functions
 *
 * @example
 * const { setClockCallbacks, sendMIDIStart } = useMIDIClock(input, output);
 * setClockCallbacks({ onClock, onStart, onStop });
 */
export function useMIDIClock(
  selectedInput: MIDIInput | null,
  selectedOutput: MIDIOutput | null
): MIDIClockResult {
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

  return {
    setClockCallbacks,
    sendMIDIClock: () => selectedOutput && sendMIDIClock(selectedOutput),
    sendMIDIStart: () => selectedOutput && sendMIDIStart(selectedOutput),
    sendMIDIStop: () => selectedOutput && sendMIDIStop(selectedOutput),
  };
}
