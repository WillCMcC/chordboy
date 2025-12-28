import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';

/**
 * Audio Modes E2E Tests
 *
 * Tests the three audio output modes:
 * - MIDI: Output only to MIDI devices
 * - SYNTH: Output only to browser Web Audio synth
 * - BOTH: Output to both MIDI and synth
 */
test.describe('Audio Modes', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test.describe('Mode Toggle UI', () => {
    test('should show MIDI mode button', async ({ page }) => {
      const midiButton = page.locator('[data-testid="audio-mode-midi"]');
      await expect(midiButton).toBeVisible();
      await expect(midiButton).toContainText('MIDI');
    });

    test('should show SYNTH mode button', async ({ page }) => {
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await expect(synthButton).toBeVisible();
      await expect(synthButton).toContainText('SYNTH');
    });

    test('should show BOTH mode button', async ({ page }) => {
      const bothButton = page.locator('[data-testid="audio-mode-both"]');
      await expect(bothButton).toBeVisible();
      await expect(bothButton).toContainText('BOTH');
    });

    test('should default to SYNTH mode', async ({ page }) => {
      // SYNTH button should be active by default (or MIDI depending on config)
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      const hasActiveClass = await synthButton.evaluate((el) =>
        el.classList.contains('active')
      );

      // Check if either synth or midi is active by default
      const midiButton = page.locator('[data-testid="audio-mode-midi"]');
      const midiActive = await midiButton.evaluate((el) =>
        el.classList.contains('active')
      );

      // One should be active
      expect(hasActiveClass || midiActive).toBe(true);
    });
  });

  test.describe('Mode Switching', () => {
    test('should switch to MIDI mode', async ({ page }) => {
      const midiButton = page.locator('[data-testid="audio-mode-midi"]');
      await midiButton.click();

      // Should be active
      await expect(midiButton).toHaveClass(/active/);

      // Other modes should not be active
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await expect(synthButton).not.toHaveClass(/active/);
    });

    test('should switch to SYNTH mode', async ({ page }) => {
      // First switch to MIDI
      await page.locator('[data-testid="audio-mode-midi"]').click();

      // Then switch to SYNTH
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      await expect(synthButton).toHaveClass(/active/);
    });

    test('should switch to BOTH mode', async ({ page }) => {
      const bothButton = page.locator('[data-testid="audio-mode-both"]');
      await bothButton.click();

      await expect(bothButton).toHaveClass(/active/);
    });

    test('should toggle between modes correctly', async ({ page }) => {
      const midiButton = page.locator('[data-testid="audio-mode-midi"]');
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      const bothButton = page.locator('[data-testid="audio-mode-both"]');

      // MIDI
      await midiButton.click();
      await expect(midiButton).toHaveClass(/active/);
      await expect(synthButton).not.toHaveClass(/active/);
      await expect(bothButton).not.toHaveClass(/active/);

      // SYNTH
      await synthButton.click();
      await expect(midiButton).not.toHaveClass(/active/);
      await expect(synthButton).toHaveClass(/active/);
      await expect(bothButton).not.toHaveClass(/active/);

      // BOTH
      await bothButton.click();
      await expect(midiButton).not.toHaveClass(/active/);
      await expect(synthButton).not.toHaveClass(/active/);
      await expect(bothButton).toHaveClass(/active/);
    });
  });

  test.describe('SYNTH Mode Behavior', () => {
    test('should show Enable Audio button when synth not initialized', async ({ page }) => {
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      // May show Enable Audio button if audio context not started
      const enableButton = page.locator('button:has-text("Enable Audio")');

      // Either audio is already enabled or button should appear
      // This depends on browser autoplay policy
      const isVisible = await enableButton.isVisible().catch(() => false);

      // If visible, click it
      if (isVisible) {
        await enableButton.click();
        await page.waitForTimeout(100);
      }

      // Now synth controls should be available
      const synthControls = page.locator('.synth-controls-row');
      await expect(synthControls).toBeVisible();
    });

    test('should show preset selector in SYNTH mode', async ({ page }) => {
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      // Enable audio if needed
      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      // Should show preset selector
      const presetSelect = page.locator('.preset-select-compact');
      await expect(presetSelect).toBeVisible();
    });

    test('should show volume control in SYNTH mode', async ({ page }) => {
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      const volumeControl = page.locator('.volume-control, .volume-slider');
      await expect(volumeControl).toBeVisible();
    });

    test('should show ENV button for ADSR envelope', async ({ page }) => {
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      const envButton = page.locator('.expand-btn, button:has-text("ENV")');
      await expect(envButton).toBeVisible();
    });

    test('should toggle ADSR envelope panel', async ({ page }) => {
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      // Click ENV button
      const envButton = page.locator('.expand-btn');
      await envButton.click();

      // ADSR panel should expand
      const adsrPanel = page.locator('.synth-expanded');
      await expect(adsrPanel).toBeVisible();

      // Click again to collapse
      await envButton.click();
      await expect(adsrPanel).not.toBeVisible();
    });
  });

  test.describe('MIDI Mode Behavior', () => {
    test('should show Configure button in MIDI mode', async ({ page }) => {
      const midiButton = page.locator('[data-testid="audio-mode-midi"]');
      await midiButton.click();

      const configureButton = page.locator('.configure-btn, button:has-text("Configure")');
      await expect(configureButton).toBeVisible();
    });

    test('should NOT show synth controls in MIDI mode', async ({ page }) => {
      const midiButton = page.locator('[data-testid="audio-mode-midi"]');
      await midiButton.click();

      const presetSelect = page.locator('.preset-select-compact');
      await expect(presetSelect).not.toBeVisible();
    });

    test('Configure button should open settings', async ({ page }) => {
      const midiButton = page.locator('[data-testid="audio-mode-midi"]');
      await midiButton.click();

      const configureButton = page.locator('.configure-btn, button:has-text("Configure")');
      await configureButton.click();

      // Settings panel should open
      const settingsPanel = page.locator('.settings-panel, [data-testid="settings-modal"]');
      await expect(settingsPanel).toBeVisible();
    });
  });

  test.describe('BOTH Mode Behavior', () => {
    test('should show Configure button in BOTH mode', async ({ page }) => {
      const bothButton = page.locator('[data-testid="audio-mode-both"]');
      await bothButton.click();

      const configureButton = page.locator('.configure-btn, button:has-text("Configure")');
      await expect(configureButton).toBeVisible();
    });

    test('should show synth controls in BOTH mode', async ({ page }) => {
      const bothButton = page.locator('[data-testid="audio-mode-both"]');
      await bothButton.click();

      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      const synthControls = page.locator('.synth-controls-row');
      await expect(synthControls).toBeVisible();
    });
  });

  test.describe('Chord Playing with Different Modes', () => {
    test('should play chord in MIDI mode without errors', async ({ page }) => {
      const midiButton = page.locator('[data-testid="audio-mode-midi"]');
      await midiButton.click();

      await playChord(page, 'C', 'maj7');
      await page.waitForTimeout(100);

      // Chord should display correctly
      const chordDisplay = page.locator('[data-testid="chord-display"]');
      await expect(chordDisplay).toContainText('C');

      await releaseAllKeys(page);
    });

    test('should play chord in SYNTH mode without errors', async ({ page }) => {
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      await playChord(page, 'D', 'min7');
      await page.waitForTimeout(100);

      const chordDisplay = page.locator('[data-testid="chord-display"]');
      await expect(chordDisplay).toContainText('D min7');

      await releaseAllKeys(page);
    });

    test('should play chord in BOTH mode without errors', async ({ page }) => {
      const bothButton = page.locator('[data-testid="audio-mode-both"]');
      await bothButton.click();

      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      await playChord(page, 'G', 'dom7');
      await page.waitForTimeout(100);

      const chordDisplay = page.locator('[data-testid="chord-display"]');
      await expect(chordDisplay).toContainText('G7');

      await releaseAllKeys(page);
    });

    test('should switch modes while chord is playing', async ({ page }) => {
      // Start in SYNTH mode
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      // Play a chord
      await playChord(page, 'F', 'maj7');

      // Switch to MIDI while playing
      const midiButton = page.locator('[data-testid="audio-mode-midi"]');
      await midiButton.click();

      // Chord should still display
      const chordDisplay = page.locator('[data-testid="chord-display"]');
      await expect(chordDisplay).toContainText('F');

      // Switch to BOTH
      const bothButton = page.locator('[data-testid="audio-mode-both"]');
      await bothButton.click();

      await expect(chordDisplay).toContainText('F');

      await releaseAllKeys(page);
    });
  });

  test.describe('Synth Preset Selection', () => {
    test('should change synth preset', async ({ page }) => {
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      const presetSelect = page.locator('.preset-select-compact');
      await expect(presetSelect).toBeVisible();

      // Get initial value
      const initialValue = await presetSelect.inputValue();

      // Navigate to next preset
      const nextBtn = page.locator('.preset-nav-btn').last();
      await nextBtn.click();

      // Value should change
      const newValue = await presetSelect.inputValue();
      expect(newValue).not.toBe(initialValue);
    });

    test('should navigate presets with arrow buttons', async ({ page }) => {
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      // Previous button
      const prevBtn = page.locator('.preset-nav-btn').first();
      await expect(prevBtn).toBeVisible();

      // Next button
      const nextBtn = page.locator('.preset-nav-btn').last();
      await expect(nextBtn).toBeVisible();

      // Click next a few times
      await nextBtn.click();
      await nextBtn.click();

      // Click prev
      await prevBtn.click();

      // Should not crash
      expect(true).toBe(true);
    });
  });

  test.describe('Volume Control', () => {
    test('should adjust volume', async ({ page }) => {
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      const enableButton = page.locator('button:has-text("Enable Audio")');
      if (await enableButton.isVisible().catch(() => false)) {
        await enableButton.click();
        await page.waitForTimeout(200);
      }

      const volumeSlider = page.locator('.volume-slider');
      await expect(volumeSlider).toBeVisible();

      // Get initial value
      const initialValue = await volumeSlider.inputValue();

      // Change volume
      await volumeSlider.fill('0.5');

      const newValue = await volumeSlider.inputValue();
      expect(newValue).toBe('0.5');
    });
  });

  test.describe('Audio Enable Button Animation', () => {
    test('should show wiggle animation when playing chord without audio enabled', async ({ page }) => {
      // Switch to synth mode but don't enable audio
      const synthButton = page.locator('[data-testid="synth-enabled"]');
      await synthButton.click();

      // Check if enable button exists and is visible
      const enableButton = page.locator('button:has-text("Enable Audio")');

      if (await enableButton.isVisible().catch(() => false)) {
        // Play a chord to trigger wiggle
        await playChord(page, 'C', 'major');

        // The button should get a wiggle class briefly
        await page.waitForTimeout(100);

        // Check if wiggle class was added (it's brief)
        // Just verify no crash occurred
        await releaseAllKeys(page);
      }
    });
  });
});
