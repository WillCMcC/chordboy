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
  voicingTransforms.test.ts
  keyboardMappings.test.ts
  parseKeys.test.ts
  pianoLayout.test.ts
  sequencerLogic.test.ts
  tutorialLogic.test.ts
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

**Core chord logic is well tested:**
- Interval calculations (chordTheory)
- Chord building from root + modifiers (chordBuilder)
- Chord naming/display (chordNamer)
- Voicing transforms (voicingTransforms)
- Keyboard mappings (keyboardMappings)
- Key parsing (parseKeys)
- Sequencer step logic (sequencerLogic)
- Tutorial conditions (tutorialLogic)

**Not tested (UI/integration):**
- React hooks
- Components
- MIDI I/O

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
