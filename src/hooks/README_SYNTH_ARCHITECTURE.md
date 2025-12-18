# Synth Architecture

The synth system is split across multiple modules for maintainability:

## Core Modules

### `/src/hooks/useToneSynth.tsx` (657 lines)
**Main composition layer** - React context provider

- State management (audio mode, presets, custom patches, volume)
- Lifecycle management (initialization, cleanup)
- Context provider for `useToneSynth()` hook
- Orchestrates all other synth modules
- Cannot be easily reduced further (mostly React boilerplate)

### `/src/lib/synthFactory.ts` (62 lines)
**Factory synth creation** - Pure functions

- `createFactorySynth()` - Creates Tone.js PolySynth with effects
- `createVolumeNode()` - Volume node helper
- No React dependencies, easily testable

### `/src/lib/synthPlayback.ts` (236 lines)
**Playback logic** - Pure functions

- `midiToFreq()` / `midiVelocityToTone()` - Conversions
- `applyExpression()` - Strum/humanize scheduling
- `playNotesCustomSynth()` - Custom synth playback
- `playNotesFactorySynth()` - Factory synth playback
- `playChordWithGlide()` - Glide/portamento effect
- No React dependencies, easily testable

### `/src/hooks/useCustomSynth.ts` (142 lines)
**Custom synth management** - React hook

- `selectCustomPatch()` - Load custom patches
- `updateCustomPatchEnvelope()` - Update ADSR
- `getCustomPatchEnvelope()` - Retrieve envelope
- `disposeCustomSynth()` - Cleanup
- Auto-updates synth when patches change

### `/src/hooks/useSynthEventHandlers.ts` (101 lines)
**Event subscriptions** - React hook

- Subscribes to `chord:changed`, `chord:cleared`, `grace:note`
- Delegates to playback functions
- Respects patch builder state

## Data Flow

```
User Input (keyboard/MIDI)
  ↓
appEvents (chord:changed, chord:cleared, grace:note)
  ↓
useSynthEventHandlers
  ↓
├─→ playNotesFactorySynth (synthPlayback.ts)
│     ↓
│   Tone.js PolySynth (from synthFactory.ts)
│
└─→ playNotesCustomSynth (synthPlayback.ts)
      ↓
    CustomSynthEngine (useCustomSynth.ts)
```

## When to Edit Each Module

- **Add new preset**: `synthPresets.ts`
- **Modify synth creation**: `synthFactory.ts`
- **Change playback behavior**: `synthPlayback.ts`
- **Add custom patch features**: `useCustomSynth.ts`
- **Add new event handlers**: `useSynthEventHandlers.ts`
- **Add new context state/API**: `useToneSynth.tsx`

## Testing Strategy

- **Unit tests**: `synthFactory.ts`, `synthPlayback.ts` (pure functions)
- **Hook tests**: `useCustomSynth.ts`, `useSynthEventHandlers.ts`
- **Integration tests**: `useToneSynth.tsx` (via existing test suite)
