import { useState, useEffect, useCallback } from "react";

/**
 * useKeyboard Hook
 * Captures keyboard events and tracks currently pressed keys
 * Handles multi-key detection for chord input
 */
export function useKeyboard(onAllKeysUp) {
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [allKeysReleased, setAllKeysReleased] = useState(false);

  /**
   * Trigger callback when all keys are released
   */
  useEffect(() => {
    if (allKeysReleased && onAllKeysUp) {
      console.log("All keys released - stopping MIDI output");
      onAllKeysUp();
      setAllKeysReleased(false);
    }
  }, [allKeysReleased, onAllKeysUp]);

  /**
   * Handle key down events
   */
  const handleKeyDown = useCallback((event) => {
    // Ignore repeated keydown events (when key is held)
    if (event.repeat) return;

    const key = event.key.toLowerCase();

    // Prevent default browser behavior for certain keys
    // This prevents browser shortcuts from interfering
    const shouldPreventDefault = [
      "Tab",
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

    // Ignore modifier/control keys and number keys - these are handled separately
    const isControlKey =
      event.key === "Shift" ||
      event.key === "CapsLock" ||
      event.key === " " ||
      event.key === "Control" ||
      event.key === "Alt" ||
      event.key === "Meta" ||
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

    console.log("Key down:", key, "Pressed keys:", pressedKeys.size + 1);
  }, []);

  /**
   * Handle key up events
   */
  const handleKeyUp = useCallback(
    (event) => {
      const key = event.key.toLowerCase();

      // Ignore modifier/control keys and number keys
      const isControlKey =
        event.key === "Shift" ||
        event.key === "CapsLock" ||
        event.key === " " ||
        event.key === "Control" ||
        event.key === "Alt" ||
        event.key === "Meta" ||
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

      console.log("Key up:", key, "Pressed keys:", pressedKeys.size - 1);
    },
    [onAllKeysUp]
  );

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
  const clearKeys = useCallback(() => {
    setPressedKeys(new Set());
  }, []);

  /**
   * Check if a specific key is pressed
   */
  const isKeyPressed = useCallback(
    (key) => {
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
