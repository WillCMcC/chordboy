# TypeScript Migration Plan

## Overview

Migrate ChordBoy from JavaScript to TypeScript. ~9,300 LOC across 52 files.

## Phase 1: Setup & Infrastructure

- [ ] Create new branch `typescript-migration`
- [ ] Install TypeScript and type dependencies
- [ ] Create `tsconfig.json` with strict settings
- [ ] Update Vite config for TypeScript
- [ ] Rename entry point `main.jsx` → `main.tsx`

## Phase 2: Domain Types & Pure Libraries

Define core types and migrate pure functions (no React dependencies).

### Type Definitions to Create (`src/types/`)

```typescript
// Core music theory types
type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
type MIDINote = number; // 0-127
type Interval = number; // semitones from root
type Octave = number;   // -2 to 8

// Chord representation
interface Chord {
  root: NoteName;
  rootMidi: MIDINote;
  octave: Octave;
  intervals: Interval[];
  notes: MIDINote[];
  name: string;
  modifiers: ModifierKey[];
}

// Voicing state
interface VoicingState {
  inversion: number;
  drop: 'none' | 'drop2' | 'drop3' | 'drop24';
  spread: number;
  octaveShift: number;
}

// Event bus events (discriminated union)
type AppEvent =
  | { type: 'chord:changed'; payload: { chord: Chord; notes: MIDINote[] } }
  | { type: 'chord:cleared'; payload: { notes: MIDINote[] } }
  | { type: 'voicing:changed'; payload: VoicingState }
  | { type: 'preset:saved'; payload: { slot: number } }
  | { type: 'preset:recalled'; payload: { slot: number } };
```

### Files to Migrate (in order)

1. `src/lib/constants.js` → `.ts` - Keyboard mappings, intervals
2. `src/lib/chordTheory.js` → `.ts` - Note/interval utilities
3. `src/lib/chordBuilder.js` → `.ts` - Chord construction
4. `src/lib/parseKeys.js` → `.ts` - Keyboard input parsing
5. `src/lib/voicingTransforms.js` → `.ts` - Drop/spread/inversion
6. `src/lib/eventBus.js` → `.ts` - Typed event system
7. `src/lib/midi.js` → `.ts` - Web MIDI API wrapper
8. `src/lib/bleMidi.js` → `.ts` - BLE MIDI wrapper
9. `src/lib/presetStorage.js` → `.ts` - IndexedDB persistence
10. `src/lib/humanize.js` → `.ts` - Timing humanization

## Phase 3: React Components

Migrate presentational components with prop interfaces.

### Files to Migrate

1. `src/App.jsx` → `.tsx`
2. `src/components/Header.jsx` → `.tsx`
3. `src/components/ChordDisplay.jsx` → `.tsx`
4. `src/components/KeyboardVisualizer.jsx` → `.tsx`
5. `src/components/MIDISettings.jsx` → `.tsx`
6. `src/components/VoicingControls.jsx` → `.tsx`
7. `src/components/PresetBar.jsx` → `.tsx`
8. `src/components/TransportControls.jsx` → `.tsx`
9. `src/components/MobileControls.jsx` → `.tsx`
10. `src/components/SettingsPanel.jsx` → `.tsx`

## Phase 4: React Hooks (Complex)

Most complex phase - requires careful state typing.

### Files to Migrate (ordered by dependency)

1. `src/hooks/useKeyboard.js` → `.ts` - Keyboard event handling
2. `src/hooks/useVoicingKeyboard.js` → `.ts` - Voicing shortcuts
3. `src/hooks/usePersistence.js` → `.ts` - Generic async storage
4. `src/hooks/usePresets.js` → `.ts` - Preset management
5. `src/hooks/useMIDI.jsx` → `.tsx` - MIDI context provider
6. `src/hooks/useTransport.js` → `.ts` - Sequencer/transport
7. `src/hooks/useChordEngine.js` → `.ts` - Central orchestrator

## Phase 5: Workers & Tests

1. `src/workers/clockWorker.js` → `.ts`
2. Migrate all `*.test.js` → `*.test.ts`
3. Run full test suite, fix any type errors

## Parallel Work Assignment

### Agent 1: Setup + Types + Lib (Phase 1 & 2)
- Infrastructure setup
- Create type definitions
- Migrate all `src/lib/*.js` files

### Agent 2: Components (Phase 3)
- Migrate all `src/components/*.jsx` files
- Define prop interfaces
- Wait for Agent 1 to complete types

### Agent 3: Hooks (Phase 4)
- Migrate all `src/hooks/*.js` files
- Most complex work
- Wait for Agent 1 to complete types and lib

### Agent 4: Tests & Workers (Phase 5)
- Migrate worker
- Migrate test files
- Final validation

## Dependencies to Install

```bash
npm install -D typescript @types/node @types/react @types/react-dom
```

## tsconfig.json Template

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

## Success Criteria

- [ ] All files renamed to `.ts`/`.tsx`
- [ ] Zero TypeScript errors with `strict: true`
- [ ] All tests pass
- [ ] Build succeeds (`npm run build`)
- [ ] No use of `any` type (or explicit exceptions documented)
