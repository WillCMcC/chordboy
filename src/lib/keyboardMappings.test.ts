import { describe, it, expect } from "vitest";
import {
  LEFT_HAND_KEYS,
  RIGHT_HAND_MODIFIERS,
  SPECIAL_KEYS,
  getRootNote,
  getModifiers,
  isSpecialKeyPressed,
  getSpecialFunctions,
} from "./keyboardMappings";
import type { NoteName, ModifierType } from "../types";

describe("keyboardMappings", () => {
  describe("LEFT_HAND_KEYS", () => {
    it("should have 12 root notes (chromatic scale)", () => {
      expect(Object.keys(LEFT_HAND_KEYS).length).toBe(12);
    });

    it("should map QWER row to C, C#, D, D#", () => {
      expect(LEFT_HAND_KEYS.q).toBe("C");
      expect(LEFT_HAND_KEYS.w).toBe("C#");
      expect(LEFT_HAND_KEYS.e).toBe("D");
      expect(LEFT_HAND_KEYS.r).toBe("D#");
    });

    it("should map ASDF row to E, F, F#, G", () => {
      expect(LEFT_HAND_KEYS.a).toBe("E");
      expect(LEFT_HAND_KEYS.s).toBe("F");
      expect(LEFT_HAND_KEYS.d).toBe("F#");
      expect(LEFT_HAND_KEYS.f).toBe("G");
    });

    it("should map ZXCV row to G#, A, A#, B", () => {
      expect(LEFT_HAND_KEYS.z).toBe("G#");
      expect(LEFT_HAND_KEYS.x).toBe("A");
      expect(LEFT_HAND_KEYS.c).toBe("A#");
      expect(LEFT_HAND_KEYS.v).toBe("B");
    });
  });

  describe("RIGHT_HAND_MODIFIERS", () => {
    it("should have quality modifiers", () => {
      expect(RIGHT_HAND_MODIFIERS.j).toBe("major");
      expect(RIGHT_HAND_MODIFIERS.u).toBe("minor");
      expect(RIGHT_HAND_MODIFIERS.m).toBe("diminished");
      expect(RIGHT_HAND_MODIFIERS["7"]).toBe("augmented");
    });

    it("should have seventh modifiers", () => {
      expect(RIGHT_HAND_MODIFIERS.k).toBe("dom7");
      expect(RIGHT_HAND_MODIFIERS.i).toBe("maj7");
      expect(RIGHT_HAND_MODIFIERS[","]).toBe("6");
    });

    it("should have extension modifiers", () => {
      expect(RIGHT_HAND_MODIFIERS.l).toBe("9");
      expect(RIGHT_HAND_MODIFIERS.o).toBe("11");
      expect(RIGHT_HAND_MODIFIERS["."]).toBe("13");
    });

    it("should have suspension modifiers", () => {
      expect(RIGHT_HAND_MODIFIERS[";"]).toBe("sus2");
      expect(RIGHT_HAND_MODIFIERS.p).toBe("sus4");
    });

    it("should have alteration modifiers", () => {
      expect(RIGHT_HAND_MODIFIERS["/"]).toBe("flat5");
      expect(RIGHT_HAND_MODIFIERS["["]).toBe("sharp9");
      expect(RIGHT_HAND_MODIFIERS["]"]).toBe("flat9");
      expect(RIGHT_HAND_MODIFIERS["'"]).toBe("sharp11");
      expect(RIGHT_HAND_MODIFIERS["\\"]).toBe("flat13");
    });
  });

  describe("SPECIAL_KEYS", () => {
    it("should have inversion key", () => {
      expect(SPECIAL_KEYS.Shift).toBe("inversion");
    });

    it("should have panic key", () => {
      expect(SPECIAL_KEYS.Escape).toBe("panic");
    });

    it("should have spread voicing key", () => {
      expect(SPECIAL_KEYS[" "]).toBe("spread-voicing");
    });
  });

  describe("getRootNote", () => {
    it("should return null for empty set", () => {
      expect(getRootNote(new Set<string>())).toBe(null);
    });

    it("should return root note from pressed keys", () => {
      expect(getRootNote(new Set(["q"]))).toBe("C");
      expect(getRootNote(new Set(["x"]))).toBe("A");
    });

    it("should return first root found when multiple pressed", () => {
      const keys = new Set(["q", "w"]);
      const root = getRootNote(keys);
      expect(["C", "C#"] as NoteName[]).toContain(root);
    });

    it("should ignore non-root keys", () => {
      expect(getRootNote(new Set(["k", "l"]))).toBe(null);
    });
  });

  describe("getModifiers", () => {
    it("should return empty array for empty set", () => {
      expect(getModifiers(new Set<string>())).toEqual([]);
    });

    it("should return single modifier", () => {
      expect(getModifiers(new Set(["u"]))).toEqual(["minor"]);
    });

    it("should return multiple modifiers", () => {
      const mods: ModifierType[] = getModifiers(new Set(["u", "k", "l"]));
      expect(mods).toContain("minor");
      expect(mods).toContain("dom7");
      expect(mods).toContain("9");
    });

    it("should ignore non-modifier keys", () => {
      expect(getModifiers(new Set(["q", "w"]))).toEqual([]);
    });
  });

  describe("isSpecialKeyPressed", () => {
    it("should return false for empty set", () => {
      expect(isSpecialKeyPressed(new Set<string>(), "inversion")).toBe(false);
    });

    it("should return true when special key is pressed", () => {
      expect(isSpecialKeyPressed(new Set(["Shift"]), "inversion")).toBe(true);
    });

    it("should return false when different special key is pressed", () => {
      expect(isSpecialKeyPressed(new Set(["Escape"]), "inversion")).toBe(false);
    });
  });

  describe("getSpecialFunctions", () => {
    it("should return empty array for no special keys", () => {
      expect(getSpecialFunctions(new Set<string>())).toEqual([]);
      expect(getSpecialFunctions(new Set(["q", "k"]))).toEqual([]);
    });

    it("should return special functions when pressed", () => {
      const funcs: string[] = getSpecialFunctions(new Set(["Shift", "Escape"]));
      expect(funcs).toContain("inversion");
      expect(funcs).toContain("panic");
    });
  });
});
