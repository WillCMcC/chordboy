# Chord Wizard

Modal for generating jazz chord progressions from a starting chord.

## Features

- Select starting chord from saved presets or play one in
- Choose progression type (ii-V-I, turnarounds, tritone subs, etc.)
- Preview generated chords with function labels
- Save directly to next available preset slots

## Progression Types

| Type | Pattern | Description |
|------|---------|-------------|
| `ii-V-I` | ii → V7 → Imaj7 | Classic jazz resolution (major) |
| `ii-V-i` | ii → V7(b9) → i7 | Minor key resolution |
| `I-vi-ii-V` | I → vi7 → ii7 → V7 | Standard turnaround |
| `tritone-sub` | ii → bII7 → Imaj7 | Tritone substitution for V |
| `backdoor` | iv → bVII7 → Imaj7 | Backdoor progression |
| `descending-ii-V` | Chain of ii-Vs | Whole-step descending ii-V pairs |
| `rhythm-changes-A` | I → VI7 → ii7 → V7 | Rhythm changes A section |

## Key Files

- `src/components/ChordWizardModal.tsx` - Modal UI component
- `src/lib/progressionGenerator.ts` - Progression logic and chord analysis
- `src/hooks/useProgressionSettings.ts` - Settings persistence

## How It Works

1. User selects starting chord (from preset or plays one)
2. `buildProgression()` generates chords based on selected type
3. Preview shows chord names and function labels (ii, V7, Imaj7, etc.)
4. On confirm, chords save to consecutive empty preset slots

## Progression Generator

`src/lib/progressionGenerator.ts` provides:

### Analysis Functions

- `analyzeChordFunction(keys)` - Determine root, quality, extensions
- `detectProgressionPattern(chords)` - Identify ii-V, turnaround patterns
- `generateNextChord(presets)` - Smart next chord based on context

### Builder Functions

- `buildProgression(keys, type, octave)` - Generate explicit progression
- `transposeRoot(root, semitones)` - Interval transposition
- `buildChordKeys(root, modifiers)` - Create key sets for chords

## Chord Quality Categories

```typescript
type ChordQualityCategory =
  | "major"     // maj7, major triads
  | "minor"     // m7, minor triads
  | "dominant"  // dom7 (no minor, no maj7)
  | "half-dim"  // m7b5
  | "dim"       // diminished
  | "aug"       // augmented
  | "sus";      // sus2, sus4
```
