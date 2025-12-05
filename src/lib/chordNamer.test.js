import { describe, it, expect } from "vitest";
import { getChordName, getSimpleChordName, formatNoteName } from "./chordNamer";

describe("chordNamer", () => {
  describe("getChordName", () => {
    it("should return empty string for no root", () => {
      expect(getChordName(null)).toBe("");
      expect(getChordName(undefined)).toBe("");
    });

    it("should return just root for major triad", () => {
      expect(getChordName("C", [])).toBe("C");
    });

    it("should format minor chords", () => {
      expect(getChordName("C", ["minor"])).toBe("C min");
      expect(getChordName("A", ["minor"])).toBe("A min");
    });

    it("should format diminished chords", () => {
      expect(getChordName("C", ["diminished"])).toBe("C dim");
    });

    it("should format augmented chords", () => {
      expect(getChordName("C", ["augmented"])).toBe("C aug");
    });

    it("should format sus2 chords", () => {
      expect(getChordName("C", ["sus2"])).toBe("C sus2");
    });

    it("should format sus4 chords", () => {
      expect(getChordName("C", ["sus4"])).toBe("C sus4");
    });

    it("should format dominant 7th chords", () => {
      expect(getChordName("C", ["dom7"])).toBe("C7");
      expect(getChordName("G", ["dom7"])).toBe("G7");
    });

    it("should format major 7th chords", () => {
      expect(getChordName("C", ["maj7"])).toBe("C Maj7");
    });

    it("should format minor 7th chords", () => {
      expect(getChordName("C", ["minor", "dom7"])).toBe("C min7");
    });

    it("should format minor major 7th chords", () => {
      expect(getChordName("C", ["minor", "maj7"])).toBe("C min(Maj7)");
    });

    it("should format 6th chords", () => {
      expect(getChordName("C", ["6"])).toBe("C6");
      expect(getChordName("C", ["minor", "6"])).toBe("C min6");
    });

    it("should format diminished 7th chords", () => {
      expect(getChordName("C", ["diminished", "dom7"])).toBe("C dim7");
    });

    it("should format augmented 7th chords", () => {
      expect(getChordName("C", ["augmented", "dom7"])).toBe("C aug7");
      expect(getChordName("C", ["augmented", "maj7"])).toBe("C aug Maj7");
    });

    it("should format 9th chords", () => {
      expect(getChordName("C", ["dom7", "9"])).toBe("C9");
    });

    it("should format 11th chords", () => {
      expect(getChordName("C", ["dom7", "11"])).toBe("C11");
    });

    it("should format 13th chords", () => {
      expect(getChordName("C", ["dom7", "13"])).toBe("C13");
    });

    it("should format add9 chords (9 without 7th)", () => {
      expect(getChordName("C", ["9"])).toBe("C9");
    });

    it("should format Maj7 with extensions", () => {
      expect(getChordName("C", ["maj7", "9"])).toBe("C Maj7 9");
      expect(getChordName("C", ["maj7", "13"])).toBe("C Maj7 13");
    });

    it("should format flat5 alteration", () => {
      expect(getChordName("C", ["flat5"])).toBe("C ♭5");
      expect(getChordName("C", ["dom7", "flat5"])).toBe("C7 ♭5");
    });

    it("should format flat9 alteration", () => {
      expect(getChordName("C", ["dom7", "flat9"])).toBe("C7 ♭9");
    });

    it("should format sharp9 alteration", () => {
      expect(getChordName("C", ["dom7", "sharp9"])).toBe("C7 ♯9");
    });

    it("should format sharp11 alteration", () => {
      expect(getChordName("C", ["dom7", "sharp11"])).toBe("C7 ♯11");
    });

    it("should format flat13 alteration", () => {
      expect(getChordName("C", ["dom7", "flat13"])).toBe("C7 ♭13");
    });

    it("should format multiple alterations", () => {
      const name = getChordName("C", ["dom7", "sharp9", "flat13"]);
      expect(name).toContain("♯9");
      expect(name).toContain("♭13");
    });

    it("should handle complex jazz chords", () => {
      expect(getChordName("C", ["dom7", "9", "sharp11"])).toBe("C9 ♯11");
    });
  });

  describe("getSimpleChordName", () => {
    it("should return empty string for null chord", () => {
      expect(getSimpleChordName(null)).toBe("");
      expect(getSimpleChordName({})).toBe("");
    });

    it("should return chord name from chord object", () => {
      const chord = { root: "C", modifiers: ["minor", "dom7"] };
      expect(getSimpleChordName(chord)).toBe("C min7");
    });
  });

  describe("formatNoteName", () => {
    it("should return empty string for null/undefined", () => {
      expect(formatNoteName(null)).toBe("");
      expect(formatNoteName(undefined)).toBe("");
    });

    it("should replace # with ♯", () => {
      expect(formatNoteName("C#")).toBe("C♯");
      expect(formatNoteName("F#")).toBe("F♯");
    });

    it("should replace b with ♭", () => {
      expect(formatNoteName("Bb")).toBe("B♭");
      expect(formatNoteName("Eb")).toBe("E♭");
    });

    it("should leave natural notes unchanged", () => {
      expect(formatNoteName("C")).toBe("C");
      expect(formatNoteName("A")).toBe("A");
    });
  });
});
