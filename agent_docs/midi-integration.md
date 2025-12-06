# MIDI Integration

## Files

- `src/hooks/useMIDI.jsx` - Main MIDI hook and provider
- `src/lib/midi.js` - Low-level Web MIDI API functions
- `src/lib/bleMidi.js` - Bluetooth LE MIDI support

## MIDIProvider

Wraps the app in `main.jsx`. Provides context for all MIDI operations.

```javascript
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

`playChord()` in useMIDI.jsx:436 only sends note-on/off for changed notes:

```javascript
const notesToStop = currentNotes.filter(n => !newNotesSet.has(n));
const notesToStart = notes.filter(n => !currentNotesSet.has(n));
```

`retriggerChord()` stops all and restarts (used on mobile for clear articulation).

## Humanization

`src/lib/humanize.js` - Staggers note timing for natural feel:
- `getHumanizeOffsets(noteCount, amount)` returns timing offsets
- Applied when `humanize > 0` and multiple notes

## Strum Mode

`src/lib/strum.js` - Arpeggiates notes by pitch:
- Directions: `STRUM_UP`, `STRUM_DOWN`, `STRUM_ALT`
- `strumSpread` controls total duration in ms

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
