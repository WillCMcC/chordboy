import { describe, it, expect } from "vitest";
import {
  buildChord,
  invertChord,
  getInversionCount,
  spreadVoicing,
} from "./chordBuilder";

describe("chordBuilder", () => {
  describe("buildChord", () => {
    it("should return null for no root", () => {
      expect(buildChord(null)).toBe(null);
      expect(buildChord(undefined)).toBe(null);
    });

    it("should build a C major triad", () => {
      const chord = buildChord("C", [], { octave: 4 });
      expect(chord.root).toBe("C");
      expect(chord.quality).toBe("major");
      expect(chord.notes).toEqual([60, 64, 67]); // C, E, G
    });

    it("should build a C minor triad", () => {
      const chord = buildChord("C", ["minor"], { octave: 4 });
      expect(chord.quality).toBe("minor");
      expect(chord.notes).toEqual([60, 63, 67]); // C, Eb, G
    });

    it("should build a C diminished triad", () => {
      const chord = buildChord("C", ["diminished"], { octave: 4 });
      expect(chord.quality).toBe("diminished");
      expect(chord.notes).toEqual([60, 63, 66]); // C, Eb, Gb
    });

    it("should build a C augmented triad", () => {
      const chord = buildChord("C", ["augmented"], { octave: 4 });
      expect(chord.quality).toBe("augmented");
      expect(chord.notes).toEqual([60, 64, 68]); // C, E, G#
    });

    it("should build a C sus2 chord", () => {
      const chord = buildChord("C", ["sus2"], { octave: 4 });
      expect(chord.quality).toBe("sus2");
      expect(chord.notes).toEqual([60, 62, 67]); // C, D, G
    });

    it("should build a C sus4 chord", () => {
      const chord = buildChord("C", ["sus4"], { octave: 4 });
      expect(chord.quality).toBe("sus4");
      expect(chord.notes).toEqual([60, 65, 67]); // C, F, G
    });

    it("should build a C dominant 7th chord", () => {
      const chord = buildChord("C", ["dom7"], { octave: 4 });
      expect(chord.notes).toEqual([60, 64, 67, 70]); // C, E, G, Bb
    });

    it("should build a C major 7th chord", () => {
      const chord = buildChord("C", ["maj7"], { octave: 4 });
      expect(chord.notes).toEqual([60, 64, 67, 71]); // C, E, G, B
    });

    it("should build a C minor 7th chord", () => {
      const chord = buildChord("C", ["minor", "dom7"], { octave: 4 });
      expect(chord.notes).toEqual([60, 63, 67, 70]); // C, Eb, G, Bb
    });

    it("should build a C6 chord", () => {
      const chord = buildChord("C", ["6"], { octave: 4 });
      expect(chord.notes).toContain(69); // A (major 6th)
    });

    it("should build a C9 chord", () => {
      const chord = buildChord("C", ["dom7", "9"], { octave: 4 });
      expect(chord.notes).toContain(74); // D (major 9th)
    });

    it("should build a C11 chord", () => {
      const chord = buildChord("C", ["dom7", "11"], { octave: 4 });
      expect(chord.notes).toContain(77); // F (perfect 11th)
    });

    it("should build a C13 chord", () => {
      const chord = buildChord("C", ["dom7", "13"], { octave: 4 });
      expect(chord.notes).toContain(81); // A (major 13th)
    });

    it("should handle flat5 alteration", () => {
      const chord = buildChord("C", ["flat5"], { octave: 4 });
      expect(chord.notes).toContain(66); // Gb instead of G
      expect(chord.notes).not.toContain(67); // No G
    });

    it("should handle sharp9 alteration", () => {
      const chord = buildChord("C", ["dom7", "sharp9"], { octave: 4 });
      expect(chord.notes).toContain(75); // D# (augmented 9th)
    });

    it("should handle flat9 alteration", () => {
      const chord = buildChord("C", ["dom7", "flat9"], { octave: 4 });
      expect(chord.notes).toContain(73); // Db (minor 9th)
    });

    it("should handle sharp11 alteration", () => {
      const chord = buildChord("C", ["dom7", "sharp11"], { octave: 4 });
      expect(chord.notes).toContain(78); // F# (augmented 11th)
    });

    it("should handle different octaves", () => {
      const chord3 = buildChord("C", [], { octave: 3 });
      const chord5 = buildChord("C", [], { octave: 5 });
      expect(chord3.notes[0]).toBe(48); // C3
      expect(chord5.notes[0]).toBe(72); // C5
    });

    it("should remove duplicate intervals", () => {
      const chord = buildChord("C", [], { octave: 4 });
      const uniqueNotes = [...new Set(chord.notes)];
      expect(chord.notes.length).toBe(uniqueNotes.length);
    });

    it("should build diminished 7th chord correctly", () => {
      const chord = buildChord("C", ["diminished", "dom7"], { octave: 4 });
      expect(chord.notes).toContain(69); // Diminished 7th = A (9 semitones)
    });
  });

  describe("invertChord", () => {
    it("should return original notes for inversion 0", () => {
      const notes = [60, 64, 67];
      expect(invertChord(notes, 0)).toEqual([60, 64, 67]);
    });

    it("should handle empty array", () => {
      expect(invertChord([], 1)).toEqual([]);
    });

    it("should handle null/undefined", () => {
      expect(invertChord(null, 1)).toBe(null);
      expect(invertChord(undefined, 1)).toBe(undefined);
    });

    it("should create first inversion (move root up an octave)", () => {
      const notes = [60, 64, 67]; // C, E, G
      const inverted = invertChord(notes, 1);
      expect(inverted).toEqual([64, 67, 72]); // E, G, C
    });

    it("should create second inversion", () => {
      const notes = [60, 64, 67]; // C, E, G
      const inverted = invertChord(notes, 2);
      expect(inverted).toEqual([67, 72, 76]); // G, C, E
    });

    it("should wrap around for inversions beyond note count", () => {
      const notes = [60, 64, 67]; // 3 notes
      const inverted = invertChord(notes, 3); // 3 % 3 = 0, back to root position
      expect(inverted).toEqual([60, 64, 67]); // Same as original (root position)
    });

    it("should handle 4-note chords", () => {
      const notes = [60, 64, 67, 71]; // C, E, G, B
      const inverted = invertChord(notes, 1);
      expect(inverted).toEqual([64, 67, 71, 72]); // E, G, B, C
    });
  });

  describe("getInversionCount", () => {
    it("should return 0 for empty array", () => {
      expect(getInversionCount([])).toBe(0);
    });

    it("should return 0 for null", () => {
      expect(getInversionCount(null)).toBe(0);
    });

    it("should return note count as inversion count", () => {
      expect(getInversionCount([60, 64, 67])).toBe(3);
      expect(getInversionCount([60, 64, 67, 71])).toBe(4);
    });
  });

  describe("spreadVoicing", () => {
    it("should return original notes for chords with less than 4 notes", () => {
      const notes = [60, 64, 67];
      expect(spreadVoicing(notes, "drop2")).toEqual([60, 64, 67]);
    });

    it("should apply drop2 voicing correctly", () => {
      const notes = [60, 64, 67, 71]; // C, E, G, B
      const spread = spreadVoicing(notes, "drop2");
      // Drop2 moves 2nd from top (G) down an octave
      expect(spread).toEqual([55, 60, 64, 71]); // G-12, C, E, B
    });

    it("should apply drop3 voicing correctly", () => {
      const notes = [60, 64, 67, 71]; // C, E, G, B
      const spread = spreadVoicing(notes, "drop3");
      // Drop3 moves 3rd from top (E) down an octave
      expect(spread).toEqual([52, 60, 67, 71]); // E-12, C, G, B
    });

    it("should return original notes for unknown voicing type", () => {
      const notes = [60, 64, 67, 71];
      expect(spreadVoicing(notes, "unknown")).toEqual([60, 64, 67, 71]);
    });
  });
});
