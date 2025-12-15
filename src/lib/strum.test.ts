/**
 * Unit tests for Strum Module
 * Tests strum timing offset generation for MIDI chord playback
 */

import { describe, it, expect } from "vitest";
import {
  getStrumOffsets,
  MAX_STRUM_SPREAD,
  STRUM_UP,
  STRUM_DOWN,
  STRUM_ALTERNATE,
} from "./strum";
import type { MIDINote } from "../types";

describe("Strum Module", () => {
  describe("Constants", () => {
    it("should export MAX_STRUM_SPREAD constant", () => {
      expect(MAX_STRUM_SPREAD).toBe(200);
    });

    it("should export strum direction constants", () => {
      expect(STRUM_UP).toBe("up");
      expect(STRUM_DOWN).toBe("down");
      expect(STRUM_ALTERNATE).toBe("alternate");
    });
  });

  describe("getStrumOffsets - Basic Functionality", () => {
    it("should return zero offsets when spreadMs is 0", () => {
      const notes: MIDINote[] = [60, 64, 67];
      const result = getStrumOffsets(notes, 0, STRUM_UP);

      expect(result.offsets).toEqual([0, 0, 0]);
      expect(result.nextDirection).toBe("up");
    });

    it("should return zero offsets for single note", () => {
      const notes: MIDINote[] = [60];
      const result = getStrumOffsets(notes, 100, STRUM_UP);

      expect(result.offsets).toEqual([0]);
      expect(result.nextDirection).toBe("up");
    });

    it("should return zero offsets for empty array", () => {
      const notes: MIDINote[] = [];
      const result = getStrumOffsets(notes, 100, STRUM_UP);

      expect(result.offsets).toEqual([]);
      expect(result.nextDirection).toBe("up");
    });

    it("should preserve lastDirection when spreadMs is 0", () => {
      const notes: MIDINote[] = [60, 64, 67];
      const result = getStrumOffsets(notes, 0, STRUM_UP, "down");

      expect(result.offsets).toEqual([0, 0, 0]);
      expect(result.nextDirection).toBe("down");
    });
  });

  describe("getStrumOffsets - Strum Up", () => {
    it("should strum up with evenly spaced offsets (low to high)", () => {
      const notes: MIDINote[] = [60, 64, 67]; // Sorted: [60, 64, 67]
      const result = getStrumOffsets(notes, 100, STRUM_UP);

      // 100ms spread over 3 notes = 50ms intervals
      // Low notes play first (0ms), high notes last (100ms)
      expect(result.offsets).toEqual([0, 50, 100]);
      expect(result.nextDirection).toBe("up");
    });

    it("should handle unsorted notes correctly for strum up", () => {
      const notes: MIDINote[] = [67, 60, 64]; // Unsorted
      const result = getStrumOffsets(notes, 100, STRUM_UP);

      // After sorting: [60, 64, 67]
      // 67 is at position 2, 60 at position 0, 64 at position 1
      expect(result.offsets).toEqual([100, 0, 50]);
      expect(result.nextDirection).toBe("up");
    });

    it("should handle duplicate notes for strum up", () => {
      const notes: MIDINote[] = [60, 60, 67];
      const result = getStrumOffsets(notes, 100, STRUM_UP);

      // Duplicates get the same position in sorted array
      expect(result.offsets.length).toBe(3);
      expect(result.nextDirection).toBe("up");
    });

    it("should calculate correct intervals with different spread values", () => {
      const notes: MIDINote[] = [60, 64, 67, 72];
      const result = getStrumOffsets(notes, 150, STRUM_UP);

      // 150ms spread over 4 notes = 50ms intervals
      expect(result.offsets).toEqual([0, 50, 100, 150]);
      expect(result.nextDirection).toBe("up");
    });
  });

  describe("getStrumOffsets - Strum Down", () => {
    it("should strum down with evenly spaced offsets (high to low)", () => {
      const notes: MIDINote[] = [60, 64, 67]; // Sorted: [60, 64, 67]
      const result = getStrumOffsets(notes, 100, STRUM_DOWN);

      // 100ms spread over 3 notes = 50ms intervals
      // High notes play first (0ms), low notes last (100ms)
      expect(result.offsets).toEqual([100, 50, 0]);
      expect(result.nextDirection).toBe("down");
    });

    it("should handle unsorted notes correctly for strum down", () => {
      const notes: MIDINote[] = [67, 60, 64]; // Unsorted
      const result = getStrumOffsets(notes, 100, STRUM_DOWN);

      // After sorting: [60, 64, 67]
      // 67 is at position 2 (plays first = 0ms)
      // 60 is at position 0 (plays last = 100ms)
      // 64 is at position 1 (plays middle = 50ms)
      expect(result.offsets).toEqual([0, 100, 50]);
      expect(result.nextDirection).toBe("down");
    });

    it("should calculate correct intervals with different spread values", () => {
      const notes: MIDINote[] = [60, 64, 67, 72];
      const result = getStrumOffsets(notes, 150, STRUM_DOWN);

      // 150ms spread over 4 notes = 50ms intervals
      expect(result.offsets).toEqual([150, 100, 50, 0]);
      expect(result.nextDirection).toBe("down");
    });
  });

  describe("getStrumOffsets - Alternate Direction", () => {
    it("should alternate from up to down", () => {
      const notes: MIDINote[] = [60, 64, 67];
      const result = getStrumOffsets(notes, 100, STRUM_ALTERNATE, "up");

      // Last direction was "up", so this should be "down"
      expect(result.offsets).toEqual([100, 50, 0]); // High to low
      expect(result.nextDirection).toBe("down");
    });

    it("should alternate from down to up", () => {
      const notes: MIDINote[] = [60, 64, 67];
      const result = getStrumOffsets(notes, 100, STRUM_ALTERNATE, "down");

      // Last direction was "down", so this should be "up"
      expect(result.offsets).toEqual([0, 50, 100]); // Low to high
      expect(result.nextDirection).toBe("up");
    });

    it("should default to up when no lastDirection provided", () => {
      const notes: MIDINote[] = [60, 64, 67];
      const result = getStrumOffsets(notes, 100, STRUM_ALTERNATE);

      // Default lastDirection is "up", so this should alternate to "down"
      expect(result.offsets).toEqual([100, 50, 0]); // High to low
      expect(result.nextDirection).toBe("down");
    });

    it("should maintain alternation across multiple calls", () => {
      const notes: MIDINote[] = [60, 64, 67];

      // First strum: alternates from "up" to "down"
      const result1 = getStrumOffsets(notes, 100, STRUM_ALTERNATE, "up");
      expect(result1.nextDirection).toBe("down");

      // Second strum: uses result1.nextDirection, alternates to "up"
      const result2 = getStrumOffsets(
        notes,
        100,
        STRUM_ALTERNATE,
        result1.nextDirection,
      );
      expect(result2.nextDirection).toBe("up");

      // Third strum: alternates back to "down"
      const result3 = getStrumOffsets(
        notes,
        100,
        STRUM_ALTERNATE,
        result2.nextDirection,
      );
      expect(result3.nextDirection).toBe("down");
    });
  });

  describe("getStrumOffsets - Edge Cases", () => {
    it("should handle very small spread values", () => {
      const notes: MIDINote[] = [60, 64, 67];
      const result = getStrumOffsets(notes, 1, STRUM_UP);

      // 1ms spread over 3 notes = 0.5ms intervals
      expect(result.offsets).toEqual([0, 0.5, 1]);
      expect(result.nextDirection).toBe("up");
    });

    it("should handle maximum spread value", () => {
      const notes: MIDINote[] = [60, 64, 67];
      const result = getStrumOffsets(notes, MAX_STRUM_SPREAD, STRUM_UP);

      // 200ms spread over 3 notes = 100ms intervals
      expect(result.offsets).toEqual([0, 100, 200]);
      expect(result.nextDirection).toBe("up");
    });

    it("should handle two-note chord", () => {
      const notes: MIDINote[] = [60, 67];
      const result = getStrumOffsets(notes, 100, STRUM_UP);

      // 100ms spread over 2 notes
      expect(result.offsets).toEqual([0, 100]);
      expect(result.nextDirection).toBe("up");
    });

    it("should handle large chord (8 notes)", () => {
      const notes: MIDINote[] = [60, 62, 64, 65, 67, 69, 71, 72];
      const result = getStrumOffsets(notes, 140, STRUM_UP);

      // 140ms spread over 8 notes = 20ms intervals
      expect(result.offsets).toEqual([0, 20, 40, 60, 80, 100, 120, 140]);
      expect(result.nextDirection).toBe("up");
    });

    it("should handle notes spanning multiple octaves", () => {
      const notes: MIDINote[] = [36, 60, 84]; // C1, C3, C5
      const result = getStrumOffsets(notes, 100, STRUM_UP);

      expect(result.offsets).toEqual([0, 50, 100]);
      expect(result.nextDirection).toBe("up");
    });

    it("should return consistent results for the same input", () => {
      const notes: MIDINote[] = [60, 64, 67];

      const result1 = getStrumOffsets(notes, 100, STRUM_UP);
      const result2 = getStrumOffsets(notes, 100, STRUM_UP);

      expect(result1.offsets).toEqual(result2.offsets);
      expect(result1.nextDirection).toEqual(result2.nextDirection);
    });
  });

  describe("getStrumOffsets - Direction State Management", () => {
    it("should preserve direction for non-alternate modes", () => {
      const notes: MIDINote[] = [60, 64, 67];

      const result1 = getStrumOffsets(notes, 100, STRUM_UP, "down");
      expect(result1.nextDirection).toBe("up");

      const result2 = getStrumOffsets(notes, 100, STRUM_DOWN, "up");
      expect(result2.nextDirection).toBe("down");
    });

    it("should ignore lastDirection for non-alternate modes", () => {
      const notes: MIDINote[] = [60, 64, 67];

      // lastDirection is "down" but mode is explicitly "up"
      const result = getStrumOffsets(notes, 100, STRUM_UP, "down");

      expect(result.offsets).toEqual([0, 50, 100]); // Still strums up
      expect(result.nextDirection).toBe("up");
    });
  });

  describe("getStrumOffsets - Mathematical Precision", () => {
    it("should distribute offsets evenly across note range", () => {
      const notes: MIDINote[] = [60, 64, 67, 72, 76];
      const spreadMs = 100;
      const result = getStrumOffsets(notes, spreadMs, STRUM_UP);

      // Verify even intervals
      const interval = spreadMs / (notes.length - 1);
      const expectedOffsets = notes
        .map((_, i) => i * interval)
        .sort((a, b) => a - b);

      expect(result.offsets).toEqual(expectedOffsets);
    });

    it("should handle floating-point spread values correctly", () => {
      const notes: MIDINote[] = [60, 64, 67];
      const result = getStrumOffsets(notes, 99.5, STRUM_UP);

      // 99.5ms spread over 3 notes = 49.75ms intervals
      expect(result.offsets).toEqual([0, 49.75, 99.5]);
    });
  });

  describe("getStrumOffsets - Real-world Scenarios", () => {
    it("should handle C major triad strum up", () => {
      const notes: MIDINote[] = [60, 64, 67]; // C, E, G
      const result = getStrumOffsets(notes, 80, STRUM_UP);

      expect(result.offsets).toEqual([0, 40, 80]);
      expect(result.nextDirection).toBe("up");
    });

    it("should handle jazz voicing with altered notes", () => {
      const notes: MIDINote[] = [48, 55, 59, 64, 68]; // Complex jazz chord
      const result = getStrumOffsets(notes, 120, STRUM_DOWN);

      // High to low: [68, 64, 59, 55, 48]
      expect(result.offsets).toEqual([120, 90, 60, 30, 0]);
      expect(result.nextDirection).toBe("down");
    });

    it("should handle quick strum for guitar-like effect", () => {
      const notes: MIDINote[] = [40, 47, 52, 55, 59, 64]; // Guitar-like voicing
      const result = getStrumOffsets(notes, 50, STRUM_UP);

      // 50ms spread over 6 notes = 10ms intervals
      expect(result.offsets).toEqual([0, 10, 20, 30, 40, 50]);
      expect(result.nextDirection).toBe("up");
    });
  });
});
