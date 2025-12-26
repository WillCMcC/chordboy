import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  savePreset,
  recallPreset,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);

    // Wait for animations to settle
    await page.waitForTimeout(300);
  });

  test('should match initial app state screenshot', async ({ page }) => {
    // Capture full page
    await expect(page).toHaveScreenshot('initial-state.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });

  test('should match chord display with C major', async ({ page }) => {
    await playChord(page, 'C', 'major');
    await page.waitForTimeout(200);

    // Capture chord display area
    const chordDisplay = page.locator('[data-testid="chord-display"]');
    await expect(chordDisplay).toHaveScreenshot('chord-display-c-major.png');
  });

  test('should match chord display with Cmaj7', async ({ page }) => {
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    await expect(chordDisplay).toHaveScreenshot('chord-display-cmaj7.png');
  });

  test('should match chord display with G7#5#9', async ({ page }) => {
    await playChord(page, 'G', 'dom7', ['#5', '#9']);
    await page.waitForTimeout(200);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    await expect(chordDisplay).toHaveScreenshot('chord-display-g7-altered.png');
  });

  test('should match chord display with Dm9', async ({ page }) => {
    await playChord(page, 'D', 'min7', ['9th']);
    await page.waitForTimeout(200);

    const chordDisplay = page.locator('[data-testid="chord-display"]');
    await expect(chordDisplay).toHaveScreenshot('chord-display-dm9.png');
  });

  test('should match piano keyboard with no active notes', async ({ page }) => {
    const pianoKeyboard = page.locator('[data-testid="piano-keyboard"], [data-testid*="piano"]').first();

    if ((await pianoKeyboard.count()) > 0) {
      await expect(pianoKeyboard).toHaveScreenshot('piano-keyboard-empty.png');
    }
  });

  test('should match piano keyboard with C major highlighted', async ({ page }) => {
    await playChord(page, 'C', 'major');
    await page.waitForTimeout(200);

    const pianoKeyboard = page.locator('[data-testid="piano-keyboard"], [data-testid*="piano"]').first();

    if ((await pianoKeyboard.count()) > 0) {
      await expect(pianoKeyboard).toHaveScreenshot('piano-keyboard-c-major.png');
    }
  });

  test('should match piano keyboard with Fmaj7 highlighted', async ({ page }) => {
    await playChord(page, 'F', 'maj7');
    await page.waitForTimeout(200);

    const pianoKeyboard = page.locator('[data-testid="piano-keyboard"], [data-testid*="piano"]').first();

    if ((await pianoKeyboard.count()) > 0) {
      await expect(pianoKeyboard).toHaveScreenshot('piano-keyboard-fmaj7.png');
    }
  });

  test('should match preset panel with saved presets', async ({ page }) => {
    // Save 3 presets
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(100);
    await savePreset(page, 1);
    await page.waitForTimeout(100);

    await releaseAllKeys(page);
    await playChord(page, 'D', 'min7');
    await page.waitForTimeout(100);
    await savePreset(page, 2);
    await page.waitForTimeout(100);

    await releaseAllKeys(page);
    await playChord(page, 'G', 'dom7');
    await page.waitForTimeout(100);
    await savePreset(page, 3);
    await page.waitForTimeout(200);

    // Capture preset panel
    const presetPanel = page.locator('[data-testid="preset-panel"], [data-testid*="preset"]').first();

    if ((await presetPanel.count()) > 0) {
      await expect(presetPanel).toHaveScreenshot('preset-panel-with-presets.png');
    } else {
      // Capture full page if preset panel not isolated
      await expect(page).toHaveScreenshot('app-with-presets.png', {
        fullPage: false,
        animations: 'disabled',
      });
    }
  });

  test('should match settings modal', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('[data-testid="open-settings"]');
    await settingsButton.click();
    await page.waitForTimeout(300);

    // Capture settings modal
    const settingsModal = page.locator('[data-testid="settings-modal"]');
    await expect(settingsModal).toHaveScreenshot('settings-modal.png', {
      animations: 'disabled',
    });

    // Close settings for cleanup
    const closeButton = page.locator('[data-testid="close-settings"]');
    await closeButton.click();
  });

  test('should match settings modal - audio section', async ({ page }) => {
    const settingsButton = page.locator('[data-testid="open-settings"]');
    await settingsButton.click();
    await page.waitForTimeout(300);

    // Capture specific section if exists
    const audioSection = page.locator('[data-testid="settings-audio"], [data-section="audio"]').first();

    if ((await audioSection.count()) > 0) {
      await expect(audioSection).toHaveScreenshot('settings-audio-section.png');
    }

    const closeButton = page.locator('[data-testid="close-settings"]');
    await closeButton.click();
  });

  test('should match sequencer modal', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');

    if ((await sequencerButton.count()) > 0) {
      await sequencerButton.click();
      await page.waitForTimeout(300);

      // Capture sequencer modal
      const sequencerModal = page.locator('[data-testid="sequencer-modal"], [data-testid="sequencer"]');
      await expect(sequencerModal).toHaveScreenshot('sequencer-modal.png', {
        animations: 'disabled',
      });

      // Close sequencer
      const closeButton = page.locator('[data-testid="close-sequencer"], [data-testid="sequencer-close"]');
      if ((await closeButton.count()) > 0) {
        await closeButton.click();
      }
    }
  });

  test('should match sequencer during playback', async ({ page }) => {
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');

    if ((await sequencerButton.count()) > 0) {
      await sequencerButton.click();
      await page.waitForTimeout(300);

      // Start playback
      const playButton = page.locator('[data-testid="sequencer-play"], [data-testid="play-button"]').first();
      await playButton.click();
      await page.waitForTimeout(500);

      // Capture sequencer in playing state
      const sequencerModal = page.locator('[data-testid="sequencer-modal"], [data-testid="sequencer"]');
      await expect(sequencerModal).toHaveScreenshot('sequencer-playing.png', {
        animations: 'disabled',
      });

      // Stop and close
      const stopButton = page.locator('[data-testid="sequencer-stop"], [data-testid="stop-button"]').first();
      if ((await stopButton.count()) > 0) {
        await stopButton.click();
      }

      const closeButton = page.locator('[data-testid="close-sequencer"], [data-testid="sequencer-close"]');
      if ((await closeButton.count()) > 0) {
        await closeButton.click();
      }
    }
  });

  test('should match voicing indicator display', async ({ page }) => {
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);

    const voicingIndicator = page.locator('[data-testid="voicing-indicator"], [data-voicing-style]').first();

    if ((await voicingIndicator.count()) > 0) {
      await expect(voicingIndicator).toHaveScreenshot('voicing-indicator.png');
    }
  });

  test('should match full app with complex chord', async ({ page }) => {
    // Build a complex chord for visual testing
    await playChord(page, 'E', 'min7', ['9th', '11th']);
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('app-complex-chord.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });

  test('should match app after octave transpose', async ({ page }) => {
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(100);

    // Transpose up
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('app-octave-transposed.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });

  test('should match different chord progression states', async ({ page }) => {
    const chords = [
      { root: 'C', quality: 'maj7' as const, name: 'cmaj7' },
      { root: 'D', quality: 'min7' as const, name: 'dm7' },
      { root: 'G', quality: 'dom7' as const, name: 'g7' },
    ];

    for (const chord of chords) {
      await releaseAllKeys(page);
      await page.waitForTimeout(100);

      await playChord(page, chord.root, chord.quality);
      await page.waitForTimeout(200);

      await expect(page).toHaveScreenshot(`app-chord-${chord.name}.png`, {
        fullPage: false,
        animations: 'disabled',
      });
    }
  });
});

test.describe('Visual Regression - Mobile Layout', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });

  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
    await page.waitForTimeout(300);
  });

  test('should match mobile initial state', async ({ page }) => {
    await expect(page).toHaveScreenshot('mobile-initial-state.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });

  test('should match mobile chord display with C major', async ({ page }) => {
    // Tap C root
    const cButton = page.locator('[data-testid="root-C"], button[data-root="C"]').first();
    if ((await cButton.count()) > 0) {
      await cButton.tap();
      await page.waitForTimeout(50);

      // Tap major quality
      const majorButton = page.locator('[data-testid="quality-major"], button[data-quality="major"]').first();
      await majorButton.tap();
      await page.waitForTimeout(200);

      await expect(page).toHaveScreenshot('mobile-c-major.png', {
        fullPage: false,
        animations: 'disabled',
      });
    }
  });

  test('should match mobile settings modal', async ({ page }) => {
    const settingsButton = page.locator('[data-testid="open-settings"], button[aria-label*="settings"]').first();
    await settingsButton.tap();
    await page.waitForTimeout(300);

    const settingsModal = page.locator('[data-testid="settings-modal"]');
    await expect(settingsModal).toHaveScreenshot('mobile-settings-modal.png', {
      animations: 'disabled',
    });

    const closeButton = page.locator('[data-testid="close-settings"]');
    await closeButton.tap();
  });

  test('should match mobile with virtual keyboard visible', async ({ page }) => {
    // Check if virtual keyboard buttons are visible
    const rootButtons = page.locator('[data-testid*="root-"], button[data-root]');

    if ((await rootButtons.count()) > 0) {
      await expect(page).toHaveScreenshot('mobile-virtual-keyboard.png', {
        fullPage: false,
        animations: 'disabled',
      });
    }
  });

  test('should match mobile grace note strip', async ({ page }) => {
    // Build a chord first
    const cButton = page.locator('[data-testid="root-C"], button[data-root="C"]').first();
    if ((await cButton.count()) > 0) {
      await cButton.tap();
      await page.waitForTimeout(50);

      const majorButton = page.locator('[data-testid="quality-major"], button[data-quality="major"]').first();
      await majorButton.tap();
      await page.waitForTimeout(200);

      const graceStrip = page.locator('[data-testid="grace-strip"], [data-testid*="grace"]').first();

      if ((await graceStrip.count()) > 0) {
        await expect(graceStrip).toHaveScreenshot('mobile-grace-strip.png');
      }
    }
  });

  test('should match mobile transport controls', async ({ page }) => {
    const transportPanel = page.locator('[data-testid="transport"], [data-testid="mobile-transport"]').first();

    if ((await transportPanel.count()) > 0) {
      await expect(transportPanel).toHaveScreenshot('mobile-transport-controls.png');
    }
  });

  test('should match mobile preset panel', async ({ page }) => {
    const presetPanel = page.locator('[data-testid="preset-panel"], [data-testid*="preset"]').first();

    if ((await presetPanel.count()) > 0) {
      await expect(presetPanel).toHaveScreenshot('mobile-preset-panel.png');
    }
  });
});

test.describe('Visual Regression - Tablet Layout', () => {
  test.use({
    viewport: { width: 1024, height: 768 },
    isMobile: true,
    hasTouch: true,
  });

  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
    await page.waitForTimeout(300);
  });

  test('should match tablet initial state', async ({ page }) => {
    await expect(page).toHaveScreenshot('tablet-initial-state.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });

  test('should match tablet with chord displayed', async ({ page }) => {
    await playChord(page, 'F', 'maj7', ['9th']);
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('tablet-fmaj9.png', {
      fullPage: false,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Theme/Style Variations', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
    await page.waitForTimeout(300);
  });

  test('should match dark mode (if available)', async ({ page }) => {
    // Try to enable dark mode
    const settingsButton = page.locator('[data-testid="open-settings"]');
    await settingsButton.click();
    await page.waitForTimeout(200);

    const darkModeToggle = page.locator('[data-testid="dark-mode"], input[type="checkbox"][name*="dark"]').first();

    if ((await darkModeToggle.count()) > 0) {
      await darkModeToggle.check();
      await page.waitForTimeout(200);

      const closeButton = page.locator('[data-testid="close-settings"]');
      await closeButton.click();
      await page.waitForTimeout(200);

      await expect(page).toHaveScreenshot('app-dark-mode.png', {
        fullPage: false,
        animations: 'disabled',
      });
    }
  });

  test('should match high contrast mode (if available)', async ({ page }) => {
    // Try to enable high contrast
    const settingsButton = page.locator('[data-testid="open-settings"]');
    await settingsButton.click();
    await page.waitForTimeout(200);

    const highContrastToggle = page.locator('[data-testid="high-contrast"], input[name*="contrast"]').first();

    if ((await highContrastToggle.count()) > 0) {
      await highContrastToggle.check();
      await page.waitForTimeout(200);

      const closeButton = page.locator('[data-testid="close-settings"]');
      await closeButton.click();
      await page.waitForTimeout(200);

      await expect(page).toHaveScreenshot('app-high-contrast.png', {
        fullPage: false,
        animations: 'disabled',
      });
    }
  });
});
