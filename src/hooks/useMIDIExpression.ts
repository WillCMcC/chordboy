/**
 * MIDI Expression Hook
 * Handles pitch bend glide effects for smooth transitions between chords.
 *
 * @module hooks/useMIDIExpression
 */

import { useCallback, useRef, useEffect } from "react";
import {
  sendNoteOn,
  sendNoteOff,
  sendPitchBend,
  resetPitchBend,
  semitonesToPitchBend,
} from "../lib/midi";
import {
  sendBLEChordOn,
  sendBLEChordOff,
} from "../lib/bleMidi";
import type {
  MIDINote,
  MIDIChannel,
  MIDIVelocity,
} from "../types";

/** Expression dependencies */
export interface ExpressionDeps {
  selectedOutput: MIDIOutput | null;
  bleConnected: boolean;
  bleCharacteristic: BluetoothRemoteGATTCharacteristic | null;
  channel: MIDIChannel;
  velocity: MIDIVelocity;
  glideTime: number;
}

/** Expression functions returned by hook */
export interface ExpressionFunctions {
  playChordWithGlide: (notes: MIDINote[], vel?: MIDIVelocity) => void;
  cancelGlide: () => void;
}

/**
 * Hook for MIDI expression functions (glide/pitch bend).
 * Provides portamento-like pitch bend effects.
 *
 * @param deps - Expression dependencies
 * @param currentNotesRef - Ref to currently playing notes
 * @param setCurrentNotes - State setter for current notes
 * @param playChord - Fallback playChord function (for non-glide cases)
 * @returns Expression functions
 */
export function useMIDIExpression(
  deps: ExpressionDeps,
  currentNotesRef: React.MutableRefObject<MIDINote[]>,
  setCurrentNotes: React.Dispatch<React.SetStateAction<MIDINote[]>>,
  playChord: (notes: MIDINote[], vel?: MIDIVelocity) => void
): ExpressionFunctions {
  const {
    selectedOutput,
    bleConnected,
    bleCharacteristic,
    channel,
    velocity,
    glideTime,
  } = deps;

  // Glide animation state
  const glideAnimationRef = useRef<number | null>(null);

  /**
   * Play a chord with pitch bend glide effect.
   * Starts new notes with pitch offset and slides them to target pitch.
   * This creates a portamento-like effect where notes "slide in".
   */
  const playChordWithGlide = useCallback(
    (notes: MIDINote[], vel: MIDIVelocity = velocity): void => {
      const hasOutput = selectedOutput || bleConnected;
      if (!hasOutput || !notes?.length) return;

      // Cancel any existing glide animation
      if (glideAnimationRef.current) {
        cancelAnimationFrame(glideAnimationRef.current);
        glideAnimationRef.current = null;
      }

      const currentNotesSnapshot = currentNotesRef.current;

      // If no current notes, just play normally
      if (currentNotesSnapshot.length === 0) {
        playChord(notes, vel);
        return;
      }

      // Calculate average pitch of current and new chords
      const currentAvg = currentNotesSnapshot.reduce((a, b) => a + b, 0) / currentNotesSnapshot.length;
      const newAvg = notes.reduce((a, b) => a + b, 0) / notes.length;
      const pitchDiff = currentAvg - newAvg; // Note: reversed - we start FROM old pitch

      // Ensure minimum bend of 1 semitone for audible effect
      // Use the direction of pitch movement, but enforce minimum magnitude
      const minBend = 1.0;
      const direction = pitchDiff >= 0 ? 1 : -1;
      const magnitude = Math.max(minBend, Math.abs(pitchDiff));

      // Clamp to max +/- 2 semitones (standard pitch bend range)
      const startBendSemitones = Math.min(2, magnitude) * direction;

      // Stop old notes immediately
      currentNotesSnapshot.forEach((note) => {
        if (selectedOutput) sendNoteOff(selectedOutput, channel, note);
      });
      // BLE: batch note-offs
      if (bleConnected && bleCharacteristic) {
        sendBLEChordOff(bleCharacteristic, channel, currentNotesSnapshot);
      }

      // Set initial pitch bend (offset from where old notes were)
      const startBendValue = semitonesToPitchBend(startBendSemitones);
      if (selectedOutput) {
        sendPitchBend(selectedOutput, channel, startBendValue);
      }

      // Start new notes (they'll sound at the bent pitch initially)
      notes.forEach((note) => {
        if (selectedOutput) sendNoteOn(selectedOutput, channel, note, vel);
      });
      // BLE: batch note-ons
      if (bleConnected && bleCharacteristic) {
        sendBLEChordOn(bleCharacteristic, channel, notes, vel);
      }
      setCurrentNotes(notes);

      // Animate pitch bend from offset back to center
      const startTime = performance.now();
      const duration = glideTime;

      const animate = (): void => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / duration);

        // Ease out: starts fast, slows at the end for smooth landing
        const easeOut = 1 - Math.pow(1 - progress, 3);

        // Interpolate from start bend toward center (0)
        const currentBend = startBendSemitones * (1 - easeOut);
        const bendValue = semitonesToPitchBend(currentBend);

        if (selectedOutput) {
          sendPitchBend(selectedOutput, channel, bendValue);
        }

        if (progress < 1) {
          glideAnimationRef.current = requestAnimationFrame(animate);
        } else {
          // Glide complete: ensure pitch bend is exactly centered
          glideAnimationRef.current = null;
          if (selectedOutput) {
            resetPitchBend(selectedOutput, channel);
          }
        }
      };

      glideAnimationRef.current = requestAnimationFrame(animate);
    },
    [
      selectedOutput,
      bleConnected,
      bleCharacteristic,
      channel,
      velocity,
      glideTime,
      currentNotesRef,
      setCurrentNotes,
      playChord,
    ]
  );

  /**
   * Cancel any active glide animation.
   */
  const cancelGlide = useCallback((): void => {
    if (glideAnimationRef.current) {
      cancelAnimationFrame(glideAnimationRef.current);
      glideAnimationRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (glideAnimationRef.current) {
        cancelAnimationFrame(glideAnimationRef.current);
        glideAnimationRef.current = null;
      }
    };
  }, []);

  return {
    playChordWithGlide,
    cancelGlide,
  };
}
