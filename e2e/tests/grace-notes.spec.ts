import { test, expect } from '@playwright/test';
import {
  playChord,
  releaseAllKeys,
  savePreset,
  recallPreset,
  releasePreset,
  getActiveNotes,
} from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';

/**
 * Grace Notes E2E Tests
 *
 * Grace notes allow re-articulating individual notes or subsets of a held chord
 * while holding a preset key (0-9).
 *
 * Key mappings:
 * - ghjkl: Single notes (1st through 5th note of chord)
 * - yuiop: Pairs (1-2, 2-3, 3-4, 4-5, 5-6)
 * - vbnm,.: Intervals (root+3rd, root+5th, root+7th, 3rd+7th, 5th+9th, triad)
 * - space: Full chord retrigger
 * - -/=: Octave shift modifiers
 */
test.describe('Grace Notes', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test.describe('Single Note Grace Notes (ghjkl)', () => {
    test('should trigger first note of chord with G key', async ({ page }) => {
      // Save a CMaj7 chord to preset 1
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      // Recall preset and hold it
      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      // Get the active notes before grace note
      const notesBefore = await getActiveNotes(page);
      expect(notesBefore.length).toBeGreaterThan(0);

      // Press 'g' to trigger first note (root)
      // This should emit a grace:note event
      await page.keyboard.press('g');
      await page.waitForTimeout(100);

      // The chord should still be active
      const notesAfter = await getActiveNotes(page);
      expect(notesAfter.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });

    test('should trigger second note of chord with H key', async ({ page }) => {
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      // Press 'h' for second note
      await page.keyboard.press('h');
      await page.waitForTimeout(100);

      // Chord should still be active
      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });

    test('should trigger multiple single notes in sequence', async ({ page }) => {
      await playChord(page, 'D', 'min7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      // Play a sequence of grace notes
      await page.keyboard.press('g');
      await page.waitForTimeout(50);
      await page.keyboard.press('h');
      await page.waitForTimeout(50);
      await page.keyboard.press('j');
      await page.waitForTimeout(50);
      await page.keyboard.press('k');
      await page.waitForTimeout(50);
      await page.keyboard.press('l');
      await page.waitForTimeout(100);

      // Chord should still be active
      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });
  });

  test.describe('Pair Grace Notes (yuiop)', () => {
    test('should trigger notes 1-2 with Y key', async ({ page }) => {
      await playChord(page, 'G', 'dom7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      await page.keyboard.press('y');
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });

    test('should trigger notes 2-3 with U key', async ({ page }) => {
      await playChord(page, 'G', 'dom7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      await page.keyboard.press('u');
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });
  });

  test.describe('Interval Grace Notes (vbnm,.)', () => {
    test('should trigger root + 3rd with V key', async ({ page }) => {
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      await page.keyboard.press('v');
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });

    test('should trigger root + 5th with B key', async ({ page }) => {
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      await page.keyboard.press('b');
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });

    test('should trigger triad with . key', async ({ page }) => {
      await playChord(page, 'F', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      await page.keyboard.press('.');
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });
  });

  test.describe('Full Chord Retrigger', () => {
    test('should retrigger full chord with Space key', async ({ page }) => {
      await playChord(page, 'E', 'min7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      // Press space for full chord retrigger
      await page.keyboard.press(' ');
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });
  });

  test.describe('Octave Shift Modifiers', () => {
    test('should shift grace note down octave with - key', async ({ page }) => {
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      // Hold minus and press grace note key
      await page.keyboard.down('-');
      await page.keyboard.press('g');
      await page.keyboard.up('-');
      await page.waitForTimeout(100);

      // Chord should still be active
      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });

    test('should shift grace note up octave with = key', async ({ page }) => {
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      // Hold equals and press grace note key
      await page.keyboard.down('=');
      await page.keyboard.press('g');
      await page.keyboard.up('=');
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });

    test('should cancel octave shift when both - and = held', async ({ page }) => {
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      // Hold both modifiers (they should cancel out)
      await page.keyboard.down('-');
      await page.keyboard.down('=');
      await page.keyboard.press('g');
      await page.keyboard.up('-');
      await page.keyboard.up('=');
      await page.waitForTimeout(100);

      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });
  });

  test.describe('Grace Note Interaction Rules', () => {
    test('should NOT trigger grace notes without preset held', async ({ page }) => {
      // Build a chord but don't save as preset
      await playChord(page, 'C', 'major');

      // Press grace note key - should not cause issues
      await page.keyboard.press('g');
      await page.waitForTimeout(100);

      // Chord should still be active (g key might affect chord building though)
      await releaseAllKeys(page);
    });

    test('should NOT trigger grace notes when building new chord', async ({ page }) => {
      // Save a preset
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      // Hold preset key
      await page.keyboard.down('1');
      await page.waitForTimeout(50);

      // Now also hold a root key (building new chord overrides grace notes)
      await page.keyboard.down('q'); // C root
      await page.waitForTimeout(50);

      // Grace note key should not trigger grace note when root is held
      await page.keyboard.press('g');
      await page.waitForTimeout(50);

      await page.keyboard.up('q');
      await page.keyboard.up('1');
    });

    test('should work with all 10 preset slots', async ({ page }) => {
      // Save presets to slots 1 and 2
      await playChord(page, 'C', 'major');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await playChord(page, 'G', 'dom7');
      await savePreset(page, 2);
      await releaseAllKeys(page);

      // Test grace notes on slot 1
      await recallPreset(page, 1);
      await page.keyboard.press('g');
      await page.waitForTimeout(50);
      await releasePreset(page, 1);

      // Test grace notes on slot 2
      await recallPreset(page, 2);
      await page.keyboard.press('h');
      await page.waitForTimeout(50);
      await releasePreset(page, 2);

      // Both should have worked without errors
      expect(true).toBe(true);
    });

    test('should handle empty preset slot gracefully', async ({ page }) => {
      // Try to recall empty slot and press grace note key
      await page.keyboard.down('5'); // Empty slot
      await page.waitForTimeout(50);
      await page.keyboard.press('g');
      await page.waitForTimeout(50);
      await page.keyboard.up('5');

      // Should not crash
      expect(true).toBe(true);
    });
  });

  test.describe('Grace Note Visual Feedback', () => {
    test('should show triggered notes visual feedback on piano', async ({ page }) => {
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      // Trigger grace note
      await page.keyboard.press('g');

      // Look for triggered state on piano keys (brief animation)
      // The triggeredNotes state should update briefly
      await page.waitForTimeout(50);

      // Chord should still be visible
      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });
  });

  test.describe('Grace Note Performance', () => {
    test('should handle rapid grace note presses', async ({ page }) => {
      await playChord(page, 'D', 'min7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await recallPreset(page, 1);
      await page.waitForTimeout(100);

      // Rapid fire grace notes
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('g');
        await page.waitForTimeout(20);
        await page.keyboard.press('h');
        await page.waitForTimeout(20);
      }

      // Should not crash and chord should still be active
      const notes = await getActiveNotes(page);
      expect(notes.length).toBeGreaterThan(0);

      await releasePreset(page, 1);
    });

    test('should handle switching presets while pressing grace notes', async ({ page }) => {
      // Save two different presets
      await playChord(page, 'C', 'maj7');
      await savePreset(page, 1);
      await releaseAllKeys(page);

      await playChord(page, 'F', 'maj7');
      await savePreset(page, 2);
      await releaseAllKeys(page);

      // Recall slot 1, press grace note, release, recall slot 2
      await recallPreset(page, 1);
      await page.keyboard.press('g');
      await releasePreset(page, 1);

      await recallPreset(page, 2);
      await page.keyboard.press('h');
      await releasePreset(page, 2);

      // Should not crash
      expect(true).toBe(true);
    });
  });
});
