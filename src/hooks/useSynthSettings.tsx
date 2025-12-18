/**
 * Synth Settings Management
 * Handles localStorage persistence for synth settings.
 *
 * @module hooks/useSynthSettings
 */

import { useState, useEffect } from "react";
import type { ADSREnvelope } from "../lib/synthPresets";
import type { AudioMode } from "./useToneSynth";

/** Storage key for synth settings */
const SYNTH_SETTINGS_KEY = "chordboy-synth-settings";

interface SynthSettings {
  audioMode: AudioMode;
  presetId: string;
  envelope: ADSREnvelope;
  volume: number;
}

/**
 * Load saved settings from localStorage
 */
function loadSettings(): Partial<SynthSettings> {
  try {
    const saved = localStorage.getItem(SYNTH_SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

/**
 * Hook to manage synth settings persistence
 */
export function useSynthSettings(defaults: {
  audioMode: AudioMode;
  presetId: string;
  envelope: ADSREnvelope;
  volume: number;
}) {
  const savedSettings = loadSettings();

  const [audioMode, setAudioMode] = useState<AudioMode>(
    savedSettings.audioMode ?? defaults.audioMode
  );
  const [presetId, setPresetId] = useState(
    savedSettings.presetId ?? defaults.presetId
  );
  const [envelope, setEnvelope] = useState<ADSREnvelope>(
    savedSettings.envelope ?? defaults.envelope
  );
  const [volume, setVolume] = useState(savedSettings.volume ?? defaults.volume);

  // Save settings on change
  useEffect(() => {
    const settings: SynthSettings = {
      audioMode,
      presetId,
      envelope,
      volume,
    };
    localStorage.setItem(SYNTH_SETTINGS_KEY, JSON.stringify(settings));
  }, [audioMode, presetId, envelope, volume]);

  return {
    audioMode,
    setAudioMode,
    presetId,
    setPresetId,
    envelope,
    setEnvelope,
    volume,
    setVolume,
  };
}
