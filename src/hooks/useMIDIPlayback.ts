/**
 * MIDI Playback Hook
 * Handles note and chord playback with smart diffing.
 * Manages note-on/off for both USB MIDI and BLE MIDI devices.
 *
 * @module hooks/useMIDIPlayback
 */

import { useCallback, useRef, useEffect } from "react";
import { sendNoteOn, sendNoteOff, sendPanic } from "../lib/midi";
import {
  sendBLENoteOn,
  sendBLENoteOff,
  sendBLEPanic,
  sendBLEChordOn,
  sendBLEChordOff,
} from "../lib/bleMidi";
import { getHumanizeOffsets, createHumanizeManager } from "../lib/humanize";
import { getStrumOffsets, STRUM_UP } from "../lib/strum";
import type {
  MIDINote,
  MIDIChannel,
  MIDIVelocity,
  StrumDirection,
  HumanizeManager,
} from "../types";

/** Delay in ms between note-off and note-on for clear re-articulation */
const REARTICULATION_DELAY_MS = 5;

/** Playback dependencies */
export interface PlaybackDeps {
  selectedOutput: MIDIOutput | null;
  bleConnected: boolean;
  bleCharacteristic: BluetoothRemoteGATTCharacteristic | null;
  channel: MIDIChannel;
  velocity: MIDIVelocity;
  humanize: number;
  strumEnabled: boolean;
  strumSpread: number;
  strumDirection: StrumDirection;
}

/** Playback functions returned by hook */
export interface PlaybackFunctions {
  playNote: (note: MIDINote, vel?: MIDIVelocity) => void;
  stopNote: (note: MIDINote) => void;
  playChord: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  retriggerChord: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  stopAllNotes: () => void;
  panic: () => void;
  currentNotes: MIDINote[];
  clearHumanizeManager: () => void;
}

/**
 * Hook for MIDI playback functions.
 * Provides smart chord diffing, humanization, and strum support.
 *
 * @param deps - Playback dependencies (outputs, channel, etc.)
 * @param currentNotesRef - Ref to currently playing notes (for smart diffing)
 * @param setCurrentNotes - State setter for current notes
 * @returns Playback functions and state
 */
export function useMIDIPlayback(
  deps: PlaybackDeps,
  currentNotesRef: React.MutableRefObject<MIDINote[]>,
  setCurrentNotes: React.Dispatch<React.SetStateAction<MIDINote[]>>,
): PlaybackFunctions {
  const {
    selectedOutput,
    bleConnected,
    bleCharacteristic,
    channel,
    velocity,
    humanize,
    strumEnabled,
    strumSpread,
    strumDirection,
  } = deps;

  // Humanization timeout manager
  const humanizeManager = useRef<HumanizeManager>(createHumanizeManager());

  // Sequence ID for tracking chord changes (prevents race conditions with humanization)
  const sequenceIdRef = useRef(0);

  // Retrigger timeout ref (for cancellation on rapid calls)
  const retriggerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Strum state
  const strumLastDirectionRef = useRef<StrumDirection>(STRUM_UP);

  // Keep refs of expression params for setTimeout callbacks (avoid stale closures)
  const humanizeRef = useRef(humanize);
  const strumEnabledRef = useRef(strumEnabled);
  const strumSpreadRef = useRef(strumSpread);
  const strumDirectionRef = useRef(strumDirection);
  humanizeRef.current = humanize;
  strumEnabledRef.current = strumEnabled;
  strumSpreadRef.current = strumSpread;
  strumDirectionRef.current = strumDirection;

  /**
   * Play a single note.
   */
  const playNote = useCallback(
    (note: MIDINote, vel: MIDIVelocity = velocity): void => {
      if (selectedOutput) {
        sendNoteOn(selectedOutput, channel, note, vel);
      }
      if (bleConnected && bleCharacteristic) {
        sendBLENoteOn(bleCharacteristic, channel, note, vel);
      }
      if (selectedOutput || bleConnected) {
        setCurrentNotes((prev) => [...prev, note]);
      }
    },
    [
      selectedOutput,
      bleConnected,
      bleCharacteristic,
      channel,
      velocity,
      setCurrentNotes,
    ],
  );

  /**
   * Stop a single note.
   */
  const stopNote = useCallback(
    (note: MIDINote): void => {
      if (selectedOutput) {
        sendNoteOff(selectedOutput, channel, note);
      }
      if (bleConnected && bleCharacteristic) {
        sendBLENoteOff(bleCharacteristic, channel, note);
      }
      setCurrentNotes((prev) => prev.filter((n) => n !== note));
    },
    [selectedOutput, bleConnected, bleCharacteristic, channel, setCurrentNotes],
  );

  /**
   * Play a chord with smart diffing.
   * Only stops notes being removed, only starts new notes.
   * Supports humanization for staggered timing.
   * Uses sequence ID to prevent race conditions when chords change rapidly.
   */
  const playChord = useCallback(
    (notes: MIDINote[], vel: MIDIVelocity = velocity): void => {
      const hasOutput = selectedOutput || bleConnected;
      if (!hasOutput || !notes?.length) return;

      // Increment sequence ID to invalidate any pending scheduled note-ons
      const currentSequence = ++sequenceIdRef.current;

      humanizeManager.current.clear();

      const currentNotesSnapshot = currentNotesRef.current;
      const newNotesSet = new Set(notes);
      const currentNotesSet = new Set(currentNotesSnapshot);

      // Stop removed notes immediately
      const notesToStop = currentNotesSnapshot.filter(
        (n) => !newNotesSet.has(n),
      );
      if (notesToStop.length > 0) {
        notesToStop.forEach((note) => {
          if (selectedOutput) sendNoteOff(selectedOutput, channel, note);
        });
        // BLE: batch all note-offs into single packet
        if (bleConnected && bleCharacteristic) {
          sendBLEChordOff(bleCharacteristic, channel, notesToStop);
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
            strumLastDirectionRef.current,
          );
          strumLastDirectionRef.current = nextDirection;
          notesToStart.forEach((note, i) => {
            humanizeManager.current.schedule(() => {
              // Guard: only execute if this is still the current sequence
              if (sequenceIdRef.current !== currentSequence) return;
              if (selectedOutput)
                sendNoteOn(selectedOutput, channel, note, vel);
              if (bleConnected && bleCharacteristic) {
                sendBLENoteOn(bleCharacteristic, channel, note, vel);
              }
            }, offsets[i]);
          });
        } else if (humanize > 0 && notesToStart.length > 1) {
          // Humanization: stagger notes (works for Web MIDI, less ideal for BLE)
          const offsets = getHumanizeOffsets(notesToStart.length, humanize);
          notesToStart.forEach((note, i) => {
            humanizeManager.current.schedule(() => {
              // Guard: only execute if this is still the current sequence
              if (sequenceIdRef.current !== currentSequence) return;
              if (selectedOutput)
                sendNoteOn(selectedOutput, channel, note, vel);
              if (bleConnected && bleCharacteristic) {
                sendBLENoteOn(bleCharacteristic, channel, note, vel);
              }
            }, offsets[i]);
          });
        } else {
          // No humanization: send all notes together
          notesToStart.forEach((note) => {
            if (selectedOutput) sendNoteOn(selectedOutput, channel, note, vel);
          });
          // BLE: batch all note-ons into single packet
          if (bleConnected && bleCharacteristic) {
            sendBLEChordOn(bleCharacteristic, channel, notesToStart, vel);
          }
        }
      }

      setCurrentNotes(notes);
    },
    [
      selectedOutput,
      bleConnected,
      bleCharacteristic,
      channel,
      velocity,
      humanize,
      strumEnabled,
      strumSpread,
      strumDirection,
      currentNotesRef,
      setCurrentNotes,
    ],
  );

  /**
   * Retrigger a chord - forces all notes to stop and restart.
   * Used by sequencer in retrig mode for clear re-articulation.
   * Cancels any pending retrigger timeout to prevent race conditions.
   */
  const retriggerChord = useCallback(
    (notes: MIDINote[], vel: MIDIVelocity = velocity): void => {
      const hasOutput = selectedOutput || bleConnected;
      if (!hasOutput || !notes?.length) return;

      // Cancel any pending retrigger timeout to prevent race conditions
      if (retriggerTimeoutRef.current) {
        clearTimeout(retriggerTimeoutRef.current);
        retriggerTimeoutRef.current = null;
      }

      // Increment sequence ID to invalidate any pending scheduled note-ons
      const currentSequence = ++sequenceIdRef.current;

      humanizeManager.current.clear();

      // Stop all current notes
      const currentNotesVal = currentNotesRef.current;
      if (currentNotesVal.length > 0) {
        currentNotesVal.forEach((note) => {
          if (selectedOutput) sendNoteOff(selectedOutput, channel, note);
        });
        if (bleConnected && bleCharacteristic) {
          sendBLEChordOff(bleCharacteristic, channel, currentNotesVal);
        }
      }

      // Small delay for clear re-articulation
      // Use refs inside setTimeout to get fresh values (avoid stale closures)
      retriggerTimeoutRef.current = setTimeout(() => {
        retriggerTimeoutRef.current = null;

        // Guard: only execute if this is still the current sequence
        if (sequenceIdRef.current !== currentSequence) return;

        // Guard against refs becoming null after component state changes
        if (!selectedOutput && !bleConnected) return;

        const currentStrumEnabled = strumEnabledRef.current;
        const currentStrumSpread = strumSpreadRef.current;
        const currentStrumDirection = strumDirectionRef.current;
        const currentHumanize = humanizeRef.current;

        if (currentStrumEnabled && currentStrumSpread > 0 && notes.length > 1) {
          // Strum: evenly-spaced delays based on note pitch order
          const { offsets, nextDirection } = getStrumOffsets(
            notes,
            currentStrumSpread,
            currentStrumDirection,
            strumLastDirectionRef.current,
          );
          strumLastDirectionRef.current = nextDirection;
          notes.forEach((note, i) => {
            humanizeManager.current.schedule(() => {
              // Guard: only execute if this is still the current sequence
              if (sequenceIdRef.current !== currentSequence) return;
              if (selectedOutput)
                sendNoteOn(selectedOutput, channel, note, vel);
              if (bleConnected && bleCharacteristic) {
                sendBLENoteOn(bleCharacteristic, channel, note, vel);
              }
            }, offsets[i]);
          });
        } else if (currentHumanize > 0 && notes.length > 1) {
          const offsets = getHumanizeOffsets(notes.length, currentHumanize);
          notes.forEach((note, i) => {
            humanizeManager.current.schedule(() => {
              // Guard: only execute if this is still the current sequence
              if (sequenceIdRef.current !== currentSequence) return;
              if (selectedOutput)
                sendNoteOn(selectedOutput, channel, note, vel);
              if (bleConnected && bleCharacteristic) {
                sendBLENoteOn(bleCharacteristic, channel, note, vel);
              }
            }, offsets[i]);
          });
        } else {
          notes.forEach((note) => {
            if (selectedOutput) sendNoteOn(selectedOutput, channel, note, vel);
          });
          if (bleConnected && bleCharacteristic) {
            sendBLEChordOn(bleCharacteristic, channel, notes, vel);
          }
        }

        setCurrentNotes(notes);
      }, REARTICULATION_DELAY_MS);
    },
    [
      selectedOutput,
      bleConnected,
      bleCharacteristic,
      channel,
      velocity,
      humanize,
      strumEnabled,
      strumSpread,
      strumDirection,
      currentNotesRef,
      setCurrentNotes,
    ],
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
      if (bleConnected && bleCharacteristic) {
        sendBLEChordOff(bleCharacteristic, channel, notes);
      }
    }
    setCurrentNotes([]);
  }, [
    selectedOutput,
    bleConnected,
    bleCharacteristic,
    channel,
    currentNotesRef,
    setCurrentNotes,
  ]);

  /**
   * MIDI panic - stop all notes on all channels.
   */
  const panic = useCallback((): void => {
    if (selectedOutput) {
      sendPanic(selectedOutput);
    }
    if (bleConnected && bleCharacteristic) {
      sendBLEPanic(bleCharacteristic);
    }
    setCurrentNotes([]);
  }, [selectedOutput, bleConnected, bleCharacteristic, setCurrentNotes]);

  /**
   * Clear humanize manager (exposed for cleanup).
   */
  const clearHumanizeManager = useCallback((): void => {
    humanizeManager.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      humanizeManager.current.clear();
      if (retriggerTimeoutRef.current) {
        clearTimeout(retriggerTimeoutRef.current);
        retriggerTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    playNote,
    stopNote,
    playChord,
    retriggerChord,
    stopAllNotes,
    panic,
    currentNotes: currentNotesRef.current,
    clearHumanizeManager,
  };
}
