/**
 * useVoicingKeyboard Hook
 * Handles keyboard shortcuts for voicing controls (inversion, drop, spread, octave).
 * Also manages number key preset save/recall interactions.
 *
 * @module hooks/useVoicingKeyboard
 */

import { useEffect, useRef, useCallback, Dispatch, SetStateAction } from "react";
import { LEFT_HAND_KEYS, RIGHT_HAND_MODIFIERS } from "../lib/keyboardMappings";
import type { Chord, Preset, MIDINote, Octave, VoicingStyle } from "../types";
import { VOICING_STYLES } from "../types";

/** Preset data for saving */
export interface PresetData {
  keys: Set<string>;
  octave: Octave;
  inversionIndex?: number;
  droppedNotes?: number;
  spreadAmount?: number;
  voicingStyle?: VoicingStyle;
}

/** Voicing updates that can be applied to a preset */
export interface VoicingUpdates {
  octave?: Octave;
  inversionIndex?: number;
  droppedNotes?: number;
  spreadAmount?: number;
  voicingStyle?: VoicingStyle;
}

/** Options for useVoicingKeyboard */
export interface UseVoicingKeyboardOptions {
  /** The currently active chord */
  currentChord: (Chord & { notes: MIDINote[]; name?: string }) | null;
  /** Currently pressed keyboard keys */
  pressedKeys: Set<string>;
  /** Map of saved chord presets */
  savedPresets: Map<string, Preset>;
  /** Keys from a recalled preset */
  recalledKeys: Set<string> | null;
  /** Currently active preset slot */
  activePresetSlot: string | null;
  /** Current octave setting */
  octave: Octave;
  /** Current inversion */
  inversionIndex: number;
  /** Current drop amount (legacy) */
  droppedNotes: number;
  /** Current spread amount */
  spreadAmount: number;
  /** Current voicing style */
  voicingStyle: VoicingStyle;
  /** Inversion from recalled preset */
  recalledInversion: number | null;
  /** Drop from recalled preset */
  recalledDrop: number | null;
  /** Spread from recalled preset */
  recalledSpread: number | null;
  /** Voicing style from recalled preset */
  recalledVoicingStyle: VoicingStyle | null;
  /** Setter for inversion */
  setInversionIndex: Dispatch<SetStateAction<number>>;
  /** Setter for dropped notes (legacy) */
  setDroppedNotes: Dispatch<SetStateAction<number>>;
  /** Setter for spread */
  setSpreadAmount: Dispatch<SetStateAction<number>>;
  /** Setter for voicing style */
  setVoicingStyle: Dispatch<SetStateAction<VoicingStyle>>;
  /** Setter for octave */
  setOctave: Dispatch<SetStateAction<Octave>>;
  /** Setter for recalled octave */
  setRecalledOctave: Dispatch<SetStateAction<Octave | null>>;
  /** Setter for recalled inversion */
  setRecalledInversion: Dispatch<SetStateAction<number | null>>;
  /** Setter for recalled drop */
  setRecalledDrop: Dispatch<SetStateAction<number | null>>;
  /** Setter for recalled spread */
  setRecalledSpread: Dispatch<SetStateAction<number | null>>;
  /** Setter for recalled voicing style */
  setRecalledVoicingStyle: Dispatch<SetStateAction<VoicingStyle | null>>;
  /** Function to save a preset */
  savePreset: (slotNumber: string, presetData: PresetData) => boolean;
  /** Function to recall a preset */
  recallPreset: (slotNumber: string) => Preset | null;
  /** Function to stop recalling */
  stopRecalling: () => void;
  /** Function to update preset voicing */
  updatePresetVoicing: (slotNumber: string, updates: VoicingUpdates) => void;
  /** Function to find next open slot */
  findNextAvailableSlot: () => string | null;
}

/**
 * Generate a random chord combination for quick experimentation.
 * Picks a random root note and 0-4 random modifiers.
 *
 * @returns Set of key characters representing the chord
 */
export function generateRandomChord(): Set<string> {
  const rootKeys = Object.keys(LEFT_HAND_KEYS);
  const modifierKeys = Object.keys(RIGHT_HAND_MODIFIERS);

  const randomRoot = rootKeys[Math.floor(Math.random() * rootKeys.length)];
  const numModifiers = Math.floor(Math.random() * 5);
  const selectedModifiers = new Set<string>();

  for (let i = 0; i < numModifiers; i++) {
    const randomModifier =
      modifierKeys[Math.floor(Math.random() * modifierKeys.length)];
    selectedModifiers.add(randomModifier);
  }

  return new Set([randomRoot, ...selectedModifiers]);
}

/**
 * Hook for handling keyboard shortcuts that control voicing and presets.
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
  voicingStyle,
  recalledInversion: _recalledInversion,
  recalledDrop: _recalledDrop,
  recalledSpread: _recalledSpread,
  recalledVoicingStyle: _recalledVoicingStyle,
  setInversionIndex,
  setDroppedNotes: _setDroppedNotes,
  setSpreadAmount,
  setVoicingStyle,
  setOctave,
  setRecalledOctave,
  setRecalledInversion,
  setRecalledDrop: _setRecalledDrop,
  setRecalledSpread,
  setRecalledVoicingStyle,
  savePreset,
  recallPreset,
  stopRecalling,
  updatePresetVoicing,
  findNextAvailableSlot,
}: UseVoicingKeyboardOptions): void {
  /** Track if space save has been triggered */
  const commandSaveTriggered = useRef<boolean>(false);

  /**
   * Handle number key presses for preset save/recall.
   */
  const handleNumberKey = useCallback(
    (event: KeyboardEvent): boolean => {
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
          voicingStyle,
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
      voicingStyle,
      savePreset,
      recallPreset,
    ]
  );

  /**
   * Handle left shift key for cycling inversions.
   * Updates recalled value if preset active, else global.
   */
  const handleShiftKey = useCallback(
    (event: KeyboardEvent): boolean => {
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
   * Handle right shift key for cycling jazz voicing styles.
   * Left shift (location=1) cycles inversions, right shift (location=2) cycles voicing styles.
   * Updates recalled value if preset active, else global.
   */
  const handleRightShift = useCallback(
    (event: KeyboardEvent): boolean => {
      // Right shift has location === 2
      if (event.key !== "Shift" || event.location !== 2) return false;

      event.preventDefault();

      if (activePresetSlot !== null && savedPresets.has(activePresetSlot)) {
        setRecalledVoicingStyle((prev) => {
          const current = prev !== null ? prev : voicingStyle;
          const currentIndex = VOICING_STYLES.indexOf(current);
          const newStyle = VOICING_STYLES[(currentIndex + 1) % VOICING_STYLES.length];
          updatePresetVoicing(activePresetSlot, { voicingStyle: newStyle });
          return newStyle;
        });
      } else {
        setVoicingStyle((prev) => {
          const currentIndex = VOICING_STYLES.indexOf(prev);
          return VOICING_STYLES[(currentIndex + 1) % VOICING_STYLES.length];
        });
      }

      return true;
    },
    [
      activePresetSlot,
      savedPresets,
      voicingStyle,
      setVoicingStyle,
      setRecalledVoicingStyle,
      updatePresetVoicing,
    ]
  );

  /**
   * Handle space key for saving to next available slot.
   */
  const handleSpaceKey = useCallback(
    (event: KeyboardEvent): boolean => {
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
          voicingStyle,
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
          voicingStyle: "close",
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
      voicingStyle,
      findNextAvailableSlot,
      savePreset,
    ]
  );

  /**
   * Handle arrow up key for increasing spread.
   */
  const handleArrowUp = useCallback(
    (event: KeyboardEvent): boolean => {
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
   */
  const handleArrowDown = useCallback(
    (event: KeyboardEvent): boolean => {
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
   */
  const handleArrowLeft = useCallback(
    (event: KeyboardEvent): boolean => {
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
   */
  const handleArrowRight = useCallback(
    (event: KeyboardEvent): boolean => {
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
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Try each handler in order
      if (handleNumberKey(event)) return;
      if (handleShiftKey(event)) return;
      if (handleRightShift(event)) return;
      if (handleSpaceKey(event)) return;
      if (handleArrowUp(event)) return;
      if (handleArrowDown(event)) return;
      if (handleArrowLeft(event)) return;
      if (handleArrowRight(event)) return;
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
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
    handleRightShift,
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
