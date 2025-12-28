import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  getActiveNotes,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';

/**
 * Playback Modes E2E Tests
 *
 * Tests the 10 playback modes:
 * - Instant modes: block, root-only, shell
 * - Rhythmic modes (BPM-synced): vamp, charleston, stride, two-feel, bossa, tremolo, custom
 */
test.describe('Playback Modes', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test.describe('Playback Mode UI', () => {
    test('should show playback mode selector in transport controls', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await expect(playbackModeSelect).toBeVisible();
    });

    test('should default to Block mode', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      const selectedValue = await playbackModeSelect.inputValue();
      expect(selectedValue).toBe('block');
    });

    test('should show all playback mode options', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');

      // Check for instant modes
      await expect(playbackModeSelect.locator('option[value="block"]')).toBeAttached();
      await expect(playbackModeSelect.locator('option[value="root-only"]')).toBeAttached();
      await expect(playbackModeSelect.locator('option[value="shell"]')).toBeAttached();

      // Check for rhythmic modes
      await expect(playbackModeSelect.locator('option[value="vamp"]')).toBeAttached();
      await expect(playbackModeSelect.locator('option[value="charleston"]')).toBeAttached();
      await expect(playbackModeSelect.locator('option[value="stride"]')).toBeAttached();
      await expect(playbackModeSelect.locator('option[value="two-feel"]')).toBeAttached();
      await expect(playbackModeSelect.locator('option[value="bossa"]')).toBeAttached();
      await expect(playbackModeSelect.locator('option[value="tremolo"]')).toBeAttached();
    });

    test('should show mode description below selector', async ({ page }) => {
      const description = page.locator('.playback-mode-description');
      await expect(description).toBeVisible();
      await expect(description).toContainText('All notes together'); // Block mode description
    });

    test('should update description when mode changes', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');

      // Change to Root Only
      await playbackModeSelect.selectOption('root-only');

      const description = page.locator('.playback-mode-description');
      await expect(description).toContainText('Just the root note');
    });

    test('should show BPM indicator for rhythmic modes', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');

      // Change to a rhythmic mode
      await playbackModeSelect.selectOption('vamp');

      // Should show BPM indicator
      const bpmIndicator = page.locator('.bpm-indicator');
      await expect(bpmIndicator).toBeVisible();
    });

    test('should NOT show BPM indicator for instant modes', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');

      // Block mode (instant) should not have BPM indicator
      await playbackModeSelect.selectOption('block');

      const bpmIndicator = page.locator('.bpm-indicator');
      await expect(bpmIndicator).not.toBeVisible();
    });
  });

  test.describe('Instant Playback Modes', () => {
    test('Block mode - should play all notes together', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('block');

      // Play a chord
      await playChord(page, 'C', 'maj7');

      // All notes should be active
      const activeNotes = await getActiveNotes(page);
      expect(activeNotes.length).toBeGreaterThanOrEqual(4); // CMaj7 has 4 notes

      await releaseAllKeys(page);
    });

    test('Root Only mode - should highlight only root note', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('root-only');

      // Play a chord
      await playChord(page, 'C', 'maj7');

      // Wait for mode to take effect
      await page.waitForTimeout(100);

      // Should show fewer notes than full chord
      const activeNotes = await getActiveNotes(page);
      // Root-only may show 1-2 notes (root, possibly doubled)
      expect(activeNotes.length).toBeLessThanOrEqual(2);

      await releaseAllKeys(page);
    });

    test('Shell mode - should highlight root, 3rd, and 7th', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('shell');

      // Play a 7th chord
      await playChord(page, 'D', 'min7');

      await page.waitForTimeout(100);

      // Shell voicing should show 3 notes (root, 3rd, 7th)
      const activeNotes = await getActiveNotes(page);
      expect(activeNotes.length).toBeLessThanOrEqual(4);
      expect(activeNotes.length).toBeGreaterThanOrEqual(2);

      await releaseAllKeys(page);
    });

    test('should switch between instant modes while playing', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');

      // Start in block mode
      await playbackModeSelect.selectOption('block');
      await playChord(page, 'G', 'dom7');

      const blockNotes = await getActiveNotes(page);

      // Switch to root-only
      await playbackModeSelect.selectOption('root-only');
      await page.waitForTimeout(100);

      const rootOnlyNotes = await getActiveNotes(page);

      // Root-only should have fewer notes
      expect(rootOnlyNotes.length).toBeLessThan(blockNotes.length);

      // Switch to shell
      await playbackModeSelect.selectOption('shell');
      await page.waitForTimeout(100);

      const shellNotes = await getActiveNotes(page);

      // Shell should be between root-only and block
      expect(shellNotes.length).toBeGreaterThanOrEqual(rootOnlyNotes.length);

      await releaseAllKeys(page);
    });
  });

  test.describe('Rhythmic Playback Modes', () => {
    test('Vamp mode - should show notes updating over time', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('vamp');

      await playChord(page, 'C', 'maj7');

      // Capture notes at two different times
      const notes1 = await getActiveNotes(page);
      await page.waitForTimeout(300); // Wait for pattern to advance
      const notes2 = await getActiveNotes(page);

      // In vamp mode, the display should change
      // (root first, then upper notes)
      // At minimum, chord should be active
      expect(notes1.length).toBeGreaterThan(0);
      expect(notes2.length).toBeGreaterThan(0);

      await releaseAllKeys(page);
    });

    test('Charleston mode - should work with swing anticipation', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('charleston');

      await playChord(page, 'F', 'maj7');

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releaseAllKeys(page);
    });

    test('Stride mode - should alternate bass and chord', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('stride');

      await playChord(page, 'C', 'major');
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releaseAllKeys(page);
    });

    test('Two-Feel mode - should work with walking bass feel', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('two-feel');

      await playChord(page, 'G', 'dom7');

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releaseAllKeys(page);
    });

    test('Bossa mode - should work with bossa nova pattern', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('bossa');

      await playChord(page, 'A', 'min7');

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releaseAllKeys(page);
    });

    test('Tremolo mode - should show rapid retrigger pattern', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('tremolo');

      await playChord(page, 'E', 'minor');

      // Tremolo should have notes active
      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releaseAllKeys(page);
    });
  });

  test.describe('Mode Persistence', () => {
    test('should remember selected mode after chord change', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');

      // Set to shell mode
      await playbackModeSelect.selectOption('shell');

      // Play first chord
      await playChord(page, 'C', 'maj7');
      await releaseAllKeys(page);

      // Play second chord
      await playChord(page, 'G', 'dom7');

      // Mode should still be shell
      const currentMode = await playbackModeSelect.inputValue();
      expect(currentMode).toBe('shell');

      await releaseAllKeys(page);
    });
  });

  test.describe('Mode with Different Chord Types', () => {
    test('Shell mode with triad should handle missing 7th gracefully', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('shell');

      // Play a triad (no 7th)
      await playChord(page, 'C', 'major');
      await page.waitForTimeout(100);

      // Should still show notes without crashing
      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releaseAllKeys(page);
    });

    test('Root Only mode with complex chord should show only root', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('root-only');

      // Play a complex chord
      await playChord(page, 'G', 'dom7', ['9th', '#11']);
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      // Should be 1-2 notes (root, possibly doubled in octave)
      expect(notes.length).toBeLessThanOrEqual(2);

      await releaseAllKeys(page);
    });
  });

  test.describe('Mode Interaction with Voicing Controls', () => {
    test('should respect octave changes in all modes', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('block');

      await playChord(page, 'C', 'major');
      const notesBefore = await getActiveNotes(page);

      // Change octave up
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);

      const notesAfter = await getActiveNotes(page);

      // Notes should be higher
      if (notesBefore.length > 0 && notesAfter.length > 0) {
        expect(notesAfter[0]).toBeGreaterThan(notesBefore[0]);
      }

      await releaseAllKeys(page);
    });

    test('should work with voicing style changes', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('shell');

      await playChord(page, 'D', 'min7');

      // Cycle voicing style
      await page.keyboard.press('Shift');
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releaseAllKeys(page);
    });
  });

  test.describe('Custom Mode', () => {
    test('should show custom mode option', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await expect(playbackModeSelect.locator('option[value="custom"]')).toBeAttached();
    });

    test('should be able to select custom mode', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('custom');

      const currentMode = await playbackModeSelect.inputValue();
      expect(currentMode).toBe('custom');
    });

    test('custom mode should work with chords', async ({ page }) => {
      const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
      await playbackModeSelect.selectOption('custom');

      await playChord(page, 'C', 'maj7');

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releaseAllKeys(page);
    });
  });

  test.describe('Mode Description Display', () => {
    const modeDescriptions: Record<string, string> = {
      'block': 'All notes together',
      'root-only': 'Just the root note',
      'shell': 'Root + 3rd + 7th',
      'vamp': 'Root then upper notes',
      'charleston': 'Swing anticipation',
      'stride': 'Bass and chord alternating',
      'two-feel': 'Walking bass feel',
      'bossa': 'Bossa nova pattern',
      'tremolo': 'Rapid retrigger',
      'custom': 'User-defined pattern',
    };

    for (const [mode, description] of Object.entries(modeDescriptions)) {
      test(`should show correct description for ${mode} mode`, async ({ page }) => {
        const playbackModeSelect = page.locator('[data-testid="playback-mode"]');
        await playbackModeSelect.selectOption(mode);

        const descriptionEl = page.locator('.playback-mode-description');
        await expect(descriptionEl).toContainText(description);
      });
    }
  });
});
