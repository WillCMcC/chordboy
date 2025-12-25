# Testing

## Commands

```bash
npm run test:run      # Run tests once (use this)
npm run test:coverage # With coverage report
```

Do not use `npm run test` (watch mode).

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
