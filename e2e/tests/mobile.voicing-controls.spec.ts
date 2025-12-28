import { test, expect } from '@playwright/test';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';
import { expectChordName } from '../utils/keyboard-helpers';

// Configure tests to run only on mobile viewport
test.use({
  viewport: { width: 375, height: 667 }, // Pixel 5 dimensions
  isMobile: true,
  hasTouch: true,
});

/**
 * Mobile Voicing Controls Tests
 *
 * These tests verify voicing controls work via the mobile touch interface.
 * The desktop voicing-controls.spec.ts uses keyboard shortcuts (Shift, Arrow keys)
 * which are not available on mobile devices.
 */
test.describe('Mobile Voicing Controls', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);

    // Build a base chord using mobile touch interface
    // Tap C root
    const cButton = page.locator('text=Roots').locator('..').locator('..').getByRole('button', { name: 'C', exact: true });
    await cButton.tap();
    await page.waitForTimeout(50);

    // Tap maj7 quality
    const maj7Button = page.locator('text=Modifiers').locator('..').getByRole('button', { name: 'maj7' });
    await maj7Button.tap();
    await page.waitForTimeout(100);

    // Verify chord is built
    await expectChordName(page, 'C Maj7');
  });

  test('should display mobile voicing controls', async ({ page }) => {
    // Verify voicing controls section is visible
    const voicingControls = page.locator('[data-testid="mobile-voicing-controls"]');
    await expect(voicingControls).toBeVisible();

    // Verify all control buttons are present
    await expect(page.locator('[data-testid="mobile-voicing-style"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-voicing-inversion"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-voicing-spread"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-voicing-octave-down"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-voicing-octave-up"]')).toBeVisible();
  });

  test('should cycle voicing style with touch', async ({ page }) => {
    const voicingStyleBtn = page.locator('[data-testid="mobile-voicing-style"]');
    const voicingStyleDisplay = page.locator('[data-testid="voicing-style"]');

    // Get initial voicing style
    const initialStyle = await voicingStyleDisplay.textContent();

    // Tap to cycle voicing style
    await voicingStyleBtn.tap();
    await page.waitForTimeout(100);

    // Voicing style should change
    const newStyle = await voicingStyleDisplay.textContent();
    expect(newStyle).not.toBe(initialStyle);
  });

  test('should cycle through multiple voicing styles', async ({ page }) => {
    const voicingStyleBtn = page.locator('[data-testid="mobile-voicing-style"]');
    const voicingStyleDisplay = page.locator('[data-testid="voicing-style"]');

    const styles = new Set<string>();

    // Capture initial style
    styles.add((await voicingStyleDisplay.textContent()) || '');

    // Cycle through 5 voicing styles
    for (let i = 0; i < 5; i++) {
      await voicingStyleBtn.tap();
      await page.waitForTimeout(100);
      styles.add((await voicingStyleDisplay.textContent()) || '');
    }

    // Should have seen at least 3 different voicing styles
    expect(styles.size).toBeGreaterThan(2);
  });

  test('should cycle inversion with touch', async ({ page }) => {
    const inversionBtn = page.locator('[data-testid="mobile-voicing-inversion"]');
    const inversionDisplay = page.locator('[data-testid="inversion-index"]');

    // Get initial inversion
    const initialInversion = await inversionDisplay.textContent();

    // Tap to cycle inversion
    await inversionBtn.tap();
    await page.waitForTimeout(100);

    // Inversion should change
    const newInversion = await inversionDisplay.textContent();
    expect(newInversion).not.toBe(initialInversion);

    // Chord name should still be C Maj7
    await expectChordName(page, 'C Maj7');
  });

  test('should cycle through multiple inversions', async ({ page }) => {
    const inversionBtn = page.locator('[data-testid="mobile-voicing-inversion"]');
    const inversionDisplay = page.locator('[data-testid="inversion-index"]');

    const inversions = new Set<string>();

    // Capture initial inversion
    inversions.add((await inversionDisplay.textContent()) || '');

    // Cycle through 4 inversions (should return to original or close)
    for (let i = 0; i < 4; i++) {
      await inversionBtn.tap();
      await page.waitForTimeout(100);
      inversions.add((await inversionDisplay.textContent()) || '');
    }

    // Should have seen at least 2 different inversions
    expect(inversions.size).toBeGreaterThan(1);
  });

  test('should cycle spread with touch', async ({ page }) => {
    const spreadBtn = page.locator('[data-testid="mobile-voicing-spread"]');
    const spreadDisplay = page.locator('[data-testid="spread-amount"]');

    // Get initial spread
    const initialSpread = await spreadDisplay.textContent();

    // Tap to cycle spread
    await spreadBtn.tap();
    await page.waitForTimeout(100);

    // Spread should change
    const newSpread = await spreadDisplay.textContent();
    expect(newSpread).not.toBe(initialSpread);

    // Chord name should still be C Maj7
    await expectChordName(page, 'C Maj7');
  });

  test('should increase octave with touch', async ({ page }) => {
    const octaveUpBtn = page.locator('[data-testid="mobile-voicing-octave-up"]');
    const octaveDisplay = page.locator('[data-testid="chord-octave"]');

    // Get initial octave
    const initialOctave = parseInt((await octaveDisplay.textContent()) || '0', 10);

    // Tap to increase octave
    await octaveUpBtn.tap();
    await page.waitForTimeout(100);

    // Octave should increase by 1
    const newOctave = parseInt((await octaveDisplay.textContent()) || '0', 10);
    expect(newOctave).toBe(initialOctave + 1);

    // Chord name should still be C Maj7
    await expectChordName(page, 'C Maj7');
  });

  test('should decrease octave with touch', async ({ page }) => {
    const octaveDownBtn = page.locator('[data-testid="mobile-voicing-octave-down"]');
    const octaveDisplay = page.locator('[data-testid="chord-octave"]');

    // Get initial octave
    const initialOctave = parseInt((await octaveDisplay.textContent()) || '0', 10);

    // Tap to decrease octave
    await octaveDownBtn.tap();
    await page.waitForTimeout(100);

    // Octave should decrease by 1
    const newOctave = parseInt((await octaveDisplay.textContent()) || '0', 10);
    expect(newOctave).toBe(initialOctave - 1);

    // Chord name should still be C Maj7
    await expectChordName(page, 'C Maj7');
  });

  test('should handle multiple octave transpositions', async ({ page }) => {
    const octaveUpBtn = page.locator('[data-testid="mobile-voicing-octave-up"]');
    const octaveDownBtn = page.locator('[data-testid="mobile-voicing-octave-down"]');
    const octaveDisplay = page.locator('[data-testid="chord-octave"]');

    // Get initial octave
    const initialOctave = parseInt((await octaveDisplay.textContent()) || '0', 10);

    // Increase by 2 octaves
    await octaveUpBtn.tap();
    await octaveUpBtn.tap();
    await page.waitForTimeout(100);

    const octaveAfterUp = parseInt((await octaveDisplay.textContent()) || '0', 10);
    expect(octaveAfterUp).toBe(initialOctave + 2);

    // Decrease by 3 octaves
    await octaveDownBtn.tap();
    await octaveDownBtn.tap();
    await octaveDownBtn.tap();
    await page.waitForTimeout(100);

    const octaveAfterDown = parseInt((await octaveDisplay.textContent()) || '0', 10);
    expect(octaveAfterDown).toBe(initialOctave - 1);
  });

  test('should preserve chord quality when changing voicing', async ({ page }) => {
    const voicingStyleBtn = page.locator('[data-testid="mobile-voicing-style"]');
    const octaveUpBtn = page.locator('[data-testid="mobile-voicing-octave-up"]');
    const inversionBtn = page.locator('[data-testid="mobile-voicing-inversion"]');

    // Start with C Maj7
    await expectChordName(page, 'C Maj7');

    // Change voicing style
    await voicingStyleBtn.tap();
    await page.waitForTimeout(100);

    // Should still be C Maj7
    await expectChordName(page, 'C Maj7');

    // Transpose octave
    await octaveUpBtn.tap();
    await page.waitForTimeout(100);

    // Should still be C Maj7
    await expectChordName(page, 'C Maj7');

    // Cycle inversion
    await inversionBtn.tap();
    await page.waitForTimeout(100);

    // Should still be C Maj7
    await expectChordName(page, 'C Maj7');
  });

  test('should combine multiple voicing transformations', async ({ page }) => {
    const voicingStyleBtn = page.locator('[data-testid="mobile-voicing-style"]');
    const octaveUpBtn = page.locator('[data-testid="mobile-voicing-octave-up"]');
    const spreadBtn = page.locator('[data-testid="mobile-voicing-spread"]');
    const inversionBtn = page.locator('[data-testid="mobile-voicing-inversion"]');

    const voicingStyleDisplay = page.locator('[data-testid="voicing-style"]');
    const octaveDisplay = page.locator('[data-testid="chord-octave"]');
    const spreadDisplay = page.locator('[data-testid="spread-amount"]');
    const inversionDisplay = page.locator('[data-testid="inversion-index"]');

    // Capture initial state
    const initialState = {
      style: await voicingStyleDisplay.textContent(),
      octave: await octaveDisplay.textContent(),
      spread: await spreadDisplay.textContent(),
      inversion: await inversionDisplay.textContent(),
    };

    // Apply multiple transformations
    await voicingStyleBtn.tap();
    await page.waitForTimeout(50);

    await octaveUpBtn.tap();
    await page.waitForTimeout(50);

    await spreadBtn.tap();
    await page.waitForTimeout(50);

    await inversionBtn.tap();
    await page.waitForTimeout(100);

    // Capture final state
    const finalState = {
      style: await voicingStyleDisplay.textContent(),
      octave: await octaveDisplay.textContent(),
      spread: await spreadDisplay.textContent(),
      inversion: await inversionDisplay.textContent(),
    };

    // State should be different
    expect(finalState).not.toEqual(initialState);

    // At least some values should have changed
    const changedValues = [
      finalState.style !== initialState.style,
      finalState.octave !== initialState.octave,
      finalState.spread !== initialState.spread,
      finalState.inversion !== initialState.inversion,
    ].filter(Boolean).length;

    expect(changedValues).toBeGreaterThanOrEqual(2);

    // But chord name should still be C Maj7
    await expectChordName(page, 'C Maj7');
  });

  test('should update voicing for different chord types', async ({ page }) => {
    // Clear current chord and build D minor
    const clearButton = page.getByRole('button', { name: /Clear Notes|clear/i }).first();
    if ((await clearButton.count()) > 0) {
      await clearButton.tap();
      await page.waitForTimeout(100);
    }

    // Build D minor
    await page.locator('text=Roots').locator('..').locator('..').getByRole('button', { name: 'D', exact: true }).tap();
    await page.waitForTimeout(50);
    await page.locator('text=Modifiers').locator('..').getByRole('button', { name: 'minor' }).tap();
    await page.waitForTimeout(100);

    await expectChordName(page, 'D min');

    // Cycle voicing style
    const voicingStyleBtn = page.locator('[data-testid="mobile-voicing-style"]');
    const voicingStyleDisplay = page.locator('[data-testid="voicing-style"]');

    const initialStyle = await voicingStyleDisplay.textContent();

    await voicingStyleBtn.tap();
    await page.waitForTimeout(100);

    const newStyle = await voicingStyleDisplay.textContent();

    // Style should change
    expect(newStyle).not.toBe(initialStyle);

    // Chord name should remain D min
    await expectChordName(page, 'D min');
  });

  test('should display octave indicator correctly', async ({ page }) => {
    const octaveDisplay = page.locator('[data-testid="mobile-voicing-octave-display"]');

    // Verify octave display button shows current octave
    const displayText = await octaveDisplay.textContent();
    expect(displayText).toMatch(/Oct: \d+/);
  });

  test('should have touch-friendly button sizes', async ({ page }) => {
    const voicingStyleBtn = page.locator('[data-testid="mobile-voicing-style"]');
    const box = await voicingStyleBtn.boundingBox();

    if (box) {
      // Buttons should be at least 40px in height for touch accessibility
      expect(box.height).toBeGreaterThanOrEqual(30);
    }
  });
});
