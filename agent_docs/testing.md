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
  chordTheory.test.ts
  chordBuilder.test.ts
  chordNamer.test.ts
  chordSolver.test.ts
  voicingTransforms.test.ts
  keyboardMappings.test.ts
  parseKeys.test.ts
  pianoLayout.test.ts
  sequencerLogic.test.ts
  tutorialLogic.test.ts
  midi.test.ts
  bleMidi.test.ts
  eventBus.test.ts

src/hooks/
  useChordEngine.test.ts
  usePresets.test.ts
```

## Test Patterns

Using Vitest. Common patterns in this codebase:

```typescript
import { describe, it, expect } from "vitest";

describe("functionName", () => {
  it("should handle normal case", () => {
    expect(functionName(input)).toEqual(expected);
  });

  it("should handle edge case", () => {
    expect(functionName(null)).toBeNull();
  });
});
```

## What's Tested

**Core chord logic:**
- Interval calculations (chordTheory)
- Chord building from root + modifiers (chordBuilder)
- Chord naming/display (chordNamer)
- Voice leading solver (chordSolver)
- Voicing transforms (voicingTransforms)
- Keyboard mappings (keyboardMappings)
- Key parsing (parseKeys)

**Infrastructure:**
- Event bus pub/sub (eventBus)
- MIDI protocol functions (midi)
- BLE MIDI protocol (bleMidi)
- Piano layout calculations (pianoLayout)

**App logic:**
- Sequencer step logic (sequencerLogic)
- Tutorial conditions (tutorialLogic)
- Chord engine hook (useChordEngine)
- Presets hook (usePresets)

**Not tested (UI/integration):**
- React components
- MIDI I/O hardware interaction
- BLE device connection

## Adding Tests

For pure functions in `src/lib/`, add corresponding `.test.ts` file:

```typescript
// src/lib/newFeature.test.ts
import { describe, it, expect } from "vitest";
import { newFunction } from "./newFeature";

describe("newFunction", () => {
  it("should do the thing", () => {
    expect(newFunction("input")).toBe("expected");
  });
});
```

Run `npm run test:run` to verify.
