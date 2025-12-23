/**
 * Tone.js Synth Hook
 * Manages browser-based synthesizer as alternative to MIDI output.
 *
 * @module hooks/useToneSynth
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import * as Tone from "tone";
import { useMIDI } from "./useMIDI";
import { createHumanizeManager } from "../lib/humanize";
import {
  synthPresets,
  getPresetById,
  DEFAULT_PRESET_ID,
  type SynthPreset,
  type ADSREnvelope,
} from "../lib/synthPresets";
import type { MIDINote, StrumDirection, HumanizeManager, PlaybackMode } from "../types";
import type { TriggerMode } from "./useMIDI";
import { useCustomPatches } from "./useCustomPatches";
import { useCustomSynth } from "./useCustomSynth";
import { useSynthEventHandlers } from "./useSynthEventHandlers";
import { useSynthSettings } from "./useSynthSettings";
import { usePatchBuilderState } from "./usePatchBuilderState";
import { usePresetSelection } from "./usePresetSelection";
import { useSynthPlayback } from "./useSynthPlayback";
import { useSynthLifecycle } from "./useSynthLifecycle";

/** Audio mode - MIDI only, Synth only, or both */
export type AudioMode = "midi" | "synth" | "both";

/** Tone Synth context value */
export interface ToneSynthContextValue {
  // State
  /** Whether the synth is initialized (AudioContext started) */
  isInitialized: boolean;
  /** Whether the synth is currently enabled for playback */
  isEnabled: boolean;
  /** Current audio mode */
  audioMode: AudioMode;
  /** Currently selected preset */
  currentPreset: SynthPreset;
  /** Current ADSR envelope */
  envelope: ADSREnvelope;
  /** Master volume (0-1) */
  volume: number;
  /** Available presets */
  presets: SynthPreset[];

  // Custom patch support
  /** Whether currently using a custom patch */
  isCustomPatch: boolean;
  /** ID of currently selected custom patch */
  customPatchId: string | null;
  /** Select a custom patch by ID */
  selectCustomPatch: (patchId: string) => void;
  /** Open the patch builder (with optional patch to edit) */
  openPatchBuilder: (patchId?: string | null) => void;
  /** Close the patch builder */
  closePatchBuilder: () => void;
  /** Whether the patch builder is open */
  isPatchBuilderOpen: boolean;
  /** ID of the patch being edited (null if creating new) */
  editingPatchId: string | null;
  /** Custom patches hook (exposed for UI) */
  customPatches: ReturnType<typeof useCustomPatches>;

  // Actions
  /** Initialize the audio context (requires user gesture) */
  initialize: () => Promise<void>;
  /** Set the audio mode */
  setAudioMode: (mode: AudioMode) => void;
  /** Select a preset by ID */
  selectPreset: (presetId: string) => void;
  /** Update ADSR envelope */
  setEnvelope: (envelope: ADSREnvelope) => void;
  /** Set master volume */
  setVolume: (volume: number) => void;
  /** Play a single note */
  playNote: (note: MIDINote, velocity?: number) => void;
  /** Stop a single note */
  stopNote: (note: MIDINote) => void;
  /** Play a chord */
  playChord: (notes: MIDINote[], velocity?: number) => void;
  /** Stop all notes */
  stopAllNotes: () => void;
}

const ToneSynthContext = createContext<ToneSynthContextValue | null>(null);

interface ToneSynthProviderProps {
  children: ReactNode;
}


/**
 * Tone Synth Provider
 * Manages Tone.js synthesizer lifecycle and provides synth functions.
 */
export function ToneSynthProvider({ children }: ToneSynthProviderProps): React.JSX.Element {
  // Get expression settings from MIDI context
  const {
    humanize,
    strumEnabled,
    strumSpread,
    strumDirection,
    triggerMode,
    glideTime,
    playbackMode,
    bpmForPlayback,
  } = useMIDI();

  // Use settings management hook
  const {
    audioMode,
    setAudioMode: setAudioModeState,
    presetId: currentPresetId,
    setPresetId: setCurrentPresetId,
    envelope: settingsEnvelope,
    setEnvelope: setSettingsEnvelope,
    volume,
    setVolume: setVolumeState,
  } = useSynthSettings({
    audioMode: "midi",
    presetId: DEFAULT_PRESET_ID,
    envelope: getPresetById(DEFAULT_PRESET_ID)!.defaultEnvelope,
    volume: 0.7,
  });

  // Refs for playback state
  const currentNotesRef = useRef<Set<string>>(new Set());

  // Use the custom patches hook
  const customPatches = useCustomPatches();

  // Get the effective envelope (from preset selection or settings)
  // This needs to be computed early for useSynthLifecycle
  const envelope = settingsEnvelope; // Will be updated after preset selection hook

  // Get current preset
  const currentPreset = getPresetById(currentPresetId) ?? synthPresets[0];

  // Use synth lifecycle hook (provides disposal function)
  const {
    isInitialized,
    setIsInitialized,
    synthRef,
    effectsRef,
    volumeNodeRef,
    initialize,
    disposeCurrentSynth,
  } = useSynthLifecycle({
    audioMode,
    currentPreset,
    envelope,
    volume,
  });

  // Use custom synth management hook
  const {
    customSynthRef,
    selectCustomPatch: selectCustomPatchInternal,
    updateCustomPatchEnvelope,
    getCustomPatchEnvelope,
    disposeCustomSynth,
  } = useCustomSynth(customPatches, isInitialized);

  // Callback for when preset changes (updates settings state)
  const handlePresetChange = useCallback((presetId: string, envelope: ADSREnvelope) => {
    setCurrentPresetId(presetId);
    setSettingsEnvelope(envelope);
  }, [setCurrentPresetId, setSettingsEnvelope]);

  // Use preset selection hook
  const {
    currentPresetId: _currentPresetId,
    isCustomPatch,
    customPatchId,
    envelope: presetEnvelope,
    setEnvelope: setPresetEnvelope,
    selectPreset,
    selectCustomPatch,
  } = usePresetSelection(
    currentPresetId,
    settingsEnvelope,
    disposeCustomSynth,
    disposeCurrentSynth,
    selectCustomPatchInternal,
    handlePresetChange
  );

  // Use patch builder state hook
  const {
    isPatchBuilderOpen,
    editingPatchId,
    openPatchBuilder,
    closePatchBuilder,
  } = usePatchBuilderState();

  // Humanization manager for scheduling notes
  const humanizeManagerRef = useRef<HumanizeManager>(createHumanizeManager());

  // Track last strum direction for alternate mode
  const strumLastDirectionRef = useRef<StrumDirection>("up");

  // Refs for latest values (to avoid stale closures in event subscriptions)
  const isEnabledRef = useRef(false);
  const isInitializedRef = useRef(false);
  const isPatchBuilderOpenRef = useRef(false);
  const isCustomPatchRef = useRef(false);
  const triggerModeRef = useRef<TriggerMode>(triggerMode);
  const playbackModeRef = useRef<PlaybackMode>(playbackMode);
  const bpmRef = useRef<number>(bpmForPlayback);

  // Update envelope based on patch selection
  const finalEnvelope = isCustomPatch ? presetEnvelope : settingsEnvelope;

  // Derived enabled state
  const isEnabled = audioMode === "synth" || audioMode === "both";

  // Keep refs in sync with state (for event subscription closures)
  useEffect(() => {
    isEnabledRef.current = isEnabled;
    isInitializedRef.current = isInitialized;
    isPatchBuilderOpenRef.current = isPatchBuilderOpen;
    isCustomPatchRef.current = isCustomPatch;
  }, [isEnabled, isInitialized, isPatchBuilderOpen, isCustomPatch]);

  useEffect(() => {
    triggerModeRef.current = triggerMode;
  }, [triggerMode]);

  useEffect(() => {
    playbackModeRef.current = playbackMode;
  }, [playbackMode]);

  useEffect(() => {
    bpmRef.current = bpmForPlayback;
  }, [bpmForPlayback]);

  /**
   * Set audio mode
   */
  const setAudioMode = useCallback(async (mode: AudioMode) => {
    setAudioModeState(mode);
    // If enabling synth for the first time, initialize immediately
    if ((mode === "synth" || mode === "both") && !isInitialized) {
      try {
        await Tone.start();
        setIsInitialized(true);
        // createSynth will be called by the useEffect that watches isInitialized
      } catch (err) {
        console.error("Failed to initialize Tone.js:", err);
      }
    }
  }, [isInitialized, setAudioModeState]);

  /**
   * Update ADSR envelope
   * For custom patches, updates the patch itself and syncs to the engine
   */
  const setEnvelope = useCallback((newEnvelope: ADSREnvelope) => {
    if (isCustomPatch && customPatchId) {
      updateCustomPatchEnvelope(customPatchId, newEnvelope);
      setPresetEnvelope(newEnvelope);
    } else {
      // Update factory preset envelope state
      setSettingsEnvelope(newEnvelope);
    }
  }, [isCustomPatch, customPatchId, updateCustomPatchEnvelope, setPresetEnvelope, setSettingsEnvelope]);

  /**
   * Set master volume
   */
  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(Math.min(1, Math.max(0, newVolume)));
  }, [setVolumeState]);

  // Use synth playback hook
  const {
    playNote,
    stopNote,
    playChord,
    playChordWithGlide: playChordWithGlideInternal,
    stopAllNotes,
  } = useSynthPlayback({
    isEnabled,
    isInitialized,
    isCustomPatch,
    customSynthRef,
    synthRef,
    humanizeManagerRef,
    strumLastDirectionRef,
    currentNotesRef,
    strumEnabled,
    strumSpread,
    strumDirection,
    humanize,
    glideTime,
  });

  // Subscribe to chord and grace note events
  useSynthEventHandlers({
    isPatchBuilderOpenRef,
    isEnabledRef,
    isInitializedRef,
    isCustomPatchRef,
    triggerModeRef,
    playbackModeRef,
    bpmRef,
    customSynthRef,
    synthRef,
    playChordWithGlide: playChordWithGlideInternal,
    playChord,
    stopAllNotes,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      humanizeManagerRef.current.clear();

      // Dispose custom synth first (before factory synth)
      disposeCustomSynth();

      // Dispose factory synth
      if (synthRef.current) {
        synthRef.current.releaseAll();
        synthRef.current.disconnect();
        synthRef.current.dispose();
        synthRef.current = null;
      }

      effectsRef.current.forEach((effect) => {
        effect.disconnect();
        effect.dispose();
      });
      effectsRef.current = [];

      if (volumeNodeRef.current) {
        volumeNodeRef.current.dispose();
        volumeNodeRef.current = null;
      }
    };
  }, [disposeCustomSynth, synthRef, effectsRef, volumeNodeRef]);

  const value: ToneSynthContextValue = {
    isInitialized,
    isEnabled,
    audioMode,
    currentPreset,
    envelope: finalEnvelope,
    volume,
    presets: synthPresets,

    // Custom patch support
    isCustomPatch,
    customPatchId,
    selectCustomPatch,
    openPatchBuilder,
    closePatchBuilder,
    isPatchBuilderOpen,
    editingPatchId,
    customPatches,

    initialize,
    setAudioMode,
    selectPreset,
    setEnvelope,
    setVolume,
    playNote,
    stopNote,
    playChord,
    stopAllNotes,
  };

  return (
    <ToneSynthContext.Provider value={value}>{children}</ToneSynthContext.Provider>
  );
}

/**
 * Hook to access Tone synth context.
 * Must be used within a ToneSynthProvider.
 */
export function useToneSynth(): ToneSynthContextValue {
  const context = useContext(ToneSynthContext);
  if (!context) {
    throw new Error("useToneSynth must be used within a ToneSynthProvider");
  }
  return context;
}
