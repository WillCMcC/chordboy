/**
 * Parse Keys Module
 * Converts pressed keyboard keys into structured chord data.
 */

import {
  getRootNote,
  getModifiers,
  getSpecialFunctions,
} from "./keyboardMappings";
import type { ParsedKeys } from "../types";

/**
 * Parse pressed keys into structured chord data
 * @param pressedKeys - Set of currently pressed keys
 * @returns Parsed chord data { root, modifiers, specialFunctions }
 */
export function parseKeys(pressedKeys: Set<string> | null | undefined): ParsedKeys {
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
 * @param parsedKeys - Result from parseKeys()
 * @returns True if valid chord
 */
export function isValidChord(parsedKeys: ParsedKeys): boolean {
  return parsedKeys.root !== null;
}

/**
 * Get a simple string representation of the parsed keys
 * Useful for debugging
 * @param parsedKeys - Result from parseKeys()
 * @returns String representation
 */
export function parsedKeysToString(parsedKeys: ParsedKeys): string {
  if (!parsedKeys.root) return "No chord";

  const parts: string[] = [parsedKeys.root];

  if (parsedKeys.modifiers.length > 0) {
    parts.push(`[${parsedKeys.modifiers.join(", ")}]`);
  }

  if (parsedKeys.specialFunctions.length > 0) {
    parts.push(`{${parsedKeys.specialFunctions.join(", ")}}`);
  }

  return parts.join(" ");
}
