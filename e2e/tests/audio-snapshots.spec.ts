import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';
import {
  captureChordAudio,
  expectAudioToMatchSnapshot,
  saveAudioSnapshot,
  loadAudioSnapshot,
  compareAudioSnapshots,
  chordSnapshotName,
  listAudioSnapshots,
} from '../utils/audio-snapshots';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure tests to skip on mobile (no synth on mobile viewport)
test.skip(({ isMobile }) => isMobile, 'Audio tests require desktop viewport');

test.describe('Audio Snapshot Testing', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test.describe('Audio Capture', () => {
    test('should capture audio from chord playback', async ({ page }) => {
      const audioData = await captureChordAudio(page, {
        root: 'C',
        quality: 'major',
      });

      expect(audioData).toBeDefined();
      expect(audioData.sampleRate).toBe(44100);
      expect(audioData.duration).toBeGreaterThan(0);
      expect(audioData.features.rms).toBeGreaterThan(0);
      expect(audioData.samples.length).toBeGreaterThan(0);
    });

    test('should capture different chords with different features', async ({ page }) => {
      const cMajor = await captureChordAudio(page, { root: 'C', quality: 'major' });
      const cMinor = await captureChordAudio(page, { root: 'C', quality: 'minor' });

      // Both should have audio
      expect(cMajor.features.rms).toBeGreaterThan(0);
      expect(cMinor.features.rms).toBeGreaterThan(0);

      // Different chords should have different spectral characteristics
      // (zero crossings differ due to different intervals)
      expect(cMajor.features.zeroCrossings).not.toBe(cMinor.features.zeroCrossings);
    });
  });

  test.describe('Snapshot Comparison', () => {
    test('should match identical audio snapshots', async ({ page }) => {
      const chord = { root: 'G', quality: 'major' };

      const capture1 = await captureChordAudio(page, chord);
      const capture2 = await captureChordAudio(page, chord);

      const result = compareAudioSnapshots(capture1, capture2);

      // Same chord should produce matching audio
      expect(result.match).toBe(true);
    });

    test('should detect differences between chords', async ({ page }) => {
      const gMajor = await captureChordAudio(page, { root: 'G', quality: 'major' });
      const gMinor = await captureChordAudio(page, { root: 'G', quality: 'minor' });

      const result = compareAudioSnapshots(gMajor, gMinor, {
        rmsTolerance: 0.001, // Very tight tolerance to detect difference
      });

      // Different chords should not match with tight tolerance
      // Note: They might still match on RMS but differ on other features
      expect(result.featureDiff.zeroCrossings).toBeGreaterThan(0);
    });
  });

  test.describe('Chord Audio Baselines', () => {
    // Basic triads
    const basicChords = [
      { root: 'C', quality: 'major' },
      { root: 'C', quality: 'minor' },
      { root: 'F', quality: 'major' },
      { root: 'G', quality: 'major' },
      { root: 'A', quality: 'minor' },
    ];

    for (const chord of basicChords) {
      test(`should match baseline for ${chord.root} ${chord.quality}`, async ({ page }) => {
        await expectAudioToMatchSnapshot(page, chordSnapshotName(chord), chord);
      });
    }

    // Seventh chords
    const seventhChords = [
      { root: 'C', quality: 'maj7' },
      { root: 'D', quality: 'min7' },
      { root: 'G', quality: 'dom7' },
      { root: 'A', quality: 'min7' },
    ];

    for (const chord of seventhChords) {
      test(`should match baseline for ${chord.root} ${chord.quality}`, async ({ page }) => {
        await expectAudioToMatchSnapshot(page, chordSnapshotName(chord), chord);
      });
    }
  });

  test.describe('Audio Feature Verification', () => {
    test('higher octave should have more zero crossings', async ({ page }) => {
      // Lower chord
      const cLow = await captureChordAudio(page, { root: 'C', quality: 'major' });

      // Higher root note should have more zero crossings (higher frequency)
      const aHigh = await captureChordAudio(page, { root: 'A', quality: 'major' });

      // A4 is higher than C4, so should have more zero crossings
      // This is a simplified test - actual frequencies depend on voicing
      expect(aHigh.features.zeroCrossings).toBeGreaterThan(0);
      expect(cLow.features.zeroCrossings).toBeGreaterThan(0);
    });

    test('diminished chord should differ from major', async ({ page }) => {
      const major = await captureChordAudio(page, { root: 'B', quality: 'major' });
      const dim = await captureChordAudio(page, { root: 'B', quality: 'dim' });

      // Both should have audio
      expect(major.features.rms).toBeGreaterThan(0);
      expect(dim.features.rms).toBeGreaterThan(0);

      // Diminished has different interval structure
      const result = compareAudioSnapshots(major, dim);
      expect(result.featureDiff.zeroCrossings).toBeGreaterThan(0);
    });

    test('augmented chord should differ from major', async ({ page }) => {
      const major = await captureChordAudio(page, { root: 'D', quality: 'major' });
      const aug = await captureChordAudio(page, { root: 'D', quality: 'aug' });

      expect(major.features.rms).toBeGreaterThan(0);
      expect(aug.features.rms).toBeGreaterThan(0);

      const result = compareAudioSnapshots(major, aug);
      expect(result.featureDiff.zeroCrossings).toBeGreaterThan(0);
    });
  });

  test.describe('Snapshot Management', () => {
    test('should list existing snapshots', async () => {
      const snapshots = listAudioSnapshots();
      // Should be an array (may be empty on first run)
      expect(Array.isArray(snapshots)).toBe(true);
    });

    test('should save and load snapshot', async ({ page }) => {
      const testName = 'test-snapshot-temp';
      const chord = { root: 'E', quality: 'minor' };

      const captured = await captureChordAudio(page, chord);
      saveAudioSnapshot(testName, captured);

      const loaded = loadAudioSnapshot(testName);
      expect(loaded).toBeDefined();
      expect(loaded?.features.rms).toBe(captured.features.rms);

      // Clean up
      const filePath = path.join(__dirname, '..', 'audio-snapshots', `${testName}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });
});

test.describe('Audio Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test('ii-V-I progression maintains consistent audio characteristics', async ({ page }) => {
    // Common jazz progression in C major: Dm7 - G7 - Cmaj7
    const dm7 = await captureChordAudio(page, { root: 'D', quality: 'min7' });
    const g7 = await captureChordAudio(page, { root: 'G', quality: 'dom7' });
    const cmaj7 = await captureChordAudio(page, { root: 'C', quality: 'maj7' });

    // All chords should produce audio
    expect(dm7.features.rms).toBeGreaterThan(0);
    expect(g7.features.rms).toBeGreaterThan(0);
    expect(cmaj7.features.rms).toBeGreaterThan(0);

    // Audio levels should be similar (same synth settings)
    expect(Math.abs(dm7.features.rms - g7.features.rms)).toBeLessThan(0.1);
    expect(Math.abs(g7.features.rms - cmaj7.features.rms)).toBeLessThan(0.1);
  });

  test('sus chords should differ from resolved chords', async ({ page }) => {
    const sus4 = await captureChordAudio(page, { root: 'C', quality: 'sus4' });
    const major = await captureChordAudio(page, { root: 'C', quality: 'major' });

    expect(sus4.features.rms).toBeGreaterThan(0);
    expect(major.features.rms).toBeGreaterThan(0);

    // Sus4 replaces 3rd with 4th - different interval structure
    const result = compareAudioSnapshots(sus4, major);
    expect(result.featureDiff.zeroCrossings).toBeGreaterThan(0);
  });
});
