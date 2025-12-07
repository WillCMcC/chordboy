import { describe, it, expect } from "vitest";
import {
  isBlackKey,
  getNoteName,
  generateKeyboard,
  getBlackKeyOffset,
} from "./pianoLayout";
import type { PianoKey } from "../types";

describe("pianoLayout", () => {
  describe("isBlackKey", () => {
    it("should return false for C (white key)", () => {
      expect(isBlackKey(60)).toBe(false); // C4
      expect(isBlackKey(48)).toBe(false); // C3
    });

    it("should return true for C# (black key)", () => {
      expect(isBlackKey(61)).toBe(true); // C#4
      expect(isBlackKey(49)).toBe(true); // C#3
    });

    it("should identify all white keys correctly", () => {
      // C, D, E, F, G, A, B are white (0, 2, 4, 5, 7, 9, 11)
      expect(isBlackKey(60)).toBe(false); // C
      expect(isBlackKey(62)).toBe(false); // D
      expect(isBlackKey(64)).toBe(false); // E
      expect(isBlackKey(65)).toBe(false); // F
      expect(isBlackKey(67)).toBe(false); // G
      expect(isBlackKey(69)).toBe(false); // A
      expect(isBlackKey(71)).toBe(false); // B
    });

    it("should identify all black keys correctly", () => {
      // C#, D#, F#, G#, A# are black (1, 3, 6, 8, 10)
      expect(isBlackKey(61)).toBe(true); // C#
      expect(isBlackKey(63)).toBe(true); // D#
      expect(isBlackKey(66)).toBe(true); // F#
      expect(isBlackKey(68)).toBe(true); // G#
      expect(isBlackKey(70)).toBe(true); // A#
    });
  });

  describe("getNoteName", () => {
    it("should return correct note name for middle C", () => {
      expect(getNoteName(60)).toBe("C4");
    });

    it("should return correct note name for A4 (concert A)", () => {
      expect(getNoteName(69)).toBe("A4");
    });

    it("should handle sharp notes", () => {
      expect(getNoteName(61)).toBe("C#4");
      expect(getNoteName(66)).toBe("F#4");
    });

    it("should handle different octaves", () => {
      expect(getNoteName(36)).toBe("C2");
      expect(getNoteName(84)).toBe("C6");
      expect(getNoteName(21)).toBe("A0");
    });
  });

  describe("generateKeyboard", () => {
    it("should generate keys for specified octave range", () => {
      const keys: PianoKey[] = generateKeyboard(4, 4);
      // One octave = 12 keys
      expect(keys.length).toBe(12);
    });

    it("should generate keys for multiple octaves", () => {
      const keys: PianoKey[] = generateKeyboard(3, 5);
      // 3 octaves = 36 keys
      expect(keys.length).toBe(36);
    });

    it("should include both black and white keys", () => {
      const keys: PianoKey[] = generateKeyboard(4, 4);
      const whiteKeys = keys.filter((k) => !k.isBlack);
      const blackKeys = keys.filter((k) => k.isBlack);
      expect(whiteKeys.length).toBe(7);
      expect(blackKeys.length).toBe(5);
    });

    it("should include MIDI numbers for each key", () => {
      const keys: PianoKey[] = generateKeyboard(4, 4);
      expect(keys[0].midi).toBe(60); // C4
      expect(keys[11].midi).toBe(71); // B4
    });

    it("should include note names for each key", () => {
      const keys: PianoKey[] = generateKeyboard(4, 4);
      expect(keys[0].noteName).toBe("C4");
      expect(keys[1].noteName).toBe("C#4");
    });

    it("should assign whiteKeyIndex to white keys", () => {
      const keys: PianoKey[] = generateKeyboard(4, 4);
      const cKey = keys.find((k) => k.midi === 60);
      const dKey = keys.find((k) => k.midi === 62);
      expect(cKey?.whiteKeyIndex).toBe(0);
      expect(dKey?.whiteKeyIndex).toBe(1);
    });
  });

  describe("getBlackKeyOffset", () => {
    it("should return offset for C#", () => {
      const offset = getBlackKeyOffset(61);
      expect(offset).toBeGreaterThan(0.5);
      expect(offset).toBeLessThanOrEqual(1);
    });

    it("should return offset for all black keys", () => {
      expect(getBlackKeyOffset(61)).toBe(0.7); // C#
      expect(getBlackKeyOffset(63)).toBe(0.7); // D#
      expect(getBlackKeyOffset(66)).toBe(0.65); // F#
      expect(getBlackKeyOffset(68)).toBe(0.6); // G#
      expect(getBlackKeyOffset(70)).toBe(0.6); // A#
    });

    it("should return default for non-black key positions", () => {
      expect(getBlackKeyOffset(60)).toBe(0.5); // C (not a black key)
    });
  });
});
