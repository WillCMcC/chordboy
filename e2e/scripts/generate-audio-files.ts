/**
 * Generate playable WAV files from chord configurations
 * Run with: npx tsx e2e/scripts/generate-audio-files.ts
 */

import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'audio-files');

// Chords to generate
const CHORDS = [
  { root: 'C', quality: 'major' },
  { root: 'C', quality: 'minor' },
  { root: 'C', quality: 'maj7' },
  { root: 'D', quality: 'min7' },
  { root: 'G', quality: 'dom7' },
  { root: 'F', quality: 'major' },
  { root: 'A', quality: 'minor' },
  { root: 'B', quality: 'dim' },
  { root: 'C', quality: 'sus4' },
];

async function generateWavFile(
  page: any,
  chord: { root: string; quality: string },
  durationMs: number = 1000
): Promise<Buffer> {
  const wavData = await page.evaluate(
    async ({ chord, duration }: { chord: { root: string; quality: string }; duration: number }) => {
      const sampleRate = 44100;
      const durationSec = duration / 1000;
      const totalSamples = Math.floor(sampleRate * durationSec);

      const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

      const noteFrequencies: Record<string, number> = {
        C: 261.63, 'C#': 277.18, D: 293.66, 'D#': 311.13,
        E: 329.63, F: 349.23, 'F#': 369.99, G: 392.0,
        'G#': 415.3, A: 440.0, 'A#': 466.16, B: 493.88,
      };

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

      const masterGain = offlineCtx.createGain();
      masterGain.connect(offlineCtx.destination);
      masterGain.gain.setValueAtTime(0, 0);
      masterGain.gain.linearRampToValueAtTime(0.4, 0.05);
      masterGain.gain.linearRampToValueAtTime(0.3, 0.2);
      masterGain.gain.setValueAtTime(0.3, durationSec - 0.2);
      masterGain.gain.linearRampToValueAtTime(0, durationSec);

      chordIntervals.forEach((interval, idx) => {
        const freq = rootFreq * Math.pow(2, interval / 12);
        const osc = offlineCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, 0);
        osc.detune.setValueAtTime((idx - 1) * 2, 0);
        osc.connect(masterGain);
        osc.start(0);
        osc.stop(durationSec);
      });

      const renderedBuffer = await offlineCtx.startRendering();
      const channelData = renderedBuffer.getChannelData(0);

      // Convert to 16-bit PCM
      const samples = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Return as array for transfer
      return Array.from(samples);
    },
    { chord, duration: durationMs }
  );

  // Create WAV file
  const samples = new Int16Array(wavData);
  const buffer = createWavBuffer(samples, 44100);
  return buffer;
}

function createWavBuffer(samples: Int16Array, sampleRate: number): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // chunk size
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM format
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Write samples
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], offset);
    offset += 2;
  }

  return buffer;
}

async function main() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to app (needed for OfflineAudioContext)
  await page.goto('http://localhost:4000');
  await page.waitForTimeout(1000);

  console.log(`\nGenerating ${CHORDS.length} audio files...\n`);

  for (const chord of CHORDS) {
    const filename = `${chord.root}-${chord.quality}.wav`;
    const filepath = path.join(OUTPUT_DIR, filename);

    console.log(`  Generating ${chord.root} ${chord.quality}...`);
    const wavBuffer = await generateWavFile(page, chord, 1500);
    fs.writeFileSync(filepath, wavBuffer);
    console.log(`    ✓ Saved: ${filename}`);
  }

  await browser.close();

  console.log(`\n✅ Done! Audio files saved to: ${OUTPUT_DIR}`);
  console.log('\nPlay with:');
  console.log(`  open ${OUTPUT_DIR}/*.wav`);
  console.log('  # or');
  console.log(`  afplay ${OUTPUT_DIR}/C-major.wav`);
}

main().catch(console.error);
