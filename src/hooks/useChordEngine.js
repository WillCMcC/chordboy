import { useState, useEffect, useMemo } from "react";
import { parseKeys } from "../lib/parseKeys";
import {
  buildChord,
  invertChord,
  spreadVoicing,
  applyTopNoteDrop,
} from "../lib/chordBuilder";
import { getChordName } from "../lib/chordNamer";

/**
 * useChordEngine Hook
 * Combines keyboard input with chord building logic
 * Manages chord state, inversions, and octave settings
 */
export function useChordEngine(pressedKeys) {
  const [inversionIndex, setInversionIndex] = useState(0);
  const [octave, setOctave] = useState(4); // Default to middle octave
  const [voicing, setVoicing] = useState("default"); // 'default', 'topNoteDrop', 'drop2'
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

    // Apply voicing style
    switch (voicing) {
      case "topNoteDrop":
        notes = applyTopNoteDrop(notes);
        break;
      case "drop2":
        notes = spreadVoicing(notes, "drop2");
        break;
      default:
        // Default voicing, no change
        break;
    }

    // Apply inversion last
    notes = invertChord(notes, inversionIndex);

    const chordName = getChordName(
      baseChord.root,
      baseChord.modifiers,
      inversionIndex,
      voicing
    );

    return {
      ...baseChord,
      notes,
      name: chordName,
      inversion: inversionIndex,
      voicing,
    };
  }, [baseChord, inversionIndex, voicing]);

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
              voicing: voicing,
            });
            console.log(
              `Saved chord to slot ${slotNumber}:`,
              Array.from(pressedKeys),
              `at octave ${octave}, inversion ${inversionIndex}, voicing ${voicing}`
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
          setVoicing(savedPreset.voicing);
          setActivePresetSlot(slotNumber);
          console.log(
            `Recalled chord from slot ${slotNumber}:`,
            Array.from(savedPreset.keys),
            `at octave ${savedPreset.octave}, inversion ${savedPreset.inversionIndex}, voicing ${savedPreset.voicing}`
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

      // Caps Lock = cycle through voicing styles
      if (event.key === "CapsLock") {
        event.preventDefault();
        const voicingOptions = ["default", "topNoteDrop", "drop2"];
        setVoicing((prev) => {
          const currentIndex = voicingOptions.indexOf(prev);
          const nextIndex = (currentIndex + 1) % voicingOptions.length;
          const newVoicing = voicingOptions[nextIndex];

          // If a preset is active, update it
          if (
            activePresetSlot !== null &&
            savedPresets.has(activePresetSlot)
          ) {
            updatePresetVoicing(activePresetSlot, {
              voicing: newVoicing,
            });
          }
          return newVoicing;
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
    voicing,
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
      setVoicing("default");
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
    voicing,
    savedPresets,
    clearPreset,
    clearAllPresets,
    increaseOctave,
    decreaseOctave,
    resetOctave,
    setOctave,
  };
}
