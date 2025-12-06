/**
 * useVoicingKeyboard Hook
 * Handles keyboard shortcuts for voicing controls (inversion, drop, spread, octave).
 * Also manages number key preset save/recall interactions.
 *
 * @module hooks/useVoicingKeyboard
 */

import { useEffect, useRef, useCallback } from "react";
import { LEFT_HAND_KEYS, RIGHT_HAND_MODIFIERS } from "../lib/keyboardMappings";

/**
 * Generate a random chord combination for quick experimentation.
 * Picks a random root note and 0-4 random modifiers.
 *
 * @returns {Set<string>} Set of key characters representing the chord
 */
export function generateRandomChord() {
  const rootKeys = Object.keys(LEFT_HAND_KEYS);
  const modifierKeys = Object.keys(RIGHT_HAND_MODIFIERS);

  const randomRoot = rootKeys[Math.floor(Math.random() * rootKeys.length)];
  const numModifiers = Math.floor(Math.random() * 5);
  const selectedModifiers = new Set();

  for (let i = 0; i < numModifiers; i++) {
    const randomModifier =
      modifierKeys[Math.floor(Math.random() * modifierKeys.length)];
    selectedModifiers.add(randomModifier);
  }

  return new Set([randomRoot, ...selectedModifiers]);
}

/**
 * Hook for handling keyboard shortcuts that control voicing and presets.
 *
 * @param {Object} options - Configuration options
 * @param {Object|null} options.currentChord - The currently active chord
 * @param {Set} options.pressedKeys - Currently pressed keyboard keys
 * @param {Map} options.savedPresets - Map of saved chord presets
 * @param {Set|null} options.recalledKeys - Keys from a recalled preset
 * @param {string|null} options.activePresetSlot - Currently active preset slot
 * @param {number} options.octave - Current octave setting
 * @param {number} options.inversionIndex - Current inversion
 * @param {number} options.droppedNotes - Current drop amount
 * @param {number} options.spreadAmount - Current spread amount
 * @param {number|null} options.recalledInversion - Inversion from recalled preset
 * @param {number|null} options.recalledDrop - Drop from recalled preset
 * @param {number|null} options.recalledSpread - Spread from recalled preset
 * @param {Function} options.setInversionIndex - Setter for inversion
 * @param {Function} options.setDroppedNotes - Setter for dropped notes
 * @param {Function} options.setSpreadAmount - Setter for spread
 * @param {Function} options.setOctave - Setter for octave
 * @param {Function} options.setRecalledOctave - Setter for recalled octave
 * @param {Function} options.setRecalledInversion - Setter for recalled inversion
 * @param {Function} options.setRecalledDrop - Setter for recalled drop
 * @param {Function} options.setRecalledSpread - Setter for recalled spread
 * @param {Function} options.savePreset - Function to save a preset
 * @param {Function} options.recallPreset - Function to recall a preset
 * @param {Function} options.stopRecalling - Function to stop recalling
 * @param {Function} options.updatePresetVoicing - Function to update preset voicing
 * @param {Function} options.findNextAvailableSlot - Function to find next open slot
 */
export function useVoicingKeyboard({
  currentChord,
  pressedKeys,
  savedPresets,
  recalledKeys,
  activePresetSlot,
  octave,
  inversionIndex,
  droppedNotes,
  spreadAmount,
  recalledInversion,
  recalledDrop,
  recalledSpread,
  setInversionIndex,
  setDroppedNotes,
  setSpreadAmount,
  setOctave,
  setRecalledOctave,
  setRecalledInversion,
  setRecalledDrop,
  setRecalledSpread,
  savePreset,
  recallPreset,
  stopRecalling,
  updatePresetVoicing,
  findNextAvailableSlot,
}) {
  /** @type {React.MutableRefObject<boolean>} Track if space save has been triggered */
  const commandSaveTriggered = useRef(false);

  /**
   * Handle number key presses for preset save/recall.
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {boolean} True if event was handled
   */
  const handleNumberKey = useCallback(
    (event) => {
      if (event.key < "0" || event.key > "9") return false;

      event.preventDefault();
      const slotNumber = event.key;

      // Save if holding chord keys, not in recall mode, and slot is empty
      if (
        pressedKeys.size > 0 &&
        !recalledKeys &&
        !savedPresets.has(slotNumber)
      ) {
        savePreset(slotNumber, {
          keys: pressedKeys,
          octave,
          inversionIndex,
          droppedNotes,
          spreadAmount,
        });
      }
      // Recall if not holding keys and preset exists
      else if (pressedKeys.size === 0 && savedPresets.has(slotNumber)) {
        recallPreset(slotNumber);
      }

      return true;
    },
    [
      pressedKeys,
      recalledKeys,
      savedPresets,
      octave,
      inversionIndex,
      droppedNotes,
      spreadAmount,
      savePreset,
      recallPreset,
    ]
  );

  /**
   * Handle left shift key for cycling inversions.
   * Updates recalled value if preset active, else global.
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {boolean} True if event was handled
   */
  const handleShiftKey = useCallback(
    (event) => {
      if (event.key !== "Shift" || event.location !== 1) return false;

      event.preventDefault();

      if (currentChord?.notes) {
        const maxInversions = currentChord.notes.length;

        if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
          setRecalledInversion((prev) => {
            const current = prev !== null ? prev : inversionIndex;
            const newInversion = (current + 1) % maxInversions;
            updatePresetVoicing(activePresetSlot, { inversionIndex: newInversion });
            return newInversion;
          });
        } else {
          setInversionIndex((prev) => (prev + 1) % maxInversions);
        }
      }

      return true;
    },
    [
      currentChord,
      activePresetSlot,
      savedPresets,
      inversionIndex,
      setInversionIndex,
      setRecalledInversion,
      updatePresetVoicing,
    ]
  );

  /**
   * Handle caps lock key for cycling dropped notes.
   * Updates recalled value if preset active, else global.
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {boolean} True if event was handled
   */
  const handleCapsLock = useCallback(
    (event) => {
      if (event.key !== "CapsLock") return false;

      event.preventDefault();

      if (currentChord?.notes) {
        const maxDrops = currentChord.notes.length - 1;

        if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
          setRecalledDrop((prev) => {
            const current = prev !== null ? prev : droppedNotes;
            const newDropped = (current + 1) % (maxDrops + 1);
            updatePresetVoicing(activePresetSlot, { droppedNotes: newDropped });
            return newDropped;
          });
        } else {
          setDroppedNotes((prev) => (prev + 1) % (maxDrops + 1));
        }
      }

      return true;
    },
    [
      currentChord,
      activePresetSlot,
      savedPresets,
      droppedNotes,
      setDroppedNotes,
      setRecalledDrop,
      updatePresetVoicing,
    ]
  );

  /**
   * Handle space key for saving to next available slot.
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {boolean} True if event was handled
   */
  const handleSpaceKey = useCallback(
    (event) => {
      if (event.key !== " " || event.code !== "Space") return false;

      event.preventDefault();

      // Only save once per space press
      if (commandSaveTriggered.current) return true;

      const nextSlot = findNextAvailableSlot();
      if (nextSlot === null) return true;

      commandSaveTriggered.current = true;

      // Save current chord if holding keys
      if (currentChord && pressedKeys.size > 0 && !recalledKeys) {
        savePreset(nextSlot, {
          keys: pressedKeys,
          octave,
          inversionIndex,
          droppedNotes,
          spreadAmount,
        });
      }
      // Generate random chord if no chord selected
      else if (!currentChord && pressedKeys.size === 0) {
        const randomChordKeys = generateRandomChord();
        savePreset(nextSlot, {
          keys: randomChordKeys,
          octave,
          inversionIndex: 0,
          droppedNotes: 0,
          spreadAmount: 0,
        });
      }

      return true;
    },
    [
      currentChord,
      pressedKeys,
      recalledKeys,
      octave,
      inversionIndex,
      droppedNotes,
      spreadAmount,
      findNextAvailableSlot,
      savePreset,
    ]
  );

  /**
   * Handle arrow up key for increasing spread.
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {boolean} True if event was handled
   */
  const handleArrowUp = useCallback(
    (event) => {
      if (event.key !== "ArrowUp") return false;

      event.preventDefault();

      if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
        setRecalledSpread((prev) => {
          const current = prev !== null ? prev : spreadAmount;
          const newSpread = Math.min(3, current + 1);
          updatePresetVoicing(activePresetSlot, { spreadAmount: newSpread });
          return newSpread;
        });
      } else {
        setSpreadAmount((prev) => Math.min(3, prev + 1));
      }

      return true;
    },
    [activePresetSlot, savedPresets, spreadAmount, setSpreadAmount, setRecalledSpread, updatePresetVoicing]
  );

  /**
   * Handle arrow down key for decreasing spread.
   * Updates recalled value if preset active, else global.
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {boolean} True if event was handled
   */
  const handleArrowDown = useCallback(
    (event) => {
      if (event.key !== "ArrowDown") return false;

      event.preventDefault();

      if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
        setRecalledSpread((prev) => {
          const current = prev !== null ? prev : spreadAmount;
          const newSpread = Math.max(0, current - 1);
          updatePresetVoicing(activePresetSlot, { spreadAmount: newSpread });
          return newSpread;
        });
      } else {
        setSpreadAmount((prev) => Math.max(0, prev - 1));
      }

      return true;
    },
    [activePresetSlot, savedPresets, spreadAmount, setSpreadAmount, setRecalledSpread, updatePresetVoicing]
  );

  /**
   * Handle arrow left key for decreasing octave.
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {boolean} True if event was handled
   */
  const handleArrowLeft = useCallback(
    (event) => {
      if (event.key !== "ArrowLeft") return false;

      event.preventDefault();

      if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
        setRecalledOctave((prev) => {
          const currentOctave = prev !== null ? prev : octave;
          const newOctave = Math.max(0, currentOctave - 1);
          updatePresetVoicing(activePresetSlot, { octave: newOctave });
          return newOctave;
        });
      } else {
        setOctave((prev) => Math.max(0, prev - 1));
      }

      return true;
    },
    [
      activePresetSlot,
      savedPresets,
      octave,
      setOctave,
      setRecalledOctave,
      updatePresetVoicing,
    ]
  );

  /**
   * Handle arrow right key for increasing octave.
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {boolean} True if event was handled
   */
  const handleArrowRight = useCallback(
    (event) => {
      if (event.key !== "ArrowRight") return false;

      event.preventDefault();

      if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
        setRecalledOctave((prev) => {
          const currentOctave = prev !== null ? prev : octave;
          const newOctave = Math.min(7, currentOctave + 1);
          updatePresetVoicing(activePresetSlot, { octave: newOctave });
          return newOctave;
        });
      } else {
        setOctave((prev) => Math.min(7, prev + 1));
      }

      return true;
    },
    [
      activePresetSlot,
      savedPresets,
      octave,
      setOctave,
      setRecalledOctave,
      updatePresetVoicing,
    ]
  );

  /**
   * Main keydown handler that dispatches to specific handlers.
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Try each handler in order
      if (handleNumberKey(event)) return;
      if (handleShiftKey(event)) return;
      if (handleCapsLock(event)) return;
      if (handleSpaceKey(event)) return;
      if (handleArrowUp(event)) return;
      if (handleArrowDown(event)) return;
      if (handleArrowLeft(event)) return;
      if (handleArrowRight(event)) return;
    };

    const handleKeyUp = (event) => {
      // Reset space save flag
      if (event.key === " ") {
        commandSaveTriggered.current = false;
      }

      // Clear recalled preset when number key is released
      if (event.key >= "0" && event.key <= "9") {
        if (recalledKeys && activePresetSlot === event.key) {
          stopRecalling();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    handleNumberKey,
    handleShiftKey,
    handleCapsLock,
    handleSpaceKey,
    handleArrowUp,
    handleArrowDown,
    handleArrowLeft,
    handleArrowRight,
    recalledKeys,
    activePresetSlot,
    stopRecalling,
  ]);
}
