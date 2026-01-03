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
 * Audio Snapshot Tests - Voicing Styles
 *
 * Tests all 8 voicing styles across multiple chord types:
 * - Close, Drop2, Drop3, RootlessA, RootlessB, Shell, Quartal, Upper Struct
 *
 * Total: 40 tests (8 styles × 5 chord types)
 */

// Skip on mobile (audio tests require desktop for synth)
test.skip(({ isMobile }) => isMobile, 'Audio tests require desktop viewport');

test.describe('Audio Combos - Voicing Styles', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell', 'quartal', 'upperStruct'];
  const testChords = [
    { root: 'C', quality: 'maj7', name: 'Cmaj7' },
    { root: 'D', quality: 'min7', name: 'Dmin7' },
    { root: 'G', quality: 'dom7', name: 'G7' },
    { root: 'F', quality: 'maj7', name: 'Fmaj7' },
    { root: 'A', quality: 'min7', name: 'Amin7' },
  ];

  for (const style of voicingStyles) {
    test.describe(`Voicing Style: ${style}`, () => {
      for (const chord of testChords) {
        test(`should render ${chord.name} in ${style} voicing`, async ({ page }) => {
          await playChord(page, chord.root, chord.quality);

          // Cycle to desired voicing style
          for (let i = 0; i < voicingStyles.indexOf(style); i++) {
            await page.keyboard.press('Shift'); // Right Shift cycles voicing
            await page.waitForTimeout(50);
          }

          await expectAudioToMatchSnapshot(
            page,
            `voicing-${style}-${chord.name.toLowerCase()}`,
            chord
          );

          await releaseAllKeys(page);
        });
      }
    });
  }
});
