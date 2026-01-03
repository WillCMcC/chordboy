import { test } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';
import {
  expectAudioToMatchSnapshot,
} from '../utils/audio-snapshots';

/**
 * Audio Snapshot Tests - Playback Modes
 *
 * Tests all 9 playback modes:
 * - Instant: block, root-only, shell
 * - Rhythmic: vamp, charleston, stride, two-feel, bossa, tremolo
 *
 * Plus combinations with voicing styles and strum
 *
 * Total: ~36 tests
 */

// Skip on mobile (audio tests require desktop for synth)
test.skip(({ isMobile }) => isMobile, 'Audio tests require desktop viewport');

test.describe('Audio Combos - Playback Modes', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  const playbackModes = [
    'block',
    'root-only',
    'shell',
    'vamp',
    'charleston',
    'stride',
    'two-feel',
    'bossa',
    'tremolo',
  ];

  const chords = [
    { root: 'C', quality: 'maj7' },
    { root: 'D', quality: 'min7' },
    { root: 'G', quality: 'dom7' },
  ];

  // Test each playback mode with multiple chords
  for (const mode of playbackModes) {
    test.describe(`Playback Mode: ${mode}`, () => {
      for (const chord of chords) {
        test(`should render ${chord.root}${chord.quality} in ${mode} mode`, async ({ page }) => {
          const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
          await playbackModeSelect.selectOption(mode);

          await playChord(page, chord.root, chord.quality);

          // Wait longer for rhythmic modes
          const isRhythmic = !['block', 'root-only', 'shell'].includes(mode);
          await page.waitForTimeout(isRhythmic ? 500 : 200);

          await expectAudioToMatchSnapshot(
            page,
            `playback-${mode}-${chord.root.toLowerCase()}${chord.quality}`,
            chord
          );

          await releaseAllKeys(page);
        });
      }
    });
  }

  // Playback modes + Voicing styles
  test.describe('Playback Modes + Voicing Styles', () => {
    const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell'];
    const combinations = [
      { mode: 'block', voicing: 'close' },
      { mode: 'block', voicing: 'drop2' },
      { mode: 'shell', voicing: 'shell' },
      { mode: 'root-only', voicing: 'close' },
      { mode: 'vamp', voicing: 'drop2' },
      { mode: 'stride', voicing: 'shell' },
    ];

    for (const combo of combinations) {
      test(`should render Fmaj7 ${combo.mode}-mode ${combo.voicing}-voicing`, async ({ page }) => {
        const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
        await playbackModeSelect.selectOption(combo.mode);

        await playChord(page, 'F', 'maj7');

        // Cycle voicing
        const targetIndex = voicingStyles.indexOf(combo.voicing);
        for (let i = 0; i < targetIndex; i++) {
          await page.keyboard.press('Shift');
          await page.waitForTimeout(50);
        }

        const isRhythmic = !['block', 'root-only', 'shell'].includes(combo.mode);
        await page.waitForTimeout(isRhythmic ? 500 : 200);

        await expectAudioToMatchSnapshot(
          page,
          `combo-playback-${combo.mode}-voicing-${combo.voicing}-fmaj7`,
          { root: 'F', quality: 'maj7' }
        );

        await releaseAllKeys(page);
      });
    }
  });

  // Playback modes + Strum
  test.describe('Playback Modes + Strum', () => {
    const combinations = [
      { mode: 'block', strum: 50, direction: 'up' },
      { mode: 'vamp', strum: 75, direction: 'down' },
      { mode: 'charleston', strum: 100, direction: 'alternate' },
    ];

    for (const combo of combinations) {
      test(`should render Amin7 ${combo.mode}-mode strum-${combo.direction}-${combo.strum}ms`, async ({ page }) => {
        const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
        await playbackModeSelect.selectOption(combo.mode);

        // Enable strum
        const strumToggle = page.locator('.strum-toggle');
        await strumToggle.click();

        const strumSlider = page.locator('.strum-slider');
        await strumSlider.fill(combo.strum.toString());

        const strumDirectionSelect = page.locator('.strum-direction-select');
        await strumDirectionSelect.selectOption(combo.direction);

        await playChord(page, 'A', 'min7');

        const isRhythmic = !['block', 'root-only', 'shell'].includes(combo.mode);
        await page.waitForTimeout(isRhythmic ? 600 : 300);

        await expectAudioToMatchSnapshot(
          page,
          `combo-playback-${combo.mode}-strum-${combo.direction}-${combo.strum}ms-amin7`,
          { root: 'A', quality: 'min7' }
        );

        await releaseAllKeys(page);
      });
    }
  });
});
