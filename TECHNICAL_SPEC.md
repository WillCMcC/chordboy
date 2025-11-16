# ChordBoy - Technical Specification

## 1. Overview

**ChordBoy** is a web-based MIDI chord controller optimized for jazz performance. It enables musicians to play complex jazz chords using a two-handed keyboard interface, outputting MIDI to external instruments or DAWs like Ableton Live.

### Key Features

- Two-handed keyboard interface (left: root notes, right: chord modifiers)
- Additive modifier system for building complex jazz chords
- Inversion/voicing rotation on demand
- Real-time MIDI output via Web MIDI API
- Visual feedback with keyboard display and chord naming
- Extensible architecture for future enhancements

---

## 2. User Interface

### 2.1 Visual Layout

```
┌─────────────────────────────────────────────┐
│  ChordBoy                     [MIDI Status] │
├─────────────────────────────────────────────┤
│                                             │
│         Current Chord Display               │
│         ─────────────────────                │
│            C Maj7 ♯13                       │
│                                             │
│         ┌─────────────────────┐             │
│         │   Piano Keyboard    │             │
│         │   Visual Display    │             │
│         │  (showing notes)    │             │
│         └─────────────────────┘             │
│                                             │
│  [Settings]  [MIDI Config]  [Help/Keys]    │
└─────────────────────────────────────────────┘
```

### 2.2 Display Elements

1. **Chord Name Display** (large, centered)

   - Shows current chord being played
   - Format: `[Root] [Quality] [Extensions]`
   - Example: `C Maj7 ♯13`, `Eb min7 ♭9`, `F# dim`

2. **Visual Keyboard**

   - Piano keyboard representation showing active notes
   - Highlights currently-played notes
   - Color-coded by function (root, third, fifth, extensions)

3. **Status Bar**

   - MIDI connection status
   - Active MIDI output device
   - Current settings (channel, velocity, octave)

4. **Settings Panel** (collapsible)
   - MIDI channel selection
   - Default velocity
   - Octave range
   - Voicing strategy preferences

---

## 3. Keyboard Mapping

### 3.1 Left Hand - Root Note Selection (Chromatic)

**Three-row chromatic layout spanning one octave:**

```
Row 1 (QWER):  Q=C   W=C#  E=D   R=D#
Row 2 (ASDF):  A=E   S=F   D=F#  F=G
Row 3 (ZXCV):  Z=G#  X=A   C=A#  V=B
```

**Design Rationale:**

- Clustered layout keeps related notes close
- Full chromatic octave within natural hand span
- Easy to visualize note relationships

### 3.2 Right Hand - Chord Modifiers (Finger-Based)

**Organized by finger position for easy stacking:**

**Index Finger (J/U/M columns):**

- `J` - Major quality (default if nothing pressed)
- `U` - Minor quality
- `M` - Diminished
- `7` (number) - Augmented

**Middle Finger (K/I/< columns):**

- `K` - Add dominant 7th
- `I` - Add major 7th
- `,` - Add 6th

**Ring Finger (L/O/> columns):**

- `L` - Add 9th
- `O` - Add 11th
- `.` - Add 13th

**Pinky (;/P/? columns):**

- `;` - Sus2
- `P` - Sus4
- `/` - Flat 5 (♭5)

**Alterations (brackets/quotes area):**

- `[` - Sharp 9 (♯9)
- `]` - Flat 9 (♭9)
- `'` - Sharp 11 (♯11)

### 3.3 Special Function Keys

**Number Row (1-9, 0, -, =):**

- `1-5` - Reserved for octave shifting (-2 to +2)
- `6-9` - Reserved for future voicing presets
- `0` - Reset to default octave
- `-` / `=` - Transpose down/up by semitone

**Modifier Keys:**

- `Left Shift` - Cycle voicing/inversion (hold while playing)
- `Space Bar` - Reserved for future "spread voicing" feature
- `Tab` - Reserved for chord memory/buffer functions
- `Esc` - Clear all MIDI notes (panic button)

**Future Enhancement:**

- Holding additional root keys (after initial root) spreads voicing across octaves

---

## 4. Chord Building System

### 4.1 Additive Modifier Logic

Chords are built by **combining** modifiers:

1. **Base Triad** (determined by root + quality modifier)

   - No modifier or `J` = Major (C, E, G)
   - `U` = Minor (C, Eb, G)
   - `M` = Diminished (C, Eb, Gb)
   - `7` (number) = Augmented (C, E, G#)

2. **Seventh Chords** (add one key)

   - Root + `K` = Dominant 7 (C7)
   - Root + `J` + `I` = Major 7 (CMaj7)
   - Root + `U` + `K` = Minor 7 (Cmin7)
   - Root + `M` + `K` = Diminished 7 (Cdim7)

3. **Extensions** (stack additional keys)

   - Root + `I` + `.` = CMaj7♯13 (3 keys total)
   - Root + `U` + `K` + `L` = Cmin9 (4 keys total)
   - Root + `K` + `L` + `.` = C13 (4 keys total)

4. **Alterations** (further stack)
   - Can add ♭9, ♯9, ♭5, ♯11, etc.
   - Example: C7♯9♭13 = Root + `K` + `[` + altered 13

### 4.2 Chord Vocabulary

**Core Chord Types (Phase 1):**

- Major (Maj)
- Minor (min)
- Dominant 7th (7)
- Major 7th (Maj7)
- Minor 7th (min7)
- Diminished (dim)
- Augmented (aug)
- Half-diminished (ø7 / min7♭5)

**Extensions:**

- 6, 9, 11, 13
- Sus2, Sus4
- Add9, Add11

**Alterations:**

- ♭5, ♯5
- ♭9, ♯9
- ♯11, ♭13

### 4.3 Chord Resolution Algorithm

```
Input: Press keys C + U + K + L

Process:
1. Identify root: C (from left hand)
2. Identify quality: U = minor
3. Identify seventh: K = dominant 7th → makes min7
4. Identify extensions: L = add 9th → makes min9

Output:
- Chord Name: "C min9"
- MIDI Notes: C, Eb, G, Bb, D
```

---

## 5. MIDI Implementation

### 5.1 Web MIDI API Integration

**Requirements:**

- Browser must support Web MIDI API (Chrome, Edge, Opera)
- User must grant MIDI permissions
- At least one MIDI output device available

**Connection Flow:**

```
1. Page Load → Request MIDI Access
2. User Grants Permission
3. Enumerate MIDI Outputs
4. Auto-select or prompt user to select device
5. Display connection status
6. Begin listening to keyboard events
```

### 5.2 MIDI Message Handling

**Note On:**

```javascript
// When chord keys pressed
Send MIDI Note On for each note in chord
  - Channel: configurable (default: 1)
  - Note: calculated MIDI note number
  - Velocity: configurable (default: 80)
```

**Note Off:**

```javascript
// When any key in the chord is released
Send MIDI Note Off for all notes in current chord
  - Channel: same as Note On
  - Note: matching note numbers
  - Velocity: 0 or 64 (configurable)
```

**Key Behavior:**

- Chord is sustained as long as ALL relevant keys are held
- Releasing any key triggers Note Off for the entire chord
- Pressing new keys while holding = change chord (Note Off old, Note On new)

### 5.3 Initial MIDI Configuration

**Default Settings:**

- MIDI Channel: 1
- Velocity: 80 (medium-hard)
- Octave: Middle C = 60 (C4)
- Voicing: Compact (within 1-2 octaves)

**Future Configurable Settings:**

- MIDI Channel (1-16)
- Velocity (0-127 or velocity sensitivity)
- Note range limits
- Voicing spread amount
- Inversion preferences

---

## 6. Voicing Engine

### 6.1 Initial Voicing Strategy (Phase 1)

**Compact Voicings:**

- Notes arranged within 1-2 octaves
- Stacked thirds (traditional close position)
- Root in bass

**Example: C Maj7**

```
Root Octave: C4
Notes: C4, E4, G4, B4
MIDI: [60, 64, 67, 71]
```

### 6.2 Inversion Cycling (Left Shift)

**Behavior:**

- Each press of Left Shift cycles to next inversion
- Maintains same chord quality and extensions
- Rotates notes but keeps within reasonable range

**Example: C Maj7 inversions**

```
Root Position:    C4, E4, G4, B4
1st Inversion:    E4, G4, B4, C5
2nd Inversion:    G4, B4, C5, E5
3rd Inversion:    B4, C5, E5, G5
(cycle back to root position)
```

**Technical Implementation:**

- Track current inversion index (0-n)
- On Left Shift press: increment index (mod n)
- Regenerate MIDI note array with new inversion
- Send Note Off for old position, Note On for new

### 6.3 Future: Voicing Spread

**Concept (Phase 2+):**

- After selecting root note, holding additional root keys spreads voicing
- More keys = wider intervals between notes
- Could implement drop-2, drop-3 voicings for jazz piano style

**Example: C Maj7 spread**

```
Compact:  C4, E4, G4, B4
Spread 1: C3, G3, B3, E4  (drop-2)
Spread 2: C3, E4, G4, B4  (drop-3)
```

---

## 7. Technology Stack

### 7.1 Frontend

**Framework:** React 18+

- Component-based UI
- useState/useReducer for state management
- Custom hooks for MIDI, keyboard input, chord logic

**Key Libraries:**

- `webmidi` or direct Web MIDI API usage
- CSS Modules or styled-components for styling
- No heavy frameworks (keep it lightweight)

**Browser Requirements:**

- Modern evergreen browser (Chrome, Edge recommended)
- Web MIDI API support
- JavaScript ES2020+

### 7.2 Backend

**Purpose:** Static file serving (for now)

**Options:**

- Express.js minimal server
- Vite dev server (for development)
- Can be extended later for:
  - User sessions
  - Chord preset saving/sharing
  - Collaboration features

**Initial Implementation:**

```javascript
// Simple Express server
const express = require("express");
const app = express();
app.use(express.static("dist"));
app.listen(3000);
```

### 7.3 No Database Initially

**State Management:**

- All state in-memory (React state)
- No persistence in Phase 1

**Future Persistence (Phase 2+):**

- IndexedDB for local storage
  - User preferences
  - Custom chord voicings
  - Saved chord progressions
- Optional backend database if sharing features needed

---

## 8. Architecture

### 8.1 Component Structure

```
App
├── MIDIProvider (context)
│   ├── MIDI connection state
│   ├── Send note on/off functions
│   └── Device selection
│
├── KeyboardListener (global event handler)
│   ├── Track pressed keys
│   ├── Parse left/right hand inputs
│   └── Trigger chord changes
│
├── ChordEngine (logic)
│   ├── Parse modifiers → chord structure
│   ├── Generate note arrays
│   ├── Handle inversions
│   └── Format chord names
│
├── Header
│   ├── App title
│   └── MIDI status indicator
│
├── ChordDisplay
│   └── Current chord name (large text)
│
├── PianoKeyboard
│   ├── Visual piano keys
│   └── Highlight active notes
│
└── SettingsPanel (collapsible)
    ├── MIDI device selector
    ├── Channel/velocity config
    └── Keyboard mapping reference
```

### 8.2 Data Flow

```
User Presses Keys
      ↓
KeyboardListener captures events
      ↓
Parse keys → { root, modifiers }
      ↓
ChordEngine.buildChord()
      ↓
{ name: "C Maj7", notes: [60,64,67,71] }
      ↓
MIDIProvider.playChord(notes)
      ↓
MIDI Output → External Device/DAW
      ↓
Update UI (ChordDisplay, PianoKeyboard)
```

### 8.3 State Management

**Global State (Context):**

- MIDI connection
- Current pressed keys
- Active chord
- Settings (channel, velocity, octave)

**Component State:**

- UI toggles (settings panel open/closed)
- Visual feedback animations

---

## 9. Future Enhancements

### 9.1 Planned Features (Post-MVP)

**Phase 2:**

- Voicing spread with additional root keys
- Advanced voicing algorithms (drop-2, drop-3, rootless)
- Velocity sensitivity based on key press timing
- MIDI input monitoring (show what's being received)

**Phase 3:**

- Chord buffer/history
- Progression sequencer
- Loop recording
- Export MIDI files

**Phase 4:**

- Preset saving (IndexedDB)
- User-customizable key mappings
- Chord recommendation engine
- Multi-user collaboration

### 9.2 Technical Debt to Address

- Optimize keyboard event handling (debouncing/throttling if needed)
- Comprehensive browser compatibility testing
- Accessibility (keyboard-only navigation already core feature)
- Mobile support (if feasible with external keyboard)

---

## 10. Non-Functional Requirements

### 10.1 Performance

- MIDI latency < 10ms from key press to MIDI output
- UI update < 16ms (60fps for visual feedback)
- Support simultaneous polyphonic chords (up to 12 notes)

### 10.2 Usability

- Zero-configuration start (auto-detect MIDI devices)
- Clear visual feedback for all interactions
- Helpful keyboard reference overlay
- Error messages that guide user to solutions

### 10.3 Compatibility

- Tested on Chrome, Edge, Opera (Web MIDI support)
- Graceful degradation message for unsupported browsers
- Works on macOS, Windows, Linux

### 10.4 Code Quality

- TypeScript for type safety (optional but recommended)
- ESLint + Prettier for code style
- Component documentation
- Unit tests for chord engine logic
- Integration tests for MIDI handling

---

## 11. Success Metrics

**MVP Success Criteria:**

1. Can play all defined chord types with keyboard
2. MIDI output works reliably with major DAWs (Ableton, Logic)
3. Chord naming displays correctly for all combinations
4. Inversions cycle properly with left shift
5. No noticeable latency in performance

**User Experience Goals:**

- Intuitive enough to play chords within 5 minutes
- Responsive enough for live performance
- Visual feedback confirms what's being played
- Easy MIDI setup process

---

## 12. Risk Assessment

**Technical Risks:**

- Web MIDI API browser support limitations
  - _Mitigation:_ Clear browser requirements, fallback message
- Keyboard event conflicts with browser shortcuts
  - _Mitigation:_ preventDefault(), fullscreen mode option
- MIDI timing jitter in browser
  - _Mitigation:_ Test across browsers, optimize event handling

**UX Risks:**

- Keyboard layout might not be intuitive
  - _Mitigation:_ User testing, customizable mappings (future)
- Complex chords hard to play simultaneously
  - _Mitigation:_ Visual reference, practice mode (future)

---

## Appendix A: Example Chord Mappings

| Chord Name | Keys Pressed | MIDI Notes (from C)        |
| ---------- | ------------ | -------------------------- |
| C          | q            | 60, 64, 67                 |
| C min      | q + u        | 60, 63, 67                 |
| C7         | q + k        | 60, 64, 67, 70             |
| C Maj7     | q + i        | 60, 64, 67, 71             |
| C min7     | q + u + k    | 60, 63, 67, 70             |
| C Maj7 ♯13 | q + i + .    | 60, 64, 67, 71, 74, 78, 82 |
| C7 ♯9      | q + k + [    | 60, 64, 67, 70, 75         |
| C dim      | q + m        | 60, 63, 66                 |
| C aug      | q + 7        | 60, 64, 68                 |

---

## Appendix B: Glossary

- **Root Note:** The fundamental note of a chord (e.g., C in C Major)
- **Voicing:** The specific arrangement of notes in a chord
- **Inversion:** Reordering chord notes with a different note in the bass
- **Extension:** Notes added beyond the basic triad (9th, 11th, 13th)
- **Alteration:** Sharpened or flattened chord tones (♯9, ♭5, etc.)
- **Web MIDI API:** Browser API for communicating with MIDI devices
- **DAW:** Digital Audio Workstation (e.g., Ableton Live, Logic Pro)
