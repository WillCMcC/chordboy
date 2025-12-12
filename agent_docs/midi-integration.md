# MIDI Integration

## Files

- `src/hooks/useMIDI.tsx` - MIDI context provider and device management
- `src/hooks/useMIDIPlayback.ts` - Note playback engine with smart diffing
- `src/hooks/useBLEMidi.ts` - Bluetooth LE MIDI support
- `src/hooks/useMIDIExpression.ts` - Pitch bend and CC handling
- `src/lib/midi.ts` - Low-level Web MIDI API functions
- `src/lib/bleMidi.ts` - BLE MIDI protocol functions
- `src/workers/clockWorker.ts` - Web Worker for precise MIDI clock

## MIDIProvider

Wraps the app in `main.tsx`. Provides context for device management.

```typescript
// Available from useMIDI() hook:
{
  // Connection state
  isConnected, outputs, inputs, selectedOutput, selectedInput,
  selectOutput, selectInput,

  // BLE
  bleSupported, bleConnected, bleDevice, connectBLE, disconnectBLE,

  // Settings
  channel, velocity, humanize, strumEnabled, strumSpread, strumDirection,
  setHumanize, setStrumEnabled, setStrumSpread, setStrumDirection,

  // Clock sync
  setClockCallbacks, sendMIDIClock, sendMIDIStart, sendMIDIStop,
}
```

## useMIDIPlayback

Handles actual note playback, subscribed to chord events:

```typescript
// Available from useMIDIPlayback() hook:
{
  playNote, stopNote,
  playChord, retriggerChord, stopAllNotes, panic,
}
```

## Smart Chord Diffing

`playChord()` in useMIDIPlayback only sends note-on/off for changed notes:

```typescript
const notesToStop = currentNotes.filter(n => !newNotesSet.has(n));
const notesToStart = notes.filter(n => !currentNotesSet.has(n));
```

`retriggerChord()` stops all and restarts (used on mobile for clear articulation).

## Humanization

`src/lib/humanize.ts` - Staggers note timing for natural feel:
- `getHumanizeOffsets(noteCount, amount)` returns timing offsets (0-100ms)
- Applied when `humanize > 0` and multiple notes
- Uses `performance.now()` based scheduling

## Strum Mode

`src/lib/strum.ts` - Arpeggiates notes by pitch:
- Directions: `up`, `down`, `alternate`
- `strumSpread` controls total duration in ms
- Notes sorted by pitch, evenly spaced delays

## Clock Worker

`src/workers/clockWorker.ts` - Web Worker for precise MIDI clock:
- Runs in background thread (avoids browser throttling when tab inactive)
- Receives messages: `start`, `stop`, `setBpm`
- Sends `pulse` messages at 24 PPQN (standard MIDI clock rate)
- Uses high-resolution timing with drift compensation
- Used by `useTransport` hook for sequencer timing

## MIDI Clock Sync

External clock input for tempo sync:
1. Select MIDI input via `selectInput()`
2. Input messages routed to `onMidiClockRef` callbacks
3. `useTransport` subscribes via `setClockCallbacks()`

Supported messages: MIDI_CLOCK (0xF8), MIDI_START (0xFA), MIDI_STOP (0xFC), MIDI_CONTINUE (0xFB)

## BLE MIDI

Bluetooth LE MIDI for wireless connection:
- `connectBLE()` scans for devices via browser picker
- Uses standard BLE MIDI characteristic (03B80E5A-EDE8-4B33-A751-6CE34EC4C700)
- `sendBLEChordOn/Off()` batches notes in single packet for efficiency
- Handles 5-byte BLE MIDI packet format with timestamps

## Panic

`panic()` sends all-notes-off on all channels. Called on unmount and page refresh to prevent stuck notes.
