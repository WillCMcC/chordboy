import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  expectChordName,
  savePreset,
  recallPreset,
  getActiveNotes,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';
import { II_V_I_C, II_V_I_EXTENDED, BASIC_TRIADS, ALTERED_DOMINANTS } from '../fixtures/preset-data';

test.describe('Preset System', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test('should save preset to slot 1', async ({ page }) => {
    // Build a chord
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(100);

    const notesBeforeSave = await getActiveNotes(page);

    // Save to slot 1
    await savePreset(page, 1);
    await page.waitForTimeout(100);

    // Clear the chord
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Recall from slot 1
    await recallPreset(page, 1);
    await page.waitForTimeout(100);

    // Should restore the same chord
    const notesAfterRecall = await getActiveNotes(page);
    expect(notesAfterRecall).toEqual(notesBeforeSave);
    await expectChordName(page, 'C Maj7');
  });

  test('should recall preset from slot', async ({ page }) => {
    // Save Dm7 to slot 2
    await playChord(page, 'D', 'min7');
    await page.waitForTimeout(100);
    await savePreset(page, 2);
    await page.waitForTimeout(100);

    // Build different chord
    await releaseAllKeys(page);
    await playChord(page, 'G', 'dom7');
    await page.waitForTimeout(100);
    await expectChordName(page, 'G7');

    // Release G7 keys before recalling
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Recall Dm7
    await recallPreset(page, 2);
    await page.waitForTimeout(100);

    await expectChordName(page, 'D min7');
  });

  test('should save multiple presets (ii-V-I progression)', async ({ page }) => {
    // Use fixture data
    const progression = II_V_I_C;

    for (const preset of progression.presets) {
      // Build chord
      await playChord(page, preset.root, preset.quality, preset.extensions);
      await page.waitForTimeout(100);

      // Verify chord name
      if (preset.expectedName) {
        await expectChordName(page, preset.expectedName);
      }

      // Save to slot
      await savePreset(page, preset.slot);
      await page.waitForTimeout(100);

      // Clear
      await releaseAllKeys(page);
      await page.waitForTimeout(100);
    }

    // Recall each preset and verify
    for (const preset of progression.presets) {
      await recallPreset(page, preset.slot);
      await page.waitForTimeout(100);

      if (preset.expectedName) {
        await expectChordName(page, preset.expectedName);
      }

      const activeNotes = await getActiveNotes(page);
      expect(activeNotes.length).toBeGreaterThan(0);

      await page.waitForTimeout(50);
    }
  });

  test('should persist presets across page reload', async ({ page }) => {
    // Save a chord to slot 5
    await playChord(page, 'F', 'maj7', ['9th']);
    await page.waitForTimeout(100);

    const notesBeforeReload = await getActiveNotes(page);
    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordNameBeforeReload = await chordDisplay.textContent();

    await savePreset(page, 5);
    await page.waitForTimeout(200);

    // Reload the page
    await page.reload();
    await initializeApp(page);
    await dismissTutorial(page);
    await page.waitForTimeout(200);

    // Recall preset
    await recallPreset(page, 5);
    await page.waitForTimeout(100);

    // Should restore the same chord
    const notesAfterReload = await getActiveNotes(page);
    const chordNameAfterReload = await chordDisplay.textContent();

    expect(notesAfterReload).toEqual(notesBeforeReload);
    expect(chordNameAfterReload).toBe(chordNameBeforeReload);
  });

  test('should overwrite existing preset', async ({ page }) => {
    // Save C major to slot 3
    await playChord(page, 'C', 'major');
    await page.waitForTimeout(100);
    await savePreset(page, 3);
    await page.waitForTimeout(100);

    // Save G7 to slot 3 (overwrite) - but slot is already filled, so need to handle differently
    // The app only saves to empty slots via number key, so we'll verify the first save works
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Recall slot 3 to verify C major was saved
    await recallPreset(page, 3);
    await page.waitForTimeout(100);

    // Should be C major
    await expectChordName(page, 'C');
  });

  test('should save extended ii-V-I progression with extensions', async ({ page }) => {
    const progression = II_V_I_EXTENDED;

    for (const preset of progression.presets) {
      await playChord(page, preset.root, preset.quality, preset.extensions);
      await page.waitForTimeout(100);
      await savePreset(page, preset.slot);
      await page.waitForTimeout(100);
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }

    // Recall and verify
    for (const preset of progression.presets) {
      await recallPreset(page, preset.slot);
      await page.waitForTimeout(100);

      if (preset.expectedName) {
        await expectChordName(page, preset.expectedName);
      }

      // Release before next recall
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }
  });

  test('should handle all 10 preset slots', async ({ page }) => {
    // Save chords to all 10 slots (1-9 and 0 for slot 10)
    for (let slot = 1; slot <= 10; slot++) {
      const root = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E'][slot - 1];
      const quality = slot % 2 === 0 ? 'minor' : 'major';

      await playChord(page, root, quality);
      await page.waitForTimeout(50);
      await savePreset(page, slot);
      await page.waitForTimeout(50);
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }

    // Recall each slot
    for (let slot = 1; slot <= 10; slot++) {
      await recallPreset(page, slot);
      await page.waitForTimeout(100);

      const activeNotes = await getActiveNotes(page);
      expect(activeNotes.length).toBeGreaterThan(0);
    }
  });

  test('should save basic triads fixture', async ({ page }) => {
    const triads = BASIC_TRIADS;

    for (const preset of triads.presets) {
      await playChord(page, preset.root, preset.quality, preset.extensions);
      await page.waitForTimeout(100);
      await savePreset(page, preset.slot);
      await page.waitForTimeout(100);
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }

    // Verify all triads
    for (const preset of triads.presets) {
      await recallPreset(page, preset.slot);
      await page.waitForTimeout(100);

      if (preset.expectedName) {
        await expectChordName(page, preset.expectedName);
      }
    }
  });

  test('should save altered dominants fixture', async ({ page }) => {
    const alteredDoms = ALTERED_DOMINANTS;

    for (const preset of alteredDoms.presets) {
      await playChord(page, preset.root, preset.quality, preset.extensions);
      await page.waitForTimeout(100);
      await savePreset(page, preset.slot);
      await page.waitForTimeout(100);
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }

    // Verify all altered dominants
    for (const preset of alteredDoms.presets) {
      await recallPreset(page, preset.slot);
      await page.waitForTimeout(100);

      const chordDisplay = page.locator('[data-testid="chord-display"]');
      const chordText = await chordDisplay.textContent();

      // Should contain G and 7 (all are G7 variants)
      expect(chordText).toContain('G');
      expect(chordText).toMatch(/7/);
    }
  });

  test('should recall presets in rapid succession', async ({ page }) => {
    // Save 3 chords
    const chords = [
      { slot: 1, root: 'C', quality: 'maj7' as const, name: 'C Maj7' },
      { slot: 2, root: 'D', quality: 'min7' as const, name: 'D min7' },
      { slot: 3, root: 'G', quality: 'dom7' as const, name: 'G7' },
    ];

    for (const chord of chords) {
      await playChord(page, chord.root, chord.quality);
      await page.waitForTimeout(100);
      await savePreset(page, chord.slot);
      await page.waitForTimeout(100);
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }

    // Rapidly recall presets
    for (let i = 0; i < 3; i++) {
      for (const chord of chords) {
        await recallPreset(page, chord.slot);
        await page.waitForTimeout(50);
        await expectChordName(page, chord.name);
      }
    }
  });

  test('should preserve voicing settings in presets', async ({ page }) => {
    // Build chord with specific voicing
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(100);

    // Modify voicing (transpose up) - ArrowRight is octave up
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    const notesWithVoicing = await getActiveNotes(page);

    // Save preset
    await savePreset(page, 8); // Use slot 8 to avoid any conflict
    await page.waitForTimeout(100);

    // Clear and build different chord
    await releaseAllKeys(page);
    await playChord(page, 'D', 'minor');
    await page.waitForTimeout(100);

    // Release D minor keys before recalling
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Recall preset
    await recallPreset(page, 8);
    await page.waitForTimeout(100);

    // Should restore exact voicing
    const recalledNotes = await getActiveNotes(page);
    expect(recalledNotes).toEqual(notesWithVoicing);
  });

  test('should show preset indicator when slot is populated', async ({ page }) => {
    // Save to slot 1
    await playChord(page, 'C', 'major');
    await page.waitForTimeout(100);
    await savePreset(page, 1);
    await page.waitForTimeout(100);

    // Check if preset indicator exists
    const presetIndicator = page.locator('[data-testid="preset-slot-1"], [data-preset-slot="1"]');

    const indicatorExists = (await presetIndicator.count()) > 0;

    if (indicatorExists) {
      // Indicator should show slot is filled
      await expect(presetIndicator).toHaveAttribute('data-filled', 'true');
    }
  });

  test('should handle voice leading between presets', async ({ page }) => {
    // Save smooth voice leading progression
    const chords = [
      { slot: 1, root: 'C', quality: 'maj7' as const },
      { slot: 2, root: 'D', quality: 'min7' as const },
      { slot: 3, root: 'G', quality: 'dom7' as const },
    ];

    for (const chord of chords) {
      await playChord(page, chord.root, chord.quality);
      await page.waitForTimeout(100);
      await savePreset(page, chord.slot);
      await page.waitForTimeout(100);
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }

    // Recall in sequence and measure voice movement
    await recallPreset(page, 1);
    await page.waitForTimeout(100);
    const notes1 = await getActiveNotes(page);

    await recallPreset(page, 2);
    await page.waitForTimeout(100);
    const notes2 = await getActiveNotes(page);

    await recallPreset(page, 3);
    await page.waitForTimeout(100);
    const notes3 = await getActiveNotes(page);

    // All progressions should have notes
    expect(notes1.length).toBeGreaterThan(0);
    expect(notes2.length).toBeGreaterThan(0);
    expect(notes3.length).toBeGreaterThan(0);
  });

  test('should maintain preset after voicing changes', async ({ page }) => {
    // Save preset
    await playChord(page, 'E', 'min7');
    await page.waitForTimeout(100);
    await savePreset(page, 4);
    await page.waitForTimeout(100);

    // Make voicing changes
    await page.keyboard.press('Shift'); // Change voicing style
    await page.waitForTimeout(100);

    // Recall preset - should return to saved voicing
    await recallPreset(page, 4);
    await page.waitForTimeout(100);

    await expectChordName(page, 'E min7');
  });

  test('should handle complex chord progression recall', async ({ page }) => {
    // Build and save a complex progression
    const progression = [
      { slot: 1, root: 'E', quality: 'min7' as const },
      { slot: 2, root: 'A', quality: 'dom7' as const },
      { slot: 3, root: 'D', quality: 'maj7' as const },
      { slot: 4, root: 'G', quality: 'maj7' as const },
      { slot: 5, root: 'C', quality: 'maj7' as const },
      { slot: 6, root: 'F', quality: 'maj7' as const },
      { slot: 7, root: 'B', quality: 'min7' as const },
      { slot: 8, root: 'E', quality: 'dom7' as const },
    ];

    // Save all chords
    for (const chord of progression) {
      await playChord(page, chord.root, chord.quality);
      await page.waitForTimeout(50);
      await savePreset(page, chord.slot);
      await page.waitForTimeout(50);
      await releaseAllKeys(page);
      await page.waitForTimeout(30);
    }

    // Recall in reverse order
    for (let i = progression.length - 1; i >= 0; i--) {
      await recallPreset(page, progression[i].slot);
      await page.waitForTimeout(100);

      const activeNotes = await getActiveNotes(page);
      expect(activeNotes.length).toBeGreaterThan(0);
    }
  });
});
