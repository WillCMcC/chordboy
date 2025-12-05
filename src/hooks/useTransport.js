import { useState, useCallback, useRef, useEffect } from "react";
import {
  sendMIDIClock,
  sendMIDIStart,
  sendMIDIStop,
} from "../lib/midi";

/**
 * useTransport - Manages BPM, transport state, MIDI clock sync, and sequencer
 *
 * Features:
 * - Adjustable BPM (20-300)
 * - Visual beat grid (quarter notes)
 * - MIDI clock output (24 PPQN)
 * - Start/Stop controls
 * - Sequencer grid with configurable steps and preset triggers
 */
export function useTransport(midiOutput, { onTriggerPreset, onRetriggerPreset, onStopNotes } = {}) {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0); // 0-3 for visual display
  const [sendClock, setSendClock] = useState(false); // Whether to send MIDI clock

  // Sequencer state
  const [sequencerEnabled, setSequencerEnabled] = useState(false);
  const [sequencerSteps, setSequencerSteps] = useState(8); // Number of steps (4, 8, 16)
  const [currentStep, setCurrentStep] = useState(0);
  const [sequence, setSequence] = useState([]); // Array of preset slots (or null for empty)
  const [stepsPerBeat, setStepsPerBeat] = useState(1); // 1 = quarter notes, 2 = eighth notes, 4 = sixteenth
  const [retrigMode, setRetrigMode] = useState(true); // true = retrigger same notes, false = sustain

  // Refs for timing loop
  const clockIntervalRef = useRef(null);
  const pulseCountRef = useRef(0);
  const lastTickTimeRef = useRef(0);
  const stepPulseCountRef = useRef(0);
  const lastTriggeredPresetRef = useRef(null); // Track last triggered preset for sustain mode

  // Refs for callbacks to avoid effect re-runs
  const onTriggerPresetRef = useRef(onTriggerPreset);
  const onRetriggerPresetRef = useRef(onRetriggerPreset);
  const onStopNotesRef = useRef(onStopNotes);

  // Keep refs updated
  useEffect(() => {
    onTriggerPresetRef.current = onTriggerPreset;
    onRetriggerPresetRef.current = onRetriggerPreset;
    onStopNotesRef.current = onStopNotes;
  });

  // Initialize sequence when steps change
  useEffect(() => {
    setSequence((prev) => {
      const newSeq = new Array(sequencerSteps).fill(null);
      // Preserve existing steps
      prev.forEach((val, i) => {
        if (i < sequencerSteps) {
          newSeq[i] = val;
        }
      });
      return newSeq;
    });
  }, [sequencerSteps]);

  // Calculate pulses per step based on stepsPerBeat
  // 24 PPQN = 24 pulses per quarter note
  // stepsPerBeat=1: 24 pulses/step (quarter notes)
  // stepsPerBeat=2: 12 pulses/step (eighth notes)
  // stepsPerBeat=4: 6 pulses/step (sixteenth notes)
  const getPulsesPerStep = useCallback(() => {
    return Math.floor(24 / stepsPerBeat);
  }, [stepsPerBeat]);

  // Calculate interval for 24 PPQN (pulses per quarter note)
  const getPulseInterval = useCallback(() => {
    // 24 pulses per beat, so interval = (60000 / bpm) / 24
    return (60000 / bpm) / 24;
  }, [bpm]);

  // High-precision clock using requestAnimationFrame + performance.now
  const clockLoop = useCallback(() => {
    if (!isPlaying) return;

    const now = performance.now();
    const pulseInterval = getPulseInterval();

    if (now - lastTickTimeRef.current >= pulseInterval) {
      // Send MIDI clock pulse if enabled
      if (sendClock && midiOutput) {
        sendMIDIClock(midiOutput);
      }

      // Update beat counter (every 24 pulses = 1 quarter note)
      pulseCountRef.current++;
      if (pulseCountRef.current >= 24) {
        pulseCountRef.current = 0;
        setCurrentBeat((prev) => (prev + 1) % 4);
      }

      // Update sequencer step
      if (sequencerEnabled) {
        stepPulseCountRef.current++;
        const pulsesPerStep = getPulsesPerStep();

        if (stepPulseCountRef.current >= pulsesPerStep) {
          stepPulseCountRef.current = 0;
          setCurrentStep((prev) => {
            const nextStep = (prev + 1) % sequencerSteps;
            return nextStep;
          });
        }
      }

      lastTickTimeRef.current = now;
    }

    clockIntervalRef.current = requestAnimationFrame(clockLoop);
  }, [isPlaying, getPulseInterval, sendClock, midiOutput, sequencerEnabled, sequencerSteps, getPulsesPerStep]);

  // Trigger preset when step changes (while sequencer is enabled and playing)
  useEffect(() => {
    if (!isPlaying || !sequencerEnabled) return;

    const presetSlot = sequence[currentStep];
    const lastPreset = lastTriggeredPresetRef.current;

    if (presetSlot) {
      const isSamePreset = presetSlot === lastPreset;

      if (retrigMode) {
        // Retrig mode: always retrigger, use retrigger callback if same preset
        if (isSamePreset && onRetriggerPresetRef.current) {
          onRetriggerPresetRef.current(presetSlot);
        } else if (onTriggerPresetRef.current) {
          onTriggerPresetRef.current(presetSlot);
        }
      } else {
        // Sustain mode: skip if same preset as last step
        if (!isSamePreset && onTriggerPresetRef.current) {
          onTriggerPresetRef.current(presetSlot);
        }
        // Same preset in sustain mode - do nothing, let notes sustain
      }
      lastTriggeredPresetRef.current = presetSlot;
    } else if (onStopNotesRef.current) {
      // Empty step - stop notes
      onStopNotesRef.current();
      lastTriggeredPresetRef.current = null;
    }
  }, [currentStep, isPlaying, sequencerEnabled, sequence, retrigMode]);

  // Start transport
  const start = useCallback(() => {
    if (isPlaying) return;

    setIsPlaying(true);
    setCurrentBeat(0);
    setCurrentStep(0);
    pulseCountRef.current = 0;
    stepPulseCountRef.current = 0;
    lastTickTimeRef.current = performance.now();
    lastTriggeredPresetRef.current = null;

    if (sendClock && midiOutput) {
      sendMIDIStart(midiOutput);
    }

    clockIntervalRef.current = requestAnimationFrame(clockLoop);
  }, [isPlaying, sendClock, midiOutput, clockLoop]);

  // Stop transport
  const stop = useCallback(() => {
    if (!isPlaying) return;

    setIsPlaying(false);
    setCurrentBeat(0);
    setCurrentStep(0);
    pulseCountRef.current = 0;
    stepPulseCountRef.current = 0;
    lastTriggeredPresetRef.current = null;

    if (clockIntervalRef.current) {
      cancelAnimationFrame(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }

    if (sendClock && midiOutput) {
      sendMIDIStop(midiOutput);
    }

    // Stop any playing notes
    if (onStopNotesRef.current) {
      onStopNotesRef.current();
    }
  }, [isPlaying, sendClock, midiOutput]);

  // Toggle play/stop
  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  // Update BPM (clamp to valid range)
  const updateBpm = useCallback((newBpm) => {
    const clamped = Math.max(20, Math.min(300, newBpm));
    setBpm(clamped);
  }, []);

  // Set a step in the sequence
  const setStep = useCallback((stepIndex, presetSlot) => {
    setSequence((prev) => {
      const newSeq = [...prev];
      newSeq[stepIndex] = presetSlot;
      return newSeq;
    });
  }, []);

  // Clear a step
  const clearStep = useCallback((stepIndex) => {
    setSequence((prev) => {
      const newSeq = [...prev];
      newSeq[stepIndex] = null;
      return newSeq;
    });
  }, []);

  // Clear all steps
  const clearSequence = useCallback(() => {
    setSequence(new Array(sequencerSteps).fill(null));
  }, [sequencerSteps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clockIntervalRef.current) {
        cancelAnimationFrame(clockIntervalRef.current);
      }
      if (isPlaying && sendClock && midiOutput) {
        sendMIDIStop(midiOutput);
      }
    };
  }, []);

  // Restart clock loop when dependencies change (while playing)
  useEffect(() => {
    if (isPlaying) {
      if (clockIntervalRef.current) {
        cancelAnimationFrame(clockIntervalRef.current);
      }
      clockIntervalRef.current = requestAnimationFrame(clockLoop);
    }
  }, [isPlaying, clockLoop]);

  return {
    // State
    bpm,
    isPlaying,
    currentBeat,
    sendClock,

    // Sequencer state
    sequencerEnabled,
    sequencerSteps,
    currentStep,
    sequence,
    stepsPerBeat,
    retrigMode,

    // Actions
    start,
    stop,
    toggle,
    setBpm: updateBpm,
    setSendClock,

    // Sequencer actions
    setSequencerEnabled,
    setSequencerSteps,
    setStepsPerBeat,
    setRetrigMode,
    setStep,
    clearStep,
    clearSequence,
  };
}
