import {
  getRootNote,
  getModifiers,
  getSpecialFunctions,
} from "./keyboardMappings";

/**
 * Parse pressed keys into structured chord data
 * @param {Set} pressedKeys - Set of currently pressed keys
 * @returns {Object} Parsed chord data { root, modifiers, specialFunctions }
 */
export function parseKeys(pressedKeys) {
  if (!pressedKeys || pressedKeys.size === 0) {
    return {
      root: null,
      modifiers: [],
      specialFunctions: [],
    };
  }

  const root = getRootNote(pressedKeys);
  const modifiers = getModifiers(pressedKeys);
  const specialFunctions = getSpecialFunctions(pressedKeys);

  return {
    root,
    modifiers,
    specialFunctions,
  };
}

/**
 * Check if the parsed keys represent a valid chord
 * (must have at least a root note)
 * @param {Object} parsedKeys - Result from parseKeys()
 * @returns {boolean} True if valid chord
 */
export function isValidChord(parsedKeys) {
  return parsedKeys.root !== null;
}

/**
 * Get a simple string representation of the parsed keys
 * Useful for debugging
 * @param {Object} parsedKeys - Result from parseKeys()
 * @returns {string} String representation
 */
export function parsedKeysToString(parsedKeys) {
  if (!parsedKeys.root) return "No chord";

  const parts = [parsedKeys.root];

  if (parsedKeys.modifiers.length > 0) {
    parts.push(`[${parsedKeys.modifiers.join(", ")}]`);
  }

  if (parsedKeys.specialFunctions.length > 0) {
    parts.push(`{${parsedKeys.specialFunctions.join(", ")}}`);
  }

  return parts.join(" ");
}
