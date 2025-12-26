# End-to-End Testing Strategy for ChordBoy

## Executive Summary

ChordBoy currently has excellent unit test coverage (33 test files) for pure functions and hooks, but lacks end-to-end validation of integrated features in a real browser context. This document outlines a comprehensive E2E testing strategy to validate critical user flows, browser API integrations, and cross-browser compatibility.

**Key Gap**: Current tests mock IndexedDB, Tone.js, and MIDI APIs. E2E tests will validate actual browser behavior, UI interactions, and real API integrations.

---

## 1. Framework Selection: Playwright

### Why Playwright?

**Recommended**: Playwright (preferred over Cypress)

**Advantages**:
- Modern architecture with full browser automation
- Excellent Web API support (Web MIDI, Web Audio, IndexedDB)
- Multi-browser support (Chromium, Firefox, WebKit)
- Built-in viewport emulation for mobile testing
- Trace viewer for debugging failures
- Auto-waiting and stable selectors
- TypeScript native support
- Fast parallel execution

**Installation**:
```bash
npm install -D @playwright/test
npx playwright install
```

**Alternative**: Cypress (if team prefers)
- Better real-time debugging UI
- Time-travel debugging
- Weaker Web MIDI API support (requires more mocking)

---

## 2. Test Organization

### Directory Structure

```
e2e/
├── tests/
│   ├── chord-building.spec.ts       # Core keyboard → chord flow
│   ├── presets.spec.ts              # Save/recall/solve presets
│   ├── sequencer.spec.ts            # Sequencer playback
│   ├── voicing-controls.spec.ts     # Inversion, octave, style
│   ├── synthesis.spec.ts            # Patch editing, sound engine
│   ├── midi-integration.spec.ts     # MIDI device I/O
│   ├── playback-modes.spec.ts       # Arpeggio, strum, patterns
│   ├── mobile.spec.ts               # Mobile UI flows
│   ├── tutorial.spec.ts             # Tutorial completion
│   └── pwa.spec.ts                  # Service worker, offline
├── fixtures/
│   ├── test-midi-device.ts          # Virtual MIDI device fixture
│   ├── audio-capture.ts             # Web Audio analysis helpers
│   └── preset-data.ts               # Test preset configurations
├── utils/
│   ├── keyboard-helpers.ts          # Simulate keyboard input
│   ├── audio-assertions.ts          # Verify audio output
│   └── midi-mocks.ts                # Mock MIDI devices
└── playwright.config.ts             # Playwright configuration
```

---

## 3. Critical User Flows

### Priority 1: Core Functionality

#### 3.1 Chord Building Flow
```typescript
test('builds chord from keyboard input and displays correctly', async ({ page }) => {
  await page.goto('/');

  // Press Q (root C) + J (major)
  await page.keyboard.press('q');
  await page.keyboard.press('j');

  // Verify chord display shows "C"
  await expect(page.locator('[data-testid="chord-display"]'))
    .toContainText('C');

  // Verify piano keyboard highlights C, E, G
  await expect(page.locator('[data-note="60"]')).toHaveClass(/active/);
  await expect(page.locator('[data-note="64"]')).toHaveClass(/active/);
  await expect(page.locator('[data-note="67"]')).toHaveClass(/active/);

  // Release keys
  await page.keyboard.up('q');
  await page.keyboard.up('j');

  // Verify highlights cleared
  await expect(page.locator('[data-note="60"]')).not.toHaveClass(/active/);
});

test('adds extensions and alterations', async ({ page }) => {
  await page.goto('/');

  // F#m9b5 (A + U + L + [)
  await page.keyboard.press('a');  // F
  await page.keyboard.press('u');  // minor
  await page.keyboard.press('l');  // 9th
  await page.keyboard.press('[');  // b5

  await expect(page.locator('[data-testid="chord-display"]'))
    .toContainText('Fm9♭5');
});
```

#### 3.2 Preset Save/Recall
```typescript
test('saves and recalls presets', async ({ page }) => {
  await page.goto('/');

  // Build a chord
  await page.keyboard.press('q');  // C
  await page.keyboard.press('k');  // dom7

  // Save to slot 1
  await page.keyboard.press('Shift+1');

  // Verify visual confirmation
  await expect(page.locator('[data-preset="1"]')).toHaveClass(/saved/);

  // Clear chord
  await page.keyboard.up('q');
  await page.keyboard.up('k');

  // Recall preset
  await page.keyboard.press('1');

  // Verify chord restored
  await expect(page.locator('[data-testid="chord-display"]'))
    .toContainText('C7');

  // Reload page to verify IndexedDB persistence
  await page.reload();
  await page.keyboard.press('1');
  await expect(page.locator('[data-testid="chord-display"]'))
    .toContainText('C7');
});

test('solves voicings across preset progression', async ({ page }) => {
  await page.goto('/');

  // Create ii-V-I progression
  // Preset 1: Dm7
  await page.keyboard.press('w');  // D
  await page.keyboard.press('u');  // m
  await page.keyboard.press('k');  // 7
  await page.keyboard.press('Shift+1');
  await page.keyboard.up('w');
  await page.keyboard.up('u');
  await page.keyboard.up('k');

  // Preset 2: G7
  await page.keyboard.press('f');  // G
  await page.keyboard.press('k');  // 7
  await page.keyboard.press('Shift+2');
  await page.keyboard.up('f');
  await page.keyboard.up('k');

  // Preset 3: Cmaj7
  await page.keyboard.press('q');  // C
  await page.keyboard.press('i');  // maj7
  await page.keyboard.press('Shift+3');

  // Click "Solve" button
  await page.click('[data-testid="solve-voicings"]');

  // Verify voicings optimized (check for specific notes in solved voicings)
  await page.keyboard.press('1');
  const dm7Notes = await page.locator('[data-testid="active-notes"]').textContent();

  await page.keyboard.press('2');
  const g7Notes = await page.locator('[data-testid="active-notes"]').textContent();

  // Assert voice leading: highest note in Dm7 should move minimally to G7
  // (This requires more specific selectors for individual notes)
});
```

#### 3.3 Voicing Controls
```typescript
test('cycles through voicing styles', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('q');  // C
  await page.keyboard.press('j');  // major

  // Default style (close)
  let notes = await getNoteArray(page);
  expect(notes).toEqual([48, 52, 55]);  // C3, E3, G3

  // Cycle to drop2
  await page.keyboard.press('Shift');
  notes = await getNoteArray(page);
  expect(notes).toEqual([48, 55, 60, 64]);  // C3, G3, C4, E4

  // Cycle to drop3
  await page.keyboard.press('Shift');
  notes = await getNoteArray(page);
  expect(notes).toEqual([48, 52, 60, 64]);  // C3, E3, C4, E4
});

test('transposes octave up/down', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('q');
  await page.keyboard.press('j');

  let notes = await getNoteArray(page);
  const originalOctave = Math.floor(notes[0] / 12);

  // Octave up
  await page.keyboard.press('ArrowUp');
  notes = await getNoteArray(page);
  expect(Math.floor(notes[0] / 12)).toBe(originalOctave + 1);

  // Octave down
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  notes = await getNoteArray(page);
  expect(Math.floor(notes[0] / 12)).toBe(originalOctave - 1);
});
```

#### 3.4 Sequencer
```typescript
test('plays sequencer pattern with correct timing', async ({ page }) => {
  await page.goto('/');

  // Set up presets 1-4
  // (Abbreviated for clarity)

  // Open sequencer
  await page.click('[data-testid="open-sequencer"]');

  // Configure: 4 steps, 4 steps per beat, 120 BPM
  await page.selectOption('[data-testid="num-steps"]', '4');
  await page.selectOption('[data-testid="steps-per-beat"]', '4');
  await page.fill('[data-testid="bpm-input"]', '120');

  // Enable presets 1-4
  await page.click('[data-testid="step-0-preset-1"]');
  await page.click('[data-testid="step-1-preset-2"]');
  await page.click('[data-testid="step-2-preset-3"]');
  await page.click('[data-testid="step-3-preset-4"]');

  // Start playback
  await page.click('[data-testid="sequencer-play"]');

  // Wait for 4 beats (2 seconds at 120 BPM)
  await page.waitForTimeout(2000);

  // Verify each preset was triggered (check event log or visual indicator)
  await expect(page.locator('[data-testid="step-0"]')).toHaveClass(/played/);
  await expect(page.locator('[data-testid="step-1"]')).toHaveClass(/played/);
  await expect(page.locator('[data-testid="step-2"]')).toHaveClass(/played/);
  await expect(page.locator('[data-testid="step-3"]')).toHaveClass(/played/);

  // Stop playback
  await page.click('[data-testid="sequencer-stop"]');
});
```

### Priority 2: Browser API Integration

#### 3.5 MIDI Device I/O
```typescript
test('connects to MIDI device and sends notes', async ({ page, context }) => {
  // Grant MIDI permission
  await context.grantPermissions(['midi']);

  // Mock MIDI device using CDP (Chrome DevTools Protocol)
  const client = await context.newCDPSession(page);
  await client.send('WebMIDI.enable');
  await client.send('WebMIDI.addVirtualDevice', {
    name: 'Test MIDI Device',
    manufacturer: 'ChordBoy Test',
    type: 'output'
  });

  await page.goto('/');

  // Open settings
  await page.click('[data-testid="open-settings"]');

  // Select MIDI device
  await page.selectOption('[data-testid="midi-output"]', 'Test MIDI Device');

  // Play a chord
  await page.keyboard.press('q');
  await page.keyboard.press('j');

  // Listen for MIDI messages via CDP
  const midiMessages = [];
  client.on('WebMIDI.messageReceived', (event) => {
    midiMessages.push(event.data);
  });

  await page.waitForTimeout(100);

  // Verify note-on messages sent
  expect(midiMessages).toContainEqual(
    expect.objectContaining({
      type: 'noteon',
      note: 60,  // C
      velocity: expect.any(Number)
    })
  );
});

test('receives MIDI input from external device', async ({ page, context }) => {
  await context.grantPermissions(['midi']);

  const client = await context.newCDPSession(page);
  await client.send('WebMIDI.enable');
  await client.send('WebMIDI.addVirtualDevice', {
    name: 'Test MIDI Input',
    type: 'input'
  });

  await page.goto('/');
  await page.click('[data-testid="open-settings"]');
  await page.selectOption('[data-testid="midi-input"]', 'Test MIDI Input');

  // Send MIDI note via CDP
  await client.send('WebMIDI.sendMessage', {
    device: 'Test MIDI Input',
    data: [0x90, 60, 100]  // Note-on C4, velocity 100
  });

  // Verify piano key lights up
  await expect(page.locator('[data-note="60"]')).toHaveClass(/active/);
});
```

**Note**: Web MIDI API mocking in Playwright requires CDP. Alternative: use virtual MIDI devices at OS level (loopMIDI on Windows, IAC Driver on macOS).

#### 3.6 Web Audio Synthesis
```typescript
test('produces audio output when synth is enabled', async ({ page }) => {
  await page.goto('/');

  // Enable synth mode
  await page.click('[data-testid="open-settings"]');
  await page.check('[data-testid="synth-enabled"]');
  await page.click('[data-testid="close-settings"]');

  // Capture audio context state
  const audioContextState = await page.evaluate(() => {
    return (window as any).__TONE_AUDIO_CONTEXT__.state;
  });
  expect(audioContextState).toBe('running');

  // Play a chord
  await page.keyboard.press('q');
  await page.keyboard.press('j');

  // Verify synth voices are active
  const activeVoices = await page.evaluate(() => {
    return (window as any).__SYNTH_DEBUG__.getActiveVoices();
  });
  expect(activeVoices).toBeGreaterThan(0);

  // Release chord
  await page.keyboard.up('q');
  await page.keyboard.up('j');

  // Wait for release envelope
  await page.waitForTimeout(1000);

  const releasedVoices = await page.evaluate(() => {
    return (window as any).__SYNTH_DEBUG__.getActiveVoices();
  });
  expect(releasedVoices).toBe(0);
});

test('updates patch parameters in real-time', async ({ page }) => {
  await page.goto('/');

  // Open patch builder
  await page.click('[data-testid="open-patch-builder"]');

  // Adjust filter cutoff
  const initialCutoff = await page.inputValue('[data-testid="filter-cutoff"]');
  await page.fill('[data-testid="filter-cutoff"]', '2000');

  // Verify synth parameter updated
  const newCutoff = await page.evaluate(() => {
    return (window as any).__SYNTH_DEBUG__.getFilterCutoff();
  });
  expect(newCutoff).toBe(2000);

  // Play a chord and verify filtered sound
  await page.keyboard.press('q');
  await page.keyboard.press('j');

  // (Could capture audio buffer and verify frequency content, but complex)
});
```

**Challenge**: Web Audio API produces actual sound, but asserting on audio quality is difficult. Solutions:
1. Use `OfflineAudioContext` for deterministic testing
2. Expose synth state via `window.__SYNTH_DEBUG__` (development mode only)
3. Use `AnalyserNode` to verify frequency content

#### 3.7 IndexedDB Persistence
```typescript
test('persists presets across sessions', async ({ page, context }) => {
  await page.goto('/');

  // Save a preset
  await page.keyboard.press('q');
  await page.keyboard.press('j');
  await page.keyboard.press('Shift+5');

  // Close and reopen page (new context)
  await page.close();
  const newPage = await context.newPage();
  await newPage.goto('/');

  // Recall preset
  await newPage.keyboard.press('5');

  // Verify chord loaded
  await expect(newPage.locator('[data-testid="chord-display"]'))
    .toContainText('C');
});

test('persists custom patches', async ({ page }) => {
  await page.goto('/');

  // Create custom patch
  await page.click('[data-testid="open-patch-builder"]');
  await page.fill('[data-testid="patch-name"]', 'Test Patch');
  await page.fill('[data-testid="osc1-detune"]', '7');
  await page.click('[data-testid="save-patch"]');

  // Reload page
  await page.reload();

  // Load custom patch
  await page.click('[data-testid="open-patch-builder"]');
  await page.selectOption('[data-testid="patch-select"]', 'Test Patch');

  // Verify parameters loaded
  await expect(page.locator('[data-testid="osc1-detune"]'))
    .toHaveValue('7');
});
```

### Priority 3: Mobile & Responsive

#### 3.8 Mobile UI
```typescript
test('mobile virtual keyboard triggers chords', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  // Tap root button (C)
  await page.click('[data-testid="mobile-root-C"]');

  // Tap quality button (major)
  await page.click('[data-testid="mobile-quality-major"]');

  // Verify chord display
  await expect(page.locator('[data-testid="chord-display"]'))
    .toContainText('C');

  // Tap grace note strip
  await page.click('[data-testid="grace-note-E"]');

  // Verify E note re-articulated (visual feedback or event log)
});

test('mobile layout shows combined transport panel', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  // Verify mobile-specific components visible
  await expect(page.locator('[data-testid="mobile-transport"]')).toBeVisible();
  await expect(page.locator('[data-testid="grace-note-strip"]')).toBeVisible();

  // Verify desktop components hidden
  await expect(page.locator('[data-testid="desktop-transport"]')).not.toBeVisible();
});
```

### Priority 4: Advanced Features

#### 3.9 Playback Modes
```typescript
test('arpeggios notes in sequence', async ({ page }) => {
  await page.goto('/');

  // Set playback mode to arpeggio
  await page.click('[data-testid="open-settings"]');
  await page.selectOption('[data-testid="playback-mode"]', 'arpeggio');
  await page.selectOption('[data-testid="arpeggio-direction"]', 'up');
  await page.click('[data-testid="close-settings"]');

  // Play chord
  await page.keyboard.press('q');
  await page.keyboard.press('j');

  // Capture note triggers over time
  const noteTriggers = [];
  page.on('console', msg => {
    if (msg.text().includes('NOTE_TRIGGERED')) {
      noteTriggers.push(JSON.parse(msg.text().split(':')[1]));
    }
  });

  await page.waitForTimeout(500);

  // Verify notes triggered in ascending order
  expect(noteTriggers.map(n => n.note)).toEqual([48, 52, 55]);  // C, E, G
  expect(noteTriggers[1].time - noteTriggers[0].time).toBeGreaterThan(0);
});

test('strum adds timing humanization', async ({ page }) => {
  await page.goto('/');

  await page.click('[data-testid="open-settings"]');
  await page.check('[data-testid="strum-enabled"]');
  await page.fill('[data-testid="strum-time"]', '50');
  await page.click('[data-testid="close-settings"]');

  // Play chord
  await page.keyboard.press('q');
  await page.keyboard.press('j');

  // Verify notes triggered with strum delay
  // (Similar to arpeggio test, but check for specific strum timing)
});
```

#### 3.10 Tutorial Flow
```typescript
test('completes tutorial and persists completion', async ({ page }) => {
  await page.goto('/');

  // Tutorial should auto-open for new users
  await expect(page.locator('[data-testid="tutorial-modal"]')).toBeVisible();

  // Step 1: Root note
  await expect(page.locator('[data-testid="tutorial-step"]'))
    .toContainText('Press Q to play a C root note');

  await page.keyboard.press('q');

  // Step 2: Quality
  await expect(page.locator('[data-testid="tutorial-step"]'))
    .toContainText('Press J for major');

  await page.keyboard.press('j');

  // Continue through tutorial steps...
  // (Steps vary based on tutorialLogic.ts conditions)

  // Close tutorial
  await page.click('[data-testid="tutorial-close"]');

  // Reload page
  await page.reload();

  // Verify tutorial doesn't reopen
  await expect(page.locator('[data-testid="tutorial-modal"]'))
    .not.toBeVisible();
});
```

#### 3.11 PWA Installation
```typescript
test('shows install prompt and installs as PWA', async ({ page, context }) => {
  // This test requires special setup - PWA install prompts are browser-controlled

  await page.goto('/');

  // Trigger beforeinstallprompt event
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    (event as any).prompt = () => Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });

  // Verify install button appears
  await expect(page.locator('[data-testid="pwa-install"]')).toBeVisible();

  // Click install
  await page.click('[data-testid="pwa-install"]');

  // Verify install prompt triggered
  const installOutcome = await page.evaluate(() => {
    return (window as any).__PWA_INSTALL_OUTCOME__;
  });
  expect(installOutcome).toBe('accepted');
});

test('works offline after service worker installation', async ({ page, context }) => {
  await page.goto('/');

  // Wait for service worker to register
  await page.waitForFunction(() => {
    return navigator.serviceWorker.controller !== null;
  });

  // Go offline
  await context.setOffline(true);

  // Reload page
  await page.reload();

  // Verify app still loads
  await expect(page.locator('[data-testid="chord-display"]')).toBeVisible();

  // Verify functionality works
  await page.keyboard.press('q');
  await page.keyboard.press('j');
  await expect(page.locator('[data-testid="chord-display"]'))
    .toContainText('C');
});
```

---

## 4. Test Helpers & Utilities

### 4.1 Keyboard Helpers
```typescript
// e2e/utils/keyboard-helpers.ts

export async function playChord(
  page: Page,
  root: string,
  quality: string,
  extensions: string[] = []
) {
  const rootMap = {
    C: 'q', 'C#': 'a', D: 'w', 'D#': 's', E: 'e', F: 'r',
    'F#': 'd', G: 'f', 'G#': 'g', A: 'v', 'A#': 'h', B: 'b'
  };

  const qualityMap = {
    major: 'j',
    minor: 'u',
    diminished: 'm',
    augmented: '7',
    dom7: 'k',
    maj7: 'i',
    // ...
  };

  await page.keyboard.press(rootMap[root]);
  await page.keyboard.press(qualityMap[quality]);

  for (const ext of extensions) {
    await page.keyboard.press(ext);
  }
}

export async function releaseAllKeys(page: Page) {
  await page.keyboard.press('Escape');  // Assuming Escape clears all
}

export async function getNoteArray(page: Page): Promise<number[]> {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.piano-key.active'))
      .map(el => parseInt(el.getAttribute('data-note') || '0'))
      .sort((a, b) => a - b);
  });
}
```

### 4.2 Audio Assertions
```typescript
// e2e/utils/audio-assertions.ts

export async function expectSynthPlaying(page: Page) {
  const isPlaying = await page.evaluate(() => {
    return (window as any).__SYNTH_DEBUG__?.isPlaying() ?? false;
  });
  expect(isPlaying).toBe(true);
}

export async function expectActiveVoiceCount(page: Page, count: number) {
  const activeVoices = await page.evaluate(() => {
    return (window as any).__SYNTH_DEBUG__?.getActiveVoices() ?? 0;
  });
  expect(activeVoices).toBe(count);
}

export async function captureAudioBuffer(page: Page, durationMs: number) {
  // Use OfflineAudioContext for deterministic audio capture
  return await page.evaluate((duration) => {
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, sampleRate * duration / 1000, sampleRate);
    // Connect synth to offline context
    // Render and return buffer data
  }, durationMs);
}
```

### 4.3 Test Fixtures
```typescript
// e2e/fixtures/preset-data.ts

export const TEST_PRESETS = {
  ii_V_I: [
    { slot: 1, root: 'D', quality: 'minor', extensions: ['7'] },
    { slot: 2, root: 'G', quality: 'dom7', extensions: [] },
    { slot: 3, root: 'C', quality: 'maj7', extensions: [] },
  ],
  modal_vamps: [
    { slot: 1, root: 'D', quality: 'minor', extensions: ['9'] },
    { slot: 2, root: 'E', quality: 'minor', extensions: ['9'] },
  ],
  // ...
};

export async function loadPresetFixture(page: Page, fixtureName: keyof typeof TEST_PRESETS) {
  for (const preset of TEST_PRESETS[fixtureName]) {
    await playChord(page, preset.root, preset.quality, preset.extensions);
    await page.keyboard.press(`Shift+${preset.slot}`);
    await releaseAllKeys(page);
  }
}
```

---

## 5. CI/CD Integration

### 5.1 GitHub Actions Workflow
```yaml
# .github/workflows/e2e-tests.yml

name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e:
    timeout-minutes: 15
    runs-on: ubuntu-latest

    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
        shard: [1, 2, 3, 4]  # Parallel execution

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Build app
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test --project=${{ matrix.browser }} --shard=${{ matrix.shard }}/4

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.browser }}-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 7

      - name: Upload trace on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces-${{ matrix.browser }}-${{ matrix.shard }}
          path: test-results/
          retention-days: 7
```

### 5.2 Playwright Config
```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github'],  // GitHub Actions annotations
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Enable Web MIDI API
        launchOptions: {
          args: ['--enable-features=WebMIDI']
        }
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

---

## 6. Mocking Strategy

### 6.1 When to Mock vs. Real APIs

| API | E2E Approach | Rationale |
|-----|--------------|-----------|
| **IndexedDB** | Real | Native browser support, critical for persistence testing |
| **Web Audio** | Real (with debug hooks) | Core functionality, need real Tone.js behavior |
| **Web MIDI** | Mock via CDP or virtual devices | Hardware-dependent, unreliable in CI |
| **BLE MIDI** | Mock | Requires Bluetooth hardware |
| **Service Worker** | Real | PWA functionality is browser-controlled |
| **Network Requests** | Mock | No external APIs in ChordBoy (static app) |

### 6.2 Exposing Debug Hooks

Add debug interface for E2E tests (development mode only):

```typescript
// src/lib/synthDebug.ts

export function enableSynthDebug(synthInstance: CustomSynthEngine) {
  if (import.meta.env.MODE !== 'development') return;

  (window as any).__SYNTH_DEBUG__ = {
    getActiveVoices: () => synthInstance.voices.filter(v => v.isPlaying).length,
    getFilterCutoff: () => synthInstance.filter.frequency.value,
    isPlaying: () => synthInstance.voices.some(v => v.isPlaying),
    getCurrentPatch: () => synthInstance.currentPatch,
    // ...
  };
}
```

### 6.3 Virtual MIDI Devices

**Option 1: Chrome DevTools Protocol (CDP)**
```typescript
// e2e/utils/midi-mocks.ts

export async function createVirtualMIDIDevice(
  context: BrowserContext,
  page: Page,
  config: { name: string; type: 'input' | 'output' }
) {
  const client = await context.newCDPSession(page);
  await client.send('WebMIDI.enable');
  await client.send('WebMIDI.addVirtualDevice', {
    name: config.name,
    manufacturer: 'ChordBoy E2E',
    type: config.type,
  });

  return {
    sendNoteOn: async (note: number, velocity: number) => {
      await client.send('WebMIDI.sendMessage', {
        device: config.name,
        data: [0x90, note, velocity],
      });
    },
    sendNoteOff: async (note: number) => {
      await client.send('WebMIDI.sendMessage', {
        device: config.name,
        data: [0x80, note, 0],
      });
    },
  };
}
```

**Option 2: OS-level virtual MIDI**
- macOS: IAC Driver (Audio MIDI Setup)
- Windows: loopMIDI, virtualMIDI
- Linux: virmidi kernel module

Requires CI runner configuration, less portable.

---

## 7. Coverage Goals

### 7.1 Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Critical user flows** | 100% | All Priority 1 tests passing |
| **Browser compatibility** | 95% | Chromium, Firefox, WebKit |
| **Mobile flows** | 90% | Touch interactions, responsive UI |
| **Regression protection** | 85% | Key features don't break on PRs |
| **Performance** | <30s | Total E2E suite execution time (sharded) |

### 7.2 Test Distribution

```
Priority 1 (Critical Flows): 40 tests
  - Chord building: 10 tests
  - Presets: 8 tests
  - Voicing controls: 6 tests
  - Sequencer: 8 tests
  - Grace notes: 4 tests
  - Settings persistence: 4 tests

Priority 2 (Browser APIs): 25 tests
  - MIDI I/O: 10 tests
  - Web Audio: 8 tests
  - IndexedDB: 4 tests
  - Service Worker: 3 tests

Priority 3 (Mobile & Responsive): 15 tests
  - Mobile UI: 8 tests
  - Touch interactions: 4 tests
  - Viewport switching: 3 tests

Priority 4 (Advanced Features): 20 tests
  - Playback modes: 8 tests
  - Tutorial: 4 tests
  - Patch builder: 6 tests
  - PWA: 2 tests

Total: ~100 E2E tests
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Install Playwright and configure projects
2. Set up directory structure
3. Create test helpers and fixtures
4. Write first 5 critical tests:
   - Basic chord building
   - Preset save/recall
   - Voicing style cycling
   - Settings persistence
   - Mobile virtual keyboard

**Deliverable**: CI pipeline running 5 core tests on every PR

### Phase 2: Core Flows (Week 3-4)
5. Expand Priority 1 tests (chord building, presets, sequencer)
6. Add keyboard helper utilities
7. Implement audio debug hooks
8. Add visual regression testing (screenshots)

**Deliverable**: 40 Priority 1 tests covering all critical user flows

### Phase 3: Browser APIs (Week 5-6)
9. Set up MIDI mocking via CDP
10. Add Web Audio assertions
11. Test IndexedDB persistence edge cases
12. Cross-browser compatibility fixes

**Deliverable**: 65 tests total, 3 browsers supported

### Phase 4: Advanced Features (Week 7-8)
13. Mobile/responsive tests
14. Playback modes and advanced features
15. Tutorial flow validation
16. PWA installation and offline mode

**Deliverable**: 100 tests total, full feature coverage

### Phase 5: Optimization (Week 9-10)
17. Parallelize test execution (sharding)
18. Reduce flakiness (improve selectors, waits)
19. Performance optimization (<30s total)
20. Documentation and team training

**Deliverable**: Production-ready E2E suite with <5% flake rate

---

## 9. Best Practices

### 9.1 Selector Strategy

**Priority order**:
1. `data-testid` attributes (add to components)
2. ARIA labels (`role`, `aria-label`)
3. Text content (for unique labels)
4. CSS classes (as last resort)

**Example**:
```tsx
// Add to components
<button data-testid="open-settings">Settings</button>
<div data-testid="chord-display">{chordName}</div>
<div data-testid="piano-key" data-note={midiNote} />
```

### 9.2 Avoiding Flakiness

1. **Use auto-waiting**: Playwright waits for elements automatically
2. **Avoid hard timeouts**: Use `waitForSelector` instead of `waitForTimeout`
3. **Stable state assertions**: Wait for animations/transitions to complete
4. **Retry assertions**: Use `expect().toBe()` with Playwright's auto-retry
5. **Isolated tests**: Each test should reset state (clear IndexedDB, reset settings)

```typescript
// Good: Auto-waiting
await expect(page.locator('[data-testid="chord-display"]')).toHaveText('C');

// Bad: Hard timeout
await page.waitForTimeout(1000);
expect(await page.textContent('[data-testid="chord-display"]')).toBe('C');
```

### 9.3 Test Independence

```typescript
// Reset state before each test
test.beforeEach(async ({ page }) => {
  // Clear IndexedDB
  await page.evaluate(() => {
    indexedDB.deleteDatabase('chordboy-presets');
    indexedDB.deleteDatabase('chordboy-patches');
    indexedDB.deleteDatabase('chordboy-sequencer');
  });

  // Reset localStorage
  await page.evaluate(() => localStorage.clear());

  // Fresh page load
  await page.goto('/');
});
```

### 9.4 Debugging Failed Tests

1. **Trace viewer**: `npx playwright show-trace trace.zip`
2. **Screenshots**: Auto-captured on failure
3. **Video**: Enabled for failed tests
4. **Debug mode**: `npx playwright test --debug`
5. **Headed mode**: `npx playwright test --headed` (see browser)

---

## 10. Success Metrics

### 10.1 Regression Detection

**Goal**: Catch breaking changes before deployment

**Metrics**:
- E2E suite runs on every PR
- PR cannot merge if E2E tests fail
- Flake rate <5% (tests should be reliable)

### 10.2 Developer Experience

**Goal**: Fast feedback loop

**Metrics**:
- Local test execution: <2 minutes for critical flows subset
- Full suite (sharded in CI): <5 minutes
- Clear failure messages with traces

### 10.3 Production Confidence

**Goal**: Ship with confidence

**Metrics**:
- Zero critical bugs in last 6 months that E2E tests should have caught
- Cross-browser compatibility verified for every release
- Mobile experience validated before deploy

---

## 11. Maintenance Plan

### 11.1 Test Ownership

- **Core flows**: Owned by backend team (chord engine, MIDI)
- **UI interactions**: Owned by frontend team (React components)
- **Mobile**: Owned by mobile specialist
- **CI/CD**: Owned by DevOps

### 11.2 Review Process

1. New features **must** include E2E tests in PR
2. E2E test failures block PR merge
3. Flaky tests addressed within 24 hours
4. Quarterly review of test coverage gaps

### 11.3 Tooling Updates

- Playwright: Update monthly to latest stable
- Review new Playwright features quarterly
- Audit deprecated APIs and replace

---

## 12. Appendix: Example Full Test

```typescript
// e2e/tests/chord-building.spec.ts

import { test, expect } from '@playwright/test';
import { playChord, releaseAllKeys, getNoteArray } from '../utils/keyboard-helpers';

test.describe('Chord Building', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to initialize
    await expect(page.locator('[data-testid="chord-display"]')).toBeVisible();
  });

  test('builds major triad from keyboard input', async ({ page }) => {
    await playChord(page, 'C', 'major');

    // Verify chord name
    await expect(page.locator('[data-testid="chord-display"]'))
      .toContainText('C');

    // Verify piano keys highlighted
    const activeNotes = await getNoteArray(page);
    expect(activeNotes).toEqual([48, 52, 55]);  // C3, E3, G3

    // Verify note count
    await expect(page.locator('[data-testid="note-count"]'))
      .toHaveText('3 notes');

    await releaseAllKeys(page);

    // Verify cleared
    const clearedNotes = await getNoteArray(page);
    expect(clearedNotes).toEqual([]);
  });

  test('adds 9th extension to chord', async ({ page }) => {
    await page.keyboard.press('q');  // C
    await page.keyboard.press('k');  // dom7
    await page.keyboard.press('l');  // 9th

    await expect(page.locator('[data-testid="chord-display"]'))
      .toContainText('C9');

    const notes = await getNoteArray(page);
    expect(notes).toContain(50);  // D (9th) = C + 2 semitones = 48 + 2
  });

  test('cycles through voicing styles', async ({ page }) => {
    await playChord(page, 'C', 'major');

    // Default: close voicing
    let notes = await getNoteArray(page);
    expect(notes).toEqual([48, 52, 55]);

    // Shift to drop2
    await page.keyboard.press('Shift');
    notes = await getNoteArray(page);
    expect(notes.length).toBeGreaterThan(3);  // Drop2 has wider spread

    // Verify voicing indicator updated
    await expect(page.locator('[data-testid="voicing-style"]'))
      .toContainText('drop2');
  });

  test('transposes octave with arrow keys', async ({ page }) => {
    await playChord(page, 'C', 'major');

    const originalNotes = await getNoteArray(page);
    const lowestNote = originalNotes[0];

    // Octave up
    await page.keyboard.press('ArrowUp');
    const transposedNotes = await getNoteArray(page);
    expect(transposedNotes[0]).toBe(lowestNote + 12);

    // Octave down (x2 to go below original)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const loweredNotes = await getNoteArray(page);
    expect(loweredNotes[0]).toBe(lowestNote - 12);
  });

  test('handles complex altered chord', async ({ page }) => {
    // G7#5#9 (altered dominant)
    await page.keyboard.press('f');  // G
    await page.keyboard.press('k');  // dom7
    await page.keyboard.press(']');  // #5
    await page.keyboard.press('l');  // 9th
    await page.keyboard.press(']');  // #9

    await expect(page.locator('[data-testid="chord-display"]'))
      .toContainText('G7♯5♯9');

    // Verify #5 (D# = 56) and #9 (A# = 58) are included
    const notes = await getNoteArray(page);
    expect(notes).toContain(56);  // D# (#5 above G)
    expect(notes).toContain(58);  // A# (#9)
  });
});
```

---

## Conclusion

This E2E testing strategy provides comprehensive coverage of ChordBoy's critical user flows, browser API integrations, and cross-platform compatibility. By implementing Playwright tests in phases and integrating with CI/CD, you'll achieve:

1. **Confidence**: Ship features knowing they work in real browsers
2. **Regression protection**: Catch breaking changes before users do
3. **Cross-browser validation**: Ensure consistent experience
4. **Mobile quality**: Validate touch interactions and responsive UI
5. **Fast feedback**: Developers know immediately if their changes break features

**Next Steps**:
1. Review and approve this strategy
2. Install Playwright: `npm install -D @playwright/test`
3. Create `e2e/` directory structure
4. Implement Phase 1 (5 critical tests)
5. Add to CI pipeline

**Questions to Address**:
- Do you want visual regression testing (screenshot comparisons)?
- Should we prioritize mobile or desktop tests first?
- Are there specific browsers/devices to prioritize?
- What's the acceptable flake rate threshold?
