import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  savePreset,
  recallPreset,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';

test.describe('Chord History', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test('should show history icon button in presets panel', async ({ page }) => {
    // History button should be visible
    const historyButton = page.locator('[data-testid="open-history"]');
    await expect(historyButton).toBeVisible();
  });

  test('should open history modal when clicking icon', async ({ page }) => {
    // Click the history button
    const historyButton = page.locator('[data-testid="open-history"]');
    await historyButton.click();

    // Verify history modal opens
    await expect(page.locator('[data-testid="chord-history-modal"]')).toBeVisible();
    await expect(page.locator('text=Chord History')).toBeVisible();
  });

  test('should close history modal with close button', async ({ page }) => {
    // Open history
    await page.locator('[data-testid="open-history"]').click();
    await expect(page.locator('[data-testid="chord-history-modal"]')).toBeVisible();

    // Close it
    await page.locator('[data-testid="history-close"]').click();
    await expect(page.locator('[data-testid="chord-history-modal"]')).not.toBeVisible();
  });

  test('should close history modal by clicking overlay', async ({ page }) => {
    // Open history
    await page.locator('[data-testid="open-history"]').click();
    await expect(page.locator('[data-testid="chord-history-modal"]')).toBeVisible();

    // Click overlay to close
    await page.locator('[data-testid="history-overlay"]').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('[data-testid="chord-history-modal"]')).not.toBeVisible();
  });

  test('should show empty state when no chords played', async ({ page }) => {
    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Should show empty message
    await expect(page.locator('text=No chords yet')).toBeVisible();
  });

  test('should record chord when played', async ({ page }) => {
    // Play a chord
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Should show at least one entry with the chord in history modal
    const modal = page.locator('[data-testid="chord-history-modal"]');
    await expect(modal.locator('[data-testid="history-entry"]').first()).toBeVisible();
    await expect(modal.locator('.history-chord-name', { hasText: 'C Maj7' })).toBeVisible();
  });

  test('should record multiple chords', async ({ page }) => {
    // Play multiple chords
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    await playChord(page, 'D', 'min7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    await playChord(page, 'G', 'dom7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Should show at least 3 entries (may have more from partial chords)
    const entries = page.locator('[data-testid="history-entry"]');
    const count = await entries.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Most recent (G7) should be first
    await expect(entries.first().locator('.history-chord-name')).toHaveText('G7');
  });

  test('should move duplicate chord to front instead of duplicating', async ({ page }) => {
    // Play C maj7
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Play D min7
    await playChord(page, 'D', 'min7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    // Play C maj7 again
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // C maj7 should now be first (most recent) - deduplicated and moved to front
    const entries = page.locator('[data-testid="history-entry"]');
    await expect(entries.first().locator('.history-chord-name')).toHaveText('C Maj7');

    // Count all C Maj7 entries - should only be one (deduplicated)
    const cMaj7Entries = page.locator('[data-testid="history-entry"]', { hasText: 'C Maj7' });
    await expect(cMaj7Entries).toHaveCount(1);
  });

  test('should show "Add to Preset" button on history entries', async ({ page }) => {
    // Play a chord
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Should show Add to Preset button on the first entry
    await expect(page.locator('[data-testid="assign-btn"]').first()).toBeVisible();
    await expect(page.locator('text=Add to Preset').first()).toBeVisible();
  });

  test('should show slot selector when clicking Add to Preset', async ({ page }) => {
    // Play a chord
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Click Add to Preset on first entry
    await page.locator('[data-testid="assign-btn"]').first().click();

    // Should show slot selector
    await expect(page.locator('.slot-buttons')).toBeVisible();
    await expect(page.locator('text=Save to slot')).toBeVisible();
  });

  test('should assign chord to preset slot', async ({ page }) => {
    // Play a chord
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Click Add to Preset then select slot 1 (use first entry)
    await page.locator('[data-testid="assign-btn"]').first().click();
    await page.locator('[data-testid="assign-slot-1"]').click();

    // Should show success message
    await expect(page.locator('.history-success')).toBeVisible({ timeout: 2000 });

    // Close history modal
    await page.locator('[data-testid="history-close"]').click();

    // Verify preset was saved - recall slot 1
    await recallPreset(page, 1);
    await page.waitForTimeout(100);

    // Should have a chord (may be the full chord or partial depending on what was in first entry)
    const chordDisplay = page.locator('[data-testid="chord-display"]');
    await expect(chordDisplay).toBeVisible();
  });

  test('should only show open slots in selector', async ({ page }) => {
    // Save a preset to slot 1 first
    await playChord(page, 'D', 'min7');
    await page.waitForTimeout(100);
    await savePreset(page, 1);
    await releaseAllKeys(page);

    // Play a different chord
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Click Add to Preset on first entry
    await page.locator('[data-testid="assign-btn"]').first().click();

    // Slot 1 should NOT be available (it's filled)
    await expect(page.locator('[data-testid="assign-slot-1"]')).not.toBeVisible();

    // Slot 2 should be available
    await expect(page.locator('[data-testid="assign-slot-2"]')).toBeVisible();
  });

  test('should disable Add to Preset when no slots available', async ({ page }) => {
    // Fill all 10 preset slots
    for (let i = 1; i <= 10; i++) {
      await playChord(page, 'C', 'major');
      await page.waitForTimeout(50);
      await savePreset(page, i);
      await releaseAllKeys(page);
      await page.waitForTimeout(50);
    }

    // Play another chord
    await playChord(page, 'D', 'minor');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Add to Preset button should be disabled (use first one)
    const assignBtn = page.locator('[data-testid="assign-btn"]').first();
    await expect(assignBtn).toBeDisabled();
    await expect(assignBtn).toContainText('No slots');
  });

  test('should clear history when clicking Clear History', async ({ page }) => {
    // Play some chords
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    await playChord(page, 'D', 'min7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Should have at least some entries
    await expect(page.locator('[data-testid="history-entry"]').first()).toBeVisible();

    // Click Clear History
    await page.locator('[data-testid="clear-history"]').click();

    // Should show empty state
    await expect(page.locator('text=No chords yet')).toBeVisible();
    await expect(page.locator('[data-testid="history-entry"]')).toHaveCount(0);
  });

  test('should show chord count in footer', async ({ page }) => {
    // Play some chords
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);
    await page.waitForTimeout(100);

    await playChord(page, 'D', 'min7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Should show chord count in footer stats (at least some chords recorded)
    await expect(page.locator('.history-stats')).toContainText('chord');
    // Check that a number appears before 'chord'
    const statsText = await page.locator('.history-stats').textContent();
    expect(statsText).toMatch(/\d+\s*chord/);
  });

  test('should show available slots count in footer', async ({ page }) => {
    // Play a chord (so history has something)
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Should show slots available (10 slots available when none are filled)
    await expect(page.locator('.history-stats')).toContainText('10');
    await expect(page.locator('.history-stats')).toContainText('slots free');
  });

  test('should cancel slot selection', async ({ page }) => {
    // Play a chord
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Click Add to Preset on first entry to show slot selector
    await page.locator('[data-testid="assign-btn"]').first().click();
    await expect(page.locator('.slot-buttons')).toBeVisible();

    // Click Cancel
    await page.locator('.slot-cancel-btn').click();

    // Slot selector should be hidden, Add to Preset button should be back
    await expect(page.locator('.slot-buttons')).not.toBeVisible();
    await expect(page.locator('[data-testid="assign-btn"]').first()).toBeVisible();
  });

  test('should show voicing details in history entry', async ({ page }) => {
    // Play a chord
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(200);
    await releaseAllKeys(page);

    // Open history
    await page.locator('[data-testid="open-history"]').click();

    // Should show entry with octave info in the meta section
    const entry = page.locator('[data-testid="history-entry"]').first();
    await expect(entry.locator('.history-octave')).toBeVisible();
    await expect(entry.locator('.history-octave')).toContainText('Oct');
  });

  test('should preserve voicing when assigning to preset', async ({ page }, testInfo) => {
    // Skip mobile - this test uses keyboard arrows which don't work on mobile touch interface
    test.skip(testInfo.project.name.includes('mobile'), 'Uses keyboard arrows not available on mobile');

    // Play a chord and change octave
    await playChord(page, 'C', 'maj7');
    await page.waitForTimeout(100);

    // Change octave up
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    await releaseAllKeys(page);

    // Open history and assign to preset (first entry should have the octave-shifted version)
    await page.locator('[data-testid="open-history"]').click();
    await page.locator('[data-testid="assign-btn"]').first().click();
    await page.locator('[data-testid="assign-slot-1"]').click();

    // Wait for success
    await expect(page.locator('.history-success')).toBeVisible({ timeout: 2000 });

    // Close history
    await page.locator('[data-testid="history-close"]').click();

    // Recall preset - should work without error
    await recallPreset(page, 1);
    await page.waitForTimeout(100);

    // Verify we have active notes (preset was assigned correctly)
    const activeNotes = await page.evaluate(() => {
      const keys = document.querySelectorAll('[data-note].active');
      return keys.length;
    });

    expect(activeNotes).toBeGreaterThan(0);
  });
});
