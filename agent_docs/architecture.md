# Architecture

## Component Hierarchy

```
main.tsx
└── MIDIProvider (src/hooks/useMIDI.tsx)
    └── App.tsx
        ├── ChordDisplay
        ├── TransportControls (desktop)
        │   └── PlaybackModeSelector
        ├── PresetsPanel (desktop)
        ├── PianoKeyboard
        ├── MobileControls (mobile)
        │   └── GraceNoteStrip
        ├── SettingsPanel
        ├── SynthPanel
        ├── TutorialModal
        ├── SequencerModal
        └── ProgWizardModal
```

## Hook Responsibilities

### Core Hooks

| Hook | Purpose | Key Exports |
|------|---------|-------------|
| `useKeyboard` | Captures key events, tracks pressed keys | `pressedKeys`, `clearKeys`, `isKeyPressed` |
| `useChordEngine` | Orchestrates chord building, voicing, presets | `currentChord`, voicing controls, preset actions |
| `useMIDI` | MIDI connection context, device management | `outputs`, `inputs`, connection state, `selectOutput` |
| `useMIDIPlayback` | Note playback engine with diffing | `playChord`, `retriggerChord`, `stopAllNotes`, `panic` |
| `usePresets` | Preset storage with IndexedDB persistence | `savePreset`, `recallPreset`, `solvePresetVoicings` |
| `useTransport` | BPM, playback, sequencer, MIDI clock sync | `toggle`, `setBpm`, sequencer state |
| `useGraceNotes` | Grace note re-articulation during preset playback | (internal, captures g/h/j/k/l keys, -/= octave shift) |
| `useCustomPatches` | Custom patch storage with IndexedDB persistence | `createPatch`, `updatePatch`, `deletePatch`, `patchLibrary` |
| `usePlaybackMode` | Playback mode state and rhythmic chord scheduling | `mode`, `setMode`, `playChordWithMode`, `stopPlayback` |
| `usePlaybackModeDisplay` | Real-time keyboard display for playback modes | Returns active notes array |
| `useProgressionSettings` | Chord progression generation settings | `trueRandomMode`, `setTrueRandomMode` |

### Supporting Hooks

| Hook | Purpose |
|------|---------|
| `useBLEMidi` | Bluetooth LE MIDI device scanning/connection |
| `useMIDIExpression` | Pitch bend and CC message handling |
| `useToneSynth` | Built-in Web Audio synthesis with CustomSynthEngine integration |
| `useVoicingKeyboard` | Keyboard shortcuts for voicing controls |
| `useEventSubscription` | Helper for subscribing to appEvents |
| `usePersistence` | Generic IndexedDB async storage pattern |
| `useStateContainer` | Ref container pattern for stable callbacks |
| `useIsMobile` | Media query detection |
| `useWakeLock` | Screen wake lock management |
| `usePWAInstall` | Progressive Web App installation prompts |

## Type System

Centralized TypeScript types in `src/types/`:

- **music.ts**: `NoteName`, `MIDINote`, `Interval`, `ChordQuality`, `ModifierType`, `Chord`, `VoicedChord`, `Preset`, `VoicingStyle`, `SequencerState`, `StepAction`
- **midi.ts**: `MIDIOutputDevice`, `MIDIInputDevice`, `BLEMIDIConnection`
- **events.ts**: `AppEventMap` with typed event payloads
- **synth.ts**: `CustomPatch`, `OscillatorConfig`, `FilterConfig`, `EnvelopeConfig`, `LFOConfig`, `ModRouting`, `EffectConfig`, `PatchLibraryEntry`

## Event Bus Pattern

The app uses `appEvents` (src/lib/eventBus.ts) to decouple components:

```typescript
// useChordEngine emits when chord changes
appEvents.emit("chord:changed", { notes, name, source, retrigger });
appEvents.emit("chord:cleared", { source });

// useMIDI subscribes and handles playback
useEventSubscription(appEvents, "chord:changed", (event) => {
  event.retrigger ? retriggerChord(event.notes) : playChord(event.notes);
});
```

**Event Types:**
- `chord:changed` - New chord to play `{ notes, name, source, retrigger }`
- `chord:cleared` - Stop all notes `{ source }`
- `voicing:changed` - Voicing parameters updated
- `preset:saved`, `preset:recalled`, `preset:cleared`
- `keys:allUp` - All keys released
- `grace:note` - Re-trigger subset of notes with octave shift

## State Flow

```
User Input → useKeyboard.pressedKeys
                    ↓
            useChordEngine.parsedKeys (parseKeys)
                    ↓
            useChordEngine.baseChord (buildChord)
                    ↓
            applyVoicingStyle (jazzVoicings.ts)
                    ↓
            applySpread + invertChord (voicingTransforms.ts)
                    ↓
            appEvents.emit("chord:changed")
                    ↓
            useMIDI subscriber → useMIDIPlayback.playChord
```

## Mobile vs Desktop

`useIsMobile()` detects viewport. Key differences:
- Mobile uses `retrigger: true` for full chord re-articulation
- Mobile has `MobileControls` component with touch interface and `GraceNoteStrip`
- Desktop has separate `TransportControls` and `PresetsPanel`

## Custom Synthesis Architecture

### CustomSynthEngine (`src/lib/customSynthEngine.ts`)

8-voice polyphonic synthesizer built on Tone.js with Web Audio API:
- **Dual oscillators** per voice with PWM, FM, ring modulation
- **Multimode filter** (lowpass/highpass/bandpass) with dedicated envelope and keyboard tracking
- **LFO modulation** with routing matrix (filter freq/res, oscillator pitch)
- **Effects chain**: Reverb, delay, chorus, phaser, distortion, bitcrusher
- **Voice management**: Voice stealing with envelope cancellation, glide/portamento

### PatchBuilder Component (`src/components/PatchBuilder/`)

Modal UI for real-time patch editing:
- Visual ADSR envelope editors (`EnvelopeEditor.tsx`)
- Knob controls for oscillator/filter parameters (`Knob.tsx`, `OscillatorSection.tsx`, `FilterSection.tsx`)
- LFO modulation routing matrix (`LFOSection.tsx`, `ModulationMatrix.tsx`)
- Effects rack with meters (`EffectsRack.tsx`)
- Patch browser with factory and user patches (`PatchLibrary.tsx`)
- All changes apply in real-time via `useCustomPatches` hook

### Patch Data Flow

```
PatchBuilder UI → useCustomPatches.updatePatch()
                        ↓
                  patchStorage.ts (IndexedDB)
                        ↓
                  useToneSynth.loadPatch()
                        ↓
                  CustomSynthEngine.loadPatch()
                        ↓
                  Web Audio API nodes updated
```

**Critical Implementation Note**: When removing LFO modulation routes, filter mod connections must be cleared BEFORE clearing modulation connections to prevent audio corruption (see `LFO_UNROUTING_BUG_FIX.md`).

### Supporting Modules

- **patchStorage.ts**: IndexedDB persistence for user patches
- **patchValidation.ts**: Schema validation and migration
- **synthPresets.ts**: Factory patch library (PWM lead, warm pad, etc.)
- **defaultPatch.ts**: Template for new patches

## Clock Worker

`src/workers/clockWorker.ts` - Web Worker for precise MIDI clock:
- Runs in background thread (avoids throttling when tab inactive)
- Receives: `start`, `stop`, `setBpm` messages
- Sends: `pulse` messages at 24 PPQN (standard MIDI clock rate)
- Uses `performance.now()` with drift compensation

## Persistence

- **Presets**: IndexedDB via `src/lib/presetStorage.ts`
- **Sequencer**: IndexedDB via `src/lib/sequencerStorage.ts`
- **Custom Patches**: IndexedDB via `src/lib/patchStorage.ts`
- **Settings**: localStorage (wake lock, tutorial seen)

Uses `usePersistence` hook for load-on-mount + debounced save-on-change pattern.
