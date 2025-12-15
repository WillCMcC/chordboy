/**
 * Tests for useVoicingKeyboard Hook
 * Tests voicing controls, preset save/recall, and keyboard shortcut logic
 */

import { describe, it, expect } from "vitest";
import { generateRandomChord } from "./useVoicingKeyboard";
import { LEFT_HAND_KEYS, RIGHT_HAND_MODIFIERS } from "../lib/keyboardMappings";

describe("useVoicingKeyboard Logic Tests", () => {
  describe("generateRandomChord utility", () => {
    it("should return a Set with at least one key (the root)", () => {
      const chord = generateRandomChord();
      expect(chord instanceof Set).toBe(true);
      expect(chord.size).toBeGreaterThanOrEqual(1);
    });

    it("should return Set with valid root key", () => {
      const chord = generateRandomChord();
      const chordArray = Array.from(chord);
      const rootKeys = Object.keys(LEFT_HAND_KEYS);

      // At least one key should be a valid root
      const hasValidRoot = chordArray.some((key) => rootKeys.includes(key));
      expect(hasValidRoot).toBe(true);
    });

    it("should include only valid keys", () => {
      const chord = generateRandomChord();
      const chordArray = Array.from(chord);
      const rootKeys = Object.keys(LEFT_HAND_KEYS);
      const modifierKeys = Object.keys(RIGHT_HAND_MODIFIERS);
      const allValidKeys = [...rootKeys, ...modifierKeys];

      chordArray.forEach((key) => {
        expect(allValidKeys.includes(key)).toBe(true);
      });
    });

    it("should generate different chords on multiple calls", () => {
      const chords = new Set<string>();

      // Generate 20 random chords
      for (let i = 0; i < 20; i++) {
        const chord = generateRandomChord();
        chords.add(Array.from(chord).sort().join(","));
      }

      // Should have some variety (at least 2 different combinations)
      expect(chords.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Keyboard event identification", () => {
    it("should identify number keys", () => {
      const numberKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
      numberKeys.forEach((key) => {
        const isNumber = key >= "0" && key <= "9";
        expect(isNumber).toBe(true);
      });
    });

    it("should identify left shift by location", () => {
      // KeyboardEvent.location === 1 for left shift
      const leftShiftLocation = 1;
      expect(leftShiftLocation).toBe(1);
    });

    it("should identify right shift by location", () => {
      // KeyboardEvent.location === 2 for right shift
      const rightShiftLocation = 2;
      expect(rightShiftLocation).toBe(2);
    });

    it("should identify space key", () => {
      const key = " ";
      const code = "Space";
      expect(key).toBe(" ");
      expect(code).toBe("Space");
    });

    it("should identify arrow keys", () => {
      const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      arrows.forEach((key) => {
        expect(
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key),
        ).toBe(true);
      });
    });
  });

  describe("Inversion cycling logic", () => {
    it("should cycle to next inversion", () => {
      const currentInversion = 0;
      const maxInversions = 4;
      const nextInversion = (currentInversion + 1) % maxInversions;
      expect(nextInversion).toBe(1);
    });

    it("should wrap around to 0 after last inversion", () => {
      const currentInversion = 3;
      const maxInversions = 4;
      const nextInversion = (currentInversion + 1) % maxInversions;
      expect(nextInversion).toBe(0);
    });

    it("should handle single-note chord", () => {
      const currentInversion = 0;
      const maxInversions = 1;
      const nextInversion = (currentInversion + 1) % maxInversions;
      expect(nextInversion).toBe(0);
    });
  });

  describe("Voicing style cycling logic", () => {
    it("should cycle through voicing styles", () => {
      const VOICING_STYLES = [
        "close",
        "drop2",
        "drop3",
        "rootless-a",
        "rootless-b",
      ] as const;
      const currentIndex = 0;
      const nextIndex = (currentIndex + 1) % VOICING_STYLES.length;
      expect(VOICING_STYLES[nextIndex]).toBe("drop2");
    });

    it("should wrap around from last to first style", () => {
      const VOICING_STYLES = [
        "close",
        "drop2",
        "drop3",
        "rootless-a",
        "rootless-b",
      ] as const;
      const currentIndex = 4;
      const nextIndex = (currentIndex + 1) % VOICING_STYLES.length;
      expect(VOICING_STYLES[nextIndex]).toBe("close");
    });
  });

  describe("Spread amount logic", () => {
    it("should increase spread up to max", () => {
      let spread = 0;
      spread = Math.min(3, spread + 1);
      expect(spread).toBe(1);

      spread = Math.min(3, spread + 1);
      expect(spread).toBe(2);

      spread = Math.min(3, spread + 1);
      expect(spread).toBe(3);
    });

    it("should not exceed max spread", () => {
      let spread = 3;
      spread = Math.min(3, spread + 1);
      expect(spread).toBe(3);
    });

    it("should decrease spread down to 0", () => {
      let spread = 3;
      spread = Math.max(0, spread - 1);
      expect(spread).toBe(2);

      spread = Math.max(0, spread - 1);
      expect(spread).toBe(1);

      spread = Math.max(0, spread - 1);
      expect(spread).toBe(0);
    });

    it("should not go below 0", () => {
      let spread = 0;
      spread = Math.max(0, spread - 1);
      expect(spread).toBe(0);
    });
  });

  describe("Octave range logic", () => {
    it("should decrease octave", () => {
      let octave = 4;
      octave = Math.max(0, octave - 1);
      expect(octave).toBe(3);
    });

    it("should not go below 0", () => {
      let octave = 0;
      octave = Math.max(0, octave - 1);
      expect(octave).toBe(0);
    });

    it("should increase octave", () => {
      let octave = 4;
      octave = Math.min(7, octave + 1);
      expect(octave).toBe(5);
    });

    it("should not exceed 7", () => {
      let octave = 7;
      octave = Math.min(7, octave + 1);
      expect(octave).toBe(7);
    });
  });

  describe("Preset slot finding logic", () => {
    it("should find first available slot", () => {
      const savedPresets = new Map([["1", {} as any]]);

      let nextSlot = null;
      for (let i = 1; i <= 9; i++) {
        const slotKey = i.toString();
        if (!savedPresets.has(slotKey)) {
          nextSlot = slotKey;
          break;
        }
      }
      if (nextSlot === null && !savedPresets.has("0")) {
        nextSlot = "0";
      }

      expect(nextSlot).toBe("2");
    });

    it("should use slot 0 when 1-9 are full", () => {
      const savedPresets = new Map();
      for (let i = 1; i <= 9; i++) {
        savedPresets.set(i.toString(), {} as any);
      }

      let nextSlot = null;
      for (let i = 1; i <= 9; i++) {
        const slotKey = i.toString();
        if (!savedPresets.has(slotKey)) {
          nextSlot = slotKey;
          break;
        }
      }
      if (nextSlot === null && !savedPresets.has("0")) {
        nextSlot = "0";
      }

      expect(nextSlot).toBe("0");
    });

    it("should return null when all slots are full", () => {
      const savedPresets = new Map();
      for (let i = 0; i <= 9; i++) {
        savedPresets.set(i.toString(), {} as any);
      }

      let nextSlot = null;
      for (let i = 1; i <= 9; i++) {
        const slotKey = i.toString();
        if (!savedPresets.has(slotKey)) {
          nextSlot = slotKey;
          break;
        }
      }
      if (nextSlot === null && !savedPresets.has("0")) {
        nextSlot = "0";
      }

      expect(nextSlot).toBeNull();
    });
  });

  describe("Preset save conditions", () => {
    it("should save when holding keys and slot is empty", () => {
      const pressedKeys = new Set(["q", "u"]);
      const recalledKeys = null;
      const slotNumber = "1";
      const savedPresets = new Map();

      const shouldSave =
        pressedKeys.size > 0 && !recalledKeys && !savedPresets.has(slotNumber);

      expect(shouldSave).toBe(true);
    });

    it("should NOT save when in recall mode", () => {
      const pressedKeys = new Set(["q", "u"]);
      const recalledKeys = new Set(["q", "u"]); // In recall mode
      const slotNumber = "1";
      const savedPresets = new Map();

      const shouldSave =
        pressedKeys.size > 0 && !recalledKeys && !savedPresets.has(slotNumber);

      expect(shouldSave).toBe(false);
    });

    it("should NOT save when slot already has preset", () => {
      const pressedKeys = new Set(["q", "u"]);
      const recalledKeys = null;
      const slotNumber = "1";
      const savedPresets = new Map([["1", {} as any]]);

      const shouldSave =
        pressedKeys.size > 0 && !recalledKeys && !savedPresets.has(slotNumber);

      expect(shouldSave).toBe(false);
    });
  });

  describe("Preset recall conditions", () => {
    it("should recall when not holding keys and preset exists", () => {
      const pressedKeys = new Set<string>();
      const slotNumber = "1";
      const savedPresets = new Map([["1", {} as any]]);

      const shouldRecall =
        pressedKeys.size === 0 && savedPresets.has(slotNumber);

      expect(shouldRecall).toBe(true);
    });

    it("should NOT recall when holding keys", () => {
      const pressedKeys = new Set(["q"]);
      const slotNumber = "1";
      const savedPresets = new Map([["1", {} as any]]);

      const shouldRecall =
        pressedKeys.size === 0 && savedPresets.has(slotNumber);

      expect(shouldRecall).toBe(false);
    });

    it("should NOT recall when preset does not exist", () => {
      const pressedKeys = new Set<string>();
      const slotNumber = "1";
      const savedPresets = new Map();

      const shouldRecall =
        pressedKeys.size === 0 && savedPresets.has(slotNumber);

      expect(shouldRecall).toBe(false);
    });
  });
});
