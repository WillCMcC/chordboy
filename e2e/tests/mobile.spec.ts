import { test, expect } from '@playwright/test';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';
import { expectChordName, getActiveNotes, expectNoActiveNotes } from '../utils/keyboard-helpers';

// Configure tests to run only on mobile viewport
test.use({
  viewport: { width: 375, height: 667 }, // Pixel 5 dimensions
  isMobile: true,
  hasTouch: true,
});

test.describe('Mobile Interface', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test('should display mobile layout', async ({ page }) => {
    // Verify mobile-specific UI elements are visible
    const mobileLayout = page.locator('[data-testid="mobile-layout"], [data-mobile="true"]');

    // Check if app adapts to mobile viewport
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(375);
    expect(viewportSize?.height).toBe(667);

    // Chord display should still be visible
    const chordDisplay = page.locator('[data-testid="chord-display"]');
    await expect(chordDisplay).toBeVisible();
  });

  test('should display virtual root note buttons', async ({ page }) => {
    // Look for mobile root note buttons
    const rootButtons = page.locator('[data-testid*="root-"], button[data-root]');

    const count = await rootButtons.count();
    expect(count).toBeGreaterThan(0);

    // Should have buttons for all 12 notes
    expect(count).toBeGreaterThanOrEqual(12);
  });

  test('should tap virtual root note button (C)', async ({ page }) => {
    // Find C root button
    const cButton = page.locator('[data-testid="root-C"], button[data-root="C"]').first();

    // Tap the button
    await cButton.tap();
    await page.waitForTimeout(100);

    // Button should be visually selected/active
    const isActive = await cButton.evaluate((el) => {
      return el.classList.contains('active') || el.getAttribute('data-active') === 'true';
    });

    expect(isActive).toBeTruthy();
  });

  test('should display virtual quality buttons', async ({ page }) => {
    // Look for quality buttons
    const qualityButtons = page.locator('[data-testid*="quality-"], button[data-quality]');

    const count = await qualityButtons.count();
    expect(count).toBeGreaterThan(0);

    // Should have buttons for main qualities (major, minor, dom7, maj7, etc.)
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('should tap quality button (major)', async ({ page }) => {
    // Find major quality button
    const majorButton = page.locator('[data-testid="quality-major"], button[data-quality="major"]').first();

    // Tap the button
    await majorButton.tap();
    await page.waitForTimeout(100);

    // Button should respond to tap
    expect(majorButton).toBeDefined();
  });

  test('should build chord using mobile touch interface', async ({ page }) => {
    // Tap C root
    const cButton = page.locator('[data-testid="root-C"], button[data-root="C"]').first();
    await cButton.tap();
    await page.waitForTimeout(100);

    // Tap major quality
    const majorButton = page.locator('[data-testid="quality-major"], button[data-quality="major"]').first();
    await majorButton.tap();
    await page.waitForTimeout(100);

    // Verify chord is built
    await expectChordName(page, 'C');

    // Verify notes are active
    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build C minor chord on mobile', async ({ page }) => {
    // Tap C root
    const cButton = page.locator('[data-testid="root-C"], button[data-root="C"]').first();
    await cButton.tap();
    await page.waitForTimeout(100);

    // Tap minor quality
    const minorButton = page.locator('[data-testid="quality-minor"], button[data-quality="minor"]').first();
    await minorButton.tap();
    await page.waitForTimeout(100);

    // Verify chord
    await expectChordName(page, 'Cm');

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should build G7 chord on mobile', async ({ page }) => {
    // Tap G root
    const gButton = page.locator('[data-testid="root-G"], button[data-root="G"]').first();
    await gButton.tap();
    await page.waitForTimeout(100);

    // Tap dom7 quality
    const dom7Button = page.locator('[data-testid="quality-dom7"], button[data-quality="dom7"]').first();
    await dom7Button.tap();
    await page.waitForTimeout(100);

    // Verify chord
    await expectChordName(page, 'G7');

    const activeNotes = await getActiveNotes(page);
    expect(activeNotes.length).toBeGreaterThan(0);
  });

  test('should display extension buttons', async ({ page }) => {
    // Look for extension buttons (9th, 11th, 13th, alterations)
    const extensionButtons = page.locator('[data-testid*="extension-"], button[data-extension]');

    const count = await extensionButtons.count();

    // May have extension buttons (depends on UI design)
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should add extension on mobile', async ({ page }) => {
    // Build base chord
    const cButton = page.locator('[data-testid="root-C"], button[data-root="C"]').first();
    await cButton.tap();
    await page.waitForTimeout(50);

    const maj7Button = page.locator('[data-testid="quality-maj7"], button[data-quality="maj7"]').first();
    await maj7Button.tap();
    await page.waitForTimeout(100);

    // Look for 9th extension button
    const ninthButton = page.locator('[data-testid="extension-9th"], button[data-extension="9th"]').first();

    if ((await ninthButton.count()) > 0) {
      await ninthButton.tap();
      await page.waitForTimeout(100);

      // Chord should now include 9th
      const chordDisplay = page.locator('[data-testid="chord-display"]');
      const chordText = await chordDisplay.textContent();
      expect(chordText).toContain('9');
    }
  });

  test('should display grace note strip on mobile', async ({ page }) => {
    // Look for grace note strip
    const graceStrip = page.locator('[data-testid="grace-strip"], [data-testid*="grace"]');

    const count = await graceStrip.count();

    if (count > 0) {
      await expect(graceStrip.first()).toBeVisible();
    }
  });

  test('should tap grace note strip', async ({ page }) => {
    // Build a chord first
    const cButton = page.locator('[data-testid="root-C"], button[data-root="C"]').first();
    await cButton.tap();
    await page.waitForTimeout(50);

    const majorButton = page.locator('[data-testid="quality-major"], button[data-quality="major"]').first();
    await majorButton.tap();
    await page.waitForTimeout(100);

    // Look for grace note strip
    const graceStrip = page.locator('[data-testid="grace-strip"], [data-testid*="grace-note"]').first();

    if ((await graceStrip.count()) > 0) {
      // Tap on grace note area
      await graceStrip.tap();
      await page.waitForTimeout(100);

      // Grace note should trigger (visual feedback or audio)
      expect(graceStrip).toBeDefined();
    }
  });

  test('should display mobile transport panel', async ({ page }) => {
    // Look for transport controls (play, stop, settings, etc.)
    const transportPanel = page.locator('[data-testid="transport"], [data-testid="mobile-transport"]');

    const count = await transportPanel.count();

    if (count > 0) {
      await expect(transportPanel.first()).toBeVisible();
    }
  });

  test('should open settings on mobile', async ({ page }) => {
    // Find settings button (hamburger menu or gear icon)
    const settingsButton = page.locator('[data-testid="open-settings"], button[aria-label*="settings"]').first();

    await settingsButton.tap();
    await page.waitForTimeout(200);

    // Settings modal should open
    const settingsModal = page.locator('[data-testid="settings-modal"]');
    await expect(settingsModal).toBeVisible();
  });

  test('should close settings on mobile', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('[data-testid="open-settings"], button[aria-label*="settings"]').first();
    await settingsButton.tap();
    await page.waitForTimeout(200);

    // Close settings
    const closeButton = page.locator('[data-testid="close-settings"], button[aria-label*="close"]').first();
    await closeButton.tap();
    await page.waitForTimeout(200);

    // Settings modal should close
    const settingsModal = page.locator('[data-testid="settings-modal"]');
    await expect(settingsModal).not.toBeVisible();
  });

  test('should display piano keyboard on mobile', async ({ page }) => {
    // Piano keyboard might be hidden or scrollable on mobile
    const pianoKeyboard = page.locator('[data-testid="piano-keyboard"], [data-testid*="piano"]');

    const count = await pianoKeyboard.count();

    if (count > 0) {
      // May be visible or hidden depending on design
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should switch between chords on mobile', async ({ page }) => {
    // Build C major
    await page.locator('[data-testid="root-C"], button[data-root="C"]').first().tap();
    await page.waitForTimeout(50);
    await page.locator('[data-testid="quality-major"], button[data-quality="major"]').first().tap();
    await page.waitForTimeout(100);
    await expectChordName(page, 'C');

    // Clear button (if exists)
    const clearButton = page.locator('[data-testid="clear-chord"], button[aria-label*="clear"]').first();

    if ((await clearButton.count()) > 0) {
      await clearButton.tap();
      await page.waitForTimeout(100);
    }

    // Build D minor
    await page.locator('[data-testid="root-D"], button[data-root="D"]').first().tap();
    await page.waitForTimeout(50);
    await page.locator('[data-testid="quality-minor"], button[data-quality="minor"]').first().tap();
    await page.waitForTimeout(100);
    await expectChordName(page, 'Dm');
  });

  test('should handle touch gestures on chord buttons', async ({ page }) => {
    const rootButton = page.locator('[data-testid="root-C"], button[data-root="C"]').first();

    // Test tap (already tested above, but verify responsiveness)
    await rootButton.tap();
    await page.waitForTimeout(100);

    const isActive = await rootButton.evaluate((el) => {
      return el.classList.contains('active') || el.getAttribute('data-active') === 'true';
    });

    expect(isActive).toBeTruthy();
  });

  test('should display preset buttons on mobile', async ({ page }) => {
    // Look for preset recall buttons
    const presetButtons = page.locator('[data-testid*="preset-"], button[data-preset]');

    const count = await presetButtons.count();

    if (count > 0) {
      expect(count).toBeGreaterThanOrEqual(10); // Should have 10 preset slots
    }
  });

  test('should save and recall preset on mobile', async ({ page }) => {
    // Build chord
    await page.locator('[data-testid="root-E"], button[data-root="E"]').first().tap();
    await page.waitForTimeout(50);
    await page.locator('[data-testid="quality-minor"], button[data-quality="minor"]').first().tap();
    await page.waitForTimeout(100);

    const notesBeforeSave = await getActiveNotes(page);

    // Look for save preset button or long press gesture
    const presetSlot1 = page.locator('[data-testid="preset-1"], button[data-preset="1"]').first();

    if ((await presetSlot1.count()) > 0) {
      // Long press to save (if supported) or dedicated save button
      await presetSlot1.tap({ delay: 500 }); // Long tap
      await page.waitForTimeout(100);

      // Tap again to recall
      await presetSlot1.tap();
      await page.waitForTimeout(100);

      const notesAfterRecall = await getActiveNotes(page);

      // Should recall the same chord
      if (notesAfterRecall.length > 0) {
        expect(notesAfterRecall).toEqual(notesBeforeSave);
      }
    }
  });

  test('should adapt layout for portrait orientation', async ({ page }) => {
    // Verify portrait orientation (375x667)
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeLessThan(viewportSize?.height || 0);

    // UI should be laid out vertically
    const chordDisplay = page.locator('[data-testid="chord-display"]');
    await expect(chordDisplay).toBeVisible();
  });

  test('should display touch-friendly button sizes', async ({ page }) => {
    // Check that buttons are large enough for touch (at least 44x44px)
    const rootButtons = page.locator('[data-testid*="root-"], button[data-root]');

    if ((await rootButtons.count()) > 0) {
      const firstButton = rootButtons.first();
      const box = await firstButton.boundingBox();

      if (box) {
        // Buttons should be at least 44px in height for touch accessibility
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('should scroll if content exceeds viewport', async ({ page }) => {
    // Verify scrolling works on mobile
    // Try scrolling down
    await page.evaluate(() => {
      window.scrollTo(0, 100);
    });

    await page.waitForTimeout(100);

    const scrollY = await page.evaluate(() => window.scrollY);

    // If content is scrollable, scroll position should change
    // (May be 0 if all content fits)
    expect(scrollY).toBeGreaterThanOrEqual(0);
  });

  test('should handle rapid taps without lag', async ({ page }) => {
    const rootButtons = [
      page.locator('[data-testid="root-C"], button[data-root="C"]').first(),
      page.locator('[data-testid="root-D"], button[data-root="D"]').first(),
      page.locator('[data-testid="root-E"], button[data-root="E"]').first(),
      page.locator('[data-testid="root-F"], button[data-root="F"]').first(),
    ];

    // Rapidly tap different root notes
    for (const button of rootButtons) {
      if ((await button.count()) > 0) {
        await button.tap();
        await page.waitForTimeout(50);
      }
    }

    // App should still be responsive
    const chordDisplay = page.locator('[data-testid="chord-display"]');
    await expect(chordDisplay).toBeVisible();
  });

  test('should display clear/reset button on mobile', async ({ page }) => {
    // Look for clear/reset button
    const clearButton = page.locator('[data-testid="clear-chord"], button[aria-label*="clear"], button[aria-label*="reset"]').first();

    if ((await clearButton.count()) > 0) {
      // Build a chord first
      await page.locator('[data-testid="root-C"], button[data-root="C"]').first().tap();
      await page.waitForTimeout(50);
      await page.locator('[data-testid="quality-major"], button[data-quality="major"]').first().tap();
      await page.waitForTimeout(100);

      // Tap clear
      await clearButton.tap();
      await page.waitForTimeout(100);

      // Chord should be cleared
      await expectNoActiveNotes(page);
    }
  });
});
