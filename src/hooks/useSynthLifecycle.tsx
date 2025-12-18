/**
 * Synth Lifecycle Management Hook
 * Handles initialization, creation, and disposal of Tone.js synth instances.
 *
 * @module hooks/useSynthLifecycle
 */

import { useState, useCallback, useEffect, useRef, type MutableRefObject } from "react";
import * as Tone from "tone";
import type { SynthPreset, ADSREnvelope } from "../lib/synthPresets";
import type { AudioMode } from "./useToneSynth";
import { createFactorySynth, createVolumeNode } from "../lib/synthFactory";

interface UseSynthLifecycleProps {
  audioMode: AudioMode;
  currentPreset: SynthPreset;
  envelope: ADSREnvelope;
  volume: number;
}

/**
 * Hook to manage synth lifecycle (initialization, creation, disposal)
 */
export function useSynthLifecycle({
  audioMode,
  currentPreset,
  envelope,
  volume,
}: UseSynthLifecycleProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const effectsRef = useRef<Tone.ToneAudioNode[]>([]);
  const volumeNodeRef = useRef<Tone.Volume | null>(null);

  /**
   * Dispose of current synth and effects
   */
  const disposeCurrentSynth = useCallback(() => {
    // Dispose factory synth if active
    if (synthRef.current) {
      synthRef.current.releaseAll();
      synthRef.current.disconnect();
      synthRef.current.dispose();
      synthRef.current = null;
    }

    // Dispose effects chain
    effectsRef.current.forEach((effect) => {
      effect.disconnect();
      effect.dispose();
    });
    effectsRef.current = [];
  }, []);

  /**
   * Create synth with current preset and envelope
   */
  const createSynth = useCallback(() => {
    disposeCurrentSynth();

    // Create volume node if not exists
    if (!volumeNodeRef.current) {
      volumeNodeRef.current = createVolumeNode(volume);
    }

    // Create factory synth
    const { synth, effects } = createFactorySynth(
      currentPreset,
      envelope,
      volume,
      volumeNodeRef.current
    );

    synthRef.current = synth;
    effectsRef.current = effects;
  }, [currentPreset, envelope, volume, disposeCurrentSynth]);

  /**
   * Initialize the audio context (requires user gesture)
   */
  const initialize = useCallback(async () => {
    if (isInitialized) return;

    try {
      await Tone.start();
      setIsInitialized(true);
      createSynth();
    } catch (err) {
      console.error("Failed to initialize Tone.js:", err);
    }
  }, [isInitialized, createSynth]);

  // Recreate synth when preset or envelope changes
  useEffect(() => {
    if (isInitialized) {
      createSynth();
    }
  }, [isInitialized, currentPreset.id, envelope, createSynth]);

  // Auto-initialize if saved mode was synth/both (requires user interaction first)
  useEffect(() => {
    if ((audioMode === "synth" || audioMode === "both") && !isInitialized) {
      // Try to initialize - will work if user has interacted with page
      Tone.start()
        .then(() => {
          setIsInitialized(true);
        })
        .catch(() => {
          // Will need user gesture - that's okay, clicking any button will trigger it
        });
    }
  }, [audioMode, isInitialized]);

  // Update volume when it changes
  useEffect(() => {
    if (volumeNodeRef.current) {
      volumeNodeRef.current.volume.value = Tone.gainToDb(volume);
    }
  }, [volume]);

  return {
    isInitialized,
    setIsInitialized,
    synthRef,
    effectsRef,
    volumeNodeRef,
    initialize,
    disposeCurrentSynth,
  };
}
