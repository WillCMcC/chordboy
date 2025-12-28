import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  expectChordName,
  getActiveNotes,
  cycleVoicingStyle,
  octaveUp,
  octaveDown,
  increaseSpread,
  decreaseSpread,
  cycleInversion,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';

// Desktop-only keyboard tests - use mobile.voicing-controls.spec.ts for mobile touch tests
test.use({ viewport: { width: 1280, height: 720 } });

test.describe('Voicing Controls', () => {

  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);

    // Build a base chord for voicing tests
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(100);
  });

  test('should cycle through voicing styles with Shift key', async ({ page }) => {
    const initialNotes = await getActiveNotes(page);

    // Cycle voicing style once
    await cycleVoicingStyle(page, 1);
    await page.waitForTimeout(100);

    const notesAfterFirstCycle = await getActiveNotes(page);

    // Notes should be different (different voicing)
    expect(notesAfterFirstCycle).not.toEqual(initialNotes);

    // Cycle again
    await cycleVoicingStyle(page, 1);
    await page.waitForTimeout(100);

    const notesAfterSecondCycle = await getActiveNotes(page);

    // Notes should change again
    expect(notesAfterSecondCycle).not.toEqual(notesAfterFirstCycle);
  });

  test('should cycle through multiple voicing styles (close, drop2, drop3)', async ({ page }) => {
    const voicings = [];

    // Capture initial voicing
    voicings.push(await getActiveNotes(page));

    // Cycle through 5 voicing styles
    for (let i = 0; i < 5; i++) {
      await cycleVoicingStyle(page, 1);
      await page.waitForTimeout(100);
      voicings.push(await getActiveNotes(page));
    }

    // Each voicing should be unique (at least most of them)
    const uniqueVoicings = new Set(voicings.map((v) => JSON.stringify(v)));
    expect(uniqueVoicings.size).toBeGreaterThan(2); // At least 3 different voicings
  });

  test('should update voicing indicator when cycling styles', async ({ page }) => {
    // Look for voicing indicator element
    const voicingIndicator = page.locator('[data-testid="voicing-indicator"], [data-voicing-style]');

    // Check if indicator exists
    const indicatorExists = (await voicingIndicator.count()) > 0;

    if (indicatorExists) {
      const initialStyle = await voicingIndicator.textContent();

      // Cycle voicing
      await cycleVoicingStyle(page, 1);
      await page.waitForTimeout(100);

      const newStyle = await voicingIndicator.textContent();

      // Style indicator should change
      expect(newStyle).not.toBe(initialStyle);
    }
  });

  test('should transpose octave up with ArrowUp key', async ({ page }) => {
    const initialNotes = await getActiveNotes(page);

    // Transpose up one octave
    await octaveUp(page, 1);
    await page.waitForTimeout(100);

    const notesAfterTranspose = await getActiveNotes(page);

    // All notes should be 12 semitones higher
    const expectedNotes = initialNotes.map((n) => n + 12);
    expect(notesAfterTranspose).toEqual(expectedNotes);
  });

  test('should transpose octave down with ArrowDown key', async ({ page }) => {
    const initialNotes = await getActiveNotes(page);

    // Transpose down one octave
    await octaveDown(page, 1);
    await page.waitForTimeout(100);

    const notesAfterTranspose = await getActiveNotes(page);

    // All notes should be 12 semitones lower
    const expectedNotes = initialNotes.map((n) => n - 12);
    expect(notesAfterTranspose).toEqual(expectedNotes);
  });

  test('should handle multiple octave transpositions', async ({ page }) => {
    const initialNotes = await getActiveNotes(page);

    // Transpose up 2 octaves
    await octaveUp(page, 2);
    await page.waitForTimeout(100);

    const notesAfterUp = await getActiveNotes(page);
    const expectedNotesUp = initialNotes.map((n) => n + 24);
    expect(notesAfterUp).toEqual(expectedNotesUp);

    // Transpose down 3 octaves
    await octaveDown(page, 3);
    await page.waitForTimeout(100);

    const notesAfterDown = await getActiveNotes(page);
    const expectedNotesDown = initialNotes.map((n) => n - 12);
    expect(notesAfterDown).toEqual(expectedNotesDown);
  });

  test('should adjust spread/width with right arrow key', async ({ page }) => {
    const initialNotes = await getActiveNotes(page);
    const initialRange = Math.max(...initialNotes) - Math.min(...initialNotes);

    // Increase spread
    await increaseSpread(page, 1);
    await page.waitForTimeout(100);

    const notesAfterSpread = await getActiveNotes(page);
    const newRange = Math.max(...notesAfterSpread) - Math.min(...notesAfterSpread);

    // Range should increase (notes more spread out)
    expect(newRange).toBeGreaterThanOrEqual(initialRange);
  });

  test('should adjust spread/width with left arrow key', async ({ page }) => {
    // First increase spread
    await increaseSpread(page, 2);
    await page.waitForTimeout(100);

    const notesAfterIncrease = await getActiveNotes(page);
    const rangeAfterIncrease = Math.max(...notesAfterIncrease) - Math.min(...notesAfterIncrease);

    // Then decrease spread
    await decreaseSpread(page, 1);
    await page.waitForTimeout(100);

    const notesAfterDecrease = await getActiveNotes(page);
    const rangeAfterDecrease = Math.max(...notesAfterDecrease) - Math.min(...notesAfterDecrease);

    // Range should decrease (notes closer together)
    expect(rangeAfterDecrease).toBeLessThanOrEqual(rangeAfterIncrease);
  });

  test('should cycle inversions with left Shift key', async ({ page }) => {
    const initialNotes = await getActiveNotes(page);

    // Cycle inversion
    await cycleInversion(page);
    await page.waitForTimeout(100);

    const notesAfterInversion = await getActiveNotes(page);

    // Notes should be different (inversion changes bass note)
    expect(notesAfterInversion).not.toEqual(initialNotes);

    // The same pitches should be present (just different octaves/ordering)
    const initialPitchClasses = initialNotes.map((n) => n % 12).sort();
    const invertedPitchClasses = notesAfterInversion.map((n) => n % 12).sort();
    expect(invertedPitchClasses).toEqual(initialPitchClasses);
  });

  test('should cycle through multiple inversions', async ({ page }) => {
    const inversions = [];

    // Capture initial inversion
    inversions.push(await getActiveNotes(page));

    // Cycle through 4 inversions (should return to original or close)
    for (let i = 0; i < 4; i++) {
      await cycleInversion(page);
      await page.waitForTimeout(100);
      inversions.push(await getActiveNotes(page));
    }

    // Should have at least 2 different inversions
    const uniqueInversions = new Set(inversions.map((v) => JSON.stringify(v)));
    expect(uniqueInversions.size).toBeGreaterThan(1);
  });

  test('should preserve chord quality when changing voicing', async ({ page }) => {
    // Start with C Maj7
    await expectChordName(page, 'C Maj7');

    // Change voicing style
    await cycleVoicingStyle(page, 1);
    await page.waitForTimeout(100);

    // Should still be C Maj7
    await expectChordName(page, 'C Maj7');

    // Transpose octave
    await octaveUp(page, 1);
    await page.waitForTimeout(100);

    // Should still be C Maj7
    await expectChordName(page, 'C Maj7');
  });

  test('should combine multiple voicing transformations', async ({ page }) => {
    const initialNotes = await getActiveNotes(page);

    // Cycle voicing style
    await cycleVoicingStyle(page, 1);
    await page.waitForTimeout(50);

    // Transpose octave up
    await octaveUp(page, 1);
    await page.waitForTimeout(50);

    // Increase spread
    await increaseSpread(page, 1);
    await page.waitForTimeout(50);

    // Cycle inversion
    await cycleInversion(page);
    await page.waitForTimeout(100);

    const finalNotes = await getActiveNotes(page);

    // Notes should be significantly different
    expect(finalNotes).not.toEqual(initialNotes);

    // But chord name should still be C Maj7
    await expectChordName(page, 'C Maj7');
  });

  test('should maintain voicing after building new chord', async ({ page }) => {
    // Set up a specific voicing
    await cycleVoicingStyle(page, 2);
    await octaveUp(page, 1);
    await page.waitForTimeout(100);

    const cmaj7Notes = await getActiveNotes(page);

    // Clear and build a different chord
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    await playChord(page, 'G', 'dom7');
    await page.waitForTimeout(100);

    const g7Notes = await getActiveNotes(page);

    // New chord should use similar voicing characteristics
    // (octave should be similar, spread should be similar)
    const cmaj7Octave = Math.floor(Math.min(...cmaj7Notes) / 12);
    const g7Octave = Math.floor(Math.min(...g7Notes) / 12);

    // Should be in similar octave range (within 1 octave)
    expect(Math.abs(cmaj7Octave - g7Octave)).toBeLessThanOrEqual(1);
  });

  test('should update voicing for different chord types', async ({ page }) => {
    // Clear initial chord
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Test voicing with a different chord type
    await playChord(page, 'D', 'min7');
    await page.waitForTimeout(100);

    const initialNotes = await getActiveNotes(page);

    // Change voicing
    await cycleVoicingStyle(page, 1);
    await page.waitForTimeout(100);

    const notesAfterVoicing = await getActiveNotes(page);

    // Notes should change
    expect(notesAfterVoicing).not.toEqual(initialNotes);

    // Chord name should remain D min7
    await expectChordName(page, 'D min7');
  });

  test('should handle voicing controls on extended chords', async ({ page }) => {
    // Clear initial chord
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Build extended chord
    await playChord(page, 'G', 'dom7', ['9th', '13th']);
    await page.waitForTimeout(100);

    const initialNotes = await getActiveNotes(page);

    // Change voicing
    await cycleVoicingStyle(page, 1);
    await page.waitForTimeout(100);

    const notesAfterVoicing = await getActiveNotes(page);

    // Notes should change
    expect(notesAfterVoicing).not.toEqual(initialNotes);

    // Should have multiple notes (extended chord)
    expect(notesAfterVoicing.length).toBeGreaterThan(4);
  });

  test('should preserve alterations when changing voicing', async ({ page }) => {
    // Clear initial chord
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Build altered chord (using #9 only - #5 not available as keyboard modifier)
    await playChord(page, 'G', 'dom7', ['#9']);
    await page.waitForTimeout(100);

    // Verify initial chord has the alteration
    const chordDisplay = page.locator('[data-testid="chord-display"]');
    await expect(chordDisplay).toContainText('G7');
    await expect(chordDisplay).toContainText('♯9');

    // Change voicing
    await cycleVoicingStyle(page, 1);
    await octaveUp(page, 1);
    await page.waitForTimeout(100);

    // Chord name should still contain the alteration
    await expect(chordDisplay).toContainText('G7');
    await expect(chordDisplay).toContainText('♯9');
  });

  test('should handle extreme octave ranges', async ({ page }) => {
    // Transpose way up
    await octaveUp(page, 3);
    await page.waitForTimeout(100);

    const notesHigh = await getActiveNotes(page);
    expect(notesHigh.length).toBeGreaterThan(0);

    // Transpose way down
    await octaveDown(page, 6);
    await page.waitForTimeout(100);

    const notesLow = await getActiveNotes(page);
    expect(notesLow.length).toBeGreaterThan(0);

    // Should still have valid MIDI notes (0-127 range)
    expect(Math.min(...notesLow)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...notesHigh)).toBeLessThanOrEqual(127);
  });
});
