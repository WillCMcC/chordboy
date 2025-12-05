import { describe, it, expect } from "vitest";
import { parseKeys, isValidChord, parsedKeysToString } from "./parseKeys";

describe("parseKeys", () => {
  describe("parseKeys", () => {
    it("should return null root for empty set", () => {
      const result = parseKeys(new Set());
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
      expect(isValidChord({ root: null, modifiers: [] })).toBe(false);
    });

    it("should return true when root is present", () => {
      expect(isValidChord({ root: "C", modifiers: [] })).toBe(true);
      expect(isValidChord({ root: "A", modifiers: ["minor"] })).toBe(true);
    });
  });

  describe("parsedKeysToString", () => {
    it("should return 'No chord' when no root", () => {
      expect(parsedKeysToString({ root: null, modifiers: [], specialFunctions: [] })).toBe("No chord");
    });

    it("should return just root for basic chord", () => {
      expect(parsedKeysToString({ root: "C", modifiers: [], specialFunctions: [] })).toBe("C");
    });

    it("should include modifiers in brackets", () => {
      const result = parsedKeysToString({
        root: "C",
        modifiers: ["minor", "dom7"],
        specialFunctions: [],
      });
      expect(result).toBe("C [minor, dom7]");
    });

    it("should include special functions in braces", () => {
      const result = parsedKeysToString({
        root: "C",
        modifiers: [],
        specialFunctions: ["inversion"],
      });
      expect(result).toBe("C {inversion}");
    });

    it("should format complete chord info", () => {
      const result = parsedKeysToString({
        root: "G",
        modifiers: ["dom7", "9"],
        specialFunctions: ["inversion"],
      });
      expect(result).toBe("G [dom7, 9] {inversion}");
    });
  });
});
