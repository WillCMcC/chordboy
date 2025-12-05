# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChordBoy is a web-based MIDI chord controller optimized for jazz performance. It enables musicians to play complex jazz chords using a two-handed keyboard interface, outputting MIDI to external instruments or DAWs via the Web MIDI API.

## Commands

```bash
npm run dev           # Start Vite dev server on port 3000
npm run build         # Build for production
npm run preview       # Preview production build
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage report
```

## Architecture

### Data Flow

```
User Presses Keys → useKeyboard() → useChordEngine() → useMIDI() → MIDI Output
                                  ↓
                         parseKeys() → buildChord() → getChordName()
```

### Key Files

**Hooks (src/hooks/):**

- `useKeyboard.js` - Captures keyboard events, tracks pressed keys
- `useChordEngine.js` - Central orchestrator: parses keys, builds chords, manages inversions/voicings/presets
- `useMIDI.jsx` - MIDI connection via MIDIProvider context, handles note on/off with smart diffing

**Lib (src/lib/):**

- `keyboardMappings.js` - Maps physical keys to musical functions (left hand = root notes Q/W/E/R/A/S/D/F/Z/X/C/V, right hand = modifiers J/U/M/K/I/L/O etc.)
- `chordBuilder.js` - Converts root + modifiers → chord structure with MIDI notes
- `chordTheory.js` - Note-to-MIDI conversion, interval definitions (INTERVALS constant)
- `chordNamer.js` - Formats chord names with proper notation (e.g., "C Maj7♯11")
- `chordSolver.js` - Voice leading optimization for chord progressions
- `voicingTransforms.js` - Shared voicing helpers (applyProgressiveDrop, applySpread)

### Keyboard Mapping

**Left Hand (Root Selection):**

- Row 1: Q=C, W=C#, E=D, R=D#
- Row 2: A=E, S=F, D=F#, F=G
- Row 3: Z=G#, X=A, C=A#, V=B

**Right Hand (Modifiers):**

- Quality: J=major, U=minor, M=dim, 7=aug
- Sevenths: K=dom7, I=maj7, ,=6th
- Extensions: L=9th, O=11th, .=13th
- Alterations: [=♯9, ]=♭9, '=♯11, /=♭5

**Controls:**

- Shift: cycle inversions
- CapsLock: drop notes
- Arrow keys: octave (←/→), spread (↑/↓)
- Space: save to next preset slot
- 0-9: save/recall presets

### Chord Building Pipeline

1. `parseKeys()` extracts root note and modifier list from pressed keys
2. `buildChord()` creates intervals array based on quality and extensions
3. Voicing transforms applied: drop, spread, inversion
4. `getChordName()` generates display name
5. `useMIDI.playChord()` sends MIDI with smart diff (only triggers changed notes)

## Tech Stack

- React 19 with Vite 7
- Web MIDI API (Chrome/Edge/Opera only)
- PWA support via vite-plugin-pwa
- No external state management (React state + context)
- Presets persist to IndexedDB

## Developer Rules

- Treat yourself and everyone else with respect
- Do not run server or test processes
- Do not attempt to create commits or manage git in any way unless asked
