# MIDI Integration

## Files

- `src/hooks/useMIDI.tsx` - Main MIDI hook and provider
- `src/lib/midi.ts` - Low-level Web MIDI API functions
- `src/lib/bleMidi.ts` - Bluetooth LE MIDI support
- `src/workers/clockWorker.ts` - Web Worker for precise MIDI clock

## MIDIProvider

Wraps the app in `main.tsx`. Provides context for all MIDI operations.

```typescript
// Available from useMIDI() hook:
{
  // Connection
  isConnected, outputs, inputs, selectedOutput, selectedInput,
  selectOutput, selectInput,

  // BLE
  bleSupported, bleConnected, bleDevice, connectBLE, disconnectBLE,

  // Playback
  playNote, stopNote, playChord, retriggerChord, stopAllNotes, panic,

  // Settings
  channel, velocity, humanize, strumEnabled, strumSpread, strumDirection,
  setHumanize, setStrumEnabled, setStrumSpread, setStrumDirection,

  // Clock
  setClockCallbacks, sendMIDIClock, sendMIDIStart, sendMIDIStop,
}
```

## Smart Chord Diffing

`playChord()` in useMIDI.tsx only sends note-on/off for changed notes:

```typescript
const notesToStop = currentNotes.filter(n => !newNotesSet.has(n));
const notesToStart = notes.filter(n => !currentNotesSet.has(n));
```

`retriggerChord()` stops all and restarts (used on mobile for clear articulation).

## Humanization

`src/lib/humanize.ts` - Staggers note timing for natural feel:
- `getHumanizeOffsets(noteCount, amount)` returns timing offsets
- Applied when `humanize > 0` and multiple notes

## Strum Mode

`src/lib/strum.ts` - Arpeggiates notes by pitch:
- Directions: `STRUM_UP`, `STRUM_DOWN`, `STRUM_ALT`
- `strumSpread` controls total duration in ms

## Clock Worker

`src/workers/clockWorker.ts` - Web Worker for precise MIDI clock:
- Runs in background thread (avoids browser throttling when tab inactive)
- Receives messages: `start`, `stop`, `setBpm`
- Sends `pulse` messages at 24 PPQN (standard MIDI clock rate)
- Used by `useTransport` hook for sequencer timing

## MIDI Clock Sync

External clock input for tempo sync:
1. Select MIDI input via `selectInput()`
2. Input messages routed to `onMidiClockRef` callbacks
3. `useTransport` subscribes via `setClockCallbacks()`

Supported messages: MIDI_CLOCK (0xF8), MIDI_START (0xFA), MIDI_STOP (0xFC), MIDI_CONTINUE (0xFB)

## BLE MIDI

Bluetooth LE MIDI for wireless connection:
- `connectBLE()` scans for devices
- Uses standard BLE MIDI characteristic
- Same note sending API but batched packets

## Panic

`panic()` sends all-notes-off on all channels. Called on unmount and page refresh to prevent stuck notes.
