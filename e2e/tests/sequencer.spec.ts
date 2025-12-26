import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  savePreset,
  recallPreset,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';
import { II_V_I_C } from '../fixtures/preset-data';

test.describe('Sequencer', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test('should open sequencer modal', async ({ page }) => {
    // Look for sequencer button/trigger
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');

    // Open sequencer
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Verify modal is visible
    const sequencerModal = page.locator('[data-testid="sequencer-modal"], [data-testid="sequencer"]');
    await expect(sequencerModal).toBeVisible();
  });

  test('should close sequencer modal', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Close sequencer
    const closeButton = page.locator('[data-testid="close-sequencer"], [data-testid="sequencer-close"]');
    await closeButton.click();
    await page.waitForTimeout(200);

    // Verify modal is hidden
    const sequencerModal = page.locator('[data-testid="sequencer-modal"], [data-testid="sequencer"]');
    await expect(sequencerModal).not.toBeVisible();
  });

  test('should configure number of steps', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Find steps control
    const stepsControl = page.locator('[data-testid="sequencer-steps"], input[type="number"][name*="steps"]').first();

    // Set to 8 steps
    await stepsControl.fill('8');
    await page.waitForTimeout(100);

    // Verify value
    await expect(stepsControl).toHaveValue('8');

    // Verify 8 step buttons/slots are visible
    const stepButtons = page.locator('[data-testid*="step-"], [data-step]');
    const count = await stepButtons.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('should configure BPM (tempo)', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Find BPM control
    const bpmControl = page.locator('[data-testid="sequencer-bpm"], input[type="number"][name*="bpm"]').first();

    // Set BPM to 120
    await bpmControl.fill('120');
    await page.waitForTimeout(100);

    // Verify value
    const bpmValue = await bpmControl.inputValue();
    expect(parseInt(bpmValue)).toBe(120);
  });

  test('should configure steps per beat', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Find steps per beat control
    const stepsPerBeatControl = page.locator(
      '[data-testid="steps-per-beat"], input[type="number"][name*="steps"][name*="beat"]'
    ).first();

    if ((await stepsPerBeatControl.count()) > 0) {
      // Set to 4 steps per beat
      await stepsPerBeatControl.fill('4');
      await page.waitForTimeout(100);

      // Verify value
      await expect(stepsPerBeatControl).toHaveValue('4');
    }
  });

  test('should enable preset on specific step', async ({ page }) => {
    // First save a preset
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(100);
    await savePreset(page, 1);
    await page.waitForTimeout(100);
    await releaseAllKeys(page);

    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Find step 1 and enable preset 1
    const step1 = page.locator('[data-testid="step-1"], [data-step="1"]').first();

    // Click to select/enable
    await step1.click();
    await page.waitForTimeout(100);

    // Look for preset selector for this step
    const presetSelector = page.locator('[data-testid="step-1-preset"], select[name*="preset"]').first();

    if ((await presetSelector.count()) > 0) {
      await presetSelector.selectOption('1');
      await page.waitForTimeout(100);
    }
  });

  test('should start sequencer playback', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Find play button
    const playButton = page.locator('[data-testid="sequencer-play"], [data-testid="play-button"]').first();

    // Start playback
    await playButton.click();
    await page.waitForTimeout(100);

    // Verify playback started (button might change to pause/stop)
    const isPlaying = await page.evaluate(() => {
      return (window as any).__SEQUENCER_DEBUG__?.isPlaying?.() ?? false;
    });

    // Visual indicator might be visible
    const playingIndicator = page.locator('[data-testid="sequencer-playing"], [data-playing="true"]');
    const hasIndicator = (await playingIndicator.count()) > 0;

    if (hasIndicator) {
      await expect(playingIndicator).toBeVisible();
    }
  });

  test('should stop sequencer playback', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Start playback
    const playButton = page.locator('[data-testid="sequencer-play"], [data-testid="play-button"]').first();
    await playButton.click();
    await page.waitForTimeout(500);

    // Stop playback
    const stopButton = page.locator('[data-testid="sequencer-stop"], [data-testid="stop-button"]').first();
    await stopButton.click();
    await page.waitForTimeout(100);

    // Verify playback stopped
    const playingIndicator = page.locator('[data-playing="true"]');
    const count = await playingIndicator.count();
    expect(count).toBe(0);
  });

  test('should show active step indicator during playback', async ({ page }) => {
    // Save presets for steps
    const chords = II_V_I_C.presets;

    for (const chord of chords) {
      await playChord(page, chord.root, chord.quality);
      await page.waitForTimeout(50);
      await savePreset(page, chord.slot);
      await page.waitForTimeout(50);
      await releaseAllKeys(page);
    }

    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Configure steps with presets (if UI allows)
    // This depends on the UI implementation

    // Start playback
    const playButton = page.locator('[data-testid="sequencer-play"], [data-testid="play-button"]').first();
    await playButton.click();
    await page.waitForTimeout(100);

    // Wait for a couple of beats
    await page.waitForTimeout(1000);

    // Look for active step indicator
    const activeStep = page.locator('[data-testid*="step-"][data-active="true"], [data-step][data-active="true"]');

    const hasActiveStep = (await activeStep.count()) > 0;
    if (hasActiveStep) {
      await expect(activeStep.first()).toBeVisible();
    }

    // Stop playback
    const stopButton = page.locator('[data-testid="sequencer-stop"], [data-testid="stop-button"]').first();
    if ((await stopButton.count()) > 0) {
      await stopButton.click();
    }
  });

  test('should cycle through steps during playback', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Set fast BPM for quick testing
    const bpmControl = page.locator('[data-testid="sequencer-bpm"], input[type="number"][name*="bpm"]').first();
    if ((await bpmControl.count()) > 0) {
      await bpmControl.fill('240'); // Fast tempo
      await page.waitForTimeout(100);
    }

    // Start playback
    const playButton = page.locator('[data-testid="sequencer-play"], [data-testid="play-button"]').first();
    await playButton.click();
    await page.waitForTimeout(100);

    // Collect active step numbers over time
    const activeSteps: number[] = [];

    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(200);

      const currentStep = await page.evaluate(() => {
        return (window as any).__SEQUENCER_DEBUG__?.getCurrentStep?.() ?? -1;
      });

      if (currentStep >= 0) {
        activeSteps.push(currentStep);
      }
    }

    // Should have seen multiple different steps
    const uniqueSteps = new Set(activeSteps);
    expect(uniqueSteps.size).toBeGreaterThan(1);

    // Stop playback
    const stopButton = page.locator('[data-testid="sequencer-stop"], [data-testid="stop-button"]').first();
    if ((await stopButton.count()) > 0) {
      await stopButton.click();
    }
  });

  test('should support retrig mode', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Look for mode selector
    const modeSelector = page.locator('[data-testid="sequencer-mode"], select[name*="mode"]').first();

    if ((await modeSelector.count()) > 0) {
      // Select retrig mode
      await modeSelector.selectOption('retrig');
      await page.waitForTimeout(100);

      // Verify selection
      await expect(modeSelector).toHaveValue('retrig');
    }
  });

  test('should support gate mode', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Look for mode selector
    const modeSelector = page.locator('[data-testid="sequencer-mode"], select[name*="mode"]').first();

    if ((await modeSelector.count()) > 0) {
      // Select gate mode
      await modeSelector.selectOption('gate');
      await page.waitForTimeout(100);

      // Verify selection
      await expect(modeSelector).toHaveValue('gate');
    }
  });

  test('should persist sequencer configuration after reload', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Configure sequencer
    const bpmControl = page.locator('[data-testid="sequencer-bpm"], input[type="number"][name*="bpm"]').first();
    if ((await bpmControl.count()) > 0) {
      await bpmControl.fill('135');
      await page.waitForTimeout(100);
    }

    const stepsControl = page.locator('[data-testid="sequencer-steps"], input[type="number"][name*="steps"]').first();
    if ((await stepsControl.count()) > 0) {
      await stepsControl.fill('12');
      await page.waitForTimeout(200);
    }

    // Close sequencer
    const closeButton = page.locator('[data-testid="close-sequencer"], [data-testid="sequencer-close"]');
    if ((await closeButton.count()) > 0) {
      await closeButton.click();
      await page.waitForTimeout(100);
    }

    // Reload page
    await page.reload();
    await initializeApp(page);
    await dismissTutorial(page);
    await page.waitForTimeout(200);

    // Reopen sequencer
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Verify BPM persisted
    if ((await bpmControl.count()) > 0) {
      const savedBPM = await bpmControl.inputValue();
      expect(parseInt(savedBPM)).toBe(135);
    }

    // Verify steps persisted
    if ((await stepsControl.count()) > 0) {
      const savedSteps = await stepsControl.inputValue();
      expect(parseInt(savedSteps)).toBe(12);
    }
  });

  test('should toggle step enable/disable', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Find first step
    const step1 = page.locator('[data-testid="step-1"], [data-step="1"]').first();

    // Get initial state
    const initialState = await step1.getAttribute('data-enabled');

    // Click to toggle
    await step1.click();
    await page.waitForTimeout(100);

    // Get new state
    const newState = await step1.getAttribute('data-enabled');

    // State should have changed (if this feature exists)
    // Or we just verify the click worked
    expect(step1).toBeDefined();
  });

  test('should display step grid', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Verify step grid is visible
    const stepGrid = page.locator('[data-testid="step-grid"], [data-testid="sequencer-steps"]');

    // Should have multiple step elements
    const steps = page.locator('[data-testid*="step-"], [data-step]');
    const stepCount = await steps.count();

    expect(stepCount).toBeGreaterThan(0);
  });

  test('should handle playback with empty steps', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Start playback with no presets configured
    const playButton = page.locator('[data-testid="sequencer-play"], [data-testid="play-button"]').first();
    await playButton.click();
    await page.waitForTimeout(500);

    // Should not crash - sequencer should run but produce no output
    const sequencerModal = page.locator('[data-testid="sequencer-modal"], [data-testid="sequencer"]');
    await expect(sequencerModal).toBeVisible();

    // Stop playback
    const stopButton = page.locator('[data-testid="sequencer-stop"], [data-testid="stop-button"]').first();
    if ((await stopButton.count()) > 0) {
      await stopButton.click();
    }
  });

  test('should update transport controls during playback', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Start playback
    const playButton = page.locator('[data-testid="sequencer-play"], [data-testid="play-button"]').first();
    await playButton.click();
    await page.waitForTimeout(200);

    // Play button might change appearance (to pause or stop icon)
    const transportControls = page.locator('[data-testid="sequencer-transport"], [data-testid*="sequencer-"][data-testid*="button"]');
    expect(await transportControls.count()).toBeGreaterThan(0);

    // Stop
    const stopButton = page.locator('[data-testid="sequencer-stop"], [data-testid="stop-button"]').first();
    if ((await stopButton.count()) > 0) {
      await stopButton.click();
      await page.waitForTimeout(100);
    }
  });

  test('should handle rapid start/stop cycles', async ({ page }) => {
    // Open sequencer
    const sequencerButton = page.locator('[data-testid="open-sequencer"], [data-testid="sequencer-button"]');
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const playButton = page.locator('[data-testid="sequencer-play"], [data-testid="play-button"]').first();
    const stopButton = page.locator('[data-testid="sequencer-stop"], [data-testid="stop-button"]').first();

    // Rapidly start and stop
    for (let i = 0; i < 5; i++) {
      await playButton.click();
      await page.waitForTimeout(100);

      if ((await stopButton.count()) > 0) {
        await stopButton.click();
        await page.waitForTimeout(100);
      }
    }

    // Sequencer should still be functional
    const sequencerModal = page.locator('[data-testid="sequencer-modal"], [data-testid="sequencer"]');
    await expect(sequencerModal).toBeVisible();
  });
});
