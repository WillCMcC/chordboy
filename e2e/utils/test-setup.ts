import { Page } from '@playwright/test';

/**
 * Global test setup utilities
 */

/**
 * Reset application state before each test
 * Must be called after navigating to the app (or will navigate for you)
 */
export async function resetAppState(page: Page) {
  // Navigate to app first so we have access to storage APIs
  await page.goto('/');

  // Clear IndexedDB databases
  await page.evaluate(() => {
    const databases = [
      'chordboy-presets',
      'chordboy-patches',
      'chordboy-sequencer',
      'chordboy-settings',
    ];

    return Promise.all(
      databases.map((db) => {
        return new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(db);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve(); // Resolve even on error
          request.onblocked = () => resolve();
        });
      })
    );
  });

  // Clear localStorage
  await page.evaluate(() => {
    localStorage.clear();
  });

  // Clear sessionStorage
  await page.evaluate(() => {
    sessionStorage.clear();
  });
}

/**
 * Initialize app for testing
 * Call after resetAppState to reload with clean state
 */
export async function initializeApp(page: Page) {
  // Reload to apply cleared storage state
  await page.reload();

  // Wait for app to be ready
  await page.waitForSelector('[data-testid="chord-display"]', {
    state: 'visible',
    timeout: 10000,
  });

  // Ensure audio context is started (required for Web Audio tests)
  await page.evaluate(async () => {
    const Tone = (window as any).Tone;
    if (Tone?.context?.state === 'suspended') {
      await Tone.start();
    }
  });

  // Small delay for initialization
  await page.waitForTimeout(200);
}

/**
 * Dismiss tutorial if it appears
 */
export async function dismissTutorial(page: Page) {
  const tutorialModal = page.locator('[data-testid="tutorial-modal"]');

  if (await tutorialModal.isVisible()) {
    await page.click('[data-testid="tutorial-close"], [data-testid="tutorial-skip"]');
    await tutorialModal.waitFor({ state: 'hidden' });
  }
}

/**
 * Enable synth mode (for audio tests)
 */
export async function enableSynth(page: Page) {
  // Open settings
  await page.click('[data-testid="open-settings"]');

  // Enable synth
  const synthToggle = page.locator('[data-testid="synth-enabled"]');
  if (!(await synthToggle.isChecked())) {
    await synthToggle.check();
  }

  // Close settings
  await page.click('[data-testid="close-settings"]');
}

/**
 * Disable synth mode (for MIDI-only tests)
 */
export async function disableSynth(page: Page) {
  await page.click('[data-testid="open-settings"]');

  const synthToggle = page.locator('[data-testid="synth-enabled"]');
  if (await synthToggle.isChecked()) {
    await synthToggle.uncheck();
  }

  await page.click('[data-testid="close-settings"]');
}

/**
 * Set playback mode
 */
export async function setPlaybackMode(page: Page, mode: string) {
  await page.click('[data-testid="open-settings"]');
  await page.selectOption('[data-testid="playback-mode"]', mode);
  await page.click('[data-testid="close-settings"]');
}

/**
 * Get all console errors (for debugging)
 */
export async function getConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return errors;
}

/**
 * Wait for network idle (useful for loading states)
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Take a screenshot for visual regression
 */
export async function takeSnapshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/.screenshots/${name}.png`,
    fullPage: false,
  });
}

/**
 * Mock MIDI device (if CDP available)
 */
export async function mockMIDIDevice(page: Page, deviceName: string, type: 'input' | 'output') {
  // This requires CDP session - only works in Chromium
  try {
    const context = page.context();
    const client = await (context as any).newCDPSession(page);

    await client.send('WebMIDI.enable');
    await client.send('WebMIDI.addVirtualDevice', {
      name: deviceName,
      manufacturer: 'ChordBoy E2E Test',
      type,
    });

    return client;
  } catch (error) {
    console.warn('CDP not available, MIDI mocking skipped:', error);
    return null;
  }
}
