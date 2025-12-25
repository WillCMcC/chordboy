# Playback Modes

Playback modes transform how chords are output. Modes fall into two categories:

## Instant Modes (No BPM Required)

| Mode | Notes Played | Description |
|------|--------------|-------------|
| `block` | All notes | Default - play full chord together |
| `root-only` | Root note | Just the bass/root note |
| `shell` | Root + 3rd + 7th | Bud Powell style shell voicing |

## Rhythmic Modes (BPM-Synced)

| Mode | Pattern | Description |
|------|---------|-------------|
| `vamp` | Root(1), Upper(2) | Funk/soul comping |
| `charleston` | Chord(1), Chord(&2) | Swing anticipation |
| `stride` | Bass(1), Chord(2), Bass(3), Chord(4) | Stride piano |
| `two-feel` | Root(1), Stab(2), 5th(3), Stab(4) | Walking bass feel |
| `bossa` | Root(1), 5th(&2), Chord(3) | Bossa nova syncopation |
| `tremolo` | Retrig every 16th | Rapid retriggering |

## Key Files

- `src/types/playbackMode.ts` - Type definitions, `PLAYBACK_MODES` config array
- `src/lib/playbackModes.ts` - Pure functions: `applyPlaybackMode()`, `extractChordComponents()`
- `src/hooks/usePlaybackMode.ts` - State management, scheduled playback
- `src/hooks/usePlaybackModeDisplay.ts` - Real-time keyboard visualization
- `src/components/transport/PlaybackModeSelector.tsx` - UI dropdown

## Data Flow

```
chord:changed event
      ↓
usePlaybackMode.playChordWithMode(notes)
      ↓
applyPlaybackMode(notes, mode, bpm)
      ↓
PlaybackModeResult { sustainedNotes, scheduledGroups }
      ↓
Play sustained immediately, schedule groups via HumanizeManager
```

## Chord Component Extraction

`extractChordComponents()` analyzes voiced notes to identify:
- Root (lowest note)
- Third (interval 3 or 4 from root)
- Fifth (interval 6, 7, or 8)
- Seventh (interval 10 or 11)
- Upper notes (everything above root)

Used by rhythmic modes to split bass from upper chord tones.

## Display Synchronization

`usePlaybackModeDisplay` tracks which notes should highlight on the keyboard:
- Instant modes: Show transformed notes immediately
- Rhythmic modes: Update display as scheduled groups fire
- Uses sequence ID pattern to cancel pending updates on chord change
