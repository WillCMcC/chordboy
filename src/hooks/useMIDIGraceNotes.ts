/**
 * MIDI Grace Notes Hook
 * Manages grace note re-articulation for MIDI output.
 *
 * @module hooks/useMIDIGraceNotes
 */

import { useRef, useEffect } from "react";
import { appEvents } from "../lib/eventBus";
import { useEventSubscription } from "./useEventSubscription";
import { sendNoteOn, sendNoteOff } from "../lib/midi";
import { sendBLEChordOn, sendBLEChordOff } from "../lib/bleMidi";
import type {
  MIDINote,
  MIDIChannel,
  MIDIVelocity,
  GraceNotePayload,
} from "../types";

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

/**
 * Props for useMIDIGraceNotes hook
 */
export interface MIDIGraceNotesProps {
  selectedOutput: MIDIOutput | null;
  bleConnected: boolean;
  bleCharacteristic: BluetoothRemoteGATTCharacteristic | null;
  channel: MIDIChannel;
  velocity: MIDIVelocity;
  lowLatencyMode: boolean;
  isConnected: boolean;
}

/**
 * Hook to handle grace note re-articulation for MIDI output.
 * Subscribes to grace:note events and triggers note-off/note-on sequences
 * with adaptive delays based on connection type.
 *
 * @param props - MIDI connection and settings
 *
 * @example
 * useMIDIGraceNotes({
 *   selectedOutput,
 *   bleConnected,
 *   bleCharacteristic,
 *   channel,
 *   velocity,
 *   lowLatencyMode,
 *   isConnected
 * });
 */
export function useMIDIGraceNotes(props: MIDIGraceNotesProps): void {
  const {
    selectedOutput,
    bleConnected,
    bleCharacteristic,
    channel,
    velocity,
    lowLatencyMode,
    isConnected,
  } = props;

  // Track pending grace note timeouts PER NOTE to allow rapid different-note taps
  // Using a Map keyed by note number ensures tapping note A doesn't cancel note B's pending on
  const graceNoteTimeoutsRef = useRef<Map<MIDINote, ReturnType<typeof setTimeout>>>(new Map());

  // Subscribe to grace note events - re-articulate specific notes without changing chord state
  // Uses per-note timeout tracking so rapid taps of different notes don't cancel each other
  useEventSubscription(appEvents, "grace:note", (event: GraceNotePayload) => {
    // Check if MIDI output is enabled (not in synth-only mode)
    if (!isMidiOutputEnabled()) return;
    if (!(isConnected || bleConnected) || !event.notes.length) return;

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
    if (bleConnected && bleCharacteristic) {
      // BLE: batch into single packet to avoid packet dropping
      sendBLEChordOff(bleCharacteristic, channel, event.notes);
    }

    // 3. Determine appropriate grace note delay based on connection type and latency mode
    // Low latency mode: absolute minimum delay for performance (may affect BLE reliability)
    // BLE: needs longer gap for reliable re-articulation due to connection interval
    // USB: can use minimal delay since transport is fast
    const graceNoteDelay = lowLatencyMode
      ? GRACE_NOTE_DELAY_LOW_LATENCY_MS
      : bleConnected
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
      if (bleConnected && bleCharacteristic) {
        sendBLEChordOn(bleCharacteristic, channel, event.notes, graceVelocity);
      }
    }, graceNoteDelay);

    // Store same timeout ref for all notes (allows cancellation if any note is re-tapped)
    event.notes.forEach((note) => {
      graceNoteTimeoutsRef.current.set(note, timeout);
    });
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up grace note timeouts
      graceNoteTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      graceNoteTimeoutsRef.current.clear();
    };
  }, []);
}
