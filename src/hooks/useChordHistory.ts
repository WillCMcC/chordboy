/**
 * useChordHistory Hook
 * Tracks the last 25 chords played for quick preset assignment.
 * Session-only storage - clears on page refresh.
 *
 * @module hooks/useChordHistory
 */

import { useState, useRef, useCallback } from "react";
import { useEventSubscription } from "./useEventSubscription";
import { appEvents } from "../lib/eventBus";
import type { Octave, VoicingStyle, Preset } from "../types";
import type { ChordChangedEvent } from "../types/events";

/** Maximum number of chords to keep in history */
const MAX_HISTORY_SIZE = 25;

/** Entry in the chord history */
export interface ChordHistoryEntry {
  /** Unique ID for React keys */
  id: string;
  /** Chord display name (e.g., "Cmaj7", "Dm9") */
  name: string;
  /** Set of keyboard keys that produced this chord */
  keys: Set<string>;
  /** Base octave */
  octave: Octave;
  /** Inversion index */
  inversionIndex: number;
  /** Spread amount */
  spreadAmount: number;
  /** Jazz voicing style */
  voicingStyle: VoicingStyle;
  /** Timestamp when chord was played */
  timestamp: number;
}

/** Options for useChordHistory hook */
export interface UseChordHistoryOptions {
  /** Currently pressed keys (or recalled preset keys) */
  pressedKeys: Set<string>;
  /** Current octave */
  octave: Octave;
  /** Current inversion index */
  inversionIndex: number;
  /** Current spread amount */
  spreadAmount: number;
  /** Current voicing style */
  voicingStyle: VoicingStyle;
}

/** Return type for useChordHistory hook */
export interface UseChordHistoryReturn {
  /** Array of chord history entries (most recent first) */
  history: ChordHistoryEntry[];
  /** Clear all history */
  clearHistory: () => void;
}

/**
 * Generate a unique ID for history entries.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a key string for deduplication (sorted keys joined).
 */
function getDedupeKey(keys: Set<string>): string {
  return [...keys].sort().join(",");
}

/**
 * Hook that tracks chord history for quick preset assignment.
 *
 * @param options - Current voicing state to capture with each chord
 * @returns History array and clear function
 *
 * @example
 * const { history, clearHistory } = useChordHistory({
 *   pressedKeys,
 *   octave,
 *   inversionIndex,
 *   spreadAmount,
 *   voicingStyle,
 * });
 */
export function useChordHistory({
  pressedKeys,
  octave,
  inversionIndex,
  spreadAmount,
  voicingStyle,
}: UseChordHistoryOptions): UseChordHistoryReturn {
  const [history, setHistory] = useState<ChordHistoryEntry[]>([]);

  // Keep refs to current state so event handler sees latest values
  const stateRef = useRef({
    pressedKeys,
    octave,
    inversionIndex,
    spreadAmount,
    voicingStyle,
  });
  stateRef.current = {
    pressedKeys,
    octave,
    inversionIndex,
    spreadAmount,
    voicingStyle,
  };

  // Handle chord changed events
  useEventSubscription(appEvents, "chord:changed", (event: ChordChangedEvent) => {
    const state = stateRef.current;

    // Only add to history if there are actual keys pressed
    if (state.pressedKeys.size === 0) return;

    const newEntry: ChordHistoryEntry = {
      id: generateId(),
      name: event.name,
      keys: new Set(state.pressedKeys),
      octave: state.octave,
      inversionIndex: state.inversionIndex,
      spreadAmount: state.spreadAmount,
      voicingStyle: state.voicingStyle,
      timestamp: Date.now(),
    };

    const dedupeKey = getDedupeKey(newEntry.keys);

    setHistory((prev) => {
      // Check for duplicate (same keys)
      const existingIndex = prev.findIndex(
        (entry) => getDedupeKey(entry.keys) === dedupeKey
      );

      let updated: ChordHistoryEntry[];
      if (existingIndex >= 0) {
        // Remove existing and add new at front
        updated = [newEntry, ...prev.filter((_, i) => i !== existingIndex)];
      } else {
        // Add new at front
        updated = [newEntry, ...prev];
      }

      // Limit to max size
      return updated.slice(0, MAX_HISTORY_SIZE);
    });
  });

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    clearHistory,
  };
}

/**
 * Convert a chord history entry to a preset for saving.
 */
export function historyEntryToPreset(entry: ChordHistoryEntry): Preset {
  return {
    keys: new Set(entry.keys),
    octave: entry.octave,
    inversionIndex: entry.inversionIndex,
    spreadAmount: entry.spreadAmount,
    voicingStyle: entry.voicingStyle,
  };
}
