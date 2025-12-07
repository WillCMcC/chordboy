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

**Alterations (brackets area):**
- `[` = sharp9 (#9)
- `]` = flat9 (b9)
- `'` = sharp11 (#11)
- `\` = flat13 (b13)

## Voicing Controls

| Key | Function |
|-----|----------|
| Left Shift | Cycle inversion |
| Right Shift | Cycle voicing style (Close → Drop 2 → Drop 3 → Rootless A → Rootless B → Shell → Quartal) |
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
| Quartal | McCoy Tyner style: stacked 4ths ("So What" voicing for minor chords) |

## Preset Controls

| Key | Function |
|-----|----------|
| 0-9 | Save current chord (if playing) or recall preset |

Presets store: keys, octave, inversion, spread, voicingStyle.

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
