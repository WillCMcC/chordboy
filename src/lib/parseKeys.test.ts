import { describe, it, expect } from "vitest";
import { parseKeys, isValidChord, parsedKeysToString } from "./parseKeys";
import type { ParsedKeys, NoteName, ModifierType } from "../types";

describe("parseKeys", () => {
  describe("parseKeys", () => {
    it("should return null root for empty set", () => {
      const result = parseKeys(new Set<string>());
      expect(result.root).toBe(null);
      expect(result.modifiers).toEqual([]);
      expect(result.specialFunctions).toEqual([]);
    });

    it("should return null root for null/undefined", () => {
      expect(parseKeys(null).root).toBe(null);
      expect(parseKeys(undefined).root).toBe(null);
    });

    it("should parse root note from left hand keys", () => {
      const result = parseKeys(new Set(["q"]));
      expect(result.root).toBe("C");
    });

    it("should parse modifiers from right hand keys", () => {
      const result = parseKeys(new Set(["q", "u", "k"]));
      expect(result.root).toBe("C");
      expect(result.modifiers).toContain("minor");
      expect(result.modifiers).toContain("dom7");
    });

    it("should parse special functions", () => {
      const result = parseKeys(new Set(["q", "Shift"]));
      expect(result.root).toBe("C");
      expect(result.specialFunctions).toContain("inversion");
    });

    it("should parse complex chord combinations", () => {
      const result = parseKeys(new Set(["x", "u", "k", "l", "["]));
      expect(result.root).toBe("A");
      expect(result.modifiers).toContain("minor");
      expect(result.modifiers).toContain("dom7");
      expect(result.modifiers).toContain("9");
      expect(result.modifiers).toContain("sharp9");
    });
  });

  describe("isValidChord", () => {
    it("should return false when no root", () => {
      const parsed: ParsedKeys = { root: null, modifiers: [], specialFunctions: [] };
      expect(isValidChord(parsed)).toBe(false);
    });

    it("should return true when root is present", () => {
      const parsed1: ParsedKeys = { root: "C" as NoteName, modifiers: [], specialFunctions: [] };
      const parsed2: ParsedKeys = { root: "A" as NoteName, modifiers: ["minor" as ModifierType], specialFunctions: [] };
      expect(isValidChord(parsed1)).toBe(true);
      expect(isValidChord(parsed2)).toBe(true);
    });
  });

  describe("parsedKeysToString", () => {
    it("should return 'No chord' when no root", () => {
      const parsed: ParsedKeys = { root: null, modifiers: [], specialFunctions: [] };
      expect(parsedKeysToString(parsed)).toBe("No chord");
    });

    it("should return just root for basic chord", () => {
      const parsed: ParsedKeys = { root: "C" as NoteName, modifiers: [], specialFunctions: [] };
      expect(parsedKeysToString(parsed)).toBe("C");
    });

    it("should include modifiers in brackets", () => {
      const parsed: ParsedKeys = {
        root: "C" as NoteName,
        modifiers: ["minor", "dom7"] as ModifierType[],
        specialFunctions: [],
      };
      expect(parsedKeysToString(parsed)).toBe("C [minor, dom7]");
    });

    it("should include special functions in braces", () => {
      const parsed: ParsedKeys = {
        root: "C" as NoteName,
        modifiers: [],
        specialFunctions: ["inversion"],
      };
      expect(parsedKeysToString(parsed)).toBe("C {inversion}");
    });

    it("should format complete chord info", () => {
      const parsed: ParsedKeys = {
        root: "G" as NoteName,
        modifiers: ["dom7", "9"] as ModifierType[],
        specialFunctions: ["inversion"],
      };
      expect(parsedKeysToString(parsed)).toBe("G [dom7, 9] {inversion}");
    });
  });
});
