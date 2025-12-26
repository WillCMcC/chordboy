import { Page, expect } from '@playwright/test';

/**
 * Audio assertion utilities for Web Audio API and Tone.js testing
 *
 * Note: These rely on debug hooks exposed via window.__SYNTH_DEBUG__
 * See src/lib/synthDebug.ts (to be created)
 */

/**
 * Check if audio context is running
 */
export async function expectAudioContextRunning(page: Page) {
  const state = await page.evaluate(() => {
    // Check Tone.js audio context
    const Tone = (window as any).Tone;
    return Tone?.context?.state || 'suspended';
  });
  expect(state).toBe('running');
}

/**
 * Check if synth is currently playing
 */
export async function expectSynthPlaying(page: Page) {
  const isPlaying = await page.evaluate(() => {
    return (window as any).__SYNTH_DEBUG__?.isPlaying?.() ?? false;
  });
  expect(isPlaying).toBe(true);
}

/**
 * Check if synth is not playing
 */
export async function expectSynthSilent(page: Page) {
  const isPlaying = await page.evaluate(() => {
    return (window as any).__SYNTH_DEBUG__?.isPlaying?.() ?? false;
  });
  expect(isPlaying).toBe(false);
}

/**
 * Verify number of active synth voices
 */
export async function expectActiveVoiceCount(page: Page, count: number) {
  const activeVoices = await page.evaluate(() => {
    return (window as any).__SYNTH_DEBUG__?.getActiveVoices?.() ?? 0;
  });
  expect(activeVoices).toBe(count);
}

/**
 * Verify synth voices are greater than count
 */
export async function expectActiveVoicesGreaterThan(page: Page, count: number) {
  const activeVoices = await page.evaluate(() => {
    return (window as any).__SYNTH_DEBUG__?.getActiveVoices?.() ?? 0;
  });
  expect(activeVoices).toBeGreaterThan(count);
}

/**
 * Get current patch name
 */
export async function getCurrentPatchName(page: Page): Promise<string> {
  return await page.evaluate(() => {
    return (window as any).__SYNTH_DEBUG__?.getCurrentPatch?.()?.name ?? 'Unknown';
  });
}

/**
 * Verify patch parameter value
 */
export async function expectPatchParameter(
  page: Page,
  paramPath: string,
  expectedValue: number
) {
  const actualValue = await page.evaluate((path) => {
    const debug = (window as any).__SYNTH_DEBUG__;
    if (!debug?.getPatchParameter) return null;
    return debug.getPatchParameter(path);
  }, paramPath);

  expect(actualValue).toBeCloseTo(expectedValue, 1);
}

/**
 * Wait for audio context to start (user gesture required in some browsers)
 */
export async function ensureAudioContextStarted(page: Page) {
  await page.evaluate(async () => {
    const Tone = (window as any).Tone;
    if (Tone?.context?.state === 'suspended') {
      await Tone.start();
    }
  });
}

/**
 * Get analyser data (frequency or waveform)
 * Useful for verifying audio output characteristics
 */
export async function getFrequencyData(page: Page): Promise<number[]> {
  return await page.evaluate(() => {
    const debug = (window as any).__SYNTH_DEBUG__;
    if (!debug?.getAnalyserData) return [];
    return debug.getAnalyserData('frequency');
  });
}

export async function getWaveformData(page: Page): Promise<number[]> {
  return await page.evaluate(() => {
    const debug = (window as any).__SYNTH_DEBUG__;
    if (!debug?.getAnalyserData) return [];
    return debug.getAnalyserData('waveform');
  });
}

/**
 * Verify audio output has energy (not silent)
 */
export async function expectAudioHasEnergy(page: Page) {
  const freqData = await getFrequencyData(page);

  // Calculate RMS energy
  const energy = freqData.reduce((sum, val) => sum + val * val, 0) / freqData.length;

  expect(energy).toBeGreaterThan(0.01); // Threshold for "not silent"
}

/**
 * Verify specific frequency range has energy (for filter testing)
 */
export async function expectFrequencyRangeHasEnergy(
  page: Page,
  minFreq: number,
  maxFreq: number
) {
  const freqData = await getFrequencyData(page);
  const sampleRate = 44100; // Assuming standard sample rate
  const nyquist = sampleRate / 2;

  const minBin = Math.floor((minFreq / nyquist) * freqData.length);
  const maxBin = Math.ceil((maxFreq / nyquist) * freqData.length);

  const rangeData = freqData.slice(minBin, maxBin);
  const energy = rangeData.reduce((sum, val) => sum + val * val, 0) / rangeData.length;

  expect(energy).toBeGreaterThan(0.01);
}

/**
 * Capture and verify MIDI output (if debug hooks available)
 */
export async function expectMIDINoteSent(page: Page, note: number, velocity?: number) {
  const sentNotes = await page.evaluate(() => {
    return (window as any).__MIDI_DEBUG__?.getSentNotes?.() ?? [];
  });

  const matching = sentNotes.find((n: any) => n.note === note);
  expect(matching).toBeDefined();

  if (velocity !== undefined) {
    expect(matching.velocity).toBe(velocity);
  }
}

/**
 * Clear MIDI debug log
 */
export async function clearMIDIDebugLog(page: Page) {
  await page.evaluate(() => {
    (window as any).__MIDI_DEBUG__?.clearLog?.();
  });
}
