# Keyboard Mapping

Source: `src/lib/keyboardMappings.ts`

## Left Hand - Root Notes (Chromatic)

Three rows spanning one octave:

| Key | Note | Key | Note | Key | Note | Key | Note |
|-----|------|-----|------|-----|------|-----|------|
| Q   | C    | W   | C#   | E   | D    | R   | D#   |
| A   | E    | S   | F    | D   | F#   | F   | G    |
| Z   | G#   | X   | A    | C   | A#   | V   | B    |

## Right Hand - Modifiers

Organized by finger position:

**Index Finger (J/U/M/7) - Quality:**
- `J` = major (default)
- `U` = minor
- `M` = diminished
- `7` = augmented

**Middle Finger (K/I/,) - Sevenths:**
- `K` = dom7 (dominant 7th)
- `I` = maj7 (major 7th)
- `,` = 6th

**Ring Finger (L/O/.) - Extensions:**
- `L` = 9th
- `O` = 11th
- `.` = 13th

**Pinky (;/P//) - Suspensions:**
- `;` = sus2
- `P` = sus4
- `/` = flat5 (b5)

**Half-Diminished:**
- `N` = half-dim (m7b5) - the ii chord in minor ii-V-i

**Alterations (brackets area):**
- `[` = sharp9 (#9)
- `]` = flat9 (b9)
- `'` = sharp11 (#11)
- `\` = flat13 (b13)

## Voicing Controls

| Key | Function |
|-----|----------|
| Left Shift | Cycle inversion |
| Right Shift | Cycle voicing style (Close → Drop 2 → Drop 3 → Rootless A → Rootless B → Shell → Quartal → Upper Struct) |
| Arrow Left/Right | Octave down/up |
| Arrow Up/Down | Spread amount |
| Space | Save to next available preset slot |

## Jazz Voicing Styles

| Style | Description |
|-------|-------------|
| Close | Standard close position voicing |
| Drop 2 | 2nd note from top dropped an octave (Barry Harris style) |
| Drop 3 | 3rd note from top dropped an octave |
| Rootless A | Bill Evans Type A: 3-5-7-9 (3rd on bottom, root omitted) |
| Rootless B | Bill Evans Type B: 7-9-3-5 (7th on bottom, root omitted) |
| Shell | Bud Powell style: root + 3rd + 7th only |
| Quartal | McCoy Tyner style: stacked 4ths ("So What" for minor, 7th-based for dominants) |
| Upper Struct | Upper structure triad: major triad a m3 above root for altered dominants (e.g., Eb/C7 = C7#9#5) |

## Preset Controls

| Key | Function |
|-----|----------|
| 0-9 | Save current chord (if playing) or recall preset |

Presets store: keys, octave, inversion, spread, voicingStyle.

## Grace Note Keys

While holding a preset key (0-9), these keys re-articulate specific notes.

**Important:** Grace notes only trigger when:
1. A preset key is held AND matches an active recalled preset
2. No root keys (QWER/ASDF/ZXCV) are pressed (indicates chord building)

**Single Notes (g/h/j/k/l):**
- `G` = 1st note of chord
- `H` = 2nd note
- `J` = 3rd note
- `K` = 4th note
- `L` = 5th note

**Consecutive Pairs (y/u/i/o/p):**
- `Y` = notes 1-2
- `U` = notes 2-3
- `I` = notes 3-4
- `O` = notes 4-5
- `P` = notes 5-6

**Harmonic Intervals (v/b/n/m/,/.):**
- `V` = notes 1 & 3 (root + 3rd)
- `B` = notes 1 & 4 (root + 5th/7th)
- `N` = notes 1 & 5 (root + 7th/9th)
- `M` = notes 2 & 4 (3rd + 7th)
- `,` = notes 3 & 5 (5th + 9th)
- `.` = notes 1, 2, 3 (triad from chord)

**Full Chord:**
- `Space` = re-articulate entire chord

**Octave Shift (while grace noting):**
- `-` = shift grace notes down one octave (-12 semitones)
- `=` = shift grace notes up one octave (+12 semitones)
- Both held = no shift (they cancel out)

## Helper Functions

```typescript
// src/lib/keyboardMappings.ts
getRootNote(pressedKeys: Set<string>): NoteName | null
getModifiers(pressedKeys: Set<string>): ModifierType[]
isSpecialKeyPressed(keys: Set<string>, fn: SpecialFunction): boolean
```

```typescript
// src/lib/parseKeys.ts
parseKeys(pressedKeys: Set<string>): ParsedKeys  // Returns { root, modifiers }
```
