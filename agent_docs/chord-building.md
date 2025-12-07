# Chord Building

## Pipeline Overview

```
parseKeys(pressedKeys) → { root, modifiers }
        ↓
buildChord(root, modifiers, { octave }) → { root, quality, intervals, notes }
        ↓
applyProgressiveDrop(notes, dropCount)
        ↓
applySpread(notes, spreadAmount)
        ↓
invertChord(notes, inversionIndex)
        ↓
Final MIDI note array
```

## Key Files

- `src/lib/parseKeys.ts` - Extracts root and modifiers from pressed keys
- `src/lib/chordBuilder.ts` - Builds chord structure from root + modifiers
- `src/lib/chordTheory.ts` - INTERVALS constant, note-to-MIDI conversion
- `src/lib/chordNamer.ts` - Generates display names (e.g., "Cmaj7#11")
- `src/lib/voicingTransforms.ts` - Drop and spread voicing helpers
- `src/types/index.ts` - Type definitions for `Chord`, `VoicedChord`, `Interval`, etc.

## Chord Building Logic

See `buildChord()` in `src/lib/chordBuilder.ts`:

1. Start with root (UNISON interval)
2. Add triad based on quality modifier:
   - major: M3 + P5 (default)
   - minor: m3 + P5
   - diminished: m3 + dim5
   - augmented: M3 + aug5
   - sus2/sus4: M2/P4 + P5
3. Apply alterations (flat5 replaces P5)
4. Add sevenths (dom7/maj7/6)
5. Add extensions (9/11/13) and alterations (#9/b9/#11/b13)
6. Dedupe and sort intervals
7. Convert to MIDI notes via `buildNotesFromIntervals()`

## Voicing Transforms

**Progressive Drop** (`applyProgressiveDrop` in voicingTransforms.ts):
- Drops highest notes down an octave
- dropCount=1: drop highest note
- dropCount=2: drop two highest notes

**Spread** (`applySpread`):
- Spreads notes across octaves
- spreadAmount 0-3

**Inversion** (`invertChord` in chordBuilder.ts):
- Moves lowest notes up an octave
- inversionIndex=1: first inversion, etc.

## Voice Leading Solver

`src/lib/chordSolver.ts` - `solveChordVoicings(presets, options)`:

Optimizes voicings across a chord progression to minimize voice movement. Used by "Solve" button in PresetsPanel.

## Intervals Reference

From `src/lib/chordTheory.ts`:

```typescript
const INTERVALS = {
  UNISON: 0,
  MINOR_SECOND: 1,
  MAJOR_SECOND: 2,
  MINOR_THIRD: 3,
  MAJOR_THIRD: 4,
  PERFECT_FOURTH: 5,
  DIMINISHED_FIFTH: 6,
  PERFECT_FIFTH: 7,
  AUGMENTED_FIFTH: 8,
  MAJOR_SIXTH: 9,
  MINOR_SEVENTH: 10,
  MAJOR_SEVENTH: 11,
  // ... extensions at octave+
} as const;
```
