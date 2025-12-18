# useMIDI.tsx Refactoring Summary

## Overview
Split the 645-line `useMIDI.tsx` file into focused, maintainable modules. The main hook is now 369 lines and composes several specialized sub-hooks.

## File Structure (Before → After)

### Before
- `useMIDI.tsx` - 645 lines (monolithic)

### After
- **`useMIDI.tsx`** - 369 lines (main orchestrator)
- **`useMIDIConnection.ts`** - 194 lines (device connection/selection)
- **`useMIDIClock.ts`** - 103 lines (clock sync)
- **`useMIDIGraceNotes.ts`** - 158 lines (grace note handling)
- **`useMIDIInputSelection.ts`** - 95 lines (input selection with BLE)
- **`useMIDIChordEvents.ts`** - 98 lines (chord event subscriptions)

### Previously Extracted (unchanged)
- `useMIDIPlayback.ts` - 421 lines (note playback logic)
- `useMIDIExpression.ts` - 202 lines (glide/expression)
- `useBLEMidi.ts` - existing (BLE connection)

## New Modules

### 1. useMIDIConnection.ts
**Purpose**: MIDI device enumeration and connection management

**Responsibilities**:
- Request MIDI access
- Enumerate input/output devices
- Handle device selection
- Hot-plug device detection
- Auto-connection on mount
- Connection state management

**Exports**:
```typescript
interface MIDIConnectionResult {
  midiAccess: MIDIAccess | null;
  outputs: MIDIOutputInfo[];
  inputs: MIDIInputInfo[];
  selectedOutput: MIDIOutput | null;
  selectedInput: MIDIInput | null;
  isConnected: boolean;
  error: string | null;
  isLoading: boolean;
  connectMIDI: () => Promise<void>;
  selectOutput: (outputId: string) => void;
  selectInput: (inputId: string | null) => void;
}
```

### 2. useMIDIClock.ts
**Purpose**: MIDI clock synchronization

**Responsibilities**:
- Handle incoming MIDI clock messages (clock, start, stop, continue)
- Provide callbacks for transport integration
- Send outgoing clock messages

**Exports**:
```typescript
interface MIDIClockResult {
  setClockCallbacks: (callbacks: ClockCallbacks) => void;
  sendMIDIClock: () => void;
  sendMIDIStart: () => void;
  sendMIDIStop: () => void;
}
```

### 3. useMIDIGraceNotes.ts
**Purpose**: Grace note re-articulation for MIDI output

**Responsibilities**:
- Subscribe to `grace:note` events
- Handle note-off/note-on sequences with adaptive delays
- Per-note timeout tracking for rapid taps
- BLE vs USB delay optimization
- Low latency mode support

**Constants**:
- `GRACE_NOTE_DELAY_BLE_MS = 20` (BLE needs longer gap)
- `GRACE_NOTE_DELAY_USB_MS = 5` (USB is fast)
- `GRACE_NOTE_DELAY_LOW_LATENCY_MS = 2` (performance mode)

**Key Features**:
- Batched BLE MIDI for efficiency
- Per-note timeout cancellation
- Adaptive velocity (85% of main velocity)

### 4. useMIDIInputSelection.ts
**Purpose**: Unified input selection for MIDI and BLE

**Responsibilities**:
- Select regular MIDI input devices
- Handle BLE input selection (special "ble" ID)
- Coordinate BLE sync enable/disable
- Clean up previous input listeners

**Exports**:
```typescript
interface MIDIInputSelectionResult {
  selectInput: (inputId: string | null) => void;
}
```

### 5. useMIDIChordEvents.ts
**Purpose**: Subscribe to chord events and trigger playback

**Responsibilities**:
- Subscribe to `chord:changed` events
- Subscribe to `chord:cleared` events
- Route to appropriate playback method based on trigger mode
- Check audio mode settings (MIDI/synth/both)

**Trigger Mode Routing**:
- `event.retrigger || mode === "all"` → `retriggerChord()`
- `mode === "glide"` → `playChordWithGlide()`
- `mode === "new"` → `playChord()` (smart diff)

## Benefits

### Code Organization
- **Single Responsibility**: Each module has one clear purpose
- **Logical Cohesion**: Related functionality grouped together
- **Easy Navigation**: Smaller files are easier to understand and maintain

### Maintainability
- **Reduced Complexity**: Main hook is now a clean composition layer
- **Isolated Changes**: Bug fixes and features can target specific modules
- **Clear Dependencies**: Import structure shows data flow

### Testing
- **Unit Testable**: Each module can be tested independently
- **Mock-Friendly**: Smaller interfaces are easier to mock
- **Focused Tests**: Test one concern at a time

### Performance
- **No Runtime Impact**: Same React hooks, just better organized
- **Tree-Shakeable**: Unused code can be eliminated by bundler
- **Lazy Loadable**: Modules could be code-split if needed

## Architecture Pattern

The refactored `useMIDI.tsx` follows a **composition pattern**:

```
useMIDI (orchestrator)
├── useMIDIConnection (device management)
├── useBLEMidi (BLE connection)
├── useMIDIPlayback (note playback)
├── useMIDIExpression (glide/pitch bend)
├── useMIDIClock (clock sync)
├── useMIDIInputSelection (input routing)
├── useMIDIGraceNotes (grace note effects)
└── useMIDIChordEvents (event subscriptions)
```

Each sub-hook:
1. Receives dependencies via props/parameters
2. Manages its own internal state
3. Returns a focused interface
4. Can be tested independently

The main hook:
1. Manages core state (channel, velocity, settings)
2. Composes sub-hooks with appropriate dependencies
3. Exposes unified context API
4. Maintains backward compatibility

## Testing Results

**Build**: ✅ No TypeScript errors
**Tests**: ✅ All 1071 tests pass
**API**: ✅ Maintains exact same external interface

## Future Improvements

If `useMIDIPlayback.ts` (421 lines) needs to be split further:

1. Extract strum logic to `useMIDIStrum.ts`
2. Extract humanization logic to `useMIDIHumanize.ts`
3. Keep core playback in `useMIDIPlayback.ts`

This would bring all files under 300 lines for maximum clarity.
