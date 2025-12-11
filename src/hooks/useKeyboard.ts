import { useState, useEffect, useCallback } from "react";

/** Return type for useKeyboard hook */
export interface UseKeyboardReturn {
  /** Set of currently pressed keys */
  pressedKeys: Set<string>;
  /** Check if a specific key is pressed */
  isKeyPressed: (key: string) => boolean;
  /** Clear all pressed keys */
  clearKeys: () => void;
}

/**
 * useKeyboard Hook
 * Captures keyboard events and tracks currently pressed keys
 * Handles multi-key detection for chord input
 */
export function useKeyboard(onAllKeysUp?: () => void): UseKeyboardReturn {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [allKeysReleased, setAllKeysReleased] = useState<boolean>(false);

  /**
   * Trigger callback when all keys are released
   */
  useEffect(() => {
    if (allKeysReleased && onAllKeysUp) {
      onAllKeysUp();
      setAllKeysReleased(false);
    }
  }, [allKeysReleased, onAllKeysUp]);

  /**
   * Handle key down events
   */
  const handleKeyDown = useCallback((event: KeyboardEvent): void => {
    // Ignore repeated keydown events (when key is held)
    if (event.repeat) return;

    const key = event.key.toLowerCase();

    // Prevent default browser behavior for certain keys
    // This prevents browser shortcuts from interfering
    // Note: Tab is NOT prevented to maintain keyboard accessibility
    const shouldPreventDefault = [
      " ", // Space
      "Escape",
      "/",
      "[",
      "]",
      "'",
      "\\",
      ";",
    ].includes(event.key);

    if (shouldPreventDefault) {
      event.preventDefault();
    }

    // Ignore modifier/control keys, arrow keys, number keys, and bracket keys - these are handled separately
    const isControlKey =
      event.key === "Shift" ||
      event.key === "CapsLock" ||
      event.key === " " ||
      event.key === "Control" ||
      event.key === "Alt" ||
      event.key === "Meta" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "[" || // Grace note octave down modifier
      event.key === "]" || // Grace note octave up modifier
      (event.key >= "0" && event.key <= "9"); // Filter out number keys

    if (isControlKey) {
      return; // Don't add to pressed keys
    }

    // Add key to pressed keys set
    setPressedKeys((prev) => {
      const newSet = new Set(prev);
      newSet.add(key);
      return newSet;
    });
  }, []);

  /**
   * Handle key up events
   */
  const handleKeyUp = useCallback((event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    // Ignore modifier/control keys, arrow keys, number keys, and bracket keys
    const isControlKey =
      event.key === "Shift" ||
      event.key === "CapsLock" ||
      event.key === " " ||
      event.key === "Control" ||
      event.key === "Alt" ||
      event.key === "Meta" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "[" || // Grace note octave down modifier
      event.key === "]" || // Grace note octave up modifier
      (event.key >= "0" && event.key <= "9"); // Filter out number keys

    if (isControlKey) {
      return; // Don't remove from pressed keys (wasn't added)
    }

    // Remove key from pressed keys set
    setPressedKeys((prev) => {
      const newSet = new Set(prev);
      newSet.delete(key);

      // If all keys are now released, set flag
      if (newSet.size === 0) {
        setAllKeysReleased(true);
      }

      return newSet;
    });
  }, []);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  /**
   * Clear all pressed keys (useful for panic/reset)
   */
  const clearKeys = useCallback((): void => {
    setPressedKeys(new Set());
  }, []);

  /**
   * Check if a specific key is pressed
   */
  const isKeyPressed = useCallback(
    (key: string): boolean => {
      return pressedKeys.has(key.toLowerCase());
    },
    [pressedKeys]
  );

  return {
    pressedKeys,
    isKeyPressed,
    clearKeys,
  };
}
