import { Page, expect } from '@playwright/test';

/**
 * Keyboard mapping for ChordBoy
 * Maps musical concepts to physical keyboard keys
 */

// Root note mappings (left hand)
export const ROOT_KEYS: Record<string, string> = {
  C: 'q',
  'C#': 'a',
  D: 'w',
  'D#': 's',
  E: 'e',
  F: 'r',
  'F#': 'd',
  G: 'f',
  'G#': 'g',
  A: 'v',
  'A#': 'h',
  B: 'b',
};

// Quality mappings (right hand)
export const QUALITY_KEYS: Record<string, string> = {
  major: 'j',
  minor: 'u',
  diminished: 'm',
  augmented: '7',
  dom7: 'k',
  maj7: 'i',
  min7: ',',
};

// Extension mappings
export const EXTENSION_KEYS: Record<string, string> = {
  '9th': 'l',
  '11th': 'o',
  '13th': '.',
  'b5': '[',
  '#5': ']',
  'b9': '[',
  '#9': ']',
  '#11': "'",
};

/**
 * Play a chord on the keyboard
 */
export async function playChord(
  page: Page,
  root: string,
  quality: string,
  extensions: string[] = []
) {
  const rootKey = ROOT_KEYS[root];
  const qualityKey = QUALITY_KEYS[quality];

  if (!rootKey) {
    throw new Error(`Unknown root note: ${root}`);
  }
  if (!qualityKey) {
    throw new Error(`Unknown quality: ${quality}`);
  }

  // Press root
  await page.keyboard.press(rootKey);

  // Press quality
  await page.keyboard.press(qualityKey);

  // Press extensions
  for (const ext of extensions) {
    const extKey = EXTENSION_KEYS[ext];
    if (!extKey) {
      throw new Error(`Unknown extension: ${ext}`);
    }
    await page.keyboard.press(extKey);
  }
}

/**
 * Release all keys (simulates releasing hands from keyboard)
 */
export async function releaseAllKeys(page: Page) {
  // Press Escape to clear all keys (assuming this behavior exists)
  await page.keyboard.press('Escape');

  // Alternative: manually release all pressed keys
  // This is more reliable but requires tracking which keys are down
}

/**
 * Get array of active MIDI note numbers from piano keyboard
 */
export async function getActiveNotes(page: Page): Promise<number[]> {
  return await page.evaluate(() => {
    const activeKeys = Array.from(
      document.querySelectorAll('[data-testid="piano-key"].active, [data-note].active')
    );
    return activeKeys
      .map((el) => {
        const note = el.getAttribute('data-note');
        return note ? parseInt(note, 10) : null;
      })
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);
  });
}

/**
 * Verify chord display shows expected chord name
 */
export async function expectChordName(page: Page, expectedName: string) {
  const chordDisplay = page.locator('[data-testid="chord-display"]');
  await expect(chordDisplay).toContainText(expectedName);
}

/**
 * Verify specific notes are active on piano keyboard
 */
export async function expectActiveNotes(page: Page, expectedNotes: number[]) {
  const activeNotes = await getActiveNotes(page);
  expect(activeNotes).toEqual(expectedNotes);
}

/**
 * Verify piano keyboard is cleared (no active notes)
 */
export async function expectNoActiveNotes(page: Page) {
  const activeNotes = await getActiveNotes(page);
  expect(activeNotes).toEqual([]);
}

/**
 * Change voicing style using Shift key
 */
export async function cycleVoicingStyle(page: Page, times: number = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press('Shift');
    await page.waitForTimeout(50); // Small delay between cycles
  }
}

/**
 * Transpose octave up
 */
export async function octaveUp(page: Page, times: number = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press('ArrowUp');
  }
}

/**
 * Transpose octave down
 */
export async function octaveDown(page: Page, times: number = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press('ArrowDown');
  }
}

/**
 * Change spread/width
 */
export async function increaseSpread(page: Page, times: number = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press('ArrowRight');
  }
}

export async function decreaseSpread(page: Page, times: number = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press('ArrowLeft');
  }
}

/**
 * Cycle inversion
 */
export async function cycleInversion(page: Page) {
  await page.keyboard.press('ShiftLeft');
}

/**
 * Save preset to slot (1-10, or 0 for slot 10)
 */
export async function savePreset(page: Page, slot: number) {
  const slotKey = slot === 10 ? '0' : slot.toString();
  await page.keyboard.press(`Shift+${slotKey}`);
  await page.waitForTimeout(100); // Wait for save confirmation
}

/**
 * Recall preset from slot (1-10, or 0 for slot 10)
 */
export async function recallPreset(page: Page, slot: number) {
  const slotKey = slot === 10 ? '0' : slot.toString();
  await page.keyboard.press(slotKey);
  await page.waitForTimeout(50); // Wait for recall
}

/**
 * Clear preset from slot
 */
export async function clearPreset(page: Page, slot: number) {
  const slotKey = slot === 10 ? '0' : slot.toString();
  // Assuming Alt+number clears preset (check actual implementation)
  await page.keyboard.press(`Alt+${slotKey}`);
}

/**
 * Open settings panel
 */
export async function openSettings(page: Page) {
  await page.click('[data-testid="open-settings"]');
  await page.waitForSelector('[data-testid="settings-modal"]', { state: 'visible' });
}

/**
 * Close settings panel
 */
export async function closeSettings(page: Page) {
  await page.click('[data-testid="close-settings"]');
  await page.waitForSelector('[data-testid="settings-modal"]', { state: 'hidden' });
}

/**
 * Wait for app to be ready (chord display visible)
 */
export async function waitForAppReady(page: Page) {
  await page.waitForSelector('[data-testid="chord-display"]', { state: 'visible' });
  // Additional wait for any initialization
  await page.waitForTimeout(200);
}
