# ChordBoy - Implementation Plan

## Overview

This document provides a phased, step-by-step implementation plan for building ChordBoy. The plan is structured to deliver working increments, allowing for testing and iteration at each phase.

---

## Development Philosophy

- **Incremental delivery:** Each phase produces a working, testable feature
- **Test as you go:** Verify functionality at each step before moving forward
- **Start simple, iterate:** Begin with core features, add complexity later
- **User feedback loops:** Test with real MIDI devices and DAWs early and often

---

## Phase 0: Project Setup

### Goal: Create development environment and basic project structure

**Estimated Time:** 2-3 hours

### Tasks

#### 0.1 Initialize Project

- [x] Create project directory structure
- [x] Initialize git repository
- [x] Create `.gitignore` (node_modules, dist, .env, .DS_Store)
- [x] Initialize npm project (`npm init`)

**Directory Structure:**

```
chordboy/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── App.jsx
│   └── main.jsx
├── public/
│   └── index.html
├── package.json
├── vite.config.js
├── README.md
├── TECHNICAL_SPEC.md
└── IMPLEMENTATION_PLAN.md
```

#### 0.2 Install Dependencies

```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react
npm install -D eslint prettier
```

**Optional (recommended):**

```bash
npm install -D typescript @types/react @types/react-dom
```

#### 0.3 Configure Build Tools

- [x] Create `vite.config.js`
- [x] Configure Vite for React
- [x] Set up hot module replacement
- [x] Create npm scripts in `package.json`:
  - `dev`: Start development server
  - `build`: Build for production
  - `preview`: Preview production build

**Example `vite.config.js`:**

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
```

#### 0.4 Create Basic App Shell

- [x] Create minimal `index.html` in `public/`
- [x] Create `src/main.jsx` (React entry point)
- [x] Create `src/App.jsx` (root component)
- [x] Add basic styling (CSS reset, base styles)
- [x] Verify app runs with `npm run dev`

#### 0.5 Version Control

- [x] Initial commit with project structure
- [ ] Create `.github` folder (if using GitHub)
- [ ] Add README with project description

**Deliverable:** ✅ Development environment ready, basic React app running on localhost:3000

---

## Phase 1: MIDI Connection & Basic Output

### Goal: Establish MIDI connection and send simple test messages

**Estimated Time:** 4-6 hours

### Tasks

#### 1.1 Web MIDI API Integration

- [x] Create `src/lib/midi.js` with Web MIDI utilities
- [x] Implement `requestMIDIAccess()` function
- [x] Handle browser compatibility checks
- [x] Handle user permission prompts
- [x] Enumerate available MIDI output devices
- [x] Implement `sendNoteOn()`, `sendNoteOff()`, `sendAllNotesOff()`, `sendPanic()`

**Key Functions:**

```javascript
// src/lib/midi.js
export async function requestMIDIAccess() { ... }
export function getMIDIOutputs(midiAccess) { ... }
export function sendNoteOn(output, channel, note, velocity) { ... }
export function sendNoteOff(output, channel, note, velocity) { ... }
export function sendAllNotesOff(output, channel) { ... }
```

#### 1.2 Create MIDIProvider Context

- [x] Create `src/hooks/useMIDI.jsx` with MIDIProvider context
- [x] Implement context provider with state:
  - `midiAccess` (MIDIAccess object or null)
  - `outputs` (array of available MIDI outputs)
  - `selectedOutput` (currently selected output)
  - `isConnected` (boolean)
  - `error` (error messages)
  - `channel` (MIDI channel)
  - `velocity` (default velocity)
  - `currentNotes` (tracking playing notes)
- [x] Implement functions:
  - `connectMIDI()` - Initialize MIDI access
  - `selectOutput(id)` - Select MIDI output device
  - `playNote(note, velocity)` - Send single note
  - `stopNote(note)` - Stop single note
  - `playChord(notes, velocity)` - Send multiple notes
  - `stopAllNotes()` - Stop all currently playing notes
  - `panic()` - Send all notes off on all channels
- [x] Auto-connect on mount
- [x] Handle device state changes

#### 1.3 Create MIDI Status Component

- [x] Create `src/components/MIDIStatus.jsx`
- [x] Create `src/components/MIDIStatus.css`
- [x] Display connection status (connected/disconnected)
- [x] Show selected output device name
- [x] Add "Connect" button if not connected
- [x] Add dropdown to select from available outputs
- [x] Show error messages if MIDI fails
- [x] Loading state indicator

#### 1.4 Testing

- [x] Test MIDI connection in browser console
- [x] Test sending single note on/off
- [x] Test with virtual MIDI device (IAC Driver on Mac, loopMIDI on Windows)
- [x] Verify notes in DAW (Ableton, Logic, etc.)
- [x] Test error handling (no MIDI devices, permission denied)

**Deliverable:** ✅ Working MIDI connection that can send note on/off messages to a DAW

---

## Phase 2: Keyboard Input System

### Goal: Capture keyboard events and map to notes/modifiers

**Estimated Time:** 4-5 hours

### Tasks

#### 2.1 Create Keyboard Mapping Configuration

- [x] Create `src/lib/keyboardMappings.js`
- [x] Define LEFT_HAND_KEYS map (qwer, asdf, zxcv → note names)
- [x] Define RIGHT_HAND_MODIFIERS map (quality, sevenths, extensions, alterations)
- [x] Define SPECIAL_KEYS map (shift, numbers, etc.)
- [x] Export key mapping constants

**Example Structure:**

```javascript
// src/lib/keyboardMappings.js
export const LEFT_HAND_KEYS = {
  q: "C",
  w: "C#",
  e: "D",
  r: "D#",
  a: "E",
  s: "F",
  d: "F#",
  f: "G",
  z: "G#",
  x: "A",
  c: "A#",
  v: "B",
};

export const RIGHT_HAND_MODIFIERS = {
  // Quality
  j: "major",
  u: "minor",
  m: "diminished",
  7: "augmented",
  // Sevenths
  k: "dom7",
  i: "maj7",
  ",": "6",
  // Extensions
  l: "9",
  o: "11",
  ".": "13",
  // ... etc
};
```

#### 2.2 Create Keyboard Listener Hook

- [x] Create `src/hooks/useKeyboard.js`
- [x] Track pressed keys in a Set (for multi-key detection)
- [x] Add event listeners for `keydown` and `keyup`
- [x] Call `preventDefault()` to avoid browser shortcuts
- [x] Handle key repeat (ignore repeated keydown events)
- [x] Clean up listeners on unmount
- [x] Return current pressed keys state

**Key Features:**

```javascript
export function useKeyboard() {
  const [pressedKeys, setPressedKeys] = useState(new Set());

  // Returns: { pressedKeys, isKeyPressed(key) }
}
```

#### 2.3 Create Key Parser Utility

- [x] Create `src/lib/parseKeys.js`
- [x] Implement `parseKeys(pressedKeys)` function
- [x] Extract root note from left hand keys
- [x] Extract modifiers from right hand keys
- [x] Return structured data: `{ root, modifiers: [] }`

#### 2.4 Testing

- [x] Test keyboard event capture (console log pressed keys)
- [x] Test multi-key detection (hold multiple keys simultaneously)
- [x] Test key release detection
- [x] Verify no browser shortcuts interfere

**Deliverable:** ✅ Reliable keyboard input system that tracks pressed keys in real-time

---

## Phase 3: Chord Engine - Core Logic

### Goal: Convert pressed keys into chord names and MIDI note arrays

**Estimated Time:** 6-8 hours

### Tasks

#### 3.1 Create Chord Theory Utilities

- [x] Create `src/lib/chordTheory.js`
- [x] Implement `noteToMIDI(noteName, octave)` - converts "C" + 4 → 60
- [x] Implement `MIDIToNote(midiNumber)` - converts 60 → "C4"
- [x] Create interval constants (PERFECT_FIFTH = 7 semitones, etc.)
- [x] Create NOTE_VALUES lookup table

**Constants:**

```javascript
const INTERVALS = {
  UNISON: 0,
  MINOR_SECOND: 1,
  MAJOR_SECOND: 2,
  MINOR_THIRD: 3,
  MAJOR_THIRD: 4,
  PERFECT_FOURTH: 5,
  TRITONE: 6,
  PERFECT_FIFTH: 7,
  MINOR_SIXTH: 8,
  MAJOR_SIXTH: 9,
  MINOR_SEVENTH: 10,
  MAJOR_SEVENTH: 11,
  OCTAVE: 12,
};
```

#### 3.2 Create Chord Builder

- [x] Create `src/lib/chordBuilder.js`
- [x] Implement `buildChord(root, modifiers, options)`
- [x] Build chord structure based on modifier combination:
  - Determine quality (major, minor, dim, aug)
  - Add seventh if applicable
  - Add extensions (9, 11, 13)
  - Apply alterations (♭9, ♯9, ♯11, etc.)
  - Handle sus chords and other variations
- [x] Implement `invertChord(notes, inversionIndex)` for inversions
- [x] Return object: `{ root, modifiers, intervals: [], notes: [] }`

**Logic:**

```javascript
export function buildChord(root, modifiers, options = {}) {
  const { octave = 4 } = options;
  const intervals = [];

  // Start with root
  intervals.push(0);

  // Determine quality (major/minor/dim/aug)
  if (modifiers.includes("minor")) {
    intervals.push(3, 7); // minor third, perfect fifth
  } else if (modifiers.includes("diminished")) {
    intervals.push(3, 6); // minor third, diminished fifth
  } else if (modifiers.includes("augmented")) {
    intervals.push(4, 8); // major third, augmented fifth
  } else {
    intervals.push(4, 7); // major third, perfect fifth (default)
  }

  // Add seventh
  if (modifiers.includes("dom7")) intervals.push(10);
  if (modifiers.includes("maj7")) intervals.push(11);

  // Add extensions...
  // Add alterations...

  // Convert intervals to MIDI notes
  const rootMIDI = noteToMIDI(root, octave);
  const notes = intervals.map((interval) => rootMIDI + interval);

  return { root, intervals, notes };
}
```

#### 3.3 Create Chord Namer

- [x] Create `src/lib/chordNamer.js`
- [x] Implement `getChordName(root, modifiers)` → "C Maj7 ♯13"
- [x] Handle complex chord naming rules
- [x] Format with proper musical symbols (♯, ♭, etc.)
- [x] Handle various chord types (triads, 7ths, extensions, alterations, sus chords)

**Logic:**

```javascript
export function getChordName(root, modifiers) {
  let name = root;

  // Quality
  if (modifiers.includes("minor")) name += " min";
  else if (modifiers.includes("diminished")) name += " dim";
  else if (modifiers.includes("augmented")) name += " aug";
  else if (!modifiers.includes("dom7") && !modifiers.includes("maj7"))
    name += " Maj";

  // Seventh
  if (modifiers.includes("dom7")) name += "7";
  if (modifiers.includes("maj7")) name += " Maj7";

  // Extensions...

  return name.trim();
}
```

#### 3.4 Integration

- [x] Create `src/hooks/useChordEngine.js`
- [x] Combine keyboard parsing + chord building
- [x] React to pressed keys changes
- [x] Update current chord state
- [x] Manage inversion state
- [x] Manage octave settings
- [x] Reset inversion when chord changes

#### 3.5 Testing

- [x] Verify chord building logic works
  - Basic triads (C, Cm, Cdim, Caug)
  - Seventh chords (C7, Cmaj7, Cmin7)
  - Extensions (C9, C13, etc.)
  - Alterations (C7♯9, etc.)
- [x] Verify MIDI note output is correct
- [x] Test chord naming accuracy

**Deliverable:** ✅ Complete chord engine that converts key presses into chord data

---

## Phase 4: UI - Chord Display

### Goal: Visual feedback showing current chord

**Estimated Time:** 3-4 hours

### Tasks

#### 4.1 Create Chord Display Component

- [x] Integrate chord display into `src/App.jsx`
- [x] Display chord name prominently
- [x] Show debug info (notes, octave, inversion)
- [x] Empty state when no chord playing
- [x] Instructions for using inversions

**Styling:**

```css
.chord-display {
  font-size: 4rem;
  font-weight: bold;
  text-align: center;
  margin: 2rem 0;
  min-height: 5rem;
  transition: opacity 0.1s;
}
```

#### 4.2 Create Header Component

- [x] Integrate header into `src/App.jsx`
- [x] App title/logo
- [x] Include MIDIStatus component
- [x] Simple, clean design

#### 4.3 Create Main Layout

- [x] Update `src/App.jsx` with layout
- [x] Compose Header + ChordDisplay + Piano placeholder
- [x] Create `src/App.css` with styling
- [x] Create `src/index.css` with base styles
- [x] Add footer with project description

#### 4.4 Testing

- [x] Test chord name updates when keys pressed
- [x] Verify visual feedback works

**Deliverable:** ✅ Clean UI showing current chord name in real-time

---

## Phase 5: UI - Piano Keyboard Visualization

### Goal: Visual piano keyboard showing active notes

**Estimated Time:** 5-6 hours

### Tasks

#### 5.1 Create Piano Key Component

- [x] Create `src/components/PianoKey.jsx`
- [x] Render individual piano key (white or black)
- [x] Receive props: `note`, `isActive`, `isBlack`
- [x] Style with CSS (white keys larger, black keys offset)
- [x] Highlight when active

**Styling approach:**

```css
.piano-key {
  position: relative;
  border: 1px solid #000;
  cursor: default;
}

.piano-key.white {
  width: 40px;
  height: 200px;
  background: white;
}

.piano-key.black {
  width: 28px;
  height: 130px;
  background: black;
  position: absolute;
  z-index: 2;
}

.piano-key.active {
  background: #4a9eff;
}
```

#### 5.2 Create Piano Keyboard Component

- [x] Create `src/components/PianoKeyboard.jsx`
- [x] Render 2-3 octaves of keys (configurable range)
- [x] Calculate black key positions (offset between whites)
- [x] Receive active MIDI notes as prop
- [x] Highlight active keys based on current chord

**Layout:**

```jsx
<div className="piano-keyboard">
  {keys.map((key) => (
    <PianoKey
      key={key.midi}
      note={key.note}
      midiNumber={key.midi}
      isBlack={key.isBlack}
      isActive={activeNotes.includes(key.midi)}
    />
  ))}
</div>
```

#### 5.3 Piano Keyboard Layout Logic

- [x] Create `src/lib/pianoLayout.js`
- [x] Generate array of keys for given octave range
- [x] Calculate positioning for black keys
- [x] Export `generateKeyboard(startOctave, endOctave)`

#### 5.4 Color Coding (Optional Enhancement)

- [ ] Color-code notes by function (deferred to future enhancement):
  - Root: blue
  - Third: green
  - Fifth: yellow
  - Seventh: orange
  - Extensions: purple

#### 5.5 Testing

- [x] Visual check of piano keyboard layout
- [x] Verify active notes highlight correctly
- [x] Test with various chords (triads, 7ths, extensions)
- [x] Ensure black keys align properly with white keys

**Deliverable:** ✅ Visual piano keyboard showing which notes are playing

---

## Phase 6: Integration - Connect Everything

### Goal: Wire up all components for end-to-end functionality

**Estimated Time:** 3-4 hours

### Tasks

#### 6.1 Complete App Integration

- [x] Update `src/App.jsx` to integrate all components
- [x] Wire keyboard input → chord engine → MIDI output
- [x] Wire chord engine → UI updates
- [x] Handle state management with contexts and hooks
- [x] Wrap app with MIDIProvider in `src/main.jsx`

**Flow:**

```jsx
function App() {
  const { playChord, stopChord, isConnected } = useMIDI();
  const { pressedKeys } = useKeyboard();
  const { currentChord } = useChordEngine(pressedKeys);

  useEffect(() => {
    if (currentChord && isConnected) {
      playChord(currentChord.notes);
    } else {
      stopChord();
    }
  }, [currentChord, isConnected]);

  return (
    <>
      <Header />
      <ChordDisplay chordName={currentChord?.name} />
      <PianoKeyboard activeNotes={currentChord?.notes || []} />
      <SettingsPanel />
    </>
  );
}
```

#### 6.2 Handle Edge Cases

- [x] No root note pressed: show empty state
- [x] No MIDI connection: show warning in MIDIStatus
- [x] Browser doesn't support MIDI: show error message
- [x] Invalid modifier combinations: handled gracefully

#### 6.3 Add Settings Panel (Basic)

- [ ] Create `src/components/SettingsPanel.jsx`
- [ ] Collapsible panel (start collapsed)
- [ ] MIDI device selection dropdown (currently in MIDIStatus)
- [ ] MIDI channel selector (1-16)
- [ ] Velocity slider
- [ ] Octave offset selector

#### 6.4 Testing - End to End

- [x] Full flow test: press keys → see chord name → hear MIDI in DAW
- [x] Test various chord types
- [x] Test MIDI latency (imperceptible)
- [x] Test with MIDI devices

**Deliverable:** ✅ Core functionality working - can play chords and send MIDI (pending piano keyboard visual and settings panel)

---

## Phase 7: Inversion System

### Goal: Implement left shift to cycle through inversions

**Estimated Time:** 3-4 hours

### Tasks

#### 7.1 Add Inversion Logic

- [x] Update `src/lib/chordBuilder.js`
- [x] Implement `invertChord(notes, inversionIndex)`
- [x] Rotate notes while maintaining octave boundaries
- [x] Keep inversions within reasonable range

**Algorithm:**

```javascript
export function invertChord(notes, inversionIndex) {
  if (inversionIndex === 0 || notes.length === 0) return notes;

  const sortedNotes = [...notes].sort((a, b) => a - b);
  const inverted = [...sortedNotes];

  for (let i = 0; i < inversionIndex % notes.length; i++) {
    // Move lowest note up an octave
    inverted.push(inverted.shift() + 12);
  }

  return inverted.sort((a, b) => a - b);
}
```

#### 7.2 Track Inversion State

- [x] Add `inversionIndex` to chord engine state
- [x] Listen for left shift key press in useChordEngine
- [x] Increment inversion index on shift press
- [x] Loop back to 0 after max inversions
- [x] Apply inversion to generated notes
- [x] Reset inversion when chord changes

#### 7.3 Update UI

- [x] Show current inversion index in debug info
- [x] Display instructions for using inversions

#### 7.4 Testing

- [x] Test inversion cycling through all positions
- [x] Verify MIDI notes update correctly
- [x] Test with simple triads (3 inversions)
- [x] Test with 7th chords (4 inversions)

**Deliverable:** ✅ Working inversion system activated by left shift

---

## Phase 8: Polish & Error Handling

### Goal: Improve UX, handle errors gracefully, add helpful features

**Estimated Time:** 4-5 hours

### Tasks

#### 8.1 Keyboard Reference Overlay

- [ ] Create `src/components/KeyboardReference.jsx`
- [ ] Visual guide showing key mappings
- [ ] Toggle with '?' or 'H' key
- [ ] Show left/right hand layouts
- [ ] Show special function keys

#### 8.2 MIDI Panic Button

- [ ] Add panic button to UI (or ESC key)
- [ ] Send "All Notes Off" (CC 123) to all channels
- [ ] Clear internal state
- [ ] Visual feedback when triggered

#### 8.3 Error Handling

- [ ] Graceful handling of MIDI disconnection
- [ ] Auto-reconnect logic (optional)
- [ ] Clear error messages for common issues:
  - "Web MIDI not supported in this browser"
  - "No MIDI devices found"
  - "MIDI permission denied"
- [ ] Helpful hints for troubleshooting

#### 8.4 Loading States

- [ ] Loading indicator while requesting MIDI access
- [ ] Skeleton UI before connection established

#### 8.5 Performance Optimization

- [ ] Debounce rapid key changes if needed
- [ ] Memoize chord calculations with React.memo
- [ ] Optimize re-renders (useCallback, useMemo)

#### 8.6 Accessibility

- [ ] Keyboard navigation for settings (already keyboard-first!)
- [ ] ARIA labels for interactive elements
- [ ] Focus management
- [ ] Screen reader support for status updates

#### 8.7 Visual Polish

- [ ] Smooth animations/transitions
- [ ] Consistent color scheme
- [ ] Typography improvements
- [ ] Hover states
- [ ] Dark mode (optional)

#### 8.8 Testing

- [ ] Cross-browser testing (Chrome, Edge, Opera)
- [ ] Test with multiple MIDI devices
- [ ] Test error scenarios
- [ ] Performance testing (RAM, CPU usage)
- [ ] Sustained playing session (ensure no memory leaks)

**Deliverable:** Polished, production-ready MVP

---

## Phase 9: Documentation & Deployment

### Goal: Prepare for distribution and use

**Estimated Time:** 2-3 hours

### Tasks

#### 9.1 Documentation

- [ ] Update README.md with:
  - Project description
  - Features list
  - Browser requirements
  - Setup instructions
  - Usage guide
  - Keyboard reference chart
  - Troubleshooting section
- [ ] Add inline code comments
- [ ] Document component props (JSDoc or TypeScript)
- [ ] Create CHANGELOG.md

#### 9.2 Build Configuration

- [ ] Optimize production build
- [ ] Configure minification
- [ ] Test production build locally
- [ ] Verify bundle size (keep under 500KB if possible)

#### 9.3 Deployment

**Option 1: Static Hosting (Vercel, Netlify, GitHub Pages)**

- [ ] Create production build
- [ ] Deploy to chosen platform
- [ ] Verify MIDI works in production
- [ ] Set up custom domain (optional)

**Option 2: Self-Hosted**

- [ ] Create simple Express server (already specified in tech spec)
- [ ] Add Dockerfile (optional)
- [ ] Document deployment process

#### 9.4 Testing in Production

- [ ] Test deployed version with DAW
- [ ] Verify all features work
- [ ] Check performance (no dev tooling overhead)
- [ ] Cross-device testing

**Deliverable:** Deployed, documented application ready for use

---

## Phase 10: Future Enhancements (Post-MVP)

### These items are planned for future releases

#### 10.1 Voicing Spread Feature

- [ ] Detect additional root key presses after initial root
- [ ] Implement drop-2, drop-3 voicing algorithms
- [ ] Add spread amount configuration
- [ ] Update UI to show voicing type

#### 10.2 Chord Buffer/History

- [ ] Track last N played chords
- [ ] Display history in UI
- [ ] Navigate through history
- [ ] Copy/export chord progression

#### 10.3 Advanced Settings

- [ ] Custom key mapping editor
- [ ] Velocity curves
- [ ] Note range limiting
- [ ] Voicing preference profiles

#### 10.4 Persistence (IndexedDB)

- [ ] Save/load user preferences
- [ ] Save favorite chord voicings
- [ ] Save custom progressions
- [ ] Import/export settings

#### 10.5 MIDI Recording

- [ ] Record MIDI sequence
- [ ] Loop playback
- [ ] Export to MIDI file
- [ ] Quantization options

#### 10.6 Progression Sequencer

- [ ] Chain chords into progressions
- [ ] Step sequencer interface
- [ ] Tempo/timing controls
- [ ] Pattern repeat/loop

#### 10.7 Visual Enhancements

- [ ] Animated transitions between chords
- [ ] Note trails/history on piano
- [ ] Chord diagram display (guitar-style)
- [ ] Themes/skins

---

## Testing Strategy

### Unit Testing

- [ ] Chord theory utilities
- [ ] Keyboard parsing logic
- [ ] Chord builder functions
- [ ] Inversion algorithms

**Tools:** Jest, Vitest

### Integration Testing

- [ ] MIDI output flow
- [ ] Keyboard → Chord → MIDI chain
- [ ] Component interactions

**Tools:** React Testing Library

### Manual Testing Checklist

- [ ] All chord types play correctly
- [ ] MIDI latency is imperceptible
- [ ] No stuck notes
- [ ] Works with virtual MIDI
- [ ] Works with hardware MIDI
- [ ] Works in Ableton Live
- [ ] Works in Logic Pro
- [ ] Works in other DAWs
- [ ] Browser compatibility (Chrome, Edge, Opera)
- [ ] OS compatibility (macOS, Windows, Linux)

---

## Success Criteria for MVP Launch

### Functionality

- ✅ Connects to MIDI devices
- ✅ Plays all defined chord types
- ✅ Chord names display correctly
- ✅ Inversions work
- ✅ Visual piano keyboard shows notes
- ✅ Settings are configurable
- ✅ No noticeable latency

### Quality

- ✅ No console errors
- ✅ Smooth performance (60fps UI)
- ✅ Clean, readable code
- ✅ Documented codebase
- ✅ Works in target browsers

### UX

- ✅ Intuitive to use within 5 minutes
- ✅ Clear feedback for all actions
- ✅ Helpful error messages
- ✅ Easy MIDI setup

---

## Risk Mitigation

### Technical Risks

**Risk:** Web MIDI API not widely supported

- _Mitigation:_ Clearly document browser requirements, show warning for unsupported browsers

**Risk:** Keyboard events conflict with browser shortcuts

- _Mitigation:_ Use preventDefault(), test thoroughly, document known conflicts

**Risk:** MIDI timing issues

- _Mitigation:_ Test early with real DAWs, optimize event handling

### Scope Risks

**Risk:** Feature creep delaying MVP

- _Mitigation:_ Stick to defined MVP scope, save enhancements for Phase 10+

**Risk:** Chord logic becomes too complex

- _Mitigation:_ Start simple, iterate based on real usage

---

## Development Tips

### Best Practices

1. **Commit frequently** - Small, atomic commits with clear messages
2. **Test with real hardware** - Use actual MIDI devices/DAWs, not just console logs
3. **Handle edge cases early** - Don't wait until the end to handle errors
4. **Keep components small** - Single responsibility principle
5. **Document as you go** - Don't save documentation for the end

### Common Pitfalls to Avoid

- ❌ Not calling preventDefault() on keyboard events → browser shortcuts interfere
- ❌ Not handling MIDI permission denial → app appears broken
- ❌ Not sending Note Off messages → stuck notes in DAW
- ❌ Not testing with multiple octaves → limited range
- ❌ Hardcoding MIDI channel → inflexible for users with complex setups

### Debugging Tips

- Use MIDI Monitor app (macOS) or MIDI-OX (Windows) to inspect messages
- Console.log pressed keys at every stage
- Test with virtual MIDI loopback device first
- Check browser console for Web MIDI errors
- Verify MIDI permissions in browser settings

---

## Estimated Total Time

| Phase                | Time          |
| -------------------- | ------------- |
| Phase 0: Setup       | 2-3 hours     |
| Phase 1: MIDI        | 4-6 hours     |
| Phase 2: Keyboard    | 4-5 hours     |
| Phase 3: Chord Logic | 6-8 hours     |
| Phase 4: Chord UI    | 3-4 hours     |
| Phase 5: Piano UI    | 5-6 hours     |
| Phase 6: Integration | 3-4 hours     |
| Phase 7: Inversions  | 3-4 hours     |
| Phase 8: Polish      | 4-5 hours     |
| Phase 9: Deploy      | 2-3 hours     |
| **Total**            | **36-48 hrs** |

**Estimated Calendar Time:** 1-2 weeks (part-time), 5-7 days (full-time)

---

## Next Steps

1. ✅ Review and approve this implementation plan
2. ⏭️ Begin Phase 0: Project Setup
3. ⏭️ Create initial git repository
4. ⏭️ Set up development environment
5. ⏭️ Start building!

---

## Appendix: Useful Resources

### Web MIDI API

- [MDN Web MIDI API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
- [WebMIDI.js Library](https://webmidijs.org/)

### MIDI Reference

- [MIDI Note Numbers Chart](https://www.inspiredacoustics.com/en/MIDI_note_numbers_and_center_frequencies)
- [MIDI Message Reference](https://www.midi.org/specifications/midi1-specifications)

### Music Theory

- [Chord Construction Reference](https://www.musictheory.net/lessons/40)
- [Jazz Chord Voicings](https://www.jazzguitar.be/chord_voicings.html)

### React & Vite

- [React Hooks Documentation](https://react.dev/reference/react)
- [Vite Documentation](https://vitejs.dev/)

### Testing

- [Testing Library](https://testing-library.com/)
- [Vitest](https://vitest.dev/)

Don't ever start any servers or test runs yourself -- ask me, the user! I'm here to work with you.
