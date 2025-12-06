# Architecture

## Component Hierarchy

```
main.jsx
└── MIDIProvider (src/hooks/useMIDI.jsx)
    └── App.jsx
        ├── ChordDisplay
        ├── TransportControls (desktop)
        ├── PresetsPanel (desktop)
        ├── PianoKeyboard
        ├── MobileControls (mobile)
        ├── SettingsPanel
        ├── TutorialModal
        └── SequencerModal
```

## Hook Responsibilities

| Hook | Purpose | Key Exports |
|------|---------|-------------|
| `useKeyboard` | Captures key events, tracks pressed keys | `pressedKeys`, `clearKeys` |
| `useChordEngine` | Orchestrates chord building, voicing, presets | `currentChord`, voicing controls, preset actions |
| `useMIDI` | MIDI connection, note playback, BLE support | `playChord`, `stopAllNotes`, connection state |
| `usePresets` | Preset storage with IndexedDB persistence | `savePreset`, `recallPreset`, `solvePresetVoicings` |
| `useTransport` | BPM, playback, sequencer, MIDI clock sync | `toggle`, `setBpm`, sequencer state |
| `useVoicingKeyboard` | Keyboard shortcuts for voicing controls | (internal to useChordEngine) |

## Event Bus Pattern

The app uses `appEvents` (src/lib/eventBus.js) to decouple components:

```javascript
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

## State Flow

```
User Input → useKeyboard.pressedKeys
                    ↓
            useChordEngine.parsedKeys (parseKeys)
                    ↓
            useChordEngine.baseChord (buildChord)
                    ↓
            useChordEngine.currentChord (with voicing transforms)
                    ↓
            appEvents.emit("chord:changed")
                    ↓
            useMIDI subscriber → playChord/retriggerChord
```

## Mobile vs Desktop

`useIsMobile()` detects viewport. Key differences:
- Mobile uses `retrigger: true` for full chord re-articulation
- Mobile has `MobileControls` component with touch interface
- Desktop has separate `TransportControls` and `PresetsPanel`

## Persistence

- **Presets**: IndexedDB via `src/lib/presetStorage.js`
- **Sequencer**: IndexedDB via `src/lib/sequencerStorage.js`
- **Settings**: localStorage (wake lock, tutorial seen)

Uses `useAsyncStorage` hook for load-on-mount + debounced save-on-change pattern.
