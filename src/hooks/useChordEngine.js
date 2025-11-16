import { useState, useEffect, useMemo } from "react";
import { parseKeys } from "../lib/parseKeys";
import { buildChord, invertChord } from "../lib/chordBuilder";
import { getChordName } from "../lib/chordNamer";

/**
 * useChordEngine Hook
 * Combines keyboard input with chord building logic
 * Manages chord state, inversions, and octave settings
 */
export function useChordEngine(pressedKeys) {
  const [inversionIndex, setInversionIndex] = useState(0);
  const [octave, setOctave] = useState(4); // Default to middle octave
  const [droppedNotes, setDroppedNotes] = useState(0); // How many notes have been dropped
  const [spreadAmount, setSpreadAmount] = useState(0); // 0, 1, 2, 3
  const [savedPresets, setSavedPresets] = useState(new Map()); // Store chord presets for number keys
  const [recalledKeys, setRecalledKeys] = useState(null); // Keys recalled from a preset
  const [recalledOctave, setRecalledOctave] = useState(null); // Octave from recalled preset
  const [activePresetSlot, setActivePresetSlot] = useState(null); // Track which preset is currently active

  // Parse the currently pressed keys (or use recalled keys if active)
  const parsedKeys = useMemo(() => {
    const keysToUse = recalledKeys || pressedKeys;
    return parseKeys(keysToUse);
  }, [pressedKeys, recalledKeys]);

  // Build the chord from parsed keys
  const baseChord = useMemo(() => {
    if (!parsedKeys.root) return null;

    // Use recalled octave if active, otherwise use current octave
    const activeOctave = recalledOctave !== null ? recalledOctave : octave;
    return buildChord(parsedKeys.root, parsedKeys.modifiers, {
      octave: activeOctave,
    });
  }, [parsedKeys.root, parsedKeys.modifiers, octave, recalledOctave]);

  // Apply inversion and voicing to the chord
  const currentChord = useMemo(() => {
    if (!baseChord) return null;

    let notes = [...baseChord.notes];

    // Apply progressive note dropping (Caps Lock behavior)
    if (droppedNotes > 0) {
      notes = applyProgressiveDrop(notes, droppedNotes);
    }

    // Apply spread (spread notes across more octaves)
    if (spreadAmount > 0) {
      notes = applySpread(notes, spreadAmount);
    }

    // Apply inversion last
    notes = invertChord(notes, inversionIndex);

    const chordName = getChordName(baseChord.root, baseChord.modifiers);

    return {
      ...baseChord,
      notes,
      name: chordName,
      inversion: inversionIndex,
      droppedNotes,
      spreadAmount,
    };
  }, [baseChord, inversionIndex, droppedNotes, spreadAmount]);

  // Handle voicing controls and chord presets
  useEffect(() => {
    const handleVoicingKeys = (event) => {
      // Number keys 0-9 = save/recall chord presets
      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        const slotNumber = event.key;

        // Only save if:
        // 1. Currently holding chord keys (pressedKeys.size > 0)
        // 2. Not currently in recall mode
        // 3. Slot is EMPTY (not already occupied)
        if (
          pressedKeys.size > 0 &&
          !recalledKeys &&
          !savedPresets.has(slotNumber)
        ) {
          setSavedPresets((prev) => {
            const newPresets = new Map(prev);
            newPresets.set(slotNumber, {
              keys: new Set(pressedKeys),
              octave: octave,
              inversionIndex: inversionIndex,
              droppedNotes: droppedNotes,
              spreadAmount: spreadAmount,
            });
            console.log(
              `Saved chord to slot ${slotNumber}:`,
              Array.from(pressedKeys),
              `at octave ${octave}, inversion ${inversionIndex}, dropped ${droppedNotes}, spread ${spreadAmount}`
            );
            return newPresets;
          });
        }
        // If not holding keys, recall the saved preset
        else if (pressedKeys.size === 0 && savedPresets.has(slotNumber)) {
          const savedPreset = savedPresets.get(slotNumber);
          setRecalledKeys(savedPreset.keys);
          setRecalledOctave(savedPreset.octave);
          setInversionIndex(savedPreset.inversionIndex);
          setDroppedNotes(savedPreset.droppedNotes);
          setSpreadAmount(savedPreset.spreadAmount);
          setActivePresetSlot(slotNumber);
          console.log(
            `Recalled chord from slot ${slotNumber}:`,
            Array.from(savedPreset.keys),
            `at octave ${savedPreset.octave}, inversion ${savedPreset.inversionIndex}, dropped ${savedPreset.droppedNotes}, spread ${savedPreset.spreadAmount}`
          );
        }
        return;
      }

      // Left Shift = cycle inversions
      if (event.key === "Shift" && event.location === 1) {
        event.preventDefault();

        if (currentChord && currentChord.notes) {
          setInversionIndex((prev) => {
            const maxInversions = currentChord.notes.length;
            const newInversion = (prev + 1) % maxInversions;

            // If a preset is active, update it
            if (
              activePresetSlot !== null &&
              savedPresets.has(activePresetSlot)
            ) {
              updatePresetVoicing(activePresetSlot, {
                inversionIndex: newInversion,
              });
            }

            return newInversion;
          });
        }
      }

      // Caps Lock = progressively drop notes down an octave
      if (event.key === "CapsLock") {
        event.preventDefault();

        if (currentChord && currentChord.notes) {
          setDroppedNotes((prev) => {
            // Cycle through 0 to number of notes - 1
            const maxDrops = currentChord.notes.length - 1;
            const newDropped = (prev + 1) % (maxDrops + 1);

            // If a preset is active, update it
            if (
              activePresetSlot !== null &&
              savedPresets.has(activePresetSlot)
            ) {
              updatePresetVoicing(activePresetSlot, {
                droppedNotes: newDropped,
              });
            }

            return newDropped;
          });
        }
      }

      // Space = increase spread
      if (event.key === " " && event.code === "Space") {
        event.preventDefault();

        setSpreadAmount((prev) => {
          const newSpread = (prev + 1) % 4; // 0, 1, 2, 3

          // If a preset is active, update it
          if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
            updatePresetVoicing(activePresetSlot, { spreadAmount: newSpread });
          }

          return newSpread;
        });
      }

      // Left Arrow = decrease octave
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setOctave((prev) => Math.max(0, prev - 1));
      }

      // Right Arrow = increase octave
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setOctave((prev) => Math.min(7, prev + 1));
      }
    };

    const handleVoicingKeyUp = (event) => {
      // When number key is released, clear recalled preset ONLY if it's the active one
      if (event.key >= "0" && event.key <= "9") {
        const releasedKey = event.key;
        // Only clear if this is the currently active preset
        if (recalledKeys && activePresetSlot === releasedKey) {
          setRecalledKeys(null);
          setRecalledOctave(null);
          setActivePresetSlot(null);
          console.log(
            `Number key ${releasedKey} released - clearing recalled preset`
          );
        }
      }
    };

    // Helper function to update preset voicing
    const updatePresetVoicing = (slotNumber, updates) => {
      setSavedPresets((prev) => {
        const newPresets = new Map(prev);
        const existingPreset = newPresets.get(slotNumber);
        if (existingPreset) {
          newPresets.set(slotNumber, {
            ...existingPreset,
            ...updates,
          });
          console.log(`Updated preset ${slotNumber} voicing:`, updates);
        }
        return newPresets;
      });
    };

    window.addEventListener("keydown", handleVoicingKeys);
    window.addEventListener("keyup", handleVoicingKeyUp);

    return () => {
      window.removeEventListener("keydown", handleVoicingKeys);
      window.removeEventListener("keyup", handleVoicingKeyUp);
    };
  }, [
    currentChord,
    pressedKeys,
    savedPresets,
    recalledKeys,
    activePresetSlot,
    inversionIndex,
    droppedNotes,
    spreadAmount,
  ]);

  // Clear recalled keys when user starts pressing chord keys manually
  useEffect(() => {
    if (recalledKeys && pressedKeys.size > 0) {
      // User is manually pressing keys, clear the recalled preset
      setRecalledKeys(null);
      setRecalledOctave(null);
      setActivePresetSlot(null);
    }
  }, [pressedKeys.size, recalledKeys]);

  // Reset voicing to defaults when chord changes (not from a preset)
  useEffect(() => {
    // Only reset if we're not in preset recall mode
    if (!recalledKeys && parsedKeys.root) {
      setInversionIndex(0);
      setDroppedNotes(0);
      setSpreadAmount(0);
    }
  }, [parsedKeys.root, parsedKeys.modifiers.join(","), recalledKeys]);

  // Functions to control octave
  const increaseOctave = () => {
    setOctave((prev) => Math.min(7, prev + 1));
  };

  const decreaseOctave = () => {
    setOctave((prev) => Math.max(0, prev - 1));
  };

  const resetOctave = () => {
    setOctave(4);
  };

  // Function to clear a specific preset slot
  const clearPreset = (slotNumber) => {
    setSavedPresets((prev) => {
      const newPresets = new Map(prev);
      newPresets.delete(slotNumber);
      console.log(`Cleared preset slot ${slotNumber}`);
      return newPresets;
    });
  };

  // Function to clear all presets
  const clearAllPresets = () => {
    setSavedPresets(new Map());
    console.log("Cleared all presets");
  };

  return {
    currentChord,
    parsedKeys,
    inversionIndex,
    octave,
    droppedNotes,
    spreadAmount,
    savedPresets,
    clearPreset,
    clearAllPresets,
    increaseOctave,
    decreaseOctave,
    resetOctave,
    setOctave,
  };
}

// Helper function to drop the highest notes down an octave
function applyProgressiveDrop(notes, dropCount) {
  if (dropCount === 0 || notes.length < 2) return notes;

  const sorted = [...notes].sort((a, b) => a - b);
  const result = [...sorted];
  const numNotes = notes.length;

  // Drop the top `dropCount` notes
  for (let i = 0; i < dropCount; i++) {
    const noteIndexToDrop = numNotes - 1 - i;
    result[noteIndexToDrop] -= 12;
  }

  return result.sort((a, b) => a - b);
}

// Helper function to spread notes across octaves
function applySpread(notes, spreadAmount) {
  if (spreadAmount === 0 || notes.length < 2) return notes;

  const result = [...notes].sort((a, b) => a - b);

  // Spread by moving alternating notes up by octaves
  for (let i = 1; i < result.length; i += 2) {
    result[i] += 12 * spreadAmount;
  }

  return result.sort((a, b) => a - b);
}
