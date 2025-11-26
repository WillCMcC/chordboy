import { useState, useEffect, useMemo, useRef } from "react";
import { parseKeys } from "../lib/parseKeys";
import { buildChord, invertChord } from "../lib/chordBuilder";
import { getChordName } from "../lib/chordNamer";
import { LEFT_HAND_KEYS, RIGHT_HAND_MODIFIERS } from "../lib/keyboardMappings";
import {
  loadPresetsFromStorage,
  savePresetsToStorage,
} from "../lib/presetStorage";
import { solveChordVoicings } from "../lib/chordSolver";

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
  const commandSaveTriggered = useRef(false); // Track if Command+key save has been triggered

  // Function to save current chord to a specific slot
  const saveCurrentChordToSlot = (slotNumber) => {
    if (pressedKeys.size > 0 && !recalledKeys) {
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
      return true;
    }
    return false;
  };

  // Function to recall a preset from a slot
  const recallPresetFromSlot = (slotNumber) => {
    if (savedPresets.has(slotNumber)) {
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
      return true;
    }
    return false;
  };

  // Function to stop recalling a preset
  const stopRecallingPreset = () => {
    if (recalledKeys) {
      setRecalledKeys(null);
      setRecalledOctave(null);
      setActivePresetSlot(null);
    }
  };

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
          saveCurrentChordToSlot(slotNumber);
        }
        // If not holding keys, recall the saved preset
        else if (pressedKeys.size === 0 && savedPresets.has(slotNumber)) {
          recallPresetFromSlot(slotNumber);
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

      // Space = save to next open slot (or generate random if no chord)
      if (event.key === " " && event.code === "Space") {
        event.preventDefault();

        // Only save once per Space key press
        if (commandSaveTriggered.current) {
          return;
        }

        // Find the next available slot (1-9, then 0)
        let nextSlot = null;
        for (let i = 1; i <= 9; i++) {
          const slotKey = i.toString();
          if (!savedPresets.has(slotKey)) {
            nextSlot = slotKey;
            break;
          }
        }
        // If 1-9 are all full, check slot 0
        if (nextSlot === null && !savedPresets.has("0")) {
          nextSlot = "0";
        }

        if (nextSlot !== null) {
          commandSaveTriggered.current = true; // Mark as triggered

          // If there's a current chord, save it
          if (currentChord && pressedKeys.size > 0 && !recalledKeys) {
            setSavedPresets((prev) => {
              const newPresets = new Map(prev);
              newPresets.set(nextSlot, {
                keys: new Set(pressedKeys),
                octave: octave,
                inversionIndex: inversionIndex,
                droppedNotes: droppedNotes,
                spreadAmount: spreadAmount,
              });
              console.log(
                `Space: Saved chord to next available slot ${nextSlot}:`,
                Array.from(pressedKeys),
                `at octave ${octave}, inversion ${inversionIndex}, dropped ${droppedNotes}, spread ${spreadAmount}`
              );
              return newPresets;
            });
          }
          // If no chord is selected, generate and save a random chord
          else if (!currentChord && pressedKeys.size === 0) {
            const randomChordKeys = generateRandomChord();
            setSavedPresets((prev) => {
              const newPresets = new Map(prev);
              newPresets.set(nextSlot, {
                keys: randomChordKeys,
                octave: octave,
                inversionIndex: 0,
                droppedNotes: 0,
                spreadAmount: 0,
              });
              console.log(
                `Space: Saved RANDOM chord to slot ${nextSlot}:`,
                Array.from(randomChordKeys),
                `at octave ${octave}`
              );
              return newPresets;
            });
          }
        } else {
          console.log("No available slots - all presets (0-9) are full");
        }
        return;
      }

      // Up Arrow = increase spread
      if (event.key === "ArrowUp") {
        event.preventDefault();

        setSpreadAmount((prev) => {
          const newSpread = Math.min(3, prev + 1); // Max 3

          // If a preset is active, update it
          if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
            updatePresetVoicing(activePresetSlot, { spreadAmount: newSpread });
          }

          return newSpread;
        });
      }

      // Down Arrow = decrease spread
      if (event.key === "ArrowDown") {
        event.preventDefault();

        setSpreadAmount((prev) => {
          const newSpread = Math.max(0, prev - 1); // Min 0

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

        // If a preset is active, modify the preset's octave
        if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
          setRecalledOctave((prev) => {
            const currentOctave = prev !== null ? prev : octave;
            const newOctave = Math.max(0, currentOctave - 1);

            // Update the saved preset
            updatePresetVoicing(activePresetSlot, { octave: newOctave });

            return newOctave;
          });
        } else {
          // Otherwise, change global octave
          setOctave((prev) => Math.max(0, prev - 1));
        }
      }

      // Right Arrow = increase octave
      if (event.key === "ArrowRight") {
        event.preventDefault();

        // If a preset is active, modify the preset's octave
        if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
          setRecalledOctave((prev) => {
            const currentOctave = prev !== null ? prev : octave;
            const newOctave = Math.min(7, currentOctave + 1);

            // Update the saved preset
            updatePresetVoicing(activePresetSlot, { octave: newOctave });

            return newOctave;
          });
        } else {
          // Otherwise, change global octave
          setOctave((prev) => Math.min(7, prev + 1));
        }
      }
    };

    const handleVoicingKeyUp = (event) => {
      // Reset save flag when Space key is released
      if (event.key === " ") {
        commandSaveTriggered.current = false;
      }

      // When number key is released, clear recalled preset ONLY if it's the active one
      if (event.key >= "0" && event.key <= "9") {
        const releasedKey = event.key;
        // Only clear if this is the currently active preset
        if (recalledKeys && activePresetSlot === releasedKey) {
          stopRecallingPreset();
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

  // Load presets from IndexedDB on mount
  useEffect(() => {
    const loadPresets = async () => {
      const loadedPresets = await loadPresetsFromStorage();
      if (loadedPresets.size > 0) {
        setSavedPresets(loadedPresets);
      }
    };
    loadPresets();
  }, []); // Run only once on mount

  // Save presets to IndexedDB whenever they change
  useEffect(() => {
    // Only save if we have presets (avoid saving empty state on mount)
    if (savedPresets.size > 0) {
      savePresetsToStorage(savedPresets);
    }
  }, [savedPresets]);

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

  // Function to solve voicings for selected presets
  const solvePresets = (selectedSlots) => {
    if (!selectedSlots || selectedSlots.length < 2) {
      console.log("Need at least 2 presets to solve");
      return false;
    }

    // Get presets in the order of selection
    const presetsToSolve = selectedSlots
      .filter((slot) => savedPresets.has(slot))
      .map((slot) => ({ slot, preset: savedPresets.get(slot) }));

    if (presetsToSolve.length < 2) {
      console.log("Not enough valid presets selected");
      return false;
    }

    // Extract just the preset data for the solver
    const presetData = presetsToSolve.map((p) => p.preset);

    // Run the solver
    const solvedVoicings = solveChordVoicings(presetData);

    if (!solvedVoicings || solvedVoicings.length !== presetsToSolve.length) {
      console.error("Solver returned invalid results");
      return false;
    }

    // Update the presets with the solved voicings
    setSavedPresets((prev) => {
      const newPresets = new Map(prev);
      presetsToSolve.forEach(({ slot, preset }, index) => {
        const solvedVoicing = solvedVoicings[index];
        newPresets.set(slot, {
          ...preset,
          octave: solvedVoicing.octave,
          inversionIndex: solvedVoicing.inversionIndex,
          droppedNotes: solvedVoicing.droppedNotes,
          spreadAmount: solvedVoicing.spreadAmount,
        });
        console.log(
          `Updated preset ${slot} with solved voicing:`,
          solvedVoicing
        );
      });
      return newPresets;
    });

    return true;
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
    setInversionIndex,
    setDroppedNotes,
    setSpreadAmount,
    saveCurrentChordToSlot,
    recallPresetFromSlot,
    stopRecallingPreset,
    activePresetSlot,
    solvePresets,
  };
}

// Helper function to generate a random chord combination
function generateRandomChord() {
  const rootKeys = Object.keys(LEFT_HAND_KEYS);
  const modifierKeys = Object.keys(RIGHT_HAND_MODIFIERS);

  // Pick a random root note (1 key required)
  const randomRoot = rootKeys[Math.floor(Math.random() * rootKeys.length)];

  // Pick 0-4 random modifiers
  const numModifiers = Math.floor(Math.random() * 5); // 0, 1, 2, 3, or 4
  const selectedModifiers = new Set();

  for (let i = 0; i < numModifiers; i++) {
    const randomModifier =
      modifierKeys[Math.floor(Math.random() * modifierKeys.length)];
    selectedModifiers.add(randomModifier);
  }

  // Combine into a Set of keys
  const chordKeys = new Set([randomRoot, ...selectedModifiers]);

  console.log("Generated random chord:", Array.from(chordKeys));
  return chordKeys;
}

// Helper function to drop the highest notes down an octave (reverse inversion)
// dropCount 1 = drop highest note down an octave
// dropCount 2 = drop 2 highest notes down an octave
// etc.
function applyProgressiveDrop(notes, dropCount) {
  if (dropCount === 0 || notes.length === 0) return notes;

  const sorted = [...notes].sort((a, b) => a - b);
  const result = [...sorted];

  // Drop the top N notes down an octave (reverse of inversion)
  const actualDrops = Math.min(dropCount, notes.length - 1); // Don't drop all notes
  for (let i = 0; i < actualDrops; i++) {
    const dropIndex = result.length - 1 - i;
    if (dropIndex >= 0) {
      result[dropIndex] = result[dropIndex] - 12;
    }
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
