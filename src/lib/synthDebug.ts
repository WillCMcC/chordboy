/**
 * Synth Debug Hooks for E2E Testing
 *
 * Exposes synth state via window.__SYNTH_DEBUG__ in development mode
 * for E2E test assertions
 */

import type { CustomSynthEngine } from './customSynthEngine';
import type { SynthPatch } from '../types/synth';

interface SynthDebugAPI {
  isPlaying: () => boolean;
  getActiveVoices: () => number;
  getCurrentPatch: () => SynthPatch | null;
  getPatchParameter: (path: string) => number | null;
  getAnalyserData: (type: 'frequency' | 'waveform') => number[];
}

interface MIDIDebugAPI {
  getSentNotes: () => Array<{ note: number; velocity: number; timestamp: number }>;
  clearLog: () => void;
}

declare global {
  interface Window {
    __SYNTH_DEBUG__?: SynthDebugAPI;
    __MIDI_DEBUG__?: MIDIDebugAPI;
  }
}

/**
 * Enable synth debug hooks (development only)
 */
export function enableSynthDebug(synthEngine: CustomSynthEngine) {
  // Only enable in development/test mode
  if (import.meta.env.MODE === 'production') {
    return;
  }

  window.__SYNTH_DEBUG__ = {
    isPlaying: () => {
      return synthEngine.voices.some((voice) => {
        // Check if voice is currently playing
        return (voice as any).envelope?.state === 'attack' ||
               (voice as any).envelope?.state === 'decay' ||
               (voice as any).envelope?.state === 'sustain';
      });
    },

    getActiveVoices: () => {
      return synthEngine.voices.filter((voice) => {
        const state = (voice as any).envelope?.state;
        return state === 'attack' || state === 'decay' || state === 'sustain';
      }).length;
    },

    getCurrentPatch: () => {
      return (synthEngine as any).currentPatch || null;
    },

    getPatchParameter: (path: string) => {
      try {
        const parts = path.split('.');
        let value: any = synthEngine;

        for (const part of parts) {
          value = value[part];
          if (value === undefined) return null;
        }

        // If it's a Tone.js parameter, get the value
        if (value && typeof value.value === 'number') {
          return value.value;
        }

        return typeof value === 'number' ? value : null;
      } catch {
        return null;
      }
    },

    getAnalyserData: (type: 'frequency' | 'waveform') => {
      // This would require an analyser node to be connected
      // For now, return empty array (can be implemented if needed)
      return [];
    },
  };
}

/**
 * Enable MIDI debug hooks (development only)
 */
export function enableMIDIDebug() {
  // Only enable in development/test mode
  if (import.meta.env.MODE === 'production') {
    return;
  }

  const sentNotes: Array<{ note: number; velocity: number; timestamp: number }> = [];

  window.__MIDI_DEBUG__ = {
    getSentNotes: () => [...sentNotes],
    clearLog: () => {
      sentNotes.length = 0;
    },
  };

  // Return a function to log MIDI notes
  return {
    logNote: (note: number, velocity: number) => {
      sentNotes.push({
        note,
        velocity,
        timestamp: Date.now(),
      });

      // Keep only last 100 notes to prevent memory leak
      if (sentNotes.length > 100) {
        sentNotes.shift();
      }
    },
  };
}

/**
 * Disable debug hooks (cleanup)
 */
export function disableDebugHooks() {
  delete window.__SYNTH_DEBUG__;
  delete window.__MIDI_DEBUG__;
}
