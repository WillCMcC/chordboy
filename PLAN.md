# ChordBoy Architecture Refactor - COMPLETED

## Summary

This refactor addressed useEffect overuse by introducing event-based and action-based patterns. The codebase went from **28 useEffect hooks** to approximately **16**, with cleaner separation of concerns.

## Changes Made

### 1. Event Bus Infrastructure (NEW FILES)

**`src/lib/eventBus.js`**
- Simple pub/sub event bus with `on`, `off`, `emit`, `once` methods
- Singleton `appEvents` for app-wide communication
- Used for decoupling chord building from MIDI playback

**`src/hooks/useEventSubscription.js`**
- `useEventSubscription(eventBus, event, handler)` - Subscribe with auto-cleanup
- `useEventSubscriptions(eventBus, handlers)` - Multiple subscriptions
- `useEventEmitter(eventBus, event)` - Stable emitter function

### 2. State Container Pattern (NEW FILE)

**`src/hooks/useStateContainer.js`**
- `useCallbackRef(callbacks)` - Keep callbacks in ref without re-subscribing
- Replaces the anti-pattern of syncing refs to state with multiple useEffect hooks

### 3. Persistence Hooks (NEW FILE)

**`src/hooks/usePersistence.js`**
- `usePersistentState(key, initialValue)` - Sync state to localStorage
- `useAsyncStorage({ load, save, initialValue })` - Async storage with load-on-mount/save-on-change
- `useIndexedDB(dbName, storeName, key, initialValue)` - IndexedDB wrapper

### 4. useTransport.js Refactor

**Before:** 11 useEffect hooks including 6+ ref-sync effects
**After:** 6 useEffect hooks

Changes:
- Replaced 6 ref-sync effects with single `stateRef` container
- Used `useCallbackRef` for callback props
- Wrapped setters update both state and container atomically

### 5. Chord Playback Refactor

**Before:** `App.jsx` had useEffect watching `currentChord` to call `playChord()`
**After:** Event-based decoupling

Changes:
- `useChordEngine` emits `chord:changed` and `chord:cleared` events
- `useMIDI` subscribes to these events and handles playback
- Removed reactive effect from `App.jsx`

### 6. useChordEngine.js Refactor

**Before:** 3 separate useEffect hooks for state coordination
**After:** 1 consolidated effect with action functions

Changes:
- Created `clearRecalledState()` and `resetVoicing()` action functions
- Consolidated 3 effects into 1 with clear responsibilities
- `recallPresetFromSlot` sets flag synchronously to prevent race conditions

### 7. usePresets.js Refactor

**Before:** 2 useEffect hooks (load on mount, save on change)
**After:** Uses `useAsyncStorage` hook which encapsulates the pattern

Changes:
- Replaced manual load/save effects with `useAsyncStorage`
- Added debouncing for save operations

## Effect Count Comparison

| Hook/Component | Before | After | Reduction |
|----------------|--------|-------|-----------|
| useTransport | 11 | 6 | 5 |
| useChordEngine | 3 | 2 | 1 |
| usePresets | 2 | 0* | 2 |
| useMIDI | 5 | 5 | 0 |
| App.jsx | 3 | 2 | 1 |
| **TOTAL** | **~28** | **~16** | **~12** |

*usePresets now uses useAsyncStorage which has 2 internal effects

## Architecture Patterns Introduced

### Event-Driven Communication
```
useChordEngine builds chord
       ↓
appEvents.emit('chord:changed', { notes, name, source })
       ↓
useMIDI subscribes and calls playChord()
```

### State Container Pattern
```js
// Instead of multiple ref-sync effects:
const stateRef = useRef({ sequencerEnabled, sequencerSteps, ... });

// Setters update both state and container:
const setSequencerEnabled = (value) => {
  stateRef.current.sequencerEnabled = value;
  setSequencerEnabledState(value);
};

// Callbacks read from container (always current):
const processPulse = () => {
  if (stateRef.current.sequencerEnabled) { ... }
};
```

### Action-Based State Coordination
```js
// Actions as functions
const clearRecalledState = useCallback(() => { ... }, []);
const resetVoicing = useCallback(() => { ... }, []);

// Single consolidated effect calls actions
useEffect(() => {
  if (condition1) clearRecalledState();
  if (condition2) resetVoicing();
}, [deps]);
```

## Files Changed

- `src/lib/eventBus.js` (NEW)
- `src/hooks/useEventSubscription.js` (NEW)
- `src/hooks/useStateContainer.js` (NEW)
- `src/hooks/usePersistence.js` (NEW)
- `src/hooks/useTransport.js` (REFACTORED)
- `src/hooks/useChordEngine.js` (REFACTORED)
- `src/hooks/usePresets.js` (REFACTORED)
- `src/hooks/useMIDI.jsx` (REFACTORED)
- `src/App.jsx` (REFACTORED)

## Remaining Effects (Legitimate Uses)

These effects should remain as they handle legitimate side effects:

1. **Event listener setup/cleanup** (keyboard, MIDI, BLE, visibility, touch)
2. **Web Worker initialization**
3. **Auto-connect on mount** (MIDI)
4. **Cleanup on unmount** (MIDI panic, note-offs)
5. **Auto-scroll on mobile** (DOM manipulation)

## Benefits

1. **Clearer data flow** - Events make communication explicit
2. **Reduced coupling** - MIDI playback doesn't need to know about chord building
3. **Fewer race conditions** - Action-based state updates are synchronous
4. **Better testability** - Actions can be tested in isolation
5. **Simpler debugging** - Event emissions can be logged/traced
