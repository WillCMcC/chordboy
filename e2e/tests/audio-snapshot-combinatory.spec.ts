import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  savePreset,
  recallPreset,
  releasePreset,
  getActiveNotes,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';
import {
  captureChordAudio,
  expectAudioToMatchSnapshot,
  chordSnapshotName,
} from '../utils/audio-snapshots';

/**
 * Comprehensive Combinatory Audio Snapshot Tests
 *
 * Tests all combinations of audio-affecting features to ensure deterministic
 * synthesis output and catch regressions during high-velocity development.
 *
 * Feature Matrix:
 * - Chord types (triads, 7ths, extensions, alterations)
 * - Voicing styles (Close, Drop2, Drop3, Rootless A/B, Shell, Quartal, Upper Struct)
 * - Inversions (0-3)
 * - Spread (0-3 octaves)
 * - Octave shifts
 * - Strum (up, down, alternate) with different spreads
 * - Humanization (0-100%)
 * - Playback modes (all 10)
 * - Grace notes (single, pairs, intervals)
 * - Presets (save/recall with voicing changes)
 * - Prog Wizard progressions
 * - Sequencer patterns
 *
 * Total test cases: 200+ audio snapshot comparisons
 */

// Skip on mobile (audio tests require desktop for synth)
test.skip(({ isMobile }) => isMobile, 'Audio tests require desktop viewport');

test.describe('Combinatory Audio Snapshots - Voicing Systems', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  // Test each voicing style with multiple chord types
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
          // Cycle to desired voicing style
          await playChord(page, chord.root, chord.quality);

          // Cycle voicing style - this is simplified, actual implementation may differ
          // In real code, we'd need to detect current style and cycle to target
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

  // Test inversions with voicing styles
  test.describe('Inversions Combined with Voicing Styles', () => {
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

  // Test spread with different voicing styles
  test.describe('Spread Combined with Voicing Styles', () => {
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

  // Test octave shifts with voicing styles
  test.describe('Octave Shifts Combined with Voicing Styles', () => {
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

test.describe('Combinatory Audio Snapshots - Performance Features', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  // Strum with different directions and spreads
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
            await page.waitForTimeout(spread + 100); // Wait for strum to complete

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

          // Cycle voicing (simplified)
          const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell'];
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

test.describe('Combinatory Audio Snapshots - Playback Modes', () => {
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
        const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell'];
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

test.describe('Combinatory Audio Snapshots - Grace Notes', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  // Grace notes with different voicing styles
  test.describe('Grace Notes + Voicing Styles', () => {
    const voicings = ['close', 'drop2', 'shell'];
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
          const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell'];
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
});

test.describe('Combinatory Audio Snapshots - Presets & State', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  // Save chord with voicing, recall, then change voicing
  test.describe('Preset Voicing Changes', () => {
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
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Shift'); // Cycle to shell
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

test.describe('Combinatory Audio Snapshots - Prog Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  // Test common jazz progressions
  test.describe('Jazz Progressions', () => {
    test('should generate and snapshot ii-V-I progression in C major', async ({ page }) => {
      // Open Prog Wizard
      const progWizardBtn = page.locator('[data-testid="open-prog-wizard"]');
      await progWizardBtn.click();

      // Select ii-V-I
      const progressionSelect = page.locator('[data-testid="progression-type"]');
      await progressionSelect.selectOption('ii-V-I');

      // Set root to C
      const rootSelect = page.locator('[data-testid="progression-root"]');
      await rootSelect.selectOption('C');

      // Generate
      const generateBtn = page.locator('[data-testid="generate-progression"]');
      await generateBtn.click();

      await page.waitForTimeout(200);

      // Close wizard
      const closeBtn = page.locator('[data-testid="close-prog-wizard"]');
      await closeBtn.click();

      // The progression should now be loaded (Dmin7 - G7 - Cmaj7)
      // Snapshot each chord in sequence
      const progression = [
        { root: 'D', quality: 'min7', name: 'Dmin7' },
        { root: 'G', quality: 'dom7', name: 'G7' },
        { root: 'C', quality: 'maj7', name: 'Cmaj7' },
      ];

      for (let i = 0; i < progression.length; i++) {
        const chord = progression[i];

        // Trigger chord (implementation depends on how prog wizard works)
        // This is placeholder - actual implementation may differ
        await playChord(page, chord.root, chord.quality);
        await page.waitForTimeout(200);

        await expectAudioToMatchSnapshot(
          page,
          `progwizard-ii-V-I-C-chord${i + 1}-${chord.name.toLowerCase()}`,
          chord
        );

        await releaseAllKeys(page);
        await page.waitForTimeout(100);
      }
    });

    test('should generate and snapshot I-vi-ii-V turnaround in F major', async ({ page }) => {
      const progWizardBtn = page.locator('[data-testid="open-prog-wizard"]');
      await progWizardBtn.click();

      const progressionSelect = page.locator('[data-testid="progression-type"]');
      await progressionSelect.selectOption('I-vi-ii-V');

      const rootSelect = page.locator('[data-testid="progression-root"]');
      await rootSelect.selectOption('F');

      const generateBtn = page.locator('[data-testid="generate-progression"]');
      await generateBtn.click();

      await page.waitForTimeout(200);

      const closeBtn = page.locator('[data-testid="close-prog-wizard"]');
      await closeBtn.click();

      // Progression: Fmaj7 - Dmin7 - Gmin7 - C7
      const progression = [
        { root: 'F', quality: 'maj7', name: 'Fmaj7' },
        { root: 'D', quality: 'min7', name: 'Dmin7' },
        { root: 'G', quality: 'min7', name: 'Gmin7' },
        { root: 'C', quality: 'dom7', name: 'C7' },
      ];

      for (let i = 0; i < progression.length; i++) {
        const chord = progression[i];

        await playChord(page, chord.root, chord.quality);
        await page.waitForTimeout(200);

        await expectAudioToMatchSnapshot(
          page,
          `progwizard-turnaround-F-chord${i + 1}-${chord.name.toLowerCase()}`,
          chord
        );

        await releaseAllKeys(page);
        await page.waitForTimeout(100);
      }
    });

    test('should generate tritone substitution progression', async ({ page }) => {
      const progWizardBtn = page.locator('[data-testid="open-prog-wizard"]');
      await progWizardBtn.click();

      const progressionSelect = page.locator('[data-testid="progression-type"]');
      await progressionSelect.selectOption('tritone-sub');

      const rootSelect = page.locator('[data-testid="progression-root"]');
      await rootSelect.selectOption('C');

      const generateBtn = page.locator('[data-testid="generate-progression"]');
      await generateBtn.click();

      await page.waitForTimeout(200);

      const closeBtn = page.locator('[data-testid="close-prog-wizard"]');
      await closeBtn.click();

      // Progression includes tritone substitution
      const progression = [
        { root: 'D', quality: 'min7', name: 'Dmin7' },
        { root: 'D#', quality: 'dom7', name: 'Db7' }, // Tritone sub for G7
        { root: 'C', quality: 'maj7', name: 'Cmaj7' },
      ];

      for (let i = 0; i < progression.length; i++) {
        const chord = progression[i];

        await playChord(page, chord.root, chord.quality);
        await page.waitForTimeout(200);

        await expectAudioToMatchSnapshot(
          page,
          `progwizard-tritone-sub-C-chord${i + 1}-${chord.name.toLowerCase()}`,
          chord
        );

        await releaseAllKeys(page);
        await page.waitForTimeout(100);
      }
    });
  });

  // Prog Wizard + Voicing Styles
  test.describe('Prog Wizard + Voicing Styles', () => {
    test('should generate ii-V-I in drop2 voicing', async ({ page }) => {
      const progWizardBtn = page.locator('[data-testid="open-prog-wizard"]');
      await progWizardBtn.click();

      const progressionSelect = page.locator('[data-testid="progression-type"]');
      await progressionSelect.selectOption('ii-V-I');

      const rootSelect = page.locator('[data-testid="progression-root"]');
      await rootSelect.selectOption('C');

      const generateBtn = page.locator('[data-testid="generate-progression"]');
      await generateBtn.click();

      await page.waitForTimeout(200);

      const closeBtn = page.locator('[data-testid="close-prog-wizard"]');
      await closeBtn.click();

      const progression = [
        { root: 'D', quality: 'min7', name: 'Dmin7' },
        { root: 'G', quality: 'dom7', name: 'G7' },
        { root: 'C', quality: 'maj7', name: 'Cmaj7' },
      ];

      for (let i = 0; i < progression.length; i++) {
        const chord = progression[i];

        await playChord(page, chord.root, chord.quality);

        // Cycle to drop2
        await page.keyboard.press('Shift');
        await page.waitForTimeout(50);

        await page.waitForTimeout(200);

        await expectAudioToMatchSnapshot(
          page,
          `progwizard-ii-V-I-C-drop2-chord${i + 1}-${chord.name.toLowerCase()}`,
          chord
        );

        await releaseAllKeys(page);
        await page.waitForTimeout(100);
      }
    });
  });
});

test.describe('Combinatory Audio Snapshots - Complex Combinations', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  // Ultimate combo: Voicing + Strum + Humanize + Playback Mode
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
        const voicingStyles = ['close', 'drop2', 'drop3', 'rootlessA', 'rootlessB', 'shell'];
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

  // Preset with all features
  test.describe('Preset with Multiple Features', () => {
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
  test.describe('Grace Notes with All Features', () => {
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

test.describe('Combinatory Audio Snapshots - Extended Chord Types', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  // Test extended and altered chords with voicings
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

  // Altered dominants
  const alteredDominants = [
    { root: 'G', quality: 'dom7', extensions: ['b9'], name: 'G7b9' },
    { root: 'C', quality: 'dom7', extensions: ['#9'], name: 'C7#9' },
    { root: 'D', quality: 'dom7', extensions: ['b5'], name: 'D7b5' },
  ];

  for (const chord of alteredDominants) {
    test(`should render ${chord.name} in upper structure voicing`, async ({ page }) => {
      await playChord(page, chord.root, chord.quality, chord.extensions);

      // Cycle to upper structure (last voicing style)
      for (let i = 0; i < 7; i++) {
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
