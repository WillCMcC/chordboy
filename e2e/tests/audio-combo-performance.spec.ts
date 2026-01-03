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
 * Audio Snapshot Tests - Performance Features
 *
 * Tests combinations of:
 * - Strum (up, down, alternate) with different spreads (25-150ms)
 * - Humanization (0-100%)
 * - Strum + Humanization combinations
 * - Voicing + Strum combinations
 *
 * Total: ~47 tests
 */

// Skip on mobile (audio tests require desktop for synth)
test.skip(({ isMobile }) => isMobile, 'Audio tests require desktop viewport');

test.describe('Audio Combos - Performance Features', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  // Strum variations
  test.describe('Strum Variations', () => {
    const strumDirections = ['up', 'down', 'alternate'];
    const strumSpreads = [25, 50, 100, 150];
    const chords = [
      { root: 'C', quality: 'maj7' },
      { root: 'G', quality: 'dom7' },
    ];

    for (const direction of strumDirections) {
      for (const spread of strumSpreads) {
        for (const chord of chords) {
          test(`should render ${chord.root}${chord.quality} strum-${direction}-${spread}ms`, async ({ page }) => {
            // Enable strum
            const strumToggle = page.locator('.strum-toggle');
            await strumToggle.click();

            // Set spread
            const strumSlider = page.locator('.strum-slider');
            await strumSlider.fill(spread.toString());

            // Set direction
            const strumDirectionSelect = page.locator('.strum-direction-select');
            await strumDirectionSelect.selectOption(direction);

            await playChord(page, chord.root, chord.quality);
            await page.waitForTimeout(spread + 100);

            await expectAudioToMatchSnapshot(
              page,
              `strum-${direction}-${spread}ms-${chord.root.toLowerCase()}${chord.quality}`,
              chord
            );

            await releaseAllKeys(page);
          });
        }
      }
    }
  });

  // Humanization levels
  test.describe('Humanization Levels', () => {
    const humanizeLevels = [0, 25, 50, 75, 100];
    const chords = [
      { root: 'D', quality: 'min7' },
      { root: 'A', quality: 'min7' },
    ];

    for (const level of humanizeLevels) {
      for (const chord of chords) {
        test(`should render ${chord.root}${chord.quality} humanize-${level}pct`, async ({ page }) => {
          const humanizeSlider = page.locator('.humanize-slider');
          await humanizeSlider.fill(level.toString());

          await playChord(page, chord.root, chord.quality);
          await page.waitForTimeout(200);

          await expectAudioToMatchSnapshot(
            page,
            `humanize-${level}pct-${chord.root.toLowerCase()}${chord.quality}`,
            chord
          );

          await releaseAllKeys(page);
        });
      }
    }
  });

  // Strum + Humanization combined
  test.describe('Strum + Humanization Combined', () => {
    const combinations = [
      { strum: 50, humanize: 25, direction: 'up' },
      { strum: 75, humanize: 50, direction: 'down' },
      { strum: 100, humanize: 75, direction: 'alternate' },
    ];

    for (const combo of combinations) {
      test(`should render Cmaj7 strum${combo.strum}-${combo.direction}-humanize${combo.humanize}`, async ({ page }) => {
        // Enable strum
        const strumToggle = page.locator('.strum-toggle');
        await strumToggle.click();

        const strumSlider = page.locator('.strum-slider');
        await strumSlider.fill(combo.strum.toString());

        const strumDirectionSelect = page.locator('.strum-direction-select');
        await strumDirectionSelect.selectOption(combo.direction);

        // Set humanization
        const humanizeSlider = page.locator('.humanize-slider');
        await humanizeSlider.fill(combo.humanize.toString());

        await playChord(page, 'C', 'maj7');
        await page.waitForTimeout(combo.strum + 200);

        await expectAudioToMatchSnapshot(
          page,
          `combo-strum${combo.strum}-${combo.direction}-humanize${combo.humanize}-cmaj7`,
          { root: 'C', quality: 'maj7' }
        );

        await releaseAllKeys(page);
      });
    }
  });

  // Voicing + Strum combinations
  test.describe('Voicing Styles + Strum', () => {
    const voicings = ['close', 'drop2', 'shell'];
    const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell'];
    const strumSettings = [
      { spread: 50, direction: 'up' },
      { spread: 100, direction: 'down' },
    ];

    for (const voicing of voicings) {
      for (const strum of strumSettings) {
        test(`should render Gmaj7 ${voicing}-voicing strum-${strum.direction}-${strum.spread}ms`, async ({ page }) => {
          // Enable strum
          const strumToggle = page.locator('.strum-toggle');
          await strumToggle.click();

          const strumSlider = page.locator('.strum-slider');
          await strumSlider.fill(strum.spread.toString());

          const strumDirectionSelect = page.locator('.strum-direction-select');
          await strumDirectionSelect.selectOption(strum.direction);

          await playChord(page, 'G', 'maj7');

          // Cycle voicing
          const targetIndex = voicingStyles.indexOf(voicing);
          for (let i = 0; i < targetIndex; i++) {
            await page.keyboard.press('Shift');
            await page.waitForTimeout(50);
          }

          await page.waitForTimeout(strum.spread + 100);

          await expectAudioToMatchSnapshot(
            page,
            `combo-${voicing}-strum-${strum.direction}-${strum.spread}ms-gmaj7`,
            { root: 'G', quality: 'maj7' }
          );

          await releaseAllKeys(page);
        });
      }
    }
  });
});
