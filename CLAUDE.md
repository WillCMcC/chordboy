# CLAUDE.md

ChordBoy is a web-based MIDI chord controller for jazz performance. Users play complex chords using a two-handed keyboard interface: left hand selects root notes, right hand adds chord qualities/extensions.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run test:run # Run tests once
```

## Deployment

Deploys to CapRover app `cb` at chordboy.com.

```bash
npm run deploy   # Build and deploy to CapRover
```

Requires one-time CapRover CLI login: `caprover login` (URL: https://captain.3218i.com, Name: 3218i)

## Project Structure

```
src/
  types/       # Centralized TypeScript type definitions
  hooks/       # React hooks (useKeyboard, useChordEngine, useMIDI, usePresets, useTransport)
  lib/         # Pure functions (chord building, MIDI, keyboard mappings, voice leading)
  components/  # UI components
  workers/     # Web Workers (MIDI clock)
```

## Data Flow

```
Keyboard → useKeyboard → useChordEngine → appEvents → useMIDI → MIDI Output
                              ↓
               parseKeys → buildChord → voicing transforms
```

The `appEvents` event bus decouples chord state from MIDI playback. `useChordEngine` emits `chord:changed` and `chord:cleared` events; `useMIDI` subscribes and handles playback.

## Key Concepts

- **Left hand keys** (QWER/ASDF/ZXCV): Select root note chromatically (C through B)
- **Right hand keys**: Add modifiers (J=major, U=minor, K=dom7, I=maj7, L=9th, etc.)
- **Voicing controls**: L-Shift=inversion, R-Shift=voicing style, arrows=octave/spread
- **Presets**: 0-9 keys save/recall chords, persisted to IndexedDB

## Architecture Notes

- React 19 + Vite 7 + TypeScript (strict mode)
- Web MIDI API (Chrome/Edge/Opera) + BLE MIDI support
- Event-driven: hooks communicate via typed `appEvents` pub/sub, not prop drilling
- Smart chord diffing: only triggers MIDI note-on/off for changed notes
- Web Worker for precise MIDI clock (avoids background tab throttling)

## Detailed Documentation

See `agent_docs/` for in-depth reference when working on specific areas:

- `architecture.md` - Component relationships, event flow, state management
- `keyboard-mapping.md` - Complete key-to-function mappings
- `chord-building.md` - Chord construction pipeline, voicing transforms
- `midi-integration.md` - MIDI/BLE setup, clock sync, humanization
- `testing.md` - Test patterns and coverage

## Rules

- Do not run dev server or watch-mode tests
- Do not create commits unless asked
