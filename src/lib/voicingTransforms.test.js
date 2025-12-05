import { describe, it, expect } from "vitest";
import { applyProgressiveDrop, applySpread } from "./voicingTransforms";

describe("voicingTransforms", () => {
  describe("applyProgressiveDrop", () => {
    it("should return original notes for dropCount 0", () => {
      const notes = [60, 64, 67, 71];
      expect(applyProgressiveDrop(notes, 0)).toEqual([60, 64, 67, 71]);
    });

    it("should return original notes for null/undefined", () => {
      expect(applyProgressiveDrop(null, 1)).toBe(null);
      expect(applyProgressiveDrop(undefined, 1)).toBe(undefined);
    });

    it("should return original notes for empty array", () => {
      expect(applyProgressiveDrop([], 1)).toEqual([]);
    });

    it("should drop highest note down an octave for dropCount 1", () => {
      const notes = [60, 64, 67, 71]; // C, E, G, B
      const result = applyProgressiveDrop(notes, 1);
      // B (71) should become 59, then sorted: [59, 60, 64, 67]
      expect(result).toEqual([59, 60, 64, 67]);
    });

    it("should drop two highest notes for dropCount 2", () => {
      const notes = [60, 64, 67, 71]; // C, E, G, B
      const result = applyProgressiveDrop(notes, 2);
      // G (67) -> 55, B (71) -> 59, sorted: [55, 59, 60, 64]
      expect(result).toEqual([55, 59, 60, 64]);
    });

    it("should not drop all notes (leave at least one in place)", () => {
      const notes = [60, 64, 67]; // 3 notes
      const result = applyProgressiveDrop(notes, 5); // More drops than notes
      // Should only drop 2 (notes.length - 1)
      expect(result.length).toBe(3);
    });

    it("should handle unsorted input", () => {
      const notes = [67, 60, 71, 64]; // Unsorted C, E, G, B
      const result = applyProgressiveDrop(notes, 1);
      expect(result).toEqual([59, 60, 64, 67]);
    });

    it("should create proper drop2 voicing", () => {
      // Drop2 moves 2nd from top down an octave
      const notes = [60, 64, 67, 71]; // C, E, G, B in close position
      const result = applyProgressiveDrop(notes, 1);
      // Result should have B dropped: [B-12, C, E, G] = [59, 60, 64, 67]
      expect(result[0]).toBe(59); // B dropped
      expect(result[1]).toBe(60); // C
      expect(result[2]).toBe(64); // E
      expect(result[3]).toBe(67); // G
    });
  });

  describe("applySpread", () => {
    it("should return original notes for spreadAmount 0", () => {
      const notes = [60, 64, 67, 71];
      expect(applySpread(notes, 0)).toEqual([60, 64, 67, 71]);
    });

    it("should return original notes for null/undefined", () => {
      expect(applySpread(null, 1)).toBe(null);
      expect(applySpread(undefined, 1)).toBe(undefined);
    });

    it("should return original notes for single note", () => {
      expect(applySpread([60], 1)).toEqual([60]);
    });

    it("should move alternating notes up by one octave for spread 1", () => {
      const notes = [60, 64, 67, 71]; // C, E, G, B
      const result = applySpread(notes, 1);
      // Indices 1 and 3 get +12: E->76, B->83
      // Sorted: [60, 67, 76, 83]
      expect(result).toEqual([60, 67, 76, 83]);
    });

    it("should move alternating notes up by two octaves for spread 2", () => {
      const notes = [60, 64, 67, 71];
      const result = applySpread(notes, 2);
      // Indices 1 and 3 get +24: E->88, B->95
      // Sorted: [60, 67, 88, 95]
      expect(result).toEqual([60, 67, 88, 95]);
    });

    it("should handle 3-note chords", () => {
      const notes = [60, 64, 67]; // C, E, G
      const result = applySpread(notes, 1);
      // Index 1 gets +12: E->76
      // Sorted: [60, 67, 76]
      expect(result).toEqual([60, 67, 76]);
    });

    it("should handle unsorted input", () => {
      const notes = [67, 60, 71, 64]; // Unsorted
      const result = applySpread(notes, 1);
      // After sorting: [60, 64, 67, 71], then spread indices 1,3
      // [60, 76, 67, 83] -> sorted: [60, 67, 76, 83]
      expect(result).toEqual([60, 67, 76, 83]);
    });

    it("should create open voicing with spread 3", () => {
      const notes = [60, 64, 67]; // C, E, G
      const result = applySpread(notes, 3);
      // Index 1 gets +36: E->100
      // Sorted: [60, 67, 100]
      expect(result).toEqual([60, 67, 100]);
    });
  });
});
