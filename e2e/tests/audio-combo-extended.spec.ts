import { test } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  savePreset,
  recallPreset,
  releasePreset,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';
import {
  expectAudioToMatchSnapshot,
} from '../utils/audio-snapshots';

/**
 * Audio Snapshot Tests - Extended Chords & Ultra Combinations
 *
 * Tests:
 * - Extended chords (9th, 11th, 13th) with voicings
 * - Altered dominants (b9, #9, b5) with upper structure voicings
 * - Ultra combinations (voicing + strum + humanize + playback mode)
 * - Complex preset combinations
 *
 * Total: ~30 tests
 */

// Skip on mobile (audio tests require desktop for synth)
test.skip(({ isMobile }) => isMobile, 'Audio tests require desktop viewport');

test.describe('Audio Combos - Extended Chords & Ultra', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell', 'quartal', 'upperStruct'];

  // Extended chords with voicings
  test.describe('Extended Chords + Voicings', () => {
    const extendedChords = [
      { root: 'C', quality: 'maj7', extensions: ['9th'], name: 'Cmaj9' },
      { root: 'G', quality: 'dom7', extensions: ['9th', '#11'], name: 'G7#11' },
      { root: 'D', quality: 'min7', extensions: ['9th', '11th'], name: 'Dmin11' },
      { root: 'F', quality: 'maj7', extensions: ['9th', '13th'], name: 'Fmaj13' },
    ];

    for (const chord of extendedChords) {
      test(`should render ${chord.name} with close voicing`, async ({ page }) => {
        await playChord(page, chord.root, chord.quality, chord.extensions);
        await page.waitForTimeout(200);

        await expectAudioToMatchSnapshot(
          page,
          `extended-${chord.name.toLowerCase()}-close`,
          chord
        );

        await releaseAllKeys(page);
      });

      test(`should render ${chord.name} with drop2 voicing`, async ({ page }) => {
        await playChord(page, chord.root, chord.quality, chord.extensions);
        await page.keyboard.press('Shift'); // drop2
        await page.waitForTimeout(50);

        await expectAudioToMatchSnapshot(
          page,
          `extended-${chord.name.toLowerCase()}-drop2`,
          chord
        );

        await releaseAllKeys(page);
      });
    }
  });

  // Altered dominants
  test.describe('Altered Dominants + Upper Structure', () => {
    const alteredDominants = [
      { root: 'G', quality: 'dom7', extensions: ['b9'], name: 'G7b9' },
      { root: 'C', quality: 'dom7', extensions: ['#9'], name: 'C7#9' },
      { root: 'D', quality: 'dom7', extensions: ['b5'], name: 'D7b5' },
    ];

    for (const chord of alteredDominants) {
      test(`should render ${chord.name} in upper structure voicing`, async ({ page }) => {
        await playChord(page, chord.root, chord.quality, chord.extensions);

        // Cycle to upper structure (last voicing style)
        for (let i = 0; i < voicingStyles.indexOf('upperStruct'); i++) {
          await page.keyboard.press('Shift');
          await page.waitForTimeout(50);
        }

        await expectAudioToMatchSnapshot(
          page,
          `altered-${chord.name.toLowerCase()}-upperStruct`,
          chord
        );

        await releaseAllKeys(page);
      });
    }
  });

  // Ultra combinations
  test.describe('Ultra Combinations', () => {
    const ultraCombos = [
      {
        name: 'drop2-strum-up-50-humanize-25-vamp',
        voicing: 'drop2',
        strum: { spread: 50, direction: 'up' },
        humanize: 25,
        playbackMode: 'vamp',
        chord: { root: 'C', quality: 'maj7' },
      },
      {
        name: 'shell-strum-down-75-humanize-50-charleston',
        voicing: 'shell',
        strum: { spread: 75, direction: 'down' },
        humanize: 50,
        playbackMode: 'charleston',
        chord: { root: 'G', quality: 'dom7' },
      },
      {
        name: 'close-strum-alternate-100-humanize-75-stride',
        voicing: 'close',
        strum: { spread: 100, direction: 'alternate' },
        humanize: 75,
        playbackMode: 'stride',
        chord: { root: 'F', quality: 'maj7' },
      },
    ];

    for (const combo of ultraCombos) {
      test(`should render ultra-combo: ${combo.name}`, async ({ page }) => {
        // Set playback mode
        const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
        await playbackModeSelect.selectOption(combo.playbackMode);

        // Enable strum
        const strumToggle = page.locator('.strum-toggle');
        await strumToggle.click();

        const strumSlider = page.locator('.strum-slider');
        await strumSlider.fill(combo.strum.spread.toString());

        const strumDirectionSelect = page.locator('.strum-direction-select');
        await strumDirectionSelect.selectOption(combo.strum.direction);

        // Set humanization
        const humanizeSlider = page.locator('.humanize-slider');
        await humanizeSlider.fill(combo.humanize.toString());

        // Play chord
        await playChord(page, combo.chord.root, combo.chord.quality);

        // Cycle voicing
        const targetIndex = voicingStyles.indexOf(combo.voicing);
        for (let i = 0; i < targetIndex; i++) {
          await page.keyboard.press('Shift');
          await page.waitForTimeout(50);
        }

        // Wait for all effects
        await page.waitForTimeout(combo.strum.spread + 500);

        await expectAudioToMatchSnapshot(
          page,
          `ultra-combo-${combo.name}`,
          combo.chord
        );

        await releaseAllKeys(page);
      });
    }
  });

  // Complex preset combinations
  test.describe('Complex Preset Combinations', () => {
    test('should save and recall preset with voicing+strum+humanize', async ({ page }) => {
      // Enable strum
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('75');

      const strumDirectionSelect = page.locator('.strum-direction-select');
      await strumDirectionSelect.selectOption('up');

      // Set humanization
      const humanizeSlider = page.locator('.humanize-slider');
      await humanizeSlider.fill('50');

      // Play chord with drop2 voicing
      await playChord(page, 'E', 'min7');
      await page.keyboard.press('Shift'); // drop2
      await page.waitForTimeout(50);

      // Increase spread
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(50);

      // Save to preset
      await savePreset(page, 5);
      await releaseAllKeys(page);

      // Recall and snapshot
      await recallPreset(page, 5);
      await page.waitForTimeout(200);

      await expectAudioToMatchSnapshot(
        page,
        `preset5-emin7-drop2-spread2-strum75-humanize50`,
        { root: 'E', quality: 'min7' }
      );

      await releasePreset(page, 5);
    });
  });

  // Grace notes in complex context
  test.describe('Grace Notes + Ultra Features', () => {
    test('should trigger grace note with voicing+strum+playback-mode', async ({ page }) => {
      // Set playback mode
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('vamp');

      // Enable strum
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('50');

      // Play chord with drop2
      await playChord(page, 'A', 'min7');
      await page.keyboard.press('Shift'); // drop2
      await page.waitForTimeout(50);

      // Save to preset
      await savePreset(page, 7);
      await releaseAllKeys(page);

      // Recall and trigger grace note
      await recallPreset(page, 7);
      await page.waitForTimeout(200);
      await page.keyboard.press('g'); // First note
      await page.waitForTimeout(200);

      await expectAudioToMatchSnapshot(
        page,
        `grace-combo-amin7-drop2-vamp-strum50`,
        { root: 'A', quality: 'min7' }
      );

      await releasePreset(page, 7);
    });
  });
});
