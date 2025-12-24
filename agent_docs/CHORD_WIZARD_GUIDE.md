# Chord Wizard (Voice Leading Solver) Guide

## Overview

The **Chord Wizard** (called "Solve Voicings" in the UI) is an intelligent voice leading optimizer that analyzes a sequence of saved chord presets and automatically finds the smoothest possible voicings to minimize finger movement and create professional-sounding voice leading.

**Location**: Presets Panel → "Select to Solve" button

## What It Does

The Chord Wizard uses a dynamic programming algorithm to solve the optimal voicing for each chord in a progression, considering:

- **Voice movement minimization**: Keeps notes moving as little as possible between chords
- **Jazz voice leading**: Rewards smooth 7th→3rd resolution (the defining motion of ii-V-I)
- **Register constraints**: Keeps each voicing style in its optimal pitch range
- **Spread preferences**: Honors your preference for tight (close) or wide (open) voicings
- **Multiple voicing styles**: Tests all combinations of inversions, spreads, octaves, and voicing styles

## How Many Chords

- **Minimum**: 2 chords (you need at least two chords to solve voice leading)
- **Maximum**: Unlimited - can process any number of saved presets
- **Common use cases**:
  - 2-4 chords for turnarounds (e.g., ii-V-I-vi)
  - 8-16 chords for song sections
  - 32+ chords for entire song forms

## Voice Movements & Optimizations

### 1. **Minimal Voice Movement**
The solver finds voicings where each note moves the shortest distance to its next position.

**Example**: C major → F major
- Poor voicing: C4-E4-G4 → F5-A5-C6 (19 semitones of movement)
- Solved voicing: C4-E4-G4 → C4-F4-A4 (5 semitones of movement)

### 2. **Jazz 7th→3rd Resolution** ⭐
This is the signature move of jazz harmony. The solver rewards voicings where the 7th of one chord resolves smoothly (by half or whole step) to the 3rd of the next chord.

**Example**: Dm7 → G7 → Cmaj7 (ii-V-I)
- Dm7: D-F-A-C (the C is the 7th)
- G7: D-F-G-B (the C moves down to B, a half-step resolution)
- Cmaj7: C-E-G-B (the B moves up to C, another resolution)

This creates the classic jazz sound where guide tones (3rds and 7ths) flow smoothly.

### 3. **Register Constraints**
Each voicing style has an optimal pitch range:

| Voicing Style | Optimal Range | Why |
|---------------|---------------|-----|
| Rootless (A/B) | C3-G5 | Bill Evans piano range |
| Shell voicings | C2-C5 | Can go lower with root |
| Quartal | C3-G5 | McCoy Tyner sound |
| Upper structure | E3-C6 | Needs clarity in upper register |
| Drop2/Drop3 | B2-F5 | Big band/guitar ranges |

The solver penalizes voicings outside these ranges to keep things sounding natural.

### 4. **Spread Preference Control**

You control how tight or wide the voicings are with a slider:

- **-1.0 (Close)**: Compact voicings, spans 10-15 semitones
  - Sound: Dense, warm, Bill Evans-style
  - Use for: Intimate ballads, comping

- **0 (Balanced)**: Neutral, lets voice movement dictate
  - Sound: Natural, varies by context
  - Use for: General jazz playing

- **+1.0 (Wide)**: Open voicings, spans 20-30+ semitones
  - Sound: Spacious, modern, spread across registers
  - Use for: Solo piano, dramatic moments

### 5. **All Voicing Styles Considered**

For each chord, the solver tests:
- 9 voicing styles (close, drop2, drop3, drop24, rootless-a, rootless-b, shell, quartal, upper-struct)
- Up to 4 inversions per chord
- 4 spread amounts (0-3)
- 3 octave shifts (-1, 0, +1)

**Total combinations**: ~432 possibilities per chord!

The solver uses dynamic programming to efficiently find the best path through all these options.

## What It Sounds Like

### Before Solving
Playing presets without solving can sound **jumpy and disconnected**:
- Large leaps between chords
- Inconsistent register
- No sense of voice leading
- Sounds like random chord stabs

### After Solving
Solved progressions sound **smooth and professional**:
- Minimal finger movement
- Voices flow logically
- Classic jazz voice leading patterns emerge
- Sounds like a seasoned jazz pianist

### Sound Characteristics by Spread Setting

**Close (-1.0)**:
- Dense clusters of notes
- Rich harmonic texture
- Bill Evans "Peace Piece" sound
- Best for: Ballads, introspective playing

**Balanced (0)**:
- Natural voice leading
- Mix of close and open based on context
- Best for: Standards, general comping

**Wide (+1.0)**:
- Spread across 2-3 octaves
- Modern, spacious sound
- Keith Jarrett solo piano sound
- Best for: Solo piano, feature moments

## Where It's Used

### 1. **Jazz Standards** 🎵
Save chord changes for a tune and solve them for perfect voice leading:

```
Autumn Leaves (first 8 bars):
Cm7 → F7 → Bbmaj7 → Ebmaj7 → Am7b5 → D7 → Gm7 → Gm7
```

### 2. **ii-V-I Progressions**
The classic jazz progression - solver excels at finding 7th→3rd resolutions:

```
Dm7 → G7 → Cmaj7
```

### 3. **Turnarounds**
4-chord cycles at the end of phrases:

```
Cmaj7 → Am7 → Dm7 → G7
```

### 4. **Modal Progressions**
Solving helps create smooth voice movement even without functional harmony:

```
Dm7 → Em7 → Dm7 → Em7 (Dorian vamp)
```

### 5. **Entire Song Forms**
Save all chord changes for a 32-bar standard (AABA form):

```
A section (8 bars) + A section (8 bars) + B section (8 bars) + A section (8 bars)
= 32 bars of perfectly voiced changes
```

### 6. **Reharmonizations**
After creating complex chord substitutions, solve them to make them playable:

```
Original: Cmaj7 → A7 → Dm7 → G7
Reharmonized: Cmaj7 → Eb7#11 → Dm7 → Db7#11
Solved: Smooth voice leading through altered dominants
```

## How to Use

### Step 1: Save Chords
Play and save chords to preset slots (1-9, 0):

1. Play a chord on the keyboard
2. Press `Space` to save
3. Press `1-9` or `0` to choose slot
4. Repeat for all chords in your progression

### Step 2: Enter Select Mode
1. Click **"Select to Solve"** button in Presets Panel
2. Panel enters multi-select mode

### Step 3: Select Chords in Order
Click preset slots in the order you want them played:
- First click → numbered badge "1" appears
- Second click → numbered badge "2" appears
- Continue selecting in progression order
- Minimum 2 chords required

### Step 4: Set Spread Preference
Use the slider to choose voicing width:
- **Close**: Tight clusters
- **Balanced**: Natural (default)
- **Wide**: Open voicings

### Step 5: Solve!
Click **"Solve Voicings"** button:
- Solver analyzes all possibilities
- Updates each preset with optimal voicing settings
- Selection mode exits automatically

### Step 6: Play Your Progression
Press the number keys in order to hear the smooth voice leading!

## Technical Details

### Algorithm: Dynamic Programming

The solver uses a DP table where `dp[i][j]` represents the minimum total voice movement to reach chord `i` with voicing option `j`.

**Time Complexity**: O(n × v²) where:
- n = number of chords
- v = voicing options per chord (~432)

**Result**: Finds globally optimal solution efficiently!

### Cost Function

Each voicing transition is scored:

```
cost = voiceMovement + registerPenalty + spreadAdjustment - resolutionBonus
```

**Voice Movement**: Sum of semitones each note moves (lower is better)

**Register Penalty**: Penalty for voicings outside optimal range for the style

**Spread Adjustment**:
- Negative preference: penalty for spans > 15 semitones
- Positive preference: penalty for spans < 20 semitones

**Resolution Bonus**: Reward for 7th→3rd or 3rd→7th movement of 1-2 semitones (jazz voice leading)

### Output: VoicingSettings

For each chord, the solver returns:

```typescript
{
  voicingStyle: "rootless-b",  // Which voicing style
  inversionIndex: 2,            // Which inversion
  spreadAmount: 1,              // How spread out
  octave: 4,                    // Which octave
  droppedNotes: 0               // Legacy field
}
```

## Tips & Best Practices

### For Best Results

1. **Save chords in the same octave first** - let the solver adjust octaves
2. **Use functional progressions** - ii-V-I movements work best
3. **Try different spread settings** - experiment with close vs wide
4. **Solve sections separately** - solve 8-bar phrases individually for more control
5. **Listen and tweak** - solver is a starting point, manual adjustments are fine

### Common Use Cases

**Ballad Playing**: spreadPreference = -0.8 (very close)
**Comping**: spreadPreference = 0 (balanced)
**Solo Piano**: spreadPreference = 0.6 (moderately wide)
**Modern Jazz**: spreadPreference = 0.3 (slightly wide)

### When NOT to Use

- **Single chords**: No voice leading to optimize
- **Dramatic leaps desired**: Solver minimizes movement - sometimes you want jumps!
- **Specific voicing in mind**: Manual control is better
- **Non-functional harmony**: Works best with tonal progressions

## Examples from Tests

### Example 1: ii-V-I in C

**Input**: Dm7 → G7 → Cmaj7

**Solver finds**:
- Dm7: Rootless-B voicing (C-E-F-A) - 7th on bottom
- G7: Similar position (B-D-F-G) - 7th resolves down to 3rd
- Cmaj7: (C-E-G-B) - 3rd resolves up to root

**Total movement**: ~8 semitones (very smooth!)

### Example 2: Autumn Leaves Opening

**Input**: Cm7 → F7 → Bbmaj7 → Ebmaj7

**Solver with spreadPreference = 0.5**:
- Creates wide, modern voicings
- Maintains smooth voice leading
- Uses drop voicings for contemporary sound

### Example 3: Giant Steps (Coltrane Changes)

**Input**: Bmaj7 → D7 → Gmaj7 → Bb7 → Ebmaj7...

**Solver handles**:
- Distant key changes (B to G to Eb)
- Finds optimal voice leading through complex harmony
- Uses octave shifts to minimize movement
- Results in playable, musical voicing choices

## Code Reference

- **Solver algorithm**: `src/lib/chordSolver.ts:285` (`solveChordVoicings`)
- **Voice distance calculation**: `src/lib/chordSolver.ts:132` (`calculateVoiceDistance`)
- **7th→3rd detection**: `src/lib/chordSolver.ts:106` (`isSeventh`), `src/lib/chordSolver.ts:114` (`isThird`)
- **Spread adjustment**: `src/lib/chordSolver.ts:58` (`calculateSpreadAdjustment`)
- **UI component**: `src/components/PresetsPanel.tsx`
- **Hook integration**: `src/hooks/usePresets.ts:274` (`solvePresetVoicings`)

## Related Documentation

- `agent_docs/chord-building.md` - Chord construction pipeline
- `agent_docs/architecture.md` - Overall app architecture
- `src/lib/chordSolver.test.ts` - Test examples and edge cases
