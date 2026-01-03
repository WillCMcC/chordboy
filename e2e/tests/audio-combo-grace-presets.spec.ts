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
 * Audio Snapshot Tests - Grace Notes & Presets
 *
 * Tests combinations of:
 * - Grace notes with voicing styles
 * - Grace notes with octave shifts
 * - Preset save/recall with voicing changes
 * - Multiple presets with different configurations
 *
 * Total: ~22 tests
 */

// Skip on mobile (audio tests require desktop for synth)
test.skip(({ isMobile }) => isMobile, 'Audio tests require desktop viewport');

test.describe('Audio Combos - Grace Notes & Presets', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  // Grace notes with different voicing styles
  test.describe('Grace Notes + Voicing Styles', () => {
    const voicings = ['close', 'drop2', 'shell'];
    const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell'];
    const graceNotes = [
      { key: 'g', name: 'note1' },
      { key: 'h', name: 'note2' },
      { key: 'v', name: 'root-3rd' },
      { key: 'b', name: 'root-5th' },
    ];

    for (const voicing of voicings) {
      for (const grace of graceNotes) {
        test(`should render Cmaj7 ${voicing}-voicing grace-${grace.name}`, async ({ page }) => {
          await playChord(page, 'C', 'maj7');

          // Cycle voicing
          const targetIndex = voicingStyles.indexOf(voicing);
          for (let i = 0; i < targetIndex; i++) {
            await page.keyboard.press('Shift');
            await page.waitForTimeout(50);
          }

          // Save to preset
          await savePreset(page, 1);
          await releaseAllKeys(page);

          // Recall and trigger grace note
          await recallPreset(page, 1);
          await page.waitForTimeout(100);
          await page.keyboard.press(grace.key);
          await page.waitForTimeout(100);

          await expectAudioToMatchSnapshot(
            page,
            `combo-grace-${grace.name}-voicing-${voicing}-cmaj7`,
            { root: 'C', quality: 'maj7' }
          );

          await releasePreset(page, 1);
        });
      }
    }
  });

  // Grace notes with octave shifts
  test.describe('Grace Notes + Octave Shifts', () => {
    const octaveShifts = [
      { key: '-', name: 'down' },
      { key: '=', name: 'up' },
    ];

    for (const shift of octaveShifts) {
      test(`should render Gmaj7 grace-note1 octave-${shift.name}`, async ({ page }) => {
        await playChord(page, 'G', 'maj7');
        await savePreset(page, 1);
        await releaseAllKeys(page);

        await recallPreset(page, 1);
        await page.waitForTimeout(100);

        // Hold octave shift and press grace note
        await page.keyboard.down(shift.key);
        await page.keyboard.press('g');
        await page.keyboard.up(shift.key);
        await page.waitForTimeout(100);

        await expectAudioToMatchSnapshot(
          page,
          `combo-grace-note1-octave-${shift.name}-gmaj7`,
          { root: 'G', quality: 'maj7' }
        );

        await releasePreset(page, 1);
      });
    }
  });

  // Preset voicing changes
  test.describe('Preset Voicing Changes', () => {
    const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell'];

    test('should save Cmaj7 close-voicing, recall, then change to drop2', async ({ page }) => {
      // Build chord in close voicing
      await playChord(page, 'C', 'maj7');

      // Save to preset 1
      await savePreset(page, 1);
      await releaseAllKeys(page);

      // Recall preset
      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      // Snapshot original
      await expectAudioToMatchSnapshot(
        page,
        `preset1-original-close-cmaj7`,
        { root: 'C', quality: 'maj7' }
      );

      await releasePreset(page, 1);

      // Recall again and change voicing
      await recallPreset(page, 1);
      await page.keyboard.press('Shift'); // Cycle to drop2
      await page.waitForTimeout(100);

      // Snapshot after voicing change
      await expectAudioToMatchSnapshot(
        page,
        `preset1-modified-drop2-cmaj7`,
        { root: 'C', quality: 'maj7' }
      );

      await releasePreset(page, 1);
    });

    test('should save multiple presets with different voicings', async ({ page }) => {
      // Preset 1: Cmaj7 close
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      // Preset 2: Dmin7 drop2
      await playChord(page, 'D', 'min7');
      await page.keyboard.press('Shift'); // Cycle to drop2
      await page.waitForTimeout(50);
      await savePreset(page, 2);
      await releaseAllKeys(page);

      // Preset 3: G7 shell
      await playChord(page, 'G', 'dom7');
      for (let i = 0; i < voicingStyles.indexOf('shell'); i++) {
        await page.keyboard.press('Shift');
        await page.waitForTimeout(50);
      }
      await savePreset(page, 3);
      await releaseAllKeys(page);

      // Recall and snapshot each
      await recallPreset(page, 1);
      await expectAudioToMatchSnapshot(page, `preset1-cmaj7-close`, { root: 'C', quality: 'maj7' });
      await releasePreset(page, 1);

      await recallPreset(page, 2);
      await expectAudioToMatchSnapshot(page, `preset2-dmin7-drop2`, { root: 'D', quality: 'min7' });
      await releasePreset(page, 2);

      await recallPreset(page, 3);
      await expectAudioToMatchSnapshot(page, `preset3-g7-shell`, { root: 'G', quality: 'dom7' });
      await releasePreset(page, 3);
    });
  });
});
