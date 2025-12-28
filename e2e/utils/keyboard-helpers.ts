import { Page, expect } from '@playwright/test';

/**
 * Keyboard mapping for ChordBoy
 * Maps musical concepts to physical keyboard keys
 */

// Root note mappings (left hand) - matches src/lib/keyboardMappings.ts
export const ROOT_KEYS: Record<string, string> = {
  // Row 1 (QWER): C, C#, D, D#
  C: 'q',
  'C#': 'w',
  D: 'e',
  'D#': 'r',
  // Row 2 (ASDF): E, F, F#, G
  E: 'a',
  F: 's',
  'F#': 'd',
  G: 'f',
  // Row 3 (ZXCV): G#, A, A#, B
  'G#': 'z',
  A: 'x',
  'A#': 'c',
  B: 'v',
};

// Quality mappings (right hand) - single keys for basic qualities
export const QUALITY_KEYS: Record<string, string> = {
  major: 'j',
  minor: 'u',
  diminished: 'm',
  augmented: '7',
  dom7: 'k',    // Dominant 7th (adds b7)
  maj7: 'i',    // Major 7th (adds M7)
};

// Extension/alteration mappings
export const EXTENSION_KEYS: Record<string, string> = {
  '9th': 'l',
  '11th': 'o',
  '13th': '.',
  'b5': '/',      // flat5
  '#9': '[',      // sharp9
  'b9': ']',      // flat9
  '#11': "'",     // sharp11
};

// Compound qualities that require multiple keys
const COMPOUND_QUALITIES: Record<string, string[]> = {
  min7: ['minor', 'dom7'],     // Minor 7th = minor + dom7
  minmaj7: ['minor', 'maj7'],  // Minor-major 7th
};

/**
 * Play a chord on the keyboard
 * Keys are held down until releaseAllKeys is called
 */
export async function playChord(
  page: Page,
  root: string,
  quality: string,
  extensions: string[] = []
) {
  const rootKey = ROOT_KEYS[root];

  if (!rootKey) {
    throw new Error(`Unknown root note: ${root}`);
  }

  // Hold down root key
  await page.keyboard.down(rootKey);

  // Handle compound qualities (e.g., min7 = minor + dom7)
  const qualityKeys = COMPOUND_QUALITIES[quality]
    ? COMPOUND_QUALITIES[quality].map(q => QUALITY_KEYS[q])
    : [QUALITY_KEYS[quality]];

  for (const qKey of qualityKeys) {
    if (!qKey) {
      throw new Error(`Unknown quality: ${quality}`);
    }
    await page.keyboard.down(qKey);
  }

  // Hold down extension keys
  for (const ext of extensions) {
    const extKey = EXTENSION_KEYS[ext];
    if (!extKey) {
      throw new Error(`Unknown extension: ${ext}`);
    }
    await page.keyboard.down(extKey);
  }

  // Wait for React state updates to propagate
  await page.waitForTimeout(150);
}

/**
 * Release all keys (simulates releasing hands from keyboard)
 */
export async function releaseAllKeys(page: Page) {
  // Release all possible chord keys
  const allKeys = [
    ...Object.values(ROOT_KEYS),
    ...Object.values(QUALITY_KEYS),
    ...Object.values(EXTENSION_KEYS),
  ];

  for (const key of allKeys) {
    await page.keyboard.up(key);
  }

  // Also release number keys (for preset recall)
  for (let i = 0; i <= 9; i++) {
    await page.keyboard.up(i.toString());
  }

  // Wait for React state updates
  await page.waitForTimeout(100);
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
 * Transpose octave up (ArrowRight in the app)
 */
export async function octaveUp(page: Page, times: number = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press('ArrowRight');
  }
}

/**
 * Transpose octave down (ArrowLeft in the app)
 */
export async function octaveDown(page: Page, times: number = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press('ArrowLeft');
  }
}

/**
 * Change spread/width (ArrowUp/Down in the app)
 */
export async function increaseSpread(page: Page, times: number = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press('ArrowUp');
  }
}

export async function decreaseSpread(page: Page, times: number = 1) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press('ArrowDown');
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
 * NOTE: Chord keys must be held down when calling this function.
 * The save happens when you press the slot number while holding chord keys.
 */
export async function savePreset(page: Page, slot: number) {
  const slotKey = slot === 10 ? '0' : slot.toString();
  // Just press the number key - save happens because chord keys are still held
  await page.keyboard.press(slotKey);
  await page.waitForTimeout(100); // Wait for save confirmation
}

/**
 * Recall preset from slot (1-10, or 0 for slot 10)
 * NOTE: The preset stays active while the key is held. This function
 * holds the key down so subsequent getActiveNotes() calls see the notes.
 * Call releasePreset() or releaseAllKeys() when done.
 */
export async function recallPreset(page: Page, slot: number) {
  const slotKey = slot === 10 ? '0' : slot.toString();
  // Hold the key down to keep the preset active
  await page.keyboard.down(slotKey);
  await page.waitForTimeout(50); // Wait for recall
}

/**
 * Release a recalled preset (release the number key)
 */
export async function releasePreset(page: Page, slot: number) {
  const slotKey = slot === 10 ? '0' : slot.toString();
  await page.keyboard.up(slotKey);
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
