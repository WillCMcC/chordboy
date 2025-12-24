import { useMemo, useCallback } from "react";
import type { Dispatch, SetStateAction, PointerEvent } from "react";
import type { NoteName } from "../../types";
import { LEFT_HAND_KEYS } from "../../lib/keyboardMappings";

interface RootNotesSectionProps {
  mobileKeys: Set<string>;
  setMobileKeys: Dispatch<SetStateAction<Set<string>>>;
}

export function RootNotesSection({
  mobileKeys,
  setMobileKeys,
}: RootNotesSectionProps) {
  // Sort root notes chromatically
  const sortedRoots = useMemo((): [string, NoteName][] => {
    const orderedNotes: NoteName[] = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const entries = Object.entries(LEFT_HAND_KEYS) as [string, NoteName][];
    return orderedNotes.map((note) => entries.find(([, n]) => n === note)!);
  }, []);

  // Handle root key tap - radio behavior (only one root at a time)
  const handleRootTap = useCallback(
    (key: string): void => {
      const rootKeys = Object.keys(LEFT_HAND_KEYS);
      setMobileKeys((prev) => {
        const next = new Set(prev);
        // If this root is already selected, deselect it
        if (prev.has(key)) {
          next.delete(key);
        } else {
          // Remove any other root keys (radio behavior) and add this one
          rootKeys.forEach((k) => next.delete(k));
          next.add(key);
        }
        return next;
      });
    },
    [setMobileKeys],
  );

  // Clear all keys
  const clearAll = useCallback((): void => {
    setMobileKeys(new Set());
  }, [setMobileKeys]);

  return (
    <>
      <div className="mobile-controls-header">
        <span className="mobile-controls-label">Roots</span>
        <button onClick={clearAll} className="control-btn" style={{ flex: 0 }}>
          Clear Notes
        </button>
      </div>

      <div className="mobile-grid root-grid">
        {sortedRoots.map(([key, note]) => (
          <button
            key={key}
            className={`mobile-btn ${mobileKeys.has(key) ? "active" : ""}`}
            data-testid={`mobile-root-${note.replace('#', 's')}`}
            onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
              e.preventDefault();
              handleRootTap(key);
            }}
          >
            {note}
          </button>
        ))}
      </div>
    </>
  );
}
