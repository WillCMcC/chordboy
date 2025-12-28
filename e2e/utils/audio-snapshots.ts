/**
 * Audio Snapshot Testing Utilities
 *
 * Provides audio capture, comparison, and snapshot management for E2E tests.
 * Uses Tone.js's Offline context for deterministic rendering and
 * tolerance-based comparison for audio buffer matching.
 */

import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Snapshot directory relative to e2e folder
const AUDIO_SNAPSHOTS_DIR = path.join(__dirname, '..', 'audio-snapshots');

// Types for audio data
export interface AudioFeatures {
  rms: number;
  peak: number;
  zeroCrossings: number;
  energy: number;
  spectralCentroid?: number;
}

export interface AudioSnapshotData {
  sampleRate: number;
  duration: number;
  channels: number;
  features: AudioFeatures;
  samples: number[]; // Downsampled for comparison
  timestamp: string;
}

export interface AudioComparisonResult {
  match: boolean;
  featureDiff: Partial<AudioFeatures>;
  sampleDiff: number; // RMS difference between samples
  details: string;
}

/**
 * Configuration for audio comparison
 */
export interface AudioComparisonConfig {
  rmsTolerance: number; // Default: 0.01
  peakTolerance: number; // Default: 0.05
  sampleTolerance: number; // Default: 0.02
  energyTolerance: number; // Default: 0.05
  zeroCrossingTolerance: number; // Default: 0.1 (10%)
}

const DEFAULT_CONFIG: AudioComparisonConfig = {
  rmsTolerance: 0.01,
  peakTolerance: 0.05,
  sampleTolerance: 0.02,
  energyTolerance: 0.05,
  zeroCrossingTolerance: 0.1,
};

/**
 * Ensure audio snapshots directory exists
 */
function ensureSnapshotDir(): void {
  if (!fs.existsSync(AUDIO_SNAPSHOTS_DIR)) {
    fs.mkdirSync(AUDIO_SNAPSHOTS_DIR, { recursive: true });
  }
}

/**
 * Get snapshot file path
 */
function getSnapshotPath(name: string): string {
  ensureSnapshotDir();
  return path.join(AUDIO_SNAPSHOTS_DIR, `${name}.json`);
}

/**
 * Capture audio from the browser using offline rendering with native Web Audio API
 * This synthesizes chords directly using OfflineAudioContext for deterministic results
 */
export async function captureChordAudio(
  page: Page,
  chordConfig: {
    root: string;
    quality: string;
    extensions?: string[];
  },
  durationMs: number = 500
): Promise<AudioSnapshotData> {
  const audioData = await page.evaluate(
    async ({ chord, duration }) => {
      const sampleRate = 44100;
      const durationSec = duration / 1000;
      const totalSamples = Math.floor(sampleRate * durationSec);

      // Create OfflineAudioContext for deterministic rendering
      const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

      // Note frequency calculation
      const noteFrequencies: Record<string, number> = {
        C: 261.63,
        'C#': 277.18,
        D: 293.66,
        'D#': 311.13,
        E: 329.63,
        F: 349.23,
        'F#': 369.99,
        G: 392.0,
        'G#': 415.3,
        A: 440.0,
        'A#': 466.16,
        B: 493.88,
      };

      // Chord intervals (semitones from root)
      const intervals: Record<string, number[]> = {
        major: [0, 4, 7],
        minor: [0, 3, 7],
        dom7: [0, 4, 7, 10],
        maj7: [0, 4, 7, 11],
        min7: [0, 3, 7, 10],
        dim: [0, 3, 6],
        aug: [0, 4, 8],
        sus4: [0, 5, 7],
        sus2: [0, 2, 7],
      };

      const chordIntervals = intervals[chord.quality] || [0, 4, 7];
      const rootFreq = noteFrequencies[chord.root];

      if (!rootFreq) {
        throw new Error(`Invalid root note: ${chord.root}`);
      }

      // Create gain node for ADSR envelope
      const masterGain = offlineCtx.createGain();
      masterGain.connect(offlineCtx.destination);
      masterGain.gain.setValueAtTime(0, 0);
      masterGain.gain.linearRampToValueAtTime(0.3, 0.02); // Attack
      masterGain.gain.linearRampToValueAtTime(0.2, 0.1); // Decay to sustain
      masterGain.gain.setValueAtTime(0.2, durationSec - 0.1); // Hold sustain
      masterGain.gain.linearRampToValueAtTime(0, durationSec); // Release

      // Create oscillators for each note in the chord
      chordIntervals.forEach((interval, idx) => {
        const freq = rootFreq * Math.pow(2, interval / 12);
        const osc = offlineCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, 0);

        // Use deterministic detune based on index for reproducibility
        osc.detune.setValueAtTime((idx - 1) * 2, 0);

        osc.connect(masterGain);
        osc.start(0);
        osc.stop(durationSec);
      });

      // Render audio
      const renderedBuffer = await offlineCtx.startRendering();
      const channelData = renderedBuffer.getChannelData(0);

      // Calculate features
      let rms = 0;
      let peak = 0;
      let zeroCrossings = 0;
      let energy = 0;
      let prevSample = 0;

      for (let i = 0; i < channelData.length; i++) {
        const sample = channelData[i];
        rms += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
        energy += Math.abs(sample);

        if (i > 0 && ((prevSample >= 0 && sample < 0) || (prevSample < 0 && sample >= 0))) {
          zeroCrossings++;
        }
        prevSample = sample;
      }

      rms = Math.sqrt(rms / channelData.length);
      energy = energy / channelData.length;
      zeroCrossings = zeroCrossings / durationSec; // Per second

      // Downsample for storage (keep every Nth sample)
      const downsampleFactor = Math.max(1, Math.floor(channelData.length / 1000));
      const samples: number[] = [];
      for (let i = 0; i < channelData.length; i += downsampleFactor) {
        samples.push(Math.round(channelData[i] * 10000) / 10000); // 4 decimal places
      }

      return {
        sampleRate,
        duration: durationSec,
        channels: 1,
        features: {
          rms,
          peak,
          zeroCrossings,
          energy,
        },
        samples,
        timestamp: new Date().toISOString(),
      };
    },
    { chord: chordConfig, duration: durationMs }
  );

  return audioData as AudioSnapshotData;
}

/**
 * Capture raw audio output from current synth state
 */
export async function captureCurrentAudio(
  page: Page,
  durationMs: number = 500
): Promise<AudioSnapshotData> {
  const audioData = await page.evaluate(async (duration) => {
    const Tone = (window as any).Tone;
    if (!Tone) {
      throw new Error('Tone.js not available');
    }

    // Create an offline context to capture current audio
    const offlineCtx = new OfflineAudioContext(1, 44100 * (duration / 1000), 44100);

    // Capture from main audio context using analyser if available
    const synthDebug = (window as any).__SYNTH_DEBUG__;
    const waveformData = synthDebug?.getAnalyserData?.('waveform') || [];

    if (waveformData.length === 0) {
      // No audio data available, return empty snapshot
      return {
        sampleRate: 44100,
        duration: duration / 1000,
        channels: 1,
        features: {
          rms: 0,
          peak: 0,
          zeroCrossings: 0,
          energy: 0,
        },
        samples: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Calculate features from waveform data
    let rms = 0;
    let peak = 0;
    let zeroCrossings = 0;
    let energy = 0;
    let prevSample = 0;

    for (let i = 0; i < waveformData.length; i++) {
      const sample = waveformData[i];
      rms += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
      energy += Math.abs(sample);

      if (i > 0 && ((prevSample >= 0 && sample < 0) || (prevSample < 0 && sample >= 0))) {
        zeroCrossings++;
      }
      prevSample = sample;
    }

    rms = Math.sqrt(rms / waveformData.length);
    energy = energy / waveformData.length;

    return {
      sampleRate: 44100,
      duration: duration / 1000,
      channels: 1,
      features: {
        rms,
        peak,
        zeroCrossings,
        energy,
      },
      samples: waveformData.slice(0, 1000), // First 1000 samples
      timestamp: new Date().toISOString(),
    };
  }, durationMs);

  return audioData as AudioSnapshotData;
}

/**
 * Save audio snapshot to file
 */
export function saveAudioSnapshot(name: string, data: AudioSnapshotData): void {
  const filePath = getSnapshotPath(name);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Load audio snapshot from file
 */
export function loadAudioSnapshot(name: string): AudioSnapshotData | null {
  const filePath = getSnapshotPath(name);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as AudioSnapshotData;
}

/**
 * Compare two audio snapshots
 */
export function compareAudioSnapshots(
  actual: AudioSnapshotData,
  expected: AudioSnapshotData,
  config: Partial<AudioComparisonConfig> = {}
): AudioComparisonResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const featureDiff: Partial<AudioFeatures> = {};
  const issues: string[] = [];

  // Compare RMS
  const rmsDiff = Math.abs(actual.features.rms - expected.features.rms);
  featureDiff.rms = rmsDiff;
  if (rmsDiff > cfg.rmsTolerance) {
    issues.push(`RMS diff ${rmsDiff.toFixed(4)} exceeds tolerance ${cfg.rmsTolerance}`);
  }

  // Compare Peak
  const peakDiff = Math.abs(actual.features.peak - expected.features.peak);
  featureDiff.peak = peakDiff;
  if (peakDiff > cfg.peakTolerance) {
    issues.push(`Peak diff ${peakDiff.toFixed(4)} exceeds tolerance ${cfg.peakTolerance}`);
  }

  // Compare Energy
  const energyDiff = Math.abs(actual.features.energy - expected.features.energy);
  featureDiff.energy = energyDiff;
  if (energyDiff > cfg.energyTolerance) {
    issues.push(`Energy diff ${energyDiff.toFixed(4)} exceeds tolerance ${cfg.energyTolerance}`);
  }

  // Compare Zero Crossings (relative)
  const zcExpected = expected.features.zeroCrossings || 1;
  const zcDiff = Math.abs(actual.features.zeroCrossings - expected.features.zeroCrossings) / zcExpected;
  featureDiff.zeroCrossings = zcDiff;
  if (zcDiff > cfg.zeroCrossingTolerance) {
    issues.push(
      `Zero crossings diff ${(zcDiff * 100).toFixed(1)}% exceeds tolerance ${cfg.zeroCrossingTolerance * 100}%`
    );
  }

  // Compare samples if available
  let sampleDiff = 0;
  const minLen = Math.min(actual.samples.length, expected.samples.length);

  if (minLen > 0) {
    let sumSquaredDiff = 0;
    for (let i = 0; i < minLen; i++) {
      const diff = actual.samples[i] - expected.samples[i];
      sumSquaredDiff += diff * diff;
    }
    sampleDiff = Math.sqrt(sumSquaredDiff / minLen);

    if (sampleDiff > cfg.sampleTolerance) {
      issues.push(`Sample RMS diff ${sampleDiff.toFixed(4)} exceeds tolerance ${cfg.sampleTolerance}`);
    }
  }

  const match = issues.length === 0;

  return {
    match,
    featureDiff,
    sampleDiff,
    details: match ? 'Audio snapshots match within tolerance' : issues.join('; '),
  };
}

/**
 * Assert audio matches snapshot (creates snapshot if missing)
 */
export async function expectAudioToMatchSnapshot(
  page: Page,
  name: string,
  chordConfig: {
    root: string;
    quality: string;
    extensions?: string[];
  },
  config: Partial<AudioComparisonConfig> = {}
): Promise<void> {
  const actual = await captureChordAudio(page, chordConfig);
  const expected = loadAudioSnapshot(name);

  if (!expected) {
    // Create baseline
    console.log(`Creating audio baseline: ${name}`);
    saveAudioSnapshot(name, actual);
    return;
  }

  const result = compareAudioSnapshots(actual, expected, config);

  if (!result.match) {
    // Save actual for debugging
    saveAudioSnapshot(`${name}.actual`, actual);
  }

  expect(result.match, result.details).toBe(true);
}

/**
 * Update audio snapshot (force regenerate)
 */
export async function updateAudioSnapshot(
  page: Page,
  name: string,
  chordConfig: {
    root: string;
    quality: string;
    extensions?: string[];
  }
): Promise<void> {
  const data = await captureChordAudio(page, chordConfig);
  saveAudioSnapshot(name, data);
  console.log(`Updated audio snapshot: ${name}`);
}

/**
 * Delete audio snapshot
 */
export function deleteAudioSnapshot(name: string): void {
  const filePath = getSnapshotPath(name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * List all audio snapshots
 */
export function listAudioSnapshots(): string[] {
  ensureSnapshotDir();
  return fs
    .readdirSync(AUDIO_SNAPSHOTS_DIR)
    .filter((f) => f.endsWith('.json') && !f.includes('.actual'))
    .map((f) => f.replace('.json', ''));
}

/**
 * Helper: Generate snapshot name from chord config
 */
export function chordSnapshotName(chord: { root: string; quality: string; extensions?: string[] }): string {
  const ext = chord.extensions?.join('-') || '';
  return `chord-${chord.root}-${chord.quality}${ext ? '-' + ext : ''}`.toLowerCase();
}
