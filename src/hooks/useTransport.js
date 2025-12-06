import { useState, useCallback, useRef, useEffect } from "react";
import {
  saveSequencerToStorage,
  loadSequencerFromStorage,
} from "../lib/sequencerStorage";
import { processStep } from "../lib/sequencerLogic";
import { useCallbackRef } from "./useStateContainer";
import ClockWorker from "../workers/clockWorker.js?worker";

/** MIDI clock pulses per quarter note (standard 24 PPQN) */
const MIDI_CLOCKS_PER_BEAT = 24;

/**
 * useTransport - Manages transport state and sequencer, synced to external MIDI clock
 *
 * Features:
 * - Sync to external MIDI clock (from Ableton, etc.) when enabled
 * - Internal clock via Web Worker (runs in background tabs)
 * - Visual beat grid (quarter notes)
 * - Sequencer grid with configurable steps and preset triggers
 * - BPM display (calculated from incoming clock when synced)
 * - Persistent storage of sequence and settings
 *
 * Architecture Note:
 * Uses a state container pattern instead of ref-sync effects.
 * The stateRef contains all values that callbacks need access to,
 * eliminating the need for multiple useEffect hooks to sync refs.
 */
export function useTransport(
  { onTriggerPreset, onRetriggerPreset, onStopNotes, setClockCallbacks } = {}
) {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0); // 0-3 for visual display
  const [syncEnabled, setSyncEnabled] = useState(false); // Whether to sync to external MIDI clock

  // Sequencer state
  const [sequencerEnabled, setSequencerEnabledState] = useState(false);
  const [sequencerSteps, setSequencerStepsState] = useState(8); // Number of steps (4, 8, 16)
  const [currentStep, setCurrentStep] = useState(0);
  const [sequence, setSequenceState] = useState([]); // Array of preset slots (or null for empty)
  const [stepsPerBeat, setStepsPerBeatState] = useState(1); // 1 = quarter notes, 2 = eighth notes, 4 = sixteenth
  const [retrigMode, setRetrigModeState] = useState(true); // true = retrigger same notes, false = sustain
  const [isLoaded, setIsLoaded] = useState(false); // Track if we've loaded from storage

  // Web Worker for internal clock (runs in background)
  const clockWorkerRef = useRef(null);
  const pulseCountRef = useRef(0);
  const stepPulseCountRef = useRef(0);
  const lastTriggeredPresetRef = useRef(null); // Track last triggered preset for sustain mode

  // BPM calculation from external clock
  const lastClockTimeRef = useRef(0);
  const clockTimesRef = useRef([]); // Rolling window of clock intervals

  // State container - single ref that holds all values callbacks need
  // This replaces 6+ individual ref-sync useEffect hooks
  const stateRef = useRef({
    sequencerEnabled: false,
    sequencerSteps: 8,
    stepsPerBeat: 1,
    retrigMode: true,
    sequence: [],
  });

  // Callback refs - keeps callbacks current without re-subscribing
  const callbacksRef = useCallbackRef({
    onTriggerPreset,
    onRetriggerPreset,
    onStopNotes,
  });

  // Wrapped setters that update both state and container
  const setSequencerEnabled = useCallback((value) => {
    const newValue = typeof value === "function"
      ? value(stateRef.current.sequencerEnabled)
      : value;
    stateRef.current.sequencerEnabled = newValue;
    setSequencerEnabledState(newValue);
  }, []);

  const setSequencerSteps = useCallback((value) => {
    const newValue = typeof value === "function"
      ? value(stateRef.current.sequencerSteps)
      : value;
    stateRef.current.sequencerSteps = newValue;
    setSequencerStepsState(newValue);
  }, []);

  const setStepsPerBeat = useCallback((value) => {
    const newValue = typeof value === "function"
      ? value(stateRef.current.stepsPerBeat)
      : value;
    stateRef.current.stepsPerBeat = newValue;
    setStepsPerBeatState(newValue);
  }, []);

  const setRetrigMode = useCallback((value) => {
    const newValue = typeof value === "function"
      ? value(stateRef.current.retrigMode)
      : value;
    stateRef.current.retrigMode = newValue;
    setRetrigModeState(newValue);
  }, []);

  const setSequence = useCallback((value) => {
    const newValue = typeof value === "function"
      ? value(stateRef.current.sequence)
      : value;
    stateRef.current.sequence = newValue;
    setSequenceState(newValue);
  }, []);

  // Load sequencer state from storage on mount
  useEffect(() => {
    loadSequencerFromStorage().then((savedState) => {
      if (savedState) {
        if (savedState.sequence) {
          stateRef.current.sequence = savedState.sequence;
          setSequenceState(savedState.sequence);
        }
        if (savedState.sequencerSteps) {
          stateRef.current.sequencerSteps = savedState.sequencerSteps;
          setSequencerStepsState(savedState.sequencerSteps);
        }
        if (savedState.stepsPerBeat) {
          stateRef.current.stepsPerBeat = savedState.stepsPerBeat;
          setStepsPerBeatState(savedState.stepsPerBeat);
        }
        if (savedState.retrigMode !== undefined) {
          stateRef.current.retrigMode = savedState.retrigMode;
          setRetrigModeState(savedState.retrigMode);
        }
        if (savedState.sequencerEnabled !== undefined) {
          stateRef.current.sequencerEnabled = savedState.sequencerEnabled;
          setSequencerEnabledState(savedState.sequencerEnabled);
        }
        if (savedState.bpm) setBpm(savedState.bpm);
      }
      setIsLoaded(true);
    });
  }, []);

  // Save sequencer state to storage when it changes (after initial load)
  useEffect(() => {
    if (!isLoaded) return;

    const state = {
      sequence: stateRef.current.sequence,
      sequencerSteps: stateRef.current.sequencerSteps,
      stepsPerBeat: stateRef.current.stepsPerBeat,
      retrigMode: stateRef.current.retrigMode,
      sequencerEnabled: stateRef.current.sequencerEnabled,
      bpm,
    };
    saveSequencerToStorage(state);
  }, [isLoaded, sequencerEnabled, sequencerSteps, stepsPerBeat, retrigMode, sequence, bpm]);

  // Initialize sequence when steps change (only if loaded)
  useEffect(() => {
    if (!isLoaded) return;

    setSequence((prev) => {
      if (prev.length === stateRef.current.sequencerSteps) return prev;

      const newSeq = new Array(stateRef.current.sequencerSteps).fill(null);
      prev.forEach((val, i) => {
        if (i < stateRef.current.sequencerSteps) {
          newSeq[i] = val;
        }
      });
      return newSeq;
    });
  }, [sequencerSteps, isLoaded, setSequence]);

  /**
   * Process a single clock pulse (called for both internal and external clock)
   * Uses stateRef for all values to avoid stale closures
   */
  const processPulse = useCallback(() => {
    // Update beat counter (every MIDI_CLOCKS_PER_BEAT pulses = 1 quarter note)
    pulseCountRef.current++;
    if (pulseCountRef.current >= MIDI_CLOCKS_PER_BEAT) {
      pulseCountRef.current = 0;
      setCurrentBeat((prev) => (prev + 1) % 4);
    }

    // Update sequencer step
    if (stateRef.current.sequencerEnabled) {
      stepPulseCountRef.current++;
      const pulsesPerStep = Math.floor(MIDI_CLOCKS_PER_BEAT / stateRef.current.stepsPerBeat);

      if (stepPulseCountRef.current >= pulsesPerStep) {
        stepPulseCountRef.current = 0;

        setCurrentStep((prev) => {
          const nextStep = (prev + 1) % stateRef.current.sequencerSteps;

          // Process this step using extracted logic
          const currentPreset = stateRef.current.sequence[nextStep];
          const result = processStep({
            currentPreset,
            lastTriggeredPreset: lastTriggeredPresetRef.current,
            retrigMode: stateRef.current.retrigMode,
          });

          // Execute the action
          switch (result.action) {
            case "trigger":
              callbacksRef.current.onTriggerPreset?.(result.preset);
              break;
            case "retrigger":
              callbacksRef.current.onRetriggerPreset?.(result.preset);
              break;
            case "stop":
              callbacksRef.current.onStopNotes?.();
              break;
            // "sustain" - do nothing, notes continue playing
          }

          // Update last triggered preset
          lastTriggeredPresetRef.current = result.lastTriggeredPreset;

          return nextStep;
        });
      }
    }
  }, [callbacksRef]);

  /**
   * Handle external MIDI clock pulse
   */
  const handleExternalClock = useCallback(() => {
    // Calculate BPM from clock timing
    const now = performance.now();
    if (lastClockTimeRef.current > 0) {
      const interval = now - lastClockTimeRef.current;
      clockTimesRef.current.push(interval);

      // Keep rolling window of last MIDI_CLOCKS_PER_BEAT intervals (1 beat)
      if (clockTimesRef.current.length > MIDI_CLOCKS_PER_BEAT) {
        clockTimesRef.current.shift();
      }

      // Calculate average BPM from intervals
      if (clockTimesRef.current.length >= 6) {
        const avgInterval =
          clockTimesRef.current.reduce((a, b) => a + b, 0) /
          clockTimesRef.current.length;
        // MIDI_CLOCKS_PER_BEAT PPQN, so BPM = 60000 / (avgInterval * MIDI_CLOCKS_PER_BEAT)
        const calculatedBpm = Math.round(60000 / (avgInterval * MIDI_CLOCKS_PER_BEAT));
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
    if (stateRef.current.sequencerEnabled) {
      const firstPreset = stateRef.current.sequence[0];
      const result = processStep({
        currentPreset: firstPreset,
        lastTriggeredPreset: null,
        retrigMode: stateRef.current.retrigMode,
      });

      if (result.action === "trigger") {
        callbacksRef.current.onTriggerPreset?.(result.preset);
      }
      lastTriggeredPresetRef.current = result.lastTriggeredPreset;
    }
  }, [callbacksRef]);

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
    callbacksRef.current.onStopNotes?.();
  }, [callbacksRef]);

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

  // Keep processPulse in a ref to avoid recreating worker
  const processPulseRef = useRef(processPulse);
  processPulseRef.current = processPulse;

  // Initialize Web Worker for internal clock (once on mount)
  useEffect(() => {
    const worker = new ClockWorker();
    clockWorkerRef.current = worker;

    worker.onmessage = (event) => {
      if (event.data.type === "pulse") {
        processPulseRef.current();
      }
    };

    return () => {
      worker.postMessage({ type: "stop" });
      worker.terminate();
    };
  }, []);

  // Update worker BPM when it changes
  useEffect(() => {
    if (clockWorkerRef.current) {
      clockWorkerRef.current.postMessage({ type: "setBpm", payload: { bpm } });
    }
  }, [bpm]);

  // Start internal transport (only when sync is disabled)
  const start = useCallback(() => {
    if (isPlaying || syncEnabled) return;

    setIsPlaying(true);
    setCurrentBeat(0);
    setCurrentStep(0);
    pulseCountRef.current = 0;
    stepPulseCountRef.current = 0;
    lastTriggeredPresetRef.current = null;

    // Trigger first step if sequencer is enabled
    if (stateRef.current.sequencerEnabled) {
      const firstPreset = stateRef.current.sequence[0];
      const result = processStep({
        currentPreset: firstPreset,
        lastTriggeredPreset: null,
        retrigMode: stateRef.current.retrigMode,
      });

      if (result.action === "trigger") {
        callbacksRef.current.onTriggerPreset?.(result.preset);
      }
      lastTriggeredPresetRef.current = result.lastTriggeredPreset;
    }

    // Start the clock worker
    if (clockWorkerRef.current) {
      clockWorkerRef.current.postMessage({ type: "start", payload: { bpm } });
    }
  }, [isPlaying, syncEnabled, bpm, callbacksRef]);

  // Stop internal transport
  const stop = useCallback(() => {
    if (!isPlaying || syncEnabled) return;

    setIsPlaying(false);
    setCurrentBeat(0);
    setCurrentStep(0);
    pulseCountRef.current = 0;
    stepPulseCountRef.current = 0;
    lastTriggeredPresetRef.current = null;

    // Stop the clock worker
    if (clockWorkerRef.current) {
      clockWorkerRef.current.postMessage({ type: "stop" });
    }

    // Stop any playing notes
    callbacksRef.current.onStopNotes?.();
  }, [isPlaying, syncEnabled, callbacksRef]);

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
  }, [setSequence]);

  // Clear a step
  const clearStep = useCallback((stepIndex) => {
    setSequence((prev) => {
      const newSeq = [...prev];
      newSeq[stepIndex] = null;
      return newSeq;
    });
  }, [setSequence]);

  // Clear all steps
  const clearSequence = useCallback(() => {
    setSequence(new Array(stateRef.current.sequencerSteps).fill(null));
  }, [setSequence]);

  // Stop clock worker when sync is enabled
  useEffect(() => {
    if (syncEnabled && clockWorkerRef.current) {
      clockWorkerRef.current.postMessage({ type: "stop" });
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
