import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  savePreset,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';
import { II_V_I_C } from '../fixtures/preset-data';

/**
 * Helper to get the sequencer open button.
 * Uses the actual data-testid from TransportControls.tsx
 */
async function getSequencerButton(page: import('@playwright/test').Page) {
  return page.getByTestId('open-sequencer');
}

/**
 * Helper to get the sequencer modal.
 * Uses the actual data-testid from SequencerModal.tsx
 */
function getSequencerModal(page: import('@playwright/test').Page) {
  return page.getByTestId('sequencer-modal');
}

/**
 * Helper to close sequencer if open.
 */
async function closeSequencerIfOpen(page: import('@playwright/test').Page) {
  const modal = getSequencerModal(page);
  if (await modal.isVisible().catch(() => false)) {
    const closeBtn = page.getByTestId('close-sequencer');
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click({ force: true });
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(200);
  }
}

test.describe('Sequencer', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test('should open sequencer modal', async ({ page }) => {
    // Get the sequencer button using data-testid
    const sequencerButton = await getSequencerButton(page);

    // Open sequencer
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Verify modal is visible using data-testid
    const sequencerModal = getSequencerModal(page);
    await expect(sequencerModal).toBeVisible();
  });

  test('should close sequencer modal', async ({ page }) => {
    // Open sequencer
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const sequencerModal = getSequencerModal(page);
    await expect(sequencerModal).toBeVisible();

    // Close sequencer using the close button (Escape is not supported)
    const closeButton = page.getByTestId('close-sequencer');
    await closeButton.click();
    await page.waitForTimeout(200);

    // Verify modal is hidden
    await expect(sequencerModal).not.toBeVisible();
  });

  test('should configure number of steps', async ({ page }) => {
    // Open sequencer
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Steps are configured via button group with values 4, 8, 16, 32
    // Click the "8" button to set 8 steps
    const stepsButton8 = modal.locator('.setting-group').filter({ hasText: 'Steps' }).getByRole('button', { name: '8', exact: true });
    await stepsButton8.click();
    await page.waitForTimeout(100);

    // Verify button is active
    await expect(stepsButton8).toHaveClass(/active/);

    // Verify 8 step cells are visible
    const stepCells = modal.locator('.step-cell');
    const count = await stepCells.count();
    expect(count).toBe(8);
  });

  test('should configure BPM (tempo)', async ({ page }) => {
    // BPM control is in TransportControls, not in the sequencer modal
    // Find BPM input in the transport controls
    const bpmControl = page.getByTestId('bpm-input');

    // Clear and set BPM to 120
    await bpmControl.fill('120');
    await page.waitForTimeout(100);

    // Verify value
    const bpmValue = await bpmControl.inputValue();
    expect(parseInt(bpmValue)).toBe(120);
  });

  test('should configure steps per beat (resolution)', async ({ page }) => {
    // Open sequencer
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Resolution is configured via button group with "1/4", "1/8", "1/16"
    // Click the "1/16" button to set 4 steps per beat
    const resolutionButton = modal.locator('.setting-group').filter({ hasText: 'Resolution' }).getByRole('button', { name: '1/16', exact: true });
    await resolutionButton.click();
    await page.waitForTimeout(100);

    // Verify button is active
    await expect(resolutionButton).toHaveClass(/active/);
  });

  test('should enable preset on specific step', async ({ page }) => {
    // First save a preset
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(100);
    await savePreset(page, 1);
    await page.waitForTimeout(100);
    await releaseAllKeys(page);

    // Open sequencer
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // First, select preset 1 from the palette
    const presetPaletteBtn = modal.locator('.palette-preset').filter({ hasText: '1' });
    await presetPaletteBtn.click();
    await page.waitForTimeout(100);

    // Verify preset is selected
    await expect(presetPaletteBtn).toHaveClass(/selected/);

    // Click on step 0 (first step) to place the preset
    const step0 = page.getByTestId('step-0');
    await step0.click();
    await page.waitForTimeout(100);

    // Verify step has the preset (should show "1" and have class "filled")
    await expect(step0).toHaveClass(/filled/);
  });

  test('should start sequencer playback', async ({ page }) => {
    // Open sequencer and enable it
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Enable sequencer first (click the ON/OFF button)
    const enableBtn = modal.locator('.enable-btn');
    const isEnabled = await enableBtn.textContent();
    if (isEnabled === 'OFF') {
      await enableBtn.click();
      await page.waitForTimeout(100);
    }

    // Close the modal first using the close button
    const closeButton = page.getByTestId('close-sequencer');
    await closeButton.click();
    await page.waitForTimeout(100);

    // Verify modal is closed
    await expect(modal).not.toBeVisible();

    // Play button is in TransportControls, not in sequencer modal
    const playButton = page.getByTestId('play-button');
    await playButton.click();
    await page.waitForTimeout(200);

    // Verify playback started - the play button should now be stop button
    const stopButton = page.getByTestId('stop-button');
    await expect(stopButton).toBeVisible();
  });

  test('should stop sequencer playback', async ({ page }) => {
    // Start playback first (play button is in TransportControls)
    const playButton = page.getByTestId('play-button');
    await playButton.click();
    await page.waitForTimeout(200);

    // Verify it's now showing stop button
    const stopButton = page.getByTestId('stop-button');
    await expect(stopButton).toBeVisible();

    // Stop playback
    await stopButton.click();
    await page.waitForTimeout(100);

    // Verify playback stopped - should now show play button again
    const playButtonAfterStop = page.getByTestId('play-button');
    await expect(playButtonAfterStop).toBeVisible();
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
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Enable sequencer
    const enableBtn = modal.locator('.enable-btn');
    const isEnabled = await enableBtn.textContent();
    if (isEnabled === 'OFF') {
      await enableBtn.click();
      await page.waitForTimeout(100);
    }

    // Place presets on steps
    for (let i = 0; i < chords.length && i < 3; i++) {
      const presetBtn = modal.locator('.palette-preset').filter({ hasText: String(chords[i].slot) });
      await presetBtn.click();
      await page.waitForTimeout(50);

      const stepCell = page.getByTestId(`step-${i}`);
      await stepCell.click();
      await page.waitForTimeout(50);
    }

    // Close modal to start playback (use close button)
    const closeButton = page.getByTestId('close-sequencer');
    await closeButton.click();
    await page.waitForTimeout(100);

    // Start playback
    const playButton = page.getByTestId('play-button');
    await playButton.click();
    await page.waitForTimeout(200);

    // Reopen sequencer to see the step indicators
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Wait for a couple of beats
    await page.waitForTimeout(1000);

    // Look for active step indicator (step with "playing" class)
    const playingStep = modal.locator('.step-cell.playing');
    const hasPlayingStep = (await playingStep.count()) > 0;

    // At least one step should be marked as playing
    expect(hasPlayingStep).toBe(true);

    // Stop playback - close modal first, then stop
    await closeButton.click();
    await page.waitForTimeout(100);
    const stopButton = page.getByTestId('stop-button');
    await stopButton.click();
  });

  test('should cycle through steps during playback', async ({ page }) => {
    // Set fast BPM for quick testing (BPM is in TransportControls)
    const bpmControl = page.getByTestId('bpm-input');
    await bpmControl.fill('240'); // Fast tempo
    await page.waitForTimeout(100);

    // Open sequencer and enable it
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Enable sequencer
    const enableBtn = modal.locator('.enable-btn');
    const isEnabled = await enableBtn.textContent();
    if (isEnabled === 'OFF') {
      await enableBtn.click();
      await page.waitForTimeout(100);
    }

    // Close modal using close button and start playback
    const closeButton = page.getByTestId('close-sequencer');
    await closeButton.click();
    await page.waitForTimeout(100);

    const playButton = page.getByTestId('play-button');
    await playButton.click();
    await page.waitForTimeout(100);

    // Reopen sequencer to observe step cycling
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Collect indices of playing steps over time
    const playingStepIndices: number[] = [];

    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(150);

      // Find which step cell has the "playing" class
      const stepCells = modal.locator('.step-cell');
      const count = await stepCells.count();

      for (let j = 0; j < count; j++) {
        const cell = stepCells.nth(j);
        const classes = await cell.getAttribute('class');
        if (classes?.includes('playing')) {
          playingStepIndices.push(j);
          break;
        }
      }
    }

    // Should have seen multiple different steps
    const uniqueSteps = new Set(playingStepIndices);
    expect(uniqueSteps.size).toBeGreaterThan(1);

    // Stop playback - close modal first, then stop
    await closeButton.click();
    await page.waitForTimeout(100);
    const stopButton = page.getByTestId('stop-button');
    await stopButton.click();
  });

  test('should support retrig mode', async ({ page }) => {
    // Open sequencer
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Mode is configured via button group with "Retrig" and "Sustain"
    const retrigButton = modal.locator('.setting-group').filter({ hasText: 'Mode' }).getByRole('button', { name: 'Retrig', exact: true });
    await retrigButton.click();
    await page.waitForTimeout(100);

    // Verify button is active
    await expect(retrigButton).toHaveClass(/active/);
  });

  test('should support sustain mode', async ({ page }) => {
    // Open sequencer
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Mode is configured via button group with "Retrig" and "Sustain"
    const sustainButton = modal.locator('.setting-group').filter({ hasText: 'Mode' }).getByRole('button', { name: 'Sustain', exact: true });
    await sustainButton.click();
    await page.waitForTimeout(100);

    // Verify button is active
    await expect(sustainButton).toHaveClass(/active/);
  });

  test('should persist sequencer configuration after reload', async ({ page }) => {
    // Configure BPM (in TransportControls)
    const bpmControl = page.getByTestId('bpm-input');
    await bpmControl.fill('135');
    await page.waitForTimeout(100);

    // Open sequencer
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Configure steps to 16
    const stepsButton16 = modal.locator('.setting-group').filter({ hasText: 'Steps' }).getByRole('button', { name: '16', exact: true });
    await stepsButton16.click();
    await page.waitForTimeout(100);

    // Verify 16 steps
    await expect(stepsButton16).toHaveClass(/active/);

    // Close sequencer
    const closeButton = page.getByTestId('close-sequencer');
    await closeButton.click();
    await page.waitForTimeout(100);

    // Reload page
    await page.reload();
    await initializeApp(page);
    await dismissTutorial(page);
    await page.waitForTimeout(200);

    // Verify BPM persisted (BPM is in TransportControls)
    const savedBPM = await bpmControl.inputValue();
    expect(parseInt(savedBPM)).toBe(135);

    // Reopen sequencer
    await sequencerButton.click();
    await page.waitForTimeout(200);

    // Verify steps persisted (16 button should be active)
    const stepsButton16After = modal.locator('.setting-group').filter({ hasText: 'Steps' }).getByRole('button', { name: '16', exact: true });
    await expect(stepsButton16After).toHaveClass(/active/);
  });

  test('should toggle step preset assignment', async ({ page }) => {
    // First save a preset to be able to assign it
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(50);
    await savePreset(page, 1);
    await page.waitForTimeout(50);
    await releaseAllKeys(page);

    // Open sequencer
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Select preset 1 from palette
    const presetBtn = modal.locator('.palette-preset').filter({ hasText: '1' });
    await presetBtn.click();
    await page.waitForTimeout(50);

    // Click on step 0 to place preset
    const step0 = page.getByTestId('step-0');
    await step0.click();
    await page.waitForTimeout(100);

    // Verify step is now filled
    await expect(step0).toHaveClass(/filled/);

    // Right-click to clear
    await step0.click({ button: 'right' });
    await page.waitForTimeout(100);

    // Verify step is now empty
    await expect(step0).toHaveClass(/empty/);
  });

  test('should display step grid', async ({ page }) => {
    // Open sequencer
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Verify step grid is visible (default is 16 steps)
    const stepCells = modal.locator('.step-cell');
    const stepCount = await stepCells.count();

    // Default is 16 steps
    expect(stepCount).toBeGreaterThan(0);
  });

  test('should handle playback with empty steps', async ({ page }) => {
    // Open sequencer and enable it
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();

    // Enable sequencer
    const enableBtn = modal.locator('.enable-btn');
    const isEnabled = await enableBtn.textContent();
    if (isEnabled === 'OFF') {
      await enableBtn.click();
      await page.waitForTimeout(100);
    }

    // Close modal using close button
    const closeButton = page.getByTestId('close-sequencer');
    await closeButton.click();
    await page.waitForTimeout(100);

    // Start playback with no presets configured
    const playButton = page.getByTestId('play-button');
    await playButton.click();
    await page.waitForTimeout(500);

    // Should not crash - sequencer should run but produce no output
    // Verify play button changed to stop button
    const stopButton = page.getByTestId('stop-button');
    await expect(stopButton).toBeVisible();

    // Reopen sequencer modal to verify it's still functional
    await sequencerButton.click();
    await page.waitForTimeout(200);
    await expect(modal).toBeVisible();

    // Stop playback - close modal first, then stop
    await closeButton.click();
    await page.waitForTimeout(100);
    await stopButton.click();
  });

  test('should update transport controls during playback', async ({ page }) => {
    // Start playback using transport controls
    const playButton = page.getByTestId('play-button');
    await playButton.click();
    await page.waitForTimeout(200);

    // Play button should now be stop button
    const stopButton = page.getByTestId('stop-button');
    await expect(stopButton).toBeVisible();

    // Stop playback
    await stopButton.click();
    await page.waitForTimeout(100);

    // Should be back to play button
    const playButtonAfterStop = page.getByTestId('play-button');
    await expect(playButtonAfterStop).toBeVisible();
  });

  test('should handle rapid start/stop cycles', async ({ page }) => {
    // Rapidly start and stop using transport controls
    for (let i = 0; i < 5; i++) {
      const playButton = page.getByTestId('play-button');
      await playButton.click();
      await page.waitForTimeout(100);

      const stopButton = page.getByTestId('stop-button');
      await stopButton.click();
      await page.waitForTimeout(100);
    }

    // Transport should still be functional - play button visible
    const playButton = page.getByTestId('play-button');
    await expect(playButton).toBeVisible();

    // Sequencer modal should still be openable
    const sequencerButton = await getSequencerButton(page);
    await sequencerButton.click();
    await page.waitForTimeout(200);

    const modal = getSequencerModal(page);
    await expect(modal).toBeVisible();
  });
});
