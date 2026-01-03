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
 * Audio Snapshot Tests - Advanced Voicing Combinations
 *
 * Tests combinations of:
 * - Inversions (0-3) with voicing styles
 * - Spread (0-3) with voicing styles
 * - Octave shifts (-1 to +2) with voicing styles
 *
 * Total: ~52 tests
 */

// Skip on mobile (audio tests require desktop for synth)
test.skip(({ isMobile }) => isMobile, 'Audio tests require desktop viewport');

test.describe('Audio Combos - Advanced Voicing', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell'];

  // Inversions with voicing styles
  test.describe('Inversions + Voicing Styles', () => {
    const inversionTests = [
      { chord: { root: 'C', quality: 'maj7' }, inversions: [0, 1, 2, 3] },
      { chord: { root: 'G', quality: 'dom7' }, inversions: [0, 1, 2, 3] },
    ];

    for (const { chord, inversions } of inversionTests) {
      for (const style of ['close', 'drop2', 'shell']) {
        for (const inv of inversions) {
          test(`should render ${chord.root}${chord.quality} ${style} inversion-${inv}`, async ({ page }) => {
            await playChord(page, chord.root, chord.quality);

            // Cycle to voicing style
            const styleIndex = voicingStyles.indexOf(style);
            for (let i = 0; i < styleIndex; i++) {
              await page.keyboard.press('Shift');
              await page.waitForTimeout(50);
            }

            // Cycle inversion
            for (let i = 0; i < inv; i++) {
              await page.keyboard.press('ShiftLeft');
              await page.waitForTimeout(50);
            }

            await expectAudioToMatchSnapshot(
              page,
              `voicing-${style}-inv${inv}-${chord.root.toLowerCase()}${chord.quality}`,
              chord
            );

            await releaseAllKeys(page);
          });
        }
      }
    }
  });

  // Spread with voicing styles
  test.describe('Spread + Voicing Styles', () => {
    const spreadLevels = [0, 1, 2, 3];

    for (const style of ['close', 'drop2', 'rootlessA']) {
      for (const spread of spreadLevels) {
        test(`should render Cmaj7 ${style} spread-${spread}`, async ({ page }) => {
          await playChord(page, 'C', 'maj7');

          // Cycle to voicing style
          const styleIndex = voicingStyles.indexOf(style);
          for (let i = 0; i < styleIndex; i++) {
            await page.keyboard.press('Shift');
            await page.waitForTimeout(50);
          }

          // Increase spread
          for (let i = 0; i < spread; i++) {
            await page.keyboard.press('ArrowUp');
            await page.waitForTimeout(50);
          }

          await expectAudioToMatchSnapshot(
            page,
            `voicing-${style}-spread${spread}-cmaj7`,
            { root: 'C', quality: 'maj7' }
          );

          await releaseAllKeys(page);
        });
      }
    }
  });

  // Octave shifts with voicing styles
  test.describe('Octave Shifts + Voicing Styles', () => {
    for (const style of ['close', 'drop2']) {
      for (const octaveShift of [-1, 0, 1, 2]) {
        test(`should render Fmaj7 ${style} octave${octaveShift >= 0 ? '+' : ''}${octaveShift}`, async ({ page }) => {
          await playChord(page, 'F', 'maj7');

          // Cycle to voicing style
          const styleIndex = voicingStyles.indexOf(style);
          for (let i = 0; i < styleIndex; i++) {
            await page.keyboard.press('Shift');
            await page.waitForTimeout(50);
          }

          // Shift octave
          if (octaveShift > 0) {
            for (let i = 0; i < octaveShift; i++) {
              await page.keyboard.press('ArrowRight');
              await page.waitForTimeout(50);
            }
          } else if (octaveShift < 0) {
            for (let i = 0; i < Math.abs(octaveShift); i++) {
              await page.keyboard.press('ArrowLeft');
              await page.waitForTimeout(50);
            }
          }

          await expectAudioToMatchSnapshot(
            page,
            `voicing-${style}-oct${octaveShift >= 0 ? 'p' : 'm'}${Math.abs(octaveShift)}-fmaj7`,
            { root: 'F', quality: 'maj7' }
          );

          await releaseAllKeys(page);
        });
      }
    }
  });
});
