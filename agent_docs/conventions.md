# Code Conventions

This document describes key coding patterns and conventions used throughout the ChordBoy codebase. Understanding these patterns is essential for maintaining consistency and avoiding common pitfalls.

---

## 1. Hook Return Type Pattern

**Convention:** Every custom hook exports a typed return interface named `Use{HookName}Return`.

**Purpose:** Provides clear type information for consumers and enables consistent destructuring patterns.

### Example

```typescript
// Hook definition
export interface UseChordEngineReturn {
  // State
  currentChord: VoicedChord | null;
  parsedKeys: ParsedKeys;
  inversionIndex: number;
  // Actions
  cycleInversion: () => void;
  saveCurrentChordToSlot: (slotNumber: string) => boolean;
}

export function useChordEngine(
  pressedKeys: Set<string>,
  options?: UseChordEngineOptions
): UseChordEngineReturn {
  // Implementation
  return {
    currentChord,
    parsedKeys,
    inversionIndex,
    cycleInversion,
    saveCurrentChordToSlot,
  };
}

// Usage
const { currentChord, cycleInversion } = useChordEngine(pressedKeys);
```

### Real Examples

- `UseChordEngineReturn` - `/src/hooks/useChordEngine.ts`
- `UsePresetsReturn` - `/src/hooks/usePresets.ts`
- `UsePersistentStateReturn` - `/src/hooks/usePersistence.ts`
- `UseAsyncStorageReturn` - `/src/hooks/usePersistence.ts`
- `UseWakeLockReturn` - `/src/hooks/useWakeLock.ts`
- `UseCustomPatchesReturn` - `/src/hooks/useCustomPatches.ts`

### Pattern Benefits

1. **Type safety** - TypeScript validates return structure
2. **Documentation** - Return types serve as inline API docs
3. **Refactoring safety** - Changes to hook signatures are caught by type system
4. **IDE support** - Autocomplete shows all available properties

---

## 2. Event Subscription Pattern

**Convention:** Use the `useEventSubscription` helper hook for subscribing to the `appEvents` bus.

**Purpose:** Automatically handles cleanup and prevents stale closures in event handlers.

### The Helper Hook

```typescript
// From /src/hooks/useEventSubscription.ts
function useEventSubscription<K extends AppEventType>(
  eventBus: EventBus,
  event: K,
  handler: EventHandler<AppEventMap[K]>
): void {
  const handlerRef = useRef<EventHandler<AppEventMap[K]>>(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = (payload: AppEventMap[K]): void => handlerRef.current(payload);
    return eventBus.on(event, wrappedHandler);
  }, [eventBus, event]);
}
```

### Key Features

- **Handler ref pattern** - Handler stored in ref to avoid re-subscribing when it changes
- **Automatic cleanup** - Returns unsubscribe function from useEffect
- **Type-safe** - Generic type parameter ensures correct payload types

### Usage Example

```typescript
import { useEventSubscription } from '../hooks/useEventSubscription';
import { appEvents } from '../lib/eventBus';

function MyComponent() {
  useEventSubscription(appEvents, 'chord:changed', (chord) => {
    // Handler receives type-safe payload: { notes, name, source, retrigger? }
    playChord(chord.notes);
  });
}
```

### Multi-Event Subscription

For subscribing to multiple events, use `useEventSubscriptions`:

```typescript
useEventSubscriptions(appEvents, {
  'chord:changed': handleChordChanged,
  'chord:cleared': handleChordCleared,
});
```

### Available Events

See `/src/lib/eventBus.ts` for full event definitions:
- `chord:changed` - Chord notes changed
- `chord:cleared` - All notes released
- `voicing:changed` - Voicing parameters updated
- `preset:saved` - Preset saved to slot
- `preset:recalled` - Preset recalled from slot
- `preset:cleared` - Preset deleted from slot
- `keys:allUp` - All keyboard keys released

---

## 3. Persistence Strategy

ChordBoy uses three different persistence mechanisms depending on the use case:

### localStorage (Synchronous)

**Use for:** Simple settings, flags, UI state

**Pattern:** `usePersistentState` hook from `/src/hooks/usePersistence.ts`

```typescript
const [lowLatencyMode, setLowLatencyMode] = usePersistentState<boolean>(
  "chordboy-low-latency-mode",
  false
);
```

**Characteristics:**
- Synchronous read on mount
- Synchronous write on change
- JSON serialization by default
- Custom serializers supported

**Examples:**
- Wake lock state - `/src/hooks/useWakeLock.ts`
- Low latency mode - `/src/hooks/useMIDI.tsx`

### IndexedDB with Per-Slot Keys (Atomic Updates)

**Use for:** Items that need individual atomic updates (presets)

**Pattern:** Each item gets its own key in the object store

**Implementation:** See `/src/lib/presetStorage.ts`

```typescript
// Presets use per-slot keys: "preset-0", "preset-1", etc.
const PRESET_KEY_PREFIX = "preset-";

// Atomic save - only updates one slot
store.put(serializedPreset, `${PRESET_KEY_PREFIX}${slot}`);
```

**Benefits:**
- Atomic operations - concurrent saves to different slots won't conflict
- Partial updates - can update one preset without re-writing all
- Migration path - can coexist with legacy storage formats

**Examples:**
- Chord presets (slots 0-9) - `/src/lib/presetStorage.ts`

### IndexedDB with Single Collection Key

**Use for:** Collections that update as a unit (patches, sequencer state)

**Pattern:** `useAsyncStorage` or `useIndexedDB` hooks from `/src/hooks/usePersistence.ts`

```typescript
const { value: patches, setValue: setPatches, isLoaded } = useAsyncStorage({
  load: loadPatchesFromStorage,
  save: savePatchesToStorage,
  initialValue: new Map<string, CustomPatch>(),
  debounceMs: 300, // Debounce saves
});
```

**Characteristics:**
- Asynchronous load on mount
- Debounced saves (configurable delay)
- Loading state tracking (`isLoaded`, `isLoading`, `error`)
- Auto-flush on unmount

**Examples:**
- Custom synth patches - `/src/hooks/useCustomPatches.ts`
- Sequencer state (if implemented)

### Database Structure

```
IndexedDB: "chordboy-db"
├── Object Store: "presets"
│   ├── "preset-0" → SerializedPreset
│   ├── "preset-1" → SerializedPreset
│   └── ...
└── Object Store: "patches"
    └── "patches-collection" → Map<string, CustomPatch>
```

---

## 4. Ref-Based State Pattern

**Convention:** Use refs to avoid stale closures in async operations and event handlers.

**Purpose:** Ensures setTimeout/event callbacks always access current values, not captured closures.

### The Problem

```typescript
// BAD - Stale closure issue
function useExample() {
  const [value, setValue] = useState(0);

  useEffect(() => {
    setTimeout(() => {
      console.log(value); // Captures value from when effect ran!
    }, 1000);
  }, []); // Empty deps = stale closure
}
```

### The Solution

```typescript
// GOOD - Ref pattern
function useExample() {
  const [value, setValue] = useState(0);
  const valueRef = useRef(value);

  // Keep ref in sync
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // OR: Direct assignment (simpler for simple cases)
  valueRef.current = value;

  useEffect(() => {
    setTimeout(() => {
      console.log(valueRef.current); // Always current!
    }, 1000);
  }, []);
}
```

### Real-World Examples

#### Example 1: useMIDIPlayback - Current Notes Ref

```typescript
// /src/hooks/useMIDIPlayback.ts
export function useMIDIPlayback(
  deps: PlaybackDeps,
  currentNotesRef: React.MutableRefObject<MIDINote[]>,  // Ref passed in!
  setCurrentNotes: React.Dispatch<React.SetStateAction<MIDINote[]>>,
): PlaybackFunctions {
  const playChord = useCallback((notes: MIDINote[]) => {
    // Use ref to get current notes for smart diffing
    const currentNotesSnapshot = currentNotesRef.current;
    const notesToStop = currentNotesSnapshot.filter(n => !newNotesSet.has(n));
    // ...
  }, [/* deps */]);
}
```

#### Example 2: useMIDIPlayback - Params Ref for setTimeout

```typescript
// /src/hooks/useMIDIPlayback.ts
const humanizeRef = useRef(humanize);
const strumEnabledRef = useRef(strumEnabled);
const strumSpreadRef = useRef(strumSpread);

// Keep refs updated
humanizeRef.current = humanize;
strumEnabledRef.current = strumEnabled;
strumSpreadRef.current = strumSpread;

const retriggerChord = useCallback((notes: MIDINote[]) => {
  setTimeout(() => {
    // Get fresh values from refs (avoid stale closures)
    const currentStrumEnabled = strumEnabledRef.current;
    const currentStrumSpread = strumSpreadRef.current;
    // ...
  }, REARTICULATION_DELAY_MS);
}, [/* deps */]);
```

#### Example 3: usePresets - Saved Presets Ref

```typescript
// /src/hooks/usePresets.ts
const savedPresetsRef = useRef<Map<string, Preset>>(savedPresets);
savedPresetsRef.current = savedPresets;

const recallPreset = useCallback((slotNumber: string): Preset | null => {
  // Use ref to always get the current Map (avoids stale closure)
  const currentPresets = savedPresetsRef.current;
  if (!currentPresets.has(slotNumber)) {
    return null;
  }
  const preset = currentPresets.get(slotNumber)!;
  // ...
}, []); // Empty deps safe because using ref
```

#### Example 4: useMIDI - Cleanup Refs

```typescript
// /src/hooks/useMIDI.tsx
const selectedOutputRef = useRef<MIDIOutput | null>(connection.selectedOutput);
const channelRef = useRef<MIDIChannel>(channel);

// Keep refs in sync
selectedOutputRef.current = connection.selectedOutput;
channelRef.current = channel;

useEffect(() => {
  return () => {
    // Cleanup uses refs to get current values
    const notes = currentNotesRef.current;
    notes.forEach((note) => {
      if (selectedOutputRef.current) {
        sendNoteOff(selectedOutputRef.current, channelRef.current, note);
      }
    });
  };
}, []); // Empty deps - cleanup runs once on unmount with current values
```

### When to Use Refs

1. **setTimeout/setInterval callbacks** - Need current state values
2. **Event handlers** - Subscriptions that outlive component updates
3. **Cleanup functions** - useEffect cleanup needs final state
4. **Callback optimization** - Stable callbacks with empty deps that need current values
5. **Avoiding expensive re-subscriptions** - Like `recallPreset` above

### Pattern Variations

```typescript
// Pattern A: Sync in useEffect
const valueRef = useRef(value);
useEffect(() => {
  valueRef.current = value;
}, [value]);

// Pattern B: Direct assignment (simpler, preferred when possible)
const valueRef = useRef(value);
valueRef.current = value;

// Pattern C: Ref passed from parent (composition)
function useChild(parentRef: MutableRefObject<T>) {
  // Use parent's ref directly
}
```

---

## 5. Error Handling Conventions

**Convention:** Use console warnings for developer debugging; fail silently for user-facing issues.

**Purpose:** Provide debug information without disrupting user experience.

### Console Warnings (Development Debugging)

Use `console.warn` for non-critical issues that developers should know about:

```typescript
// Wake lock failures (user may deny permission)
catch (err) {
  console.warn("Wake lock request failed:", (err as Error).message);
  setIsActive(false);
}

// MIDI device not selected
if (!selectedOutput) {
  console.warn("No MIDI output device selected");
  return;
}

// Unknown effect types
default:
  console.warn(`Unknown effect type: ${config.type}`);
```

**Use cases:**
- Expected failures (permissions denied, device not found)
- Non-critical errors (optional features unavailable)
- Development warnings (unknown parameters, deprecated usage)

### Console Errors (Critical Failures)

Use `console.error` for critical failures that indicate bugs or data corruption:

```typescript
// Storage failures
catch (error) {
  console.error("Error saving presets:", transaction.error);
  reject(transaction.error);
}

// Event handler errors (caught and logged by event bus)
try {
  handler(payload);
} catch (error) {
  console.error(`Error in event handler for "${event}":`, error);
}

// MIDI communication failures
catch (error) {
  console.error("Failed to send Note On:", error);
}
```

**Use cases:**
- Storage/persistence failures
- Event handler exceptions
- MIDI communication errors
- Unexpected errors in critical paths

### Silent Failures (User Experience)

Some operations fail silently to avoid disrupting the user:

```typescript
// Synth engine cleanup - errors logged but not thrown
try {
  filterModGain?.disconnect();
} catch (e) {
  console.warn('[VoicePool] Error disconnecting filter mod signals:', e);
  // Don't throw - continue cleanup
}

// Preset loading - returns empty Map on failure
catch (error) {
  console.error("Failed to load presets:", error);
  return new Map(); // Silent fallback
}
```

**Use cases:**
- Cleanup operations (best-effort disconnect)
- Fallback values (empty collections, default settings)
- Audio engine errors (continue playback)

### Error Handling Patterns

```typescript
// Pattern 1: Try-catch with warning
try {
  riskyOperation();
} catch (err) {
  console.warn("Operation failed:", (err as Error).message);
  // Degrade gracefully
}

// Pattern 2: Try-catch with error and re-throw
try {
  criticalOperation();
} catch (error) {
  console.error("Critical failure:", error);
  throw error; // Let caller handle
}

// Pattern 3: Early return with warning
if (!requiredThing) {
  console.warn("Required thing not available");
  return; // Bail out early
}

// Pattern 4: Guard in event bus
try {
  handler(payload);
} catch (error) {
  console.error(`Error in event handler for "${event}":`, error);
  // Don't let one bad handler break others
}
```

### Testing Considerations

```typescript
// Suppress console output in tests when testing error paths
const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
// Run test that triggers warning
consoleSpy.mockRestore();
```

---

## Summary

These five conventions form the backbone of ChordBoy's architecture:

1. **Hook Return Types** - Consistent, typed interfaces for all hooks
2. **Event Subscriptions** - Decoupled communication via `useEventSubscription`
3. **Persistence** - Three-tier strategy (localStorage, IndexedDB per-slot, IndexedDB collections)
4. **Ref Pattern** - Avoid stale closures in async operations
5. **Error Handling** - Console warnings for debug, silent failures for UX

When implementing new features:
- Export typed return interfaces for hooks
- Use `useEventSubscription` for event bus integration
- Choose appropriate persistence mechanism
- Use refs for state accessed in callbacks/timeouts
- Log errors appropriately without breaking user experience
