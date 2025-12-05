import { useState, useCallback, useRef, useEffect } from "react";
import {
  saveSequencerToStorage,
  loadSequencerFromStorage,
} from "../lib/sequencerStorage";

/**
 * useTransport - Manages transport state and sequencer, synced to external MIDI clock
 *
 * Features:
 * - Sync to external MIDI clock (from Ableton, etc.) when enabled
 * - Internal clock when sync is disabled
 * - Visual beat grid (quarter notes)
 * - Sequencer grid with configurable steps and preset triggers
 * - BPM display (calculated from incoming clock when synced)
 * - Persistent storage of sequence and settings
 */
export function useTransport(
  { onTriggerPreset, onRetriggerPreset, onStopNotes, setClockCallbacks } = {}
) {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0); // 0-3 for visual display
  const [syncEnabled, setSyncEnabled] = useState(false); // Whether to sync to external MIDI clock

  // Sequencer state
  const [sequencerEnabled, setSequencerEnabled] = useState(false);
  const [sequencerSteps, setSequencerSteps] = useState(8); // Number of steps (4, 8, 16)
  const [currentStep, setCurrentStep] = useState(0);
  const [sequence, setSequence] = useState([]); // Array of preset slots (or null for empty)
  const [stepsPerBeat, setStepsPerBeat] = useState(1); // 1 = quarter notes, 2 = eighth notes, 4 = sixteenth
  const [retrigMode, setRetrigMode] = useState(true); // true = retrigger same notes, false = sustain
  const [isLoaded, setIsLoaded] = useState(false); // Track if we've loaded from storage

  // Refs for internal clock timing
  const clockIntervalRef = useRef(null);
  const pulseCountRef = useRef(0);
  const lastTickTimeRef = useRef(0);
  const stepPulseCountRef = useRef(0);
  const lastTriggeredPresetRef = useRef(null); // Track last triggered preset for sustain mode

  // BPM calculation from external clock
  const lastClockTimeRef = useRef(0);
  const clockTimesRef = useRef([]); // Rolling window of clock intervals

  // Refs for callbacks to avoid effect re-runs
  const onTriggerPresetRef = useRef(onTriggerPreset);
  const onRetriggerPresetRef = useRef(onRetriggerPreset);
  const onStopNotesRef = useRef(onStopNotes);
  const sequencerEnabledRef = useRef(sequencerEnabled);
  const sequencerStepsRef = useRef(sequencerSteps);
  const stepsPerBeatRef = useRef(stepsPerBeat);
  const retrigModeRef = useRef(retrigMode);
  const sequenceRef = useRef(sequence);

  // Keep refs updated
  useEffect(() => {
    onTriggerPresetRef.current = onTriggerPreset;
    onRetriggerPresetRef.current = onRetriggerPreset;
    onStopNotesRef.current = onStopNotes;
  });

  useEffect(() => {
    sequencerEnabledRef.current = sequencerEnabled;
  }, [sequencerEnabled]);

  useEffect(() => {
    sequencerStepsRef.current = sequencerSteps;
  }, [sequencerSteps]);

  useEffect(() => {
    stepsPerBeatRef.current = stepsPerBeat;
  }, [stepsPerBeat]);

  useEffect(() => {
    retrigModeRef.current = retrigMode;
  }, [retrigMode]);

  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);

  // Load sequencer state from storage on mount
  useEffect(() => {
    loadSequencerFromStorage().then((savedState) => {
      if (savedState) {
        if (savedState.sequence) setSequence(savedState.sequence);
        if (savedState.sequencerSteps) setSequencerSteps(savedState.sequencerSteps);
        if (savedState.stepsPerBeat) setStepsPerBeat(savedState.stepsPerBeat);
        if (savedState.retrigMode !== undefined) setRetrigMode(savedState.retrigMode);
        if (savedState.sequencerEnabled !== undefined) setSequencerEnabled(savedState.sequencerEnabled);
        if (savedState.bpm) setBpm(savedState.bpm);
      }
      setIsLoaded(true);
    });
  }, []);

  // Save sequencer state to storage when it changes (after initial load)
  useEffect(() => {
    if (!isLoaded) return;

    const state = {
      sequence,
      sequencerSteps,
      stepsPerBeat,
      retrigMode,
      sequencerEnabled,
      bpm,
    };
    saveSequencerToStorage(state);
  }, [isLoaded, sequence, sequencerSteps, stepsPerBeat, retrigMode, sequencerEnabled, bpm]);

  // Initialize sequence when steps change (only if not loaded yet or explicitly changed)
  useEffect(() => {
    if (!isLoaded) return; // Don't initialize until we've loaded from storage

    setSequence((prev) => {
      // If sequence is already the right length, don't change it
      if (prev.length === sequencerSteps) return prev;

      const newSeq = new Array(sequencerSteps).fill(null);
      // Preserve existing steps
      prev.forEach((val, i) => {
        if (i < sequencerSteps) {
          newSeq[i] = val;
        }
      });
      return newSeq;
    });
  }, [sequencerSteps, isLoaded]);

  // Calculate pulses per step based on stepsPerBeat
  // 24 PPQN = 24 pulses per quarter note
  const getPulsesPerStep = useCallback(() => {
    return Math.floor(24 / stepsPerBeat);
  }, [stepsPerBeat]);

  /**
   * Process a single clock pulse (called for both internal and external clock)
   */
  const processPulse = useCallback(() => {
    // Update beat counter (every 24 pulses = 1 quarter note)
    pulseCountRef.current++;
    if (pulseCountRef.current >= 24) {
      pulseCountRef.current = 0;
      setCurrentBeat((prev) => (prev + 1) % 4);
    }

    // Update sequencer step
    if (sequencerEnabledRef.current) {
      stepPulseCountRef.current++;
      const pulsesPerStep = Math.floor(24 / stepsPerBeatRef.current);

      if (stepPulseCountRef.current >= pulsesPerStep) {
        stepPulseCountRef.current = 0;

        setCurrentStep((prev) => {
          const nextStep = (prev + 1) % sequencerStepsRef.current;

          // Trigger preset for this step
          const presetSlot = sequenceRef.current[nextStep];
          const lastPreset = lastTriggeredPresetRef.current;

          if (presetSlot) {
            const isSamePreset = presetSlot === lastPreset;

            if (retrigModeRef.current) {
              // Retrig mode: always retrigger
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
            }
            lastTriggeredPresetRef.current = presetSlot;
          } else if (onStopNotesRef.current) {
            // Empty step - stop notes
            onStopNotesRef.current();
            lastTriggeredPresetRef.current = null;
          }

          return nextStep;
        });
      }
    }
  }, []);

  /**
   * Handle external MIDI clock pulse
   */
  const handleExternalClock = useCallback(() => {
    // Calculate BPM from clock timing
    const now = performance.now();
    if (lastClockTimeRef.current > 0) {
      const interval = now - lastClockTimeRef.current;
      clockTimesRef.current.push(interval);

      // Keep rolling window of last 24 intervals (1 beat)
      if (clockTimesRef.current.length > 24) {
        clockTimesRef.current.shift();
      }

      // Calculate average BPM from intervals
      if (clockTimesRef.current.length >= 6) {
        const avgInterval =
          clockTimesRef.current.reduce((a, b) => a + b, 0) /
          clockTimesRef.current.length;
        // 24 PPQN, so BPM = 60000 / (avgInterval * 24)
        const calculatedBpm = Math.round(60000 / (avgInterval * 24));
        if (calculatedBpm >= 20 && calculatedBpm <= 300) {
          setBpm(calculatedBpm);
        }
      }
    }
    lastClockTimeRef.current = now;

    // Process the pulse
    processPulse();
  }, [processPulse]);

  /**
   * Handle external MIDI Start
   */
  const handleExternalStart = useCallback(() => {
    setIsPlaying(true);
    setCurrentBeat(0);
    setCurrentStep(0);
    pulseCountRef.current = 0;
    stepPulseCountRef.current = 0;
    lastTriggeredPresetRef.current = null;
    clockTimesRef.current = [];
    lastClockTimeRef.current = 0;

    // Trigger first step if sequencer is enabled
    if (sequencerEnabledRef.current) {
      const firstPreset = sequenceRef.current[0];
      if (firstPreset && onTriggerPresetRef.current) {
        onTriggerPresetRef.current(firstPreset);
        lastTriggeredPresetRef.current = firstPreset;
      }
    }
  }, []);

  /**
   * Handle external MIDI Stop
   */
  const handleExternalStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentBeat(0);
    setCurrentStep(0);
    pulseCountRef.current = 0;
    stepPulseCountRef.current = 0;
    lastTriggeredPresetRef.current = null;

    // Stop any playing notes
    if (onStopNotesRef.current) {
      onStopNotesRef.current();
    }
  }, []);

  // Register clock callbacks when sync is enabled
  useEffect(() => {
    if (setClockCallbacks) {
      if (syncEnabled) {
        setClockCallbacks({
          onClock: handleExternalClock,
          onStart: handleExternalStart,
          onStop: handleExternalStop,
        });
      } else {
        // Clear callbacks when sync is disabled
        setClockCallbacks({
          onClock: null,
          onStart: null,
          onStop: null,
        });
      }
    }
  }, [syncEnabled, setClockCallbacks, handleExternalClock, handleExternalStart, handleExternalStop]);

  // Calculate interval for 24 PPQN (pulses per quarter note) for internal clock
  const getPulseInterval = useCallback(() => {
    return (60000 / bpm) / 24;
  }, [bpm]);

  // Internal clock loop using requestAnimationFrame
  const clockLoop = useCallback(() => {
    if (!isPlaying || syncEnabled) return;

    const now = performance.now();
    const pulseInterval = getPulseInterval();

    if (now - lastTickTimeRef.current >= pulseInterval) {
      processPulse();
      lastTickTimeRef.current = now;
    }

    clockIntervalRef.current = requestAnimationFrame(clockLoop);
  }, [isPlaying, syncEnabled, getPulseInterval, processPulse]);

  // Start internal transport (only when sync is disabled)
  const start = useCallback(() => {
    if (isPlaying || syncEnabled) return;

    setIsPlaying(true);
    setCurrentBeat(0);
    setCurrentStep(0);
    pulseCountRef.current = 0;
    stepPulseCountRef.current = 0;
    lastTickTimeRef.current = performance.now();
    lastTriggeredPresetRef.current = null;

    // Trigger first step if sequencer is enabled
    if (sequencerEnabledRef.current) {
      const firstPreset = sequenceRef.current[0];
      if (firstPreset && onTriggerPresetRef.current) {
        onTriggerPresetRef.current(firstPreset);
        lastTriggeredPresetRef.current = firstPreset;
      }
    }

    clockIntervalRef.current = requestAnimationFrame(clockLoop);
  }, [isPlaying, syncEnabled, clockLoop]);

  // Stop internal transport
  const stop = useCallback(() => {
    if (!isPlaying || syncEnabled) return;

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

    // Stop any playing notes
    if (onStopNotesRef.current) {
      onStopNotesRef.current();
    }
  }, [isPlaying, syncEnabled]);

  // Toggle play/stop (only for internal clock)
  const toggle = useCallback(() => {
    if (syncEnabled) return; // Can't manually toggle when synced

    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, syncEnabled, start, stop]);

  // Update BPM (only affects internal clock)
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
    };
  }, []);

  // Restart internal clock loop when dependencies change (while playing without sync)
  useEffect(() => {
    if (isPlaying && !syncEnabled) {
      if (clockIntervalRef.current) {
        cancelAnimationFrame(clockIntervalRef.current);
      }
      clockIntervalRef.current = requestAnimationFrame(clockLoop);
    }
  }, [isPlaying, syncEnabled, clockLoop]);

  // Stop internal clock when sync is enabled
  useEffect(() => {
    if (syncEnabled && clockIntervalRef.current) {
      cancelAnimationFrame(clockIntervalRef.current);
      clockIntervalRef.current = null;
    }
  }, [syncEnabled]);

  return {
    // State
    bpm,
    isPlaying,
    currentBeat,
    syncEnabled,

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
    setSyncEnabled,

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
