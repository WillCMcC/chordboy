# MIDI Integration

## Files

Core MIDI hooks (modular architecture):
- `src/hooks/useMIDI.tsx` - MIDI context provider, orchestrates sub-hooks
- `src/hooks/useMIDIConnection.ts` - Device enumeration and connection management
- `src/hooks/useMIDIPlayback.ts` - Note playback engine with smart diffing
- `src/hooks/useMIDIClock.ts` - MIDI clock synchronization
- `src/hooks/useMIDIGraceNotes.ts` - Grace note re-articulation
- `src/hooks/useMIDIChordEvents.ts` - Chord event subscription
- `src/hooks/useMIDIInputSelection.ts` - Input device selection

Supporting:
- `src/hooks/useBLEMidi.ts` - Bluetooth LE MIDI support
- `src/hooks/useMIDIExpression.ts` - Pitch bend and CC handling
- `src/lib/midi.ts` - Low-level Web MIDI API functions
- `src/lib/bleMidi.ts` - BLE MIDI protocol functions
- `src/workers/clockWorker.ts` - Web Worker for precise MIDI clock

## MIDIProvider

Wraps the app in `main.tsx`. Provides context for device management:

```typescript
// Key exports from useMIDI():
isConnected, outputs, inputs, selectedOutput, selectedInput,
selectOutput, selectInput,
bleSupported, bleConnected, connectBLE, disconnectBLE,
channel, velocity, humanize, strumEnabled, strumSpread, strumDirection,
setClockCallbacks, sendMIDIClock, sendMIDIStart, sendMIDIStop
```

## Smart Chord Diffing

`playChord()` only sends note-on/off for changed notes (see `useMIDIPlayback.ts`):
- Compares new notes to currently playing notes
- Stops notes no longer in chord, starts new notes
- `retriggerChord()` stops all and restarts (used on mobile)

## Humanization

`src/lib/humanize.ts` staggers note timing for natural feel:
- `getHumanizeOffsets(noteCount, amount)` returns timing offsets (0-100ms)
- Applied when `humanize > 0` and multiple notes

## Strum Mode

`src/lib/strum.ts` arpeggiates notes by pitch:
- Directions: `up`, `down`, `alternate`
- Notes sorted by pitch, evenly spaced delays over `strumSpread` ms

## Clock Worker

`src/workers/clockWorker.ts` - Web Worker for precise MIDI clock:
- Background thread avoids browser throttling
- Messages: `start`, `stop`, `setBpm`
- Sends `pulse` at 24 PPQN (standard MIDI clock rate)
- High-resolution timing with drift compensation

## MIDI Clock Sync

External clock input: select input via `selectInput()`, transport subscribes via `setClockCallbacks()`.

Messages: MIDI_CLOCK (0xF8), MIDI_START (0xFA), MIDI_STOP (0xFC), MIDI_CONTINUE (0xFB)

## BLE MIDI

Bluetooth LE MIDI for wireless connection:
- `connectBLE()` scans via browser picker
- Standard BLE MIDI characteristic (03B80E5A-EDE8-4B33-A751-6CE34EC4C700)
- Batches notes in single packet for efficiency
- Handles 5-byte BLE MIDI packet format with timestamps

## Panic

`panic()` sends all-notes-off on all channels. Called on unmount and page refresh to prevent stuck notes.
