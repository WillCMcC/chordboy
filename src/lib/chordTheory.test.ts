import { describe, it, expect } from "vitest";
import {
  noteToMIDI,
  MIDIToNote,
  transpose,
  buildNotesFromIntervals,
  isValidMIDINote,
  getInterval,
  INTERVALS,
} from "./chordTheory";
import type { NoteNameWithFlats, Interval } from "../types";

describe("chordTheory", () => {
  describe("noteToMIDI", () => {
    it("should convert C4 (middle C) to MIDI 60", () => {
      expect(noteToMIDI("C", 4)).toBe(60);
    });

    it("should convert C#4 to MIDI 61", () => {
      expect(noteToMIDI("C#", 4)).toBe(61);
    });

    it("should convert A4 to MIDI 69 (concert A)", () => {
      expect(noteToMIDI("A", 4)).toBe(69);
    });

    it("should handle different octaves", () => {
      expect(noteToMIDI("C", 0)).toBe(12);
      expect(noteToMIDI("C", 5)).toBe(72);
      expect(noteToMIDI("C", 8)).toBe(108);
    });

    it("should handle flat notes (Db = C#)", () => {
      expect(noteToMIDI("Db", 4)).toBe(61);
      expect(noteToMIDI("Bb", 4)).toBe(70);
    });

    it("should clamp to valid MIDI range 0-127", () => {
      expect(noteToMIDI("C", 10)).toBeLessThanOrEqual(127);
    });

    it("should default to C4 for invalid note names", () => {
      expect(noteToMIDI("X" as NoteNameWithFlats, 4)).toBe(60);
    });
  });

  describe("MIDIToNote", () => {
    it("should convert MIDI 60 to C4", () => {
      expect(MIDIToNote(60)).toBe("C4");
    });

    it("should convert MIDI 69 to A4", () => {
      expect(MIDIToNote(69)).toBe("A4");
    });

    it("should handle sharps correctly", () => {
      expect(MIDIToNote(61)).toBe("C#4");
      expect(MIDIToNote(66)).toBe("F#4");
    });

    it("should handle different octaves", () => {
      expect(MIDIToNote(48)).toBe("C3");
      expect(MIDIToNote(72)).toBe("C5");
      expect(MIDIToNote(24)).toBe("C1");
    });
  });

  describe("transpose", () => {
    it("should transpose up by semitones", () => {
      expect(transpose(60, 7)).toBe(67); // C4 to G4
    });

    it("should transpose down by semitones", () => {
      expect(transpose(60, -12)).toBe(48); // C4 to C3
    });

    it("should clamp to minimum MIDI value 0", () => {
      expect(transpose(5, -10)).toBe(0);
    });

    it("should clamp to maximum MIDI value 127", () => {
      expect(transpose(120, 20)).toBe(127);
    });
  });

  describe("buildNotesFromIntervals", () => {
    it("should build a major triad", () => {
      const intervals: Interval[] = [INTERVALS.UNISON, INTERVALS.MAJOR_THIRD, INTERVALS.PERFECT_FIFTH];
      const notes = buildNotesFromIntervals("C", 4, intervals);
      expect(notes).toEqual([60, 64, 67]); // C, E, G
    });

    it("should build a minor triad", () => {
      const intervals: Interval[] = [INTERVALS.UNISON, INTERVALS.MINOR_THIRD, INTERVALS.PERFECT_FIFTH];
      const notes = buildNotesFromIntervals("A", 4, intervals);
      expect(notes).toEqual([69, 72, 76]); // A, C, E
    });

    it("should build a dominant 7th chord", () => {
      const intervals: Interval[] = [
        INTERVALS.UNISON,
        INTERVALS.MAJOR_THIRD,
        INTERVALS.PERFECT_FIFTH,
        INTERVALS.MINOR_SEVENTH,
      ];
      const notes = buildNotesFromIntervals("G", 4, intervals);
      expect(notes).toEqual([67, 71, 74, 77]); // G, B, D, F
    });
  });

  describe("isValidMIDINote", () => {
    it("should return true for valid MIDI notes (0-127)", () => {
      expect(isValidMIDINote(0)).toBe(true);
      expect(isValidMIDINote(60)).toBe(true);
      expect(isValidMIDINote(127)).toBe(true);
    });

    it("should return false for notes below 0", () => {
      expect(isValidMIDINote(-1)).toBe(false);
      expect(isValidMIDINote(-100)).toBe(false);
    });

    it("should return false for notes above 127", () => {
      expect(isValidMIDINote(128)).toBe(false);
      expect(isValidMIDINote(200)).toBe(false);
    });
  });

  describe("getInterval", () => {
    it("should return 0 for same notes", () => {
      expect(getInterval(60, 60)).toBe(0);
    });

    it("should return correct interval for ascending notes", () => {
      expect(getInterval(60, 67)).toBe(7); // C to G = perfect fifth
    });

    it("should return correct interval for descending notes", () => {
      expect(getInterval(67, 60)).toBe(7); // G to C = perfect fifth (absolute)
    });

    it("should calculate octave interval", () => {
      expect(getInterval(60, 72)).toBe(12);
    });
  });

  describe("INTERVALS constants", () => {
    it("should have correct semitone values for basic intervals", () => {
      expect(INTERVALS.UNISON).toBe(0);
      expect(INTERVALS.MINOR_SECOND).toBe(1);
      expect(INTERVALS.MAJOR_SECOND).toBe(2);
      expect(INTERVALS.MINOR_THIRD).toBe(3);
      expect(INTERVALS.MAJOR_THIRD).toBe(4);
      expect(INTERVALS.PERFECT_FOURTH).toBe(5);
      expect(INTERVALS.PERFECT_FIFTH).toBe(7);
      expect(INTERVALS.OCTAVE).toBe(12);
    });

    it("should have correct semitone values for seventh intervals", () => {
      expect(INTERVALS.MINOR_SEVENTH).toBe(10);
      expect(INTERVALS.MAJOR_SEVENTH).toBe(11);
    });

    it("should have correct semitone values for extended intervals", () => {
      expect(INTERVALS.MAJOR_NINTH).toBe(14);
      expect(INTERVALS.PERFECT_ELEVENTH).toBe(17);
      expect(INTERVALS.MAJOR_THIRTEENTH).toBe(21);
    });
  });
});
