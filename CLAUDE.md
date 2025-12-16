# CLAUDE.md

ChordBoy is a web-based MIDI chord controller for jazz performance. Users play complex chords using a two-handed keyboard interface: left hand selects root notes, right hand adds chord qualities/extensions. Features built-in synthesis with custom patch editor and grace note support.

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
  types/       # Centralized TypeScript type definitions (includes synth types)
  hooks/       # React hooks (useKeyboard, useChordEngine, useMIDI, usePresets, useTransport,
               #             useToneSynth, useCustomPatches, useGraceNotes)
  lib/         # Pure functions (chord building, MIDI, keyboard mappings, voice leading,
               #                 customSynthEngine, synthPresets, patchStorage)
  components/  # UI components (includes PatchBuilder/ subdirectory)
  workers/     # Web Workers (MIDI clock)
```

## Data Flow

```
Keyboard → useKeyboard → useChordEngine → appEvents → useMIDI → MIDI Output
                              ↓                            ↓
               parseKeys → buildChord → voicing transforms ↓
                                                            ↓
                                           useToneSynth → CustomSynthEngine
                                                            (Web Audio API)
```

The `appEvents` event bus decouples chord state from MIDI playback. `useChordEngine` emits `chord:changed` and `chord:cleared` events; `useMIDI` and `useToneSynth` subscribe and handle playback to external MIDI devices and/or internal synthesizer.

## Key Concepts

- **Left hand keys** (QWER/ASDF/ZXCV): Select root note chromatically (C through B)
- **Right hand keys**: Add modifiers (J=major, U=minor, K=dom7, I=maj7, L=9th, etc.)
- **Voicing controls**: L-Shift=inversion, R-Shift=voicing style, arrows=octave/spread
- **Presets**: 0-9 keys save/recall chords, persisted to IndexedDB
- **Grace notes**: Configurable pre-note ornaments with octave shift (-/= keys)
- **Audio modes**: MIDI only, Synth only, or Both (simultaneous output)

## Architecture Notes

- React 19 + Vite 7 + TypeScript (strict mode)
- Web MIDI API (Chrome/Edge/Opera) + BLE MIDI support
- Web Audio API via Tone.js with custom synthesis engine
- Event-driven: hooks communicate via typed `appEvents` pub/sub, not prop drilling
- Smart chord diffing: only triggers MIDI note-on/off for changed notes
- Web Worker for precise MIDI clock (avoids background tab throttling)

## Custom Synthesis

ChordBoy includes a sophisticated custom synthesis engine (`customSynthEngine.ts`) with:

- **Dual oscillators** per voice with PWM, FM, and ring modulation
- **Multimode filter** with dedicated envelope and keyboard tracking
- **LFOs** with routing matrix (can modulate filter freq/res, oscillator pitch)
- **Effects chain**: Reverb, delay, chorus, phaser, distortion, bitcrusher
- **8-voice polyphony** with voice stealing and glide/portamento
- **Patch system**: Factory presets + user-created patches stored in IndexedDB

### PatchBuilder Component

Full-featured modal patch editor at `/src/components/PatchBuilder/`:
- Visual ADSR envelope editors
- Knob controls for oscillator/filter parameters
- LFO modulation routing matrix
- Effects rack with visual meters
- Patch browser with factory and user patches
- All changes apply in real-time to the synth engine

Critical implementation note: When updating LFO routing, filter mod connections must be reset BEFORE clearing modulation connections to prevent audio corruption (see `LFO_UNROUTING_BUG_FIX.md`).

## Recent Updates (Since Dec 10, 2025)

### Synthesis Engine & Patch System
- Added custom synthesis engine with dual oscillators, multimode filter, and LFO modulation
- Implemented PatchBuilder modal UI with real-time parameter editing
- Created factory patch library with presets (PWM lead, warm pad, etc.) in `synthPresets.ts`
- Added `useCustomPatches` hook for user patch creation, editing, and IndexedDB persistence
- Fixed critical LFO unrouting bug that caused audio silence when removing modulation routes
- Improved synth latency settings in SettingsPanel for better performance tuning

### Grace Notes System
- Implemented `useGraceNotes` hook for pre-note ornaments
- Added grace note octave shifting with `-` (down) and `=` (up) keys
- Configurable timing and trigger mode support
- Visual grace note strip component for feedback

### Mobile Experience
- Major mobile UI refactor for better touch interaction
- Improved MobileControls layout and touch targets
- Enhanced ChordDisplay for mobile viewports

### Critical Bug Fixes
- Fixed MIDI sequence ID race conditions in chord playback
- Fixed BLE MIDI state desync issues with proper disconnect listener attachment
- Fixed synth voice stealing to cancel envelopes before reallocation
- Added atomic preset saves with per-slot keys to prevent race conditions
- Resolved 33 TypeScript errors in PatchBuilder components

## Detailed Documentation

See `agent_docs/` for in-depth reference when working on specific areas:

- `architecture.md` - Component relationships, event flow, state management
- `keyboard-mapping.md` - Complete key-to-function mappings
- `chord-building.md` - Chord construction pipeline, voicing transforms
- `midi-integration.md` - MIDI/BLE setup, clock sync, humanization
- `testing.md` - Test patterns and coverage
