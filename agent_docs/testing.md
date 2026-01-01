# Testing

## Commands

```bash
# Unit tests (Vitest)
npm run test:run      # Run tests once (use this)
npm run test:coverage # With coverage report

# E2E tests (Playwright)
npm run test:e2e           # Run all e2e tests
npm run test:e2e:headed    # Run with visible browser
npm run test:e2e:ui        # Run with Playwright UI
npm run test:e2e:debug     # Run in debug mode
npm run test:e2e:report    # View last test report
```

Do not use `npm run test` (watch mode).

## When to Run Tests

**CRITICAL: Always run e2e tests when:**
- Adding or modifying chord building logic
- Changing preset save/recall behavior
- Modifying voicing controls or keyboard mappings
- Updating sequencer functionality
- Changing mobile interface behavior
- Modifying visual components (run visual regression)
- Changing synthesis or audio output

**Quick validation:** `npm run test:e2e` catches most regressions in ~2 minutes.

## Test Files

Located alongside source files with `.test.ts` suffix:

```
src/lib/
  chordTheory.test.ts      # Interval calculations
  chordBuilder.test.ts     # Chord building from root + modifiers
  chordNamer.test.ts       # Chord naming/display
  chordSolver.test.ts      # Voice leading solver
  voicingTransforms.test.ts # Voicing transforms
  jazzVoicings.test.ts     # Jazz voicing patterns
  keyboardMappings.test.ts # Keyboard mappings
  parseKeys.test.ts        # Key parsing
  pianoLayout.test.ts      # Piano layout calculations
  sequencerLogic.test.ts   # Sequencer step logic
  tutorialLogic.test.ts    # Tutorial conditions
  midi.test.ts             # MIDI protocol functions
  bleMidi.test.ts          # BLE MIDI protocol
  eventBus.test.ts         # Event bus pub/sub
  humanize.test.ts         # Note timing humanization
  strum.test.ts            # Strum/arpeggio logic
  noteColors.test.ts       # Piano key coloring
  dbUtils.test.ts          # IndexedDB utilities
  presetStorage.test.ts    # Preset persistence
  sequencerStorage.test.ts # Sequencer persistence
  patchStorage.test.ts     # Custom patch persistence
  patchValidation.test.ts  # Patch schema validation
  customSynthEngine.test.ts # Synthesis engine
  effects.test.ts          # Audio effects
  modulation.test.ts       # LFO/modulation routing
  synthPresets.test.ts     # Factory presets
  integration.test.ts      # Cross-module integration

src/hooks/
  useChordEngine.test.ts   # Chord engine hook
  usePresets.test.ts       # Presets hook
  usePresets.solveVoicings.test.ts # Voice leading solver tests
  useKeyboard.test.ts      # Keyboard input hook
  useVoicingKeyboard.test.ts # Voicing controls
  useGraceNotes.test.ts    # Grace note re-articulation
```

## Test Patterns

Using Vitest. See any existing test file for patterns. Example:

```typescript
import { describe, it, expect } from "vitest";
import { functionName } from "./moduleName";

describe("functionName", () => {
  it("should handle normal case", () => {
    expect(functionName(input)).toEqual(expected);
  });
});
```

## What's Tested

**Core chord logic:** intervals, chord building, naming, voice leading, voicing transforms, keyboard mappings

**Synthesis:** custom synth engine, effects chain, modulation routing, patch validation

**Infrastructure:** event bus, MIDI protocol, BLE MIDI, humanization, strum

**Persistence:** IndexedDB storage for presets, sequencer, patches

**Not tested (UI/integration):** React components, MIDI hardware I/O, BLE device connection

## Adding Tests

For pure functions in `src/lib/`, add corresponding `.test.ts` file. Run `npm run test:run` to verify.

---

## E2E Tests (Playwright)

Located in `e2e/tests/`. These provide integration testing of the full application.

### E2E Test Files

```
e2e/tests/
  chord-building.spec.ts      # Core chord construction (23 tests)
  presets.spec.ts             # Preset save/recall/persistence (15 tests)
  voicing-controls.spec.ts    # Keyboard voicing transforms (17 tests)
  sequencer.spec.ts           # Grid sequencer functionality (18 tests)
  mobile.spec.ts              # Mobile touch interface (25+ tests)
  mobile.voicing-controls.spec.ts # Mobile voicing interactions
  visual-regression.spec.ts   # Screenshot comparisons (28 tests)
  audio-snapshots.spec.ts     # Audio synthesis validation
  prog-wizard.spec.ts         # Jazz progression generator (17 tests, desktop-only)
  grace-notes.spec.ts         # Grace note re-articulation (20+ tests)
  playback-modes.spec.ts      # All 10 playback modes (30+ tests)
  audio-modes.spec.ts         # MIDI/Synth/Both mode switching (25+ tests)
  strum-humanize.spec.ts      # Strum and humanize controls (25+ tests)
```

### E2E Utilities

```
e2e/utils/
  keyboard-helpers.ts    # playChord(), savePreset(), recallPreset(), etc.
  test-setup.ts          # resetAppState(), initializeApp(), enableSynth()
  audio-assertions.ts    # expectSynthPlaying(), expectActiveVoiceCount()
  audio-snapshots.ts     # Audio capture and comparison
```

### What E2E Tests Cover

| Feature | Covered | Tests |
|---------|---------|-------|
| Chord building (triads, 7ths, extensions) | ✅ Full | chord-building.spec.ts |
| Preset save/recall | ✅ Full | presets.spec.ts |
| Preset persistence (IndexedDB) | ✅ Full | presets.spec.ts |
| Voicing styles (close/drop-2/drop-3) | ✅ Full | voicing-controls.spec.ts |
| Octave/spread controls | ✅ Full | voicing-controls.spec.ts |
| Grid sequencer | ✅ Full | sequencer.spec.ts |
| Mobile touch UI | ✅ Full | mobile.spec.ts |
| Visual regression (3 viewports) | ✅ Full | visual-regression.spec.ts |
| Audio synthesis output | ✅ Partial | audio-snapshots.spec.ts |
| Prog Wizard | ✅ Full | prog-wizard.spec.ts (desktop-only) |
| Grace notes (ghjkl keys) | ✅ Full | grace-notes.spec.ts |
| Playback modes (all 10) | ✅ Full | playback-modes.spec.ts |
| Audio mode switching (MIDI/Synth/Both) | ✅ Full | audio-modes.spec.ts |
| Strum/Humanize controls | ✅ Full | strum-humanize.spec.ts |

### Remaining Coverage Gaps

| Feature | Priority | Notes |
|---------|----------|-------|
| Patch Builder | Medium | Synth editor UI |
| Settings panel | Low | Wake lock, true random mode |
| Tutorial modal | Low | First-run tutorial |
| BLE MIDI | Low | Bluetooth connectivity (hardware-dependent) |
| MIDI clock sync | Low | External clock sync (hardware-dependent) |

### Writing E2E Tests

Use the keyboard helpers for simulating user input:

```typescript
import { test, expect } from "@playwright/test";
import { playChord, releaseAllKeys, expectChordName } from "../utils/keyboard-helpers";
import { resetAppState, initializeApp } from "../utils/test-setup";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppState(page);  // Clear IndexedDB/localStorage
    await initializeApp(page);  // Wait for app ready
  });

  test("should do something", async ({ page }) => {
    await playChord(page, "C", "major");  // Q + J keys
    await expectChordName(page, "C");
    await releaseAllKeys(page);
  });
});
```

### Visual Regression

Visual tests capture screenshots across desktop, mobile (Pixel 5), and tablet (iPad Pro) viewports.

**Update baselines after intentional UI changes:**
```bash
npm run test:e2e:update-snapshots
```

Baselines stored in: `e2e/tests/visual-regression.spec.ts-snapshots/`

### Audio Snapshots

Audio tests capture synthesizer output and compare features (RMS, peak, zero crossings). These ensure synthesis output remains deterministic.

Audio baselines stored in: `e2e/audio-snapshots/`
