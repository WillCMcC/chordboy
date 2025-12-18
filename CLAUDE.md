# CLAUDE.md

ChordBoy is a web-based MIDI chord controller for jazz performance. Users play complex chords using a two-handed keyboard interface: left hand selects root notes, right hand adds chord qualities/extensions. Features built-in synthesis and MIDI output.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run test:run # Run tests once
npm run deploy   # Build and deploy to CapRover (chordboy.com)
```

## Project Structure

```
src/
  types/       # TypeScript types (music, midi, events, synth)
  hooks/       # React hooks (useChordEngine, useMIDI, useToneSynth, usePresets, etc.)
  lib/         # Pure functions (chord building, MIDI, voicings, synthesis engine)
  components/  # UI components (includes PatchBuilder/ for synth editing)
  workers/     # Web Workers (MIDI clock)
```

## Data Flow

```
Keyboard → useKeyboard → useChordEngine → appEvents → useMIDI → MIDI Output
                                                   → useToneSynth → Web Audio
```

The `appEvents` event bus decouples chord state from playback. `useChordEngine` emits `chord:changed`; `useMIDI` and `useToneSynth` subscribe and handle output.

## Key Concepts

- **Left hand** (QWER/ASDF/ZXCV): Root notes C through B
- **Right hand**: Chord modifiers (J=major, U=minor, K=dom7, I=maj7, L=9th)
- **Voicing controls**: Shift keys for inversion/style, arrows for octave/spread
- **Presets**: 0-9 keys save/recall chords (IndexedDB)
- **Audio modes**: MIDI only, Synth only, or Both

## Tech Stack

- React 19 + Vite + TypeScript (strict)
- Web MIDI API + BLE MIDI
- Tone.js + custom synthesis engine (8-voice polyphonic, dual oscillators, effects)
- Event-driven architecture via typed `appEvents` pub/sub

## Detailed Documentation

See `agent_docs/` for in-depth reference:

| File | Contents |
|------|----------|
| `architecture.md` | Component hierarchy, hooks, event flow, synthesis engine, state management |
| `keyboard-mapping.md` | Complete key-to-function mappings |
| `chord-building.md` | Chord construction pipeline, voicing transforms |
| `midi-integration.md` | MIDI/BLE setup, clock sync, humanization |
| `testing.md` | Test patterns and coverage |

## Critical Notes

- **LFO routing bug**: When updating LFO routing, filter mod connections must be reset BEFORE clearing modulation connections (see `LFO_UNROUTING_BUG_FIX.md`)
- **Event bus**: All inter-hook communication uses `appEvents` - avoid prop drilling
