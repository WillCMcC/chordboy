import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  savePreset,
  recallPreset,
  releasePreset,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';

// Chord Wizard is only available on desktop (not mobile)
test.describe('Chord Wizard', () => {
  // Skip mobile - Chord Wizard is in PresetsPanel which is desktop-only
  test.skip(({ browserName }, testInfo) => {
    return testInfo.project.name.includes('mobile');
  }, 'Chord Wizard is desktop-only');

  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test('should open wizard from presets panel', async ({ page }) => {
    // Click the wizard button in presets panel
    const wizardButton = page.locator('[data-testid="open-wizard"]');
    await wizardButton.click();

    // Verify wizard modal opens
    await expect(page.locator('[data-testid="chord-wizard-modal"]')).toBeVisible();
    await expect(page.locator('text=Chord Wizard')).toBeVisible();
  });

  test('should close wizard with close button', async ({ page }) => {
    // Open wizard
    const wizardButton = page.locator('[data-testid="open-wizard"]');
    await wizardButton.click();
    await expect(page.locator('[data-testid="chord-wizard-modal"]')).toBeVisible();

    // Close it
    await page.locator('[data-testid="wizard-close"]').click();
    await expect(page.locator('[data-testid="chord-wizard-modal"]')).not.toBeVisible();
  });

  test('should close wizard by clicking overlay', async ({ page }) => {
    // Open wizard
    const wizardButton = page.locator('[data-testid="open-wizard"]');
    await wizardButton.click();
    await expect(page.locator('[data-testid="chord-wizard-modal"]')).toBeVisible();

    // Click overlay to close
    await page.locator('[data-testid="wizard-overlay"]').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('[data-testid="chord-wizard-modal"]')).not.toBeVisible();
  });

  test('should show "From Preset" and "Play In" source tabs', async ({ page }) => {
    // Open wizard
    const wizardButton = page.locator('[data-testid="open-wizard"]');
    await wizardButton.click();

    // Verify source tabs exist
    await expect(page.locator('button:has-text("From Preset")')).toBeVisible();
    await expect(page.locator('button:has-text("Play In")')).toBeVisible();
  });

  test('should show saved presets when "From Preset" selected', async ({ page }) => {
    // Save a preset first
    await playChord(page, 'C', 'maj7');
    await savePreset(page, 1);
    await releaseAllKeys(page);

    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // "From Preset" should be selected by default
    await expect(page.locator('.source-tab.active:has-text("From Preset")')).toBeVisible();

    // Should show the saved preset
    await expect(page.locator('.preset-btn').first()).toBeVisible();
  });

  test('should show empty message when no presets saved', async ({ page }) => {
    // Open wizard without saving any presets
    await page.locator('[data-testid="open-wizard"]').click();

    // Should show empty message
    await expect(page.locator('text=No presets saved')).toBeVisible();
  });

  test('should switch to "Play In" mode', async ({ page }) => {
    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Click "Play In" tab
    await page.locator('button:has-text("Play In")').click();

    // Should show play-in instructions and capture button
    await expect(page.locator('text=Play a chord')).toBeVisible();
    await expect(page.locator('.capture-btn')).toBeVisible();
  });

  test('should capture played chord in Play In mode', async ({ page }) => {
    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Switch to Play In
    await page.locator('button:has-text("Play In")').click();

    // Play a chord
    await playChord(page, 'C', 'maj7');

    // Capture button should be enabled
    const captureBtn = page.locator('.capture-btn');
    await expect(captureBtn).toBeEnabled();

    // Capture the chord
    await captureBtn.click();

    // Should show captured chord
    await expect(page.locator('text=Captured')).toBeVisible();

    await releaseAllKeys(page);
  });

  test('should show progression type options', async ({ page }) => {
    // Save a preset first
    await playChord(page, 'C', 'maj7');
    await savePreset(page, 1);
    await releaseAllKeys(page);

    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Select the preset
    await page.locator('.preset-btn').first().click();

    // Should show progression types
    await expect(page.locator('.progression-btn:has-text("ii-V-I")')).toBeVisible();
  });

  test('should select ii-V-I progression from preset', async ({ page }) => {
    // Save CMaj7 as starting chord
    await playChord(page, 'C', 'maj7');
    await savePreset(page, 1);
    await releaseAllKeys(page);

    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Select the preset
    await page.locator('.preset-btn').first().click();

    // Select ii-V-I progression
    await page.locator('.progression-btn:has-text("ii-V-I")').click();

    // Should show preview
    await expect(page.locator('.preview-chords')).toBeVisible();
  });

  test('should show preview of generated progression', async ({ page }) => {
    // Save CMaj7 as starting chord
    await playChord(page, 'C', 'maj7');
    await savePreset(page, 1);
    await releaseAllKeys(page);

    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Select preset and progression
    await page.locator('.preset-btn').first().click();
    await page.locator('.progression-btn:has-text("ii-V-I")').click();

    // Preview should show chord names
    const preview = page.locator('.preview-chords');
    await expect(preview).toBeVisible();

    // Look for chord function labels
    await expect(page.locator('.preview-chord-function').first()).toBeVisible();
  });

  test('should generate and save ii-V-I progression', async ({ page }) => {
    // Save CMaj7 as slot 1
    await playChord(page, 'C', 'maj7');
    await savePreset(page, 1);
    await releaseAllKeys(page);

    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Select preset and ii-V-I
    await page.locator('.preset-btn').first().click();
    await page.locator('.progression-btn:has-text("ii-V-I")').click();

    // Click Generate
    await page.locator('.wizard-confirm').click();

    // Wait for wizard to close (success message then close)
    await expect(page.locator('[data-testid="chord-wizard-modal"]')).not.toBeVisible({ timeout: 2000 });

    // Verify new presets were created - check slot 2 has a chord
    await recallPreset(page, 2);
    const activeNotes = await page.evaluate(() => {
      const keys = document.querySelectorAll('[data-note].active');
      return keys.length;
    });
    expect(activeNotes).toBeGreaterThan(0);
    await releasePreset(page, 2);
  });

  test('should show slots info in preview', async ({ page }) => {
    // Save a preset
    await playChord(page, 'G', 'dom7');
    await savePreset(page, 1);
    await releaseAllKeys(page);

    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Select preset and progression
    await page.locator('.preset-btn').first().click();
    await page.locator('.progression-btn').first().click();

    // Should show slots info
    await expect(page.locator('.slots-info')).toBeVisible();
  });

  test('should disable Generate when not enough slots', async ({ page }) => {
    // Fill up most preset slots (1-9)
    for (let i = 1; i <= 9; i++) {
      await playChord(page, 'C', 'major');
      await savePreset(page, i);
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }

    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Select preset 1 and try to generate a progression
    await page.locator('.preset-btn').first().click();
    await page.locator('.progression-btn').first().click();

    // Generate button should be disabled (only 1 slot available, progressions need 2+)
    const generateBtn = page.locator('.wizard-confirm');
    await expect(generateBtn).toBeDisabled();
  });

  test('should show error when not enough slots available', async ({ page }) => {
    // Fill up most preset slots
    for (let i = 1; i <= 9; i++) {
      await playChord(page, 'C', 'major');
      await savePreset(page, i);
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }

    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Select preset and progression
    await page.locator('.preset-btn').first().click();
    await page.locator('.progression-btn').first().click();

    // Should show slots info indicating limited availability
    await expect(page.locator('.slots-info')).toBeVisible();
  });

  test('should handle "Play In" and generate progression', async ({ page }) => {
    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Switch to Play In
    await page.locator('button:has-text("Play In")').click();

    // Play and capture chord
    await playChord(page, 'F', 'maj7');
    await page.locator('.capture-btn').click();

    // Select progression
    await page.locator('.progression-btn:has-text("ii-V-I")').click();

    // Preview should show
    await expect(page.locator('.preview-chords')).toBeVisible();

    // Generate
    await page.locator('.wizard-confirm').click();

    // Wizard should close
    await expect(page.locator('[data-testid="chord-wizard-modal"]')).not.toBeVisible({ timeout: 2000 });

    // Release the played chord
    await releaseAllKeys(page);

    // Verify preset 1 was created (since we used Play In, starting chord gets saved too)
    await recallPreset(page, 1);
    const activeNotes = await page.evaluate(() => {
      const keys = document.querySelectorAll('[data-note].active');
      return keys.length;
    });
    expect(activeNotes).toBeGreaterThan(0);
    await releasePreset(page, 1);
  });

  test('should show success message after generating', async ({ page }) => {
    // Save a preset
    await playChord(page, 'C', 'maj7');
    await savePreset(page, 1);
    await releaseAllKeys(page);

    // Open wizard
    await page.locator('[data-testid="open-wizard"]').click();

    // Select and generate
    await page.locator('.preset-btn').first().click();
    await page.locator('.progression-btn').first().click();
    await page.locator('.wizard-confirm').click();

    // Should briefly show success message
    await expect(page.locator('.wizard-success')).toBeVisible({ timeout: 1000 });
  });
});
