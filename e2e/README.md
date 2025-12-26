# ChordBoy E2E Tests

End-to-end tests for ChordBoy using Playwright, covering desktop and mobile user flows, visual regression, and browser API integration.

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with debugger
npm run test:e2e:debug

# Update visual regression screenshots
npm run test:e2e:update-snapshots

# View test report
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── tests/                      # Test files
│   ├── chord-building.spec.ts  # Chord construction (23 tests)
│   ├── voicing-controls.spec.ts # Voicing transforms (17 tests)
│   ├── presets.spec.ts         # Preset system (15 tests)
│   ├── sequencer.spec.ts       # Sequencer (18 tests)
│   ├── mobile.spec.ts          # Mobile UI (25 tests)
│   └── visual-regression.spec.ts # Screenshots (28 tests)
├── utils/                      # Test utilities
│   ├── keyboard-helpers.ts     # Keyboard simulation
│   ├── audio-assertions.ts     # Web Audio assertions
│   └── test-setup.ts           # Setup/teardown helpers
├── fixtures/                   # Test data
│   └── preset-data.ts          # Chord progression fixtures
└── .screenshots/               # Visual regression baselines
```

**Total: 126 tests** across 6 test files

## Test Coverage

### Desktop Tests
- ✅ Chord building (triads, 7ths, extensions, alterations)
- ✅ Voicing controls (styles, octaves, inversions, spread)
- ✅ Preset save/recall with IndexedDB persistence
- ✅ Voice leading solver
- ✅ Sequencer playback and configuration
- ✅ Settings panel

### Mobile Tests (Pixel 5 viewport)
- ✅ Virtual keyboard buttons (roots, qualities, extensions)
- ✅ Grace note strip
- ✅ Touch interactions
- ✅ Mobile transport panel
- ✅ Responsive layout

### Visual Regression
- ✅ Chord display states
- ✅ Piano keyboard highlighting
- ✅ Preset panel
- ✅ Settings and sequencer modals
- ✅ Desktop, mobile, and tablet layouts

## Running Specific Tests

```bash
# Run single test file
npx playwright test chord-building

# Run mobile tests only
npx playwright test mobile --project=chromium-mobile

# Run desktop tests only
npx playwright test --project=chromium-desktop

# Run specific test by name
npx playwright test -g "builds major triad"

# Run visual regression only
npx playwright test visual-regression
```

## Debugging Failed Tests

### View Traces
```bash
# Traces are automatically captured on first retry
npx playwright show-trace test-results/.../trace.zip
```

### Debug Mode
```bash
# Runs tests with Playwright Inspector
npm run test:e2e:debug
```

### Headed Mode
```bash
# See the browser while tests run
npm run test:e2e:headed
```

### Update Screenshots
```bash
# If visual regression fails due to intentional UI changes
npm run test:e2e:update-snapshots
```

## CI/CD Integration

E2E tests run automatically on:
- ✅ Push to `main` or `develop` branches
- ✅ Pull requests to `main` or `develop`

See `.github/workflows/e2e-tests.yml` for configuration.

### Parallelization
Tests are split into 4 shards for faster CI execution:
- Shard 1/4
- Shard 2/4
- Shard 3/4
- Shard 4/4

Total CI runtime: **~5 minutes** (parallelized)

### Flake Tolerance
- **2% flake tolerance** (2 retries in CI)
- Success rate target: **98%+**

## Writing New Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';
import { playChord, expectChordName } from '../utils/keyboard-helpers';
import { resetAppState, initializeApp, dismissTutorial } from '../utils/test-setup';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);
    await initializeApp(page);
    await dismissTutorial(page);
  });

  test('specific behavior', async ({ page }) => {
    // Arrange
    await playChord(page, 'C', 'major');

    // Act
    await page.keyboard.press('Shift');

    // Assert
    await expectChordName(page, 'C');
  });
});
```

### Best Practices

1. **Use data-testid selectors**
   ```typescript
   await page.click('[data-testid="open-settings"]');
   ```

2. **Reset state before each test**
   ```typescript
   test.beforeEach(async ({ page }) => {
     await resetAppState(page); // Clears IndexedDB, localStorage
     await initializeApp(page);
   });
   ```

3. **Use helper functions**
   ```typescript
   import { playChord, releaseAllKeys } from '../utils/keyboard-helpers';
   await playChord(page, 'C', 'major', ['9th']);
   ```

4. **Avoid hard timeouts**
   ```typescript
   // Bad
   await page.waitForTimeout(1000);

   // Good
   await page.waitForSelector('[data-testid="chord-display"]');
   ```

5. **Use auto-retry assertions**
   ```typescript
   // Playwright will retry until timeout or success
   await expect(page.locator('[data-testid="chord-display"]'))
     .toContainText('C');
   ```

## Test Helpers

### Keyboard Helpers (`keyboard-helpers.ts`)
```typescript
playChord(page, root, quality, extensions)
releaseAllKeys(page)
getActiveNotes(page)
expectChordName(page, name)
cycleVoicingStyle(page, times)
octaveUp(page, times)
savePreset(page, slot)
recallPreset(page, slot)
```

### Audio Assertions (`audio-assertions.ts`)
```typescript
expectAudioContextRunning(page)
expectSynthPlaying(page)
expectActiveVoiceCount(page, count)
getCurrentPatchName(page)
```

### Test Setup (`test-setup.ts`)
```typescript
resetAppState(page)
initializeApp(page)
dismissTutorial(page)
enableSynth(page)
setPlaybackMode(page, mode)
```

### Fixtures (`preset-data.ts`)
```typescript
import { II_V_I_C, ALTERED_DOMINANTS } from '../fixtures/preset-data';
```

## Troubleshooting

### Tests fail locally but pass in CI
- Ensure you're on the same Node version (20.x)
- Run `npm ci` instead of `npm install`
- Check for timing issues (add strategic waits)

### Visual regression failures
- Screenshots may differ between platforms
- Update snapshots: `npm run test:e2e:update-snapshots`
- Review diffs in `playwright-report/`

### Synth/audio assertions fail
- Check that `window.__SYNTH_DEBUG__` is available (development mode only)
- Verify audio context is started (some browsers require user gesture)

### IndexedDB persistence tests fail
- Ensure `resetAppState()` is called in `beforeEach`
- Check browser compatibility (Chromium only in CI)

## Performance

- **Single test**: ~2-5 seconds
- **Full suite (local)**: ~3-4 minutes
- **Full suite (CI, sharded)**: ~5 minutes

## Browser Support

Currently testing **Chromium only** for:
- Best Web MIDI API support
- Consistent Web Audio behavior
- Faster CI execution

Future: Add Firefox and WebKit when needed.

## Contributing

When adding new features to ChordBoy:

1. ✅ Add `data-testid` attributes to new components
2. ✅ Write E2E tests for new user flows
3. ✅ Update visual regression tests if UI changes
4. ✅ Run tests locally before pushing: `npm run test:e2e`
5. ✅ Ensure CI passes on PR

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [E2E Testing Strategy](../agent_docs/e2e-testing-strategy.md)
- [ChordBoy Architecture](../agent_docs/architecture.md)
