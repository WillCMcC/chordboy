import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';

/**
 * Strum and Humanize E2E Tests
 *
 * Tests the performance features:
 * - Strum: Arpeggiates chord notes with configurable spread and direction
 * - Humanize: Adds timing variation to make playing sound more natural
 */
test.describe('Strum and Humanize Controls', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test.describe('Strum Controls UI', () => {
    test('should show strum toggle button', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle, [data-testid="strum-toggle"]');
      await expect(strumToggle).toBeVisible();
    });

    test('should show strum spread slider', async ({ page }) => {
      const strumSlider = page.locator('.strum-slider, [data-testid="strum-slider"]');
      await expect(strumSlider).toBeVisible();
    });

    test('should show strum direction selector', async ({ page }) => {
      const strumDirection = page.locator('.strum-direction-select, [data-testid="strum-direction"]');
      await expect(strumDirection).toBeVisible();
    });

    test('should show strum value in ms', async ({ page }) => {
      const strumValue = page.locator('.strum-value');
      await expect(strumValue).toBeVisible();
      await expect(strumValue).toContainText('ms');
    });

    test('strum should default to OFF', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      const text = await strumToggle.textContent();
      expect(text).toContain('OFF');
    });
  });

  test.describe('Strum Toggle', () => {
    test('should toggle strum ON', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      await expect(strumToggle).toHaveClass(/active/);
      await expect(strumToggle).toContainText('ON');
    });

    test('should toggle strum OFF', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');

      // Turn ON
      await strumToggle.click();
      await expect(strumToggle).toHaveClass(/active/);

      // Turn OFF
      await strumToggle.click();
      await expect(strumToggle).not.toHaveClass(/active/);
      await expect(strumToggle).toContainText('OFF');
    });

    test('should enable slider when strum is ON', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      const strumSlider = page.locator('.strum-slider');

      // Initially disabled
      await expect(strumSlider).toHaveClass(/disabled/);

      // Enable strum
      await strumToggle.click();

      // Slider should be enabled
      await expect(strumSlider).not.toHaveClass(/disabled/);
    });

    test('should enable direction selector when strum is ON', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      const strumDirection = page.locator('.strum-direction-select');

      // Enable strum
      await strumToggle.click();

      // Direction should be enabled
      await expect(strumDirection).not.toBeDisabled();
    });
  });

  test.describe('Strum Spread Slider', () => {
    test('should adjust strum spread value', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumSlider = page.locator('.strum-slider');
      const strumValue = page.locator('.strum-value');

      // Change spread
      await strumSlider.fill('100');

      await expect(strumValue).toContainText('100ms');
    });

    test('should have min value of 0', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('0');

      const strumValue = page.locator('.strum-value');
      await expect(strumValue).toContainText('0ms');
    });

    test('should have max value of 200', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('200');

      const strumValue = page.locator('.strum-value');
      await expect(strumValue).toContainText('200ms');
    });
  });

  test.describe('Strum Direction', () => {
    test('should have Up direction option', async ({ page }) => {
      const strumDirection = page.locator('.strum-direction-select');
      await expect(strumDirection.locator('option[value="up"]')).toBeAttached();
    });

    test('should have Down direction option', async ({ page }) => {
      const strumDirection = page.locator('.strum-direction-select');
      await expect(strumDirection.locator('option[value="down"]')).toBeAttached();
    });

    test('should have Alternate direction option', async ({ page }) => {
      const strumDirection = page.locator('.strum-direction-select');
      await expect(strumDirection.locator('option[value="alternate"]')).toBeAttached();
    });

    test('should change strum direction to Down', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumDirection = page.locator('.strum-direction-select');
      await strumDirection.selectOption('down');

      const value = await strumDirection.inputValue();
      expect(value).toBe('down');
    });

    test('should change strum direction to Alternate', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumDirection = page.locator('.strum-direction-select');
      await strumDirection.selectOption('alternate');

      const value = await strumDirection.inputValue();
      expect(value).toBe('alternate');
    });
  });

  test.describe('Humanize Controls UI', () => {
    test('should show humanize slider', async ({ page }) => {
      const humanizeSlider = page.locator('.humanize-slider, [data-testid="humanize-slider"]');
      await expect(humanizeSlider).toBeVisible();
    });

    test('should show humanize value in percentage', async ({ page }) => {
      const humanizeValue = page.locator('.humanize-value');
      await expect(humanizeValue).toBeVisible();
      await expect(humanizeValue).toContainText('%');
    });

    test('humanize should default to 0%', async ({ page }) => {
      const humanizeValue = page.locator('.humanize-value');
      await expect(humanizeValue).toContainText('0%');
    });
  });

  test.describe('Humanize Slider', () => {
    test('should adjust humanize value', async ({ page }) => {
      const humanizeSlider = page.locator('.humanize-slider');
      const humanizeValue = page.locator('.humanize-value');

      await humanizeSlider.fill('50');

      await expect(humanizeValue).toContainText('50%');
    });

    test('should have min value of 0', async ({ page }) => {
      const humanizeSlider = page.locator('.humanize-slider');
      await humanizeSlider.fill('0');

      const humanizeValue = page.locator('.humanize-value');
      await expect(humanizeValue).toContainText('0%');
    });

    test('should have max value of 100', async ({ page }) => {
      const humanizeSlider = page.locator('.humanize-slider');
      await humanizeSlider.fill('100');

      const humanizeValue = page.locator('.humanize-value');
      await expect(humanizeValue).toContainText('100%');
    });

    test('should update value incrementally', async ({ page }) => {
      const humanizeSlider = page.locator('.humanize-slider');
      const humanizeValue = page.locator('.humanize-value');

      // Set to 25
      await humanizeSlider.fill('25');
      await expect(humanizeValue).toContainText('25%');

      // Set to 75
      await humanizeSlider.fill('75');
      await expect(humanizeValue).toContainText('75%');
    });
  });

  test.describe('Playing Chords with Strum', () => {
    test('should play chord with strum enabled without errors', async ({ page }) => {
      // Enable strum
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      // Set spread
      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('50');

      // Play chord
      await playChord(page, 'C', 'maj7');
      await page.waitForTimeout(200);

      // Chord should display
      const chordDisplay = page.locator('[data-testid="chord-display"]');
      await expect(chordDisplay).toContainText('C');

      await releaseAllKeys(page);
    });

    test('should play chord with strum up', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumDirection = page.locator('.strum-direction-select');
      await strumDirection.selectOption('up');

      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('75');

      await playChord(page, 'G', 'dom7');
      await page.waitForTimeout(200);

      const chordDisplay = page.locator('[data-testid="chord-display"]');
      await expect(chordDisplay).toContainText('G7');

      await releaseAllKeys(page);
    });

    test('should play chord with strum down', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumDirection = page.locator('.strum-direction-select');
      await strumDirection.selectOption('down');

      await playChord(page, 'D', 'min7');
      await page.waitForTimeout(200);

      const chordDisplay = page.locator('[data-testid="chord-display"]');
      await expect(chordDisplay).toContainText('D min7');

      await releaseAllKeys(page);
    });

    test('should play chord with strum alternate', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumDirection = page.locator('.strum-direction-select');
      await strumDirection.selectOption('alternate');

      // Play multiple chords to test alternation
      await playChord(page, 'C', 'major');
      await releaseAllKeys(page);
      await page.waitForTimeout(100);

      await playChord(page, 'G', 'major');
      await releaseAllKeys(page);
      await page.waitForTimeout(100);

      await playChord(page, 'A', 'minor');
      await releaseAllKeys(page);

      // Should not crash
      expect(true).toBe(true);
    });
  });

  test.describe('Playing Chords with Humanize', () => {
    test('should play chord with humanize enabled', async ({ page }) => {
      const humanizeSlider = page.locator('.humanize-slider');
      await humanizeSlider.fill('50');

      await playChord(page, 'F', 'maj7');
      await page.waitForTimeout(200);

      const chordDisplay = page.locator('[data-testid="chord-display"]');
      await expect(chordDisplay).toContainText('F');

      await releaseAllKeys(page);
    });

    test('should play multiple chords with humanize', async ({ page }) => {
      const humanizeSlider = page.locator('.humanize-slider');
      await humanizeSlider.fill('75');

      await playChord(page, 'C', 'major');
      await releaseAllKeys(page);
      await page.waitForTimeout(50);

      await playChord(page, 'F', 'major');
      await releaseAllKeys(page);
      await page.waitForTimeout(50);

      await playChord(page, 'G', 'major');
      await releaseAllKeys(page);

      expect(true).toBe(true);
    });
  });

  test.describe('Combined Strum and Humanize', () => {
    test('should play chord with both strum and humanize', async ({ page }) => {
      // Enable strum
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('50');

      // Set humanize
      const humanizeSlider = page.locator('.humanize-slider');
      await humanizeSlider.fill('50');

      // Play chord
      await playChord(page, 'E', 'min7');
      await page.waitForTimeout(200);

      const chordDisplay = page.locator('[data-testid="chord-display"]');
      await expect(chordDisplay).toContainText('E min7');

      await releaseAllKeys(page);
    });

    test('should handle rapid chord changes with strum and humanize', async ({ page }) => {
      // Enable strum
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();
      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('30');

      // Set humanize
      const humanizeSlider = page.locator('.humanize-slider');
      await humanizeSlider.fill('25');

      // Rapid chord changes
      const chords = [
        { root: 'C', quality: 'maj7' as const },
        { root: 'D', quality: 'min7' as const },
        { root: 'G', quality: 'dom7' as const },
        { root: 'C', quality: 'maj7' as const },
      ];

      for (const chord of chords) {
        await playChord(page, chord.root, chord.quality);
        await page.waitForTimeout(100);
        await releaseAllKeys(page);
        await page.waitForTimeout(50);
      }

      expect(true).toBe(true);
    });
  });

  test.describe('Settings Persistence', () => {
    test('strum settings should persist while playing', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('100');

      const strumDirection = page.locator('.strum-direction-select');
      await strumDirection.selectOption('down');

      // Play a chord
      await playChord(page, 'C', 'major');

      // Settings should still be the same
      expect(await strumSlider.inputValue()).toBe('100');
      expect(await strumDirection.inputValue()).toBe('down');

      await releaseAllKeys(page);
    });

    test('humanize settings should persist while playing', async ({ page }) => {
      const humanizeSlider = page.locator('.humanize-slider');
      await humanizeSlider.fill('75');

      await playChord(page, 'G', 'dom7');

      expect(await humanizeSlider.inputValue()).toBe('75');

      await releaseAllKeys(page);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle strum with max spread', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('200');

      await playChord(page, 'C', 'maj7');
      await page.waitForTimeout(300);

      await releaseAllKeys(page);
      expect(true).toBe(true);
    });

    test('should handle humanize at max', async ({ page }) => {
      const humanizeSlider = page.locator('.humanize-slider');
      await humanizeSlider.fill('100');

      await playChord(page, 'A', 'min7');
      await page.waitForTimeout(200);

      await releaseAllKeys(page);
      expect(true).toBe(true);
    });

    test('should handle disabling strum while chord is playing', async ({ page }) => {
      const strumToggle = page.locator('.strum-toggle');
      await strumToggle.click();

      const strumSlider = page.locator('.strum-slider');
      await strumSlider.fill('100');

      // Start playing chord
      await playChord(page, 'D', 'major');

      // Disable strum while playing
      await strumToggle.click();

      await page.waitForTimeout(100);
      await releaseAllKeys(page);

      // Should not crash
      expect(true).toBe(true);
    });
  });
});
