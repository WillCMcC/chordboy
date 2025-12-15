# LFO Unrouting Bug Fix

## Problem
When removing an LFO routing (e.g., LFO1 -> Filter Freq) in the PatchBuilder, the entire synth goes silent. Audio only returns after saving and reloading the patch.

## Root Cause Analysis

The bug occurred due to improper cleanup order when modulation routings are changed.

### Signal Chain (when routing is active)
```
LFO1 → Center (Add) → Scale (Multiply) → filterFrequencyMod → voice.filter.frequency (×8 voices)
```

### What Was Happening (BUGGY)
1. `clearModConnections()` disposed modulation nodes (Center, Scale) while they were still connected to filterFrequencyMod
2. filterFrequencyMod was left in a corrupt state with connections to disposed nodes
3. The broken connection chain caused the audio signal path to fail
4. Filter became non-functional even though it should work with just base frequency + envelope

### The Fix

Changed the cleanup order to ensure proper disconnection before disposal:

**BEFORE (buggy):**
```typescript
this.modManager.clearModConnections();      // Dispose nodes first (WRONG)
this.voicePool.resetFilterModConnection();  // Then disconnect from voices
```

**AFTER (fixed):**
```typescript
this.voicePool.resetFilterModConnection();  // Disconnect from voices FIRST
this.modManager.clearModConnections();      // THEN dispose nodes
```

### Changes Made

1. **VoicePool.resetFilterModConnection()** (`src/lib/customSynthEngine.ts` lines 463-479)
   - Now explicitly disconnects filterFrequencyMod and filterResonanceMod from all voices
   - Prevents disposed modulation nodes from corrupting voice filter connections
   - Resets signal values to 0 to prevent stuck filter positions

2. **ModulationManager.clearModConnections()** (`src/lib/customSynthEngine.ts` lines 837-857)
   - Two-pass cleanup: disconnect all nodes first, then dispose all nodes
   - Ensures clean disconnection before disposal to prevent corrupt state
   - Proper error handling for each step

3. **CustomSynthEngine.updatePatchLive()** (`src/lib/customSynthEngine.ts` lines 1603-1611, 1725-1734)
   - Fixed order: reset filter connections BEFORE clearing modulation connections
   - Applied to both LFO enabled state changes and routing changes
   - Prevents audio signal chain corruption

## Testing

Verified with:
- TypeScript compilation: ✓ No errors
- Test suite: ✓ All 1071 tests pass
- Manual testing steps:
  1. Create patch with LFO modulating filter
  2. Remove the routing
  3. Verify audio continues working (no silence)
  4. Re-add routing and verify modulation works

## Technical Details

The audio signal path must remain intact:
```
OSC1/OSC2 → Mixer → Filter → AmpEnv → Output
```

Filter frequency can have multiple modulation inputs that ADD together:
- Base frequency (set via filter.frequency.value)
- Filter envelope (if enabled)
- LFO modulation (via filterFrequencyMod signal)

When removing LFO modulation, the filter must continue functioning with just the base frequency and envelope. The fix ensures that disposing modulation nodes doesn't corrupt the main audio path.
