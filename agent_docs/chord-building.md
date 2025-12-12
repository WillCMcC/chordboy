# Chord Building

## Pipeline Overview

```
parseKeys(pressedKeys) → { root, modifiers }
        ↓
buildChord(root, modifiers, { octave }) → { root, quality, intervals, notes }
        ↓
applyVoicingStyle(chord, style) (jazzVoicings.ts)
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
- `src/lib/jazzVoicings.ts` - Jazz voicing style implementations (Bill Evans, Bud Powell, McCoy Tyner)
- `src/lib/voicingTransforms.ts` - Generic transforms (drop, spread, inversion)
- `src/lib/chordSolver.ts` - Voice leading optimization across progressions
- `src/types/music.ts` - Type definitions for `Chord`, `VoicedChord`, `Interval`, etc.

## Chord Building Logic

See `buildChord()` in `src/lib/chordBuilder.ts`:

1. Start with root (UNISON interval)
2. Add triad based on quality modifier:
   - **half-dim**: m3 + dim5 + m7 (complete m7b5 chord) - the ii chord in minor ii-V-i
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

## Voicing Styles

`src/lib/jazzVoicings.ts` - Jazz-specific voicing implementations:

| Style | Description | Inspiration |
|-------|-------------|-------------|
| `close` | Standard close position voicing | Default |
| `drop2` | 2nd note from top dropped an octave | Barry Harris |
| `drop3` | 3rd note from top dropped an octave | Big band section writing |
| `drop24` | 2nd and 4th notes dropped | Guitar/piano spread |
| `rootless-a` | 3-5-7-9 (3rd on bottom, root omitted) | Bill Evans Type A |
| `rootless-b` | 7-9-3-5 (7th on bottom, root omitted) | Bill Evans Type B |
| `shell` | Root + 3rd + 7th only | Bud Powell |
| `quartal` | Stacked 4ths ("So What" for minor) | McCoy Tyner |
| `upper-struct` | Major triad above root for altered dominants | Modern jazz |

## Generic Transforms

`src/lib/voicingTransforms.ts`:

**Spread** (`applySpread`):
- Spreads notes across octaves
- spreadAmount 0-3

**Inversion** (`invertChord`):
- Moves lowest notes up an octave
- inversionIndex=1: first inversion, etc.

**MIDI Clamping** (`clampMIDI`):
- Ensures notes stay within 0-127 range

## Voice Leading Solver

`src/lib/chordSolver.ts` - `solveChordVoicings(presets, options)`:

Optimizes voicings across a chord progression to minimize voice movement. Used by "Solve" button in PresetsPanel.

### Jazz-Aware Features

1. **7th→3rd Resolution Weighting**: Rewards voicings where the 7th of one chord resolves smoothly (by half/whole step) to the 3rd of the next chord.

2. **Register Constraints**: Each voicing style has optimal register ranges:
   - Rootless voicings: C3-G5 (ideal around middle C)
   - Shell voicings: C2-C5 (can go lower with root)
   - Quartal voicings: C3-G5
   - Upper structure: E3-C6 (higher register for clarity)

3. **All Combinations**: Considers all voicing styles × inversions × spreads × octave shifts.

### Solver Options

```typescript
interface SolverOptions {
  targetOctave?: Octave;           // Center voicings around this octave
  allowedStyles?: VoicingStyle[];  // Limit which styles to consider
  jazzVoiceLeading?: boolean;      // Enable 7th→3rd weighting (default: true)
  useRegisterConstraints?: boolean; // Apply register penalties (default: true)
  spreadPreference?: number;       // -1 (close) to 1 (wide), 0 = neutral
}
```

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
  // Extensions at octave+
  FLAT_NINTH: 13,
  NINTH: 14,
  SHARP_NINTH: 15,
  ELEVENTH: 17,
  SHARP_ELEVENTH: 18,
  FLAT_THIRTEENTH: 20,
  THIRTEENTH: 21,
} as const;
```
