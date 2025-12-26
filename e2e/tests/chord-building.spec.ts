import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  expectChordName,
  getActiveNotes,
  expectNoActiveNotes,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';

test.describe('Chord Building', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test('should build C major triad', async ({ page }) => {
    await playChord(page, 'C', 'major');

    // Verify chord name display
    await expectChordName(page, 'C');

    // Verify notes are highlighted on piano keyboard
    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
    expect(activeNotes.length).toBeLessThanOrEqual(4); // Triad should have 3-4 notes depending on voicing
  });

  test('should build C minor chord', async ({ page }) => {
    await playChord(page, 'C', 'minor');

    await expectChordName(page, 'Cm');

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build D minor chord', async ({ page }) => {
    await playChord(page, 'D', 'minor');

    await expectChordName(page, 'Dm');

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build C dominant 7th chord', async ({ page }) => {
    await playChord(page, 'C', 'dom7');

    await expectChordName(page, 'C7');

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build C major 7th chord', async ({ page }) => {
    await playChord(page, 'C', 'maj7');

    await expectChordName(page, 'Cmaj7');

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build D minor 7th chord', async ({ page }) => {
    await playChord(page, 'D', 'min7');

    await expectChordName(page, 'Dm7');

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should add 9th extension to C major', async ({ page }) => {
    await playChord(page, 'C', 'major', ['9th']);

    await expectChordName(page, 'C'); // May show as Cadd9 or C9

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build C major 9th chord', async ({ page }) => {
    await playChord(page, 'C', 'maj7', ['9th']);

    // Chord name should contain 9
    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText).toContain('9');

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build G dominant 9th chord', async ({ page }) => {
    await playChord(page, 'G', 'dom7', ['9th']);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText).toMatch(/G.*9/); // G9 or G7(9)

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build chord with 11th extension', async ({ page }) => {
    await playChord(page, 'D', 'min7', ['11th']);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText).toContain('11');

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build chord with 13th extension', async ({ page }) => {
    await playChord(page, 'G', 'dom7', ['13th']);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText).toContain('13');

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build chord with b5 alteration', async ({ page }) => {
    await playChord(page, 'G', 'dom7', ['b5']);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText).toMatch(/♭5|b5/); // May use flat symbol or b5

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build chord with #5 alteration', async ({ page }) => {
    await playChord(page, 'G', 'dom7', ['#5']);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText).toMatch(/♯5|#5/); // May use sharp symbol or #5

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build chord with b9 alteration', async ({ page }) => {
    await playChord(page, 'G', 'dom7', ['b9']);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText).toMatch(/♭9|b9/);

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build chord with #9 alteration', async ({ page }) => {
    await playChord(page, 'G', 'dom7', ['#9']);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText).toMatch(/♯9|#9/);

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build complex altered chord (G7#5#9)', async ({ page }) => {
    // Build G7 with #5 and #9
    await playChord(page, 'G', 'dom7', ['#5', '#9']);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();

    // Should contain both alterations
    expect(chordText).toContain('G');
    expect(chordText).toMatch(/♯5|#5/);
    expect(chordText).toMatch(/♯9|#9/);

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build diminished chord', async ({ page }) => {
    await playChord(page, 'C', 'diminished');

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText).toMatch(/Cdim|C°/);

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build augmented chord', async ({ page }) => {
    await playChord(page, 'C', 'augmented');

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText).toMatch(/Caug|C\+/);

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should clear chord with Escape key', async ({ page }) => {
    // First build a chord
    await playChord(page, 'C', 'maj7');

    // Verify chord is displayed
    const activeNotesBefore = await getActiveNotes(page);
    expect(activeNotesBefore.length).toBeGreaterThan(0);

    // Clear with Escape
    await releaseAllKeys(page);

    // Verify piano keyboard is cleared
    await expectNoActiveNotes(page);

    // Chord display should show empty or default state
    const chordDisplay = page.locator('[data-testid="chord-display"]');
    const chordText = await chordDisplay.textContent();
    expect(chordText?.trim()).toBeTruthy(); // May show "No Chord" or be empty
  });

  test('should switch between different chords', async ({ page }) => {
    // Build C major
    await playChord(page, 'C', 'major');
    await expectChordName(page, 'C');

    // Clear
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Build G7
    await playChord(page, 'G', 'dom7');
    await expectChordName(page, 'G7');

    // Clear
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Build Dm7
    await playChord(page, 'D', 'min7');
    await expectChordName(page, 'Dm7');
  });

  test('should verify piano keyboard highlights change with different chords', async ({ page }) => {
    // Build C major
    await playChord(page, 'C', 'major');
    const cMajorNotes = await getActiveNotes(page);

    // Clear
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Build C minor
    await playChord(page, 'C', 'minor');
    const cMinorNotes = await getActiveNotes(page);

    // Notes should be different (C minor has Eb instead of E)
    expect(cMajorNotes).not.toEqual(cMinorNotes);
  });

  test('should handle rapid chord changes', async ({ page }) => {
    const chords = [
      { root: 'C', quality: 'major' as const, name: 'C' },
      { root: 'D', quality: 'minor' as const, name: 'Dm' },
      { root: 'G', quality: 'dom7' as const, name: 'G7' },
      { root: 'F', quality: 'maj7' as const, name: 'Fmaj7' },
    ];

    for (const chord of chords) {
      await playChord(page, chord.root, chord.quality);
      await expectChordName(page, chord.name);
      await page.waitForTimeout(50);
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }
  });

  test('should display chord name immediately after construction', async ({ page }) => {
    await playChord(page, 'E', 'min7');

    // Chord display should update within a short time
    await page.waitForTimeout(100);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    await expect(chordDisplay).toContainText('Em7', { timeout: 1000 });
  });
});
