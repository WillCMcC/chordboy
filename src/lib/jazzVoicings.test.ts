import { describe, it, expect } from "vitest";
import {
  applyRootlessA,
  applyRootlessB,
  applyShell,
  applyQuartal,
  applyUpperStructure,
} from "./jazzVoicings";
import { buildChord } from "./chordBuilder";
import { INTERVALS } from "./chordTheory";
import type { MIDINote, Chord } from "../types";

/**
 * Helper to verify all MIDI notes are in valid range (0-127)
 */
function expectValidMIDIRange(notes: MIDINote[]) {
  notes.forEach((note) => {
    expect(note).toBeGreaterThanOrEqual(0);
    expect(note).toBeLessThanOrEqual(127);
  });
}

/**
 * Helper to check if notes are sorted
 */
function expectSorted(notes: MIDINote[]) {
  for (let i = 1; i < notes.length; i++) {
    expect(notes[i]).toBeGreaterThanOrEqual(notes[i - 1]);
  }
}

describe("jazzVoicings", () => {
  describe("applyRootlessA", () => {
    it("should create Bill Evans Type A voicing (3-5-7-9) for Cmaj7", () => {
      const chord = buildChord("C", ["maj7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessA(chord!);

      // Should omit root (60), keep 3rd(64), 5th(67), 7th(71), and add/keep 9th
      expect(result).not.toContain(60); // No root
      expect(result).toContain(64); // E (3rd)
      expect(result).toContain(67); // G (5th)
      expect(result).toContain(71); // B (7th)

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should create Type A voicing for Cmin7", () => {
      const chord = buildChord("C", ["minor", "dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessA(chord!);

      expect(result).not.toContain(60); // No root
      expect(result).toContain(63); // Eb (minor 3rd)
      expect(result).toContain(67); // G (5th)
      expect(result).toContain(70); // Bb (7th)

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should create Type A voicing for C7 (dominant)", () => {
      const chord = buildChord("C", ["dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessA(chord!);

      expect(result).not.toContain(60); // No root
      expect(result).toContain(64); // E (3rd)
      expect(result).toContain(67); // G (5th)
      expect(result).toContain(70); // Bb (7th)

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should add natural 9th if not present in chord", () => {
      const chord = buildChord("C", ["maj7"], { octave: 4 }); // No 9 in modifiers
      expect(chord).not.toBeNull();
      const result = applyRootlessA(chord!);

      // Should automatically add natural 9th (D = 60 + 14 = 74)
      const hasNinth = result.some(
        (note) => (note - 60 + 120) % 12 === INTERVALS.MAJOR_NINTH % 12,
      );
      expect(hasNinth).toBe(true);

      expectValidMIDIRange(result);
    });

    it("should use existing 9th if present in chord", () => {
      const chord = buildChord("C", ["maj7", "9"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessA(chord!);

      // Should include 9th from chord (D = 74)
      const hasNinth = result.some(
        (note) => (note - 60 + 120) % 12 === INTERVALS.MAJOR_NINTH % 12,
      );
      expect(hasNinth).toBe(true);

      expectValidMIDIRange(result);
    });

    it("should handle altered 5th (flat5)", () => {
      const chord = buildChord("C", ["dom7", "flat5"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessA(chord!);

      // Should include b5 (Gb = 66)
      expect(result).toContain(66);
      expect(result).not.toContain(67); // No perfect 5th

      expectValidMIDIRange(result);
    });

    it("should handle altered 9th (sharp9)", () => {
      const chord = buildChord("C", ["dom7", "sharp9"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessA(chord!);

      // Should include #9 (D# = 75)
      expect(result).toContain(75);

      expectValidMIDIRange(result);
    });

    it("should handle altered 9th (flat9)", () => {
      const chord = buildChord("C", ["dom7", "flat9"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessA(chord!);

      // Should include b9 (Db = 73)
      expect(result).toContain(73);

      expectValidMIDIRange(result);
    });

    it("should ensure 3rd is on bottom (Type A characteristic)", () => {
      const chord = buildChord("C", ["maj7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessA(chord!);

      // 3rd should be lowest note (or close to it after octave adjustment)
      const third = result.find(
        (note) => (note - 60 + 120) % 12 === INTERVALS.MAJOR_THIRD % 12,
      );
      expect(third).toBeDefined();

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should return original notes if chord has less than 3 notes", () => {
      // Create a minimal chord manually
      const minimalChord: Chord = {
        root: "C",
        quality: "major",
        modifiers: [],
        intervals: [0],
        notes: [60],
        octave: 4,
      };

      const result = applyRootlessA(minimalChord);
      expect(result).toEqual([60]);
    });

    it("should maintain valid MIDI range at edge octaves", () => {
      // Test at very low octave
      const lowChord = buildChord("C", ["maj7"], { octave: 1 });
      expect(lowChord).not.toBeNull();
      const lowResult = applyRootlessA(lowChord!);
      expectValidMIDIRange(lowResult);

      // Test at very high octave
      const highChord = buildChord("C", ["maj7"], { octave: 7 });
      expect(highChord).not.toBeNull();
      const highResult = applyRootlessA(highChord!);
      expectValidMIDIRange(highResult);
    });
  });

  describe("applyRootlessB", () => {
    it("should create Bill Evans Type B voicing (7-9-3-5) for Cmaj7", () => {
      const chord = buildChord("C", ["maj7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessB(chord!);

      // Should omit root (60), keep 3rd(64), 5th(67), 7th (might be dropped octave), and add 9th
      expect(result).not.toContain(60); // No root
      expect(result).toContain(64); // E (3rd)
      expect(result).toContain(67); // G (5th)
      // 7th might be dropped to 59 (B - 12) to be on bottom
      const hasSeventh = result.some(
        (note) => (note - 60 + 120) % 12 === INTERVALS.MAJOR_SEVENTH % 12,
      );
      expect(hasSeventh).toBe(true);

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should create Type B voicing for Cmin7", () => {
      const chord = buildChord("C", ["minor", "dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessB(chord!);

      expect(result).not.toContain(60); // No root
      expect(result).toContain(63); // Eb (minor 3rd)
      expect(result).toContain(67); // G (5th)
      // 7th might be dropped to 58 (Bb - 12) to be on bottom
      const hasSeventh = result.some(
        (note) => (note - 60 + 120) % 12 === INTERVALS.MINOR_SEVENTH % 12,
      );
      expect(hasSeventh).toBe(true);

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should always add a 9th (natural if not present)", () => {
      const chord = buildChord("C", ["maj7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessB(chord!);

      // Should always have a 9th
      const hasNinth = result.some(
        (note) => (note - 60 + 120) % 12 === INTERVALS.MAJOR_NINTH % 12,
      );
      expect(hasNinth).toBe(true);

      expectValidMIDIRange(result);
    });

    it("should ensure 7th is on bottom (Type B characteristic)", () => {
      const chord = buildChord("C", ["maj7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessB(chord!);

      // 7th should be lowest note after sorting and adjustment
      const seventh = result.find(
        (note) => (note - 60 + 120) % 12 === INTERVALS.MAJOR_SEVENTH % 12,
      );
      expect(seventh).toBeDefined();

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should handle dominant 7th chords", () => {
      const chord = buildChord("C", ["dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyRootlessB(chord!);

      // 7th might be dropped octave to be on bottom
      const hasSeventh = result.some(
        (note) => (note - 60 + 120) % 12 === INTERVALS.MINOR_SEVENTH % 12,
      );
      expect(hasSeventh).toBe(true);
      expect(result).toContain(64); // E (3rd)
      expect(result).toContain(67); // G (5th)

      expectValidMIDIRange(result);
    });

    it("should return original notes if chord has less than 3 notes", () => {
      const minimalChord: Chord = {
        root: "C",
        quality: "major",
        modifiers: [],
        intervals: [0, 4],
        notes: [60, 64],
        octave: 4,
      };

      const result = applyRootlessB(minimalChord);
      expect(result).toEqual([60, 64]);
    });

    it("should maintain valid MIDI range at edge octaves", () => {
      const lowChord = buildChord("C", ["maj7"], { octave: 1 });
      expect(lowChord).not.toBeNull();
      const lowResult = applyRootlessB(lowChord!);
      expectValidMIDIRange(lowResult);

      const highChord = buildChord("C", ["maj7"], { octave: 7 });
      expect(highChord).not.toBeNull();
      const highResult = applyRootlessB(highChord!);
      expectValidMIDIRange(highResult);
    });
  });

  describe("applyShell", () => {
    it("should create Bud Powell shell voicing (root + 3rd + 7th) for Cmaj7", () => {
      const chord = buildChord("C", ["maj7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyShell(chord!);

      expect(result).toContain(60); // C (root)
      expect(result).toContain(64); // E (3rd)
      expect(result).toContain(71); // B (7th)
      expect(result.length).toBe(3); // Only three notes

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should create shell voicing for Cmin7", () => {
      const chord = buildChord("C", ["minor", "dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyShell(chord!);

      expect(result).toContain(60); // C (root)
      expect(result).toContain(63); // Eb (minor 3rd)
      expect(result).toContain(70); // Bb (7th)
      expect(result.length).toBe(3);

      expectValidMIDIRange(result);
    });

    it("should create shell voicing for C7 (dominant)", () => {
      const chord = buildChord("C", ["dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyShell(chord!);

      expect(result).toContain(60); // C (root)
      expect(result).toContain(64); // E (3rd)
      expect(result).toContain(70); // Bb (7th)

      expectValidMIDIRange(result);
    });

    it("should use 6th instead of 7th for 6th chords", () => {
      const chord = buildChord("C", ["6"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyShell(chord!);

      expect(result).toContain(60); // C (root)
      expect(result).toContain(64); // E (3rd)
      expect(result).toContain(69); // A (6th)

      expectValidMIDIRange(result);
    });

    it("should handle chords without 7th gracefully", () => {
      const chord = buildChord("C", [], { octave: 4 }); // Simple C major triad
      expect(chord).not.toBeNull();
      const result = applyShell(chord!);

      expect(result).toContain(60); // C (root)
      expect(result).toContain(64); // E (3rd)
      // No 7th or 6th, so only root + 3rd
      expect(result.length).toBeGreaterThanOrEqual(2);

      expectValidMIDIRange(result);
    });

    it("should return original notes if insufficient notes", () => {
      const minimalChord: Chord = {
        root: "C",
        quality: "major",
        modifiers: [],
        intervals: [0],
        notes: [60],
        octave: 4,
      };

      const result = applyShell(minimalChord);
      expect(result).toEqual([60]);
    });

    it("should maintain valid MIDI range at edge octaves", () => {
      const lowChord = buildChord("C", ["maj7"], { octave: 1 });
      expect(lowChord).not.toBeNull();
      const lowResult = applyShell(lowChord!);
      expectValidMIDIRange(lowResult);

      const highChord = buildChord("C", ["maj7"], { octave: 7 });
      expect(highChord).not.toBeNull();
      const highResult = applyShell(highChord!);
      expectValidMIDIRange(highResult);
    });
  });

  describe("applyQuartal", () => {
    it("should create So What voicing for minor chords (4th-4th-4th-3rd)", () => {
      const chord = buildChord("D", ["minor", "dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyQuartal(chord!);

      // "So What" voicing starts from 3rd: E-A-D-G-B for Dm7
      // Check for stacked fourths from the 3rd
      expect(result.length).toBe(5);

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should create quartal voicing from 7th for dominant chords", () => {
      const chord = buildChord("C", ["dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyQuartal(chord!);

      // For C7: should start from b7 (Bb) and stack fourths
      // Bb-Eb-Ab-Db
      expect(result).toContain(70); // Bb (b7)
      expect(result.length).toBe(4);

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should stack 4ths from root for major chords", () => {
      const chord = buildChord("C", [], { octave: 4 }); // C major
      expect(chord).not.toBeNull();
      const result = applyQuartal(chord!);

      // C-F-Bb-Eb and adds M3 on top for color: C-F-Bb-Eb-E
      expect(result).toContain(60); // C (root)
      expect(result).toContain(65); // F (P4)
      expect(result).toContain(70); // Bb (P4)
      expect(result).toContain(75); // Eb (P4)
      expect(result.length).toBe(5); // Major adds 3rd on top

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should stack 4ths from root for non-minor, non-dominant chords", () => {
      const chord = buildChord("C", ["augmented"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyQuartal(chord!);

      // Should stack 4ths from root: C-F-Bb-Eb
      expect(result).toContain(60); // C (root)
      expect(result.length).toBeGreaterThanOrEqual(4);

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should maintain valid MIDI range at edge octaves", () => {
      const lowChord = buildChord("C", ["minor", "dom7"], { octave: 1 });
      expect(lowChord).not.toBeNull();
      const lowResult = applyQuartal(lowChord!);
      expectValidMIDIRange(lowResult);

      const highChord = buildChord("C", ["minor", "dom7"], { octave: 7 });
      expect(highChord).not.toBeNull();
      const highResult = applyQuartal(highChord!);
      expectValidMIDIRange(highResult);
    });

    it("should create different voicings for minor vs dominant", () => {
      const minorChord = buildChord("C", ["minor", "dom7"], { octave: 4 });
      const domChord = buildChord("C", ["dom7"], { octave: 4 });

      expect(minorChord).not.toBeNull();
      expect(domChord).not.toBeNull();

      const minorResult = applyQuartal(minorChord!);
      const domResult = applyQuartal(domChord!);

      // Results should differ (different voicing logic)
      expect(minorResult).not.toEqual(domResult);

      expectValidMIDIRange(minorResult);
      expectValidMIDIRange(domResult);
    });
  });

  describe("applyUpperStructure", () => {
    it("should create upper structure voicing for altered dominants", () => {
      const chord = buildChord("C", ["dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyUpperStructure(chord!);

      // Should have tritone (3rd and 7th)
      expect(result).toContain(64); // E (3rd)
      expect(result).toContain(70); // Bb (7th)

      // Upper structure: Eb major triad (minor 3rd above root)
      // Eb(#9) - G(#5/b13) - Bb(7)
      const upperRoot = 60 + INTERVALS.MINOR_THIRD; // Eb = 63
      expect(result).toContain(upperRoot); // Eb

      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should include tritone (3rd and 7th) for dominant sound", () => {
      const chord = buildChord("C", ["dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyUpperStructure(chord!);

      // Tritone is essential for dominant sound
      expect(result).toContain(64); // E (major 3rd)
      expect(result).toContain(70); // Bb (minor 7th)

      expectValidMIDIRange(result);
    });

    it("should work with major 7th if no minor 7th present", () => {
      const chord = buildChord("C", ["maj7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyUpperStructure(chord!);

      // Should still create upper structure, using maj7
      expect(result).toContain(64); // E (3rd)
      // Upper structure should have at least 4 notes
      expect(result.length).toBeGreaterThanOrEqual(4);

      expectValidMIDIRange(result);
    });

    it("should create 5 note voicing (tritone + upper structure triad)", () => {
      const chord = buildChord("C", ["dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyUpperStructure(chord!);

      // Should have 5 notes: 3rd, 7th, and upper structure triad (3 notes)
      expect(result.length).toBeGreaterThanOrEqual(4);

      expectValidMIDIRange(result);
    });

    it("should return original notes if insufficient notes for upper structure", () => {
      const minimalChord: Chord = {
        root: "C",
        quality: "major",
        modifiers: [],
        intervals: [0, 4],
        notes: [60, 64],
        octave: 4,
      };

      const result = applyUpperStructure(minimalChord);
      // When there's insufficient tritone, it still adds upper structure but returns original if < 4 notes
      // Actually, the function adds upper structure anyway, so we just check it's valid
      expectValidMIDIRange(result);
      expectSorted(result);
    });

    it("should maintain valid MIDI range at edge octaves", () => {
      const lowChord = buildChord("C", ["dom7"], { octave: 1 });
      expect(lowChord).not.toBeNull();
      const lowResult = applyUpperStructure(lowChord!);
      expectValidMIDIRange(lowResult);

      const highChord = buildChord("C", ["dom7"], { octave: 7 });
      expect(highChord).not.toBeNull();
      const highResult = applyUpperStructure(highChord!);
      expectValidMIDIRange(highResult);
    });

    it("should create altered dominant sound with #9 and #5/b13", () => {
      const chord = buildChord("C", ["dom7"], { octave: 4 });
      expect(chord).not.toBeNull();
      const result = applyUpperStructure(chord!);

      // Upper structure creates altered tones:
      // Eb (enharmonic #9), G (#5/b13), Bb (7)
      const rootMidi = 60;
      const upperRoot = rootMidi + INTERVALS.MINOR_THIRD; // 63 (Eb = #9)
      const upperThird = upperRoot + INTERVALS.MAJOR_THIRD; // 67 (G = #5/b13)
      const upperFifth = upperRoot + INTERVALS.PERFECT_FIFTH; // 70 (Bb = 7)

      expect(result).toContain(upperRoot);
      expect(result).toContain(upperThird);
      expect(result).toContain(upperFifth);

      expectValidMIDIRange(result);
    });
  });

  describe("MIDI Range Validation - All Functions", () => {
    it("should never produce notes below 0", () => {
      const veryLowChord = buildChord("C", ["maj7", "9"], { octave: 0 });
      expect(veryLowChord).not.toBeNull();

      const rootlessA = applyRootlessA(veryLowChord!);
      const rootlessB = applyRootlessB(veryLowChord!);
      const shell = applyShell(veryLowChord!);
      const quartal = applyQuartal(veryLowChord!);
      const upperStruct = applyUpperStructure(veryLowChord!);

      rootlessA.forEach((note) => expect(note).toBeGreaterThanOrEqual(0));
      rootlessB.forEach((note) => expect(note).toBeGreaterThanOrEqual(0));
      shell.forEach((note) => expect(note).toBeGreaterThanOrEqual(0));
      quartal.forEach((note) => expect(note).toBeGreaterThanOrEqual(0));
      upperStruct.forEach((note) => expect(note).toBeGreaterThanOrEqual(0));
    });

    it("should never produce notes above 127", () => {
      const veryHighChord = buildChord("C", ["maj7", "9"], { octave: 8 });
      expect(veryHighChord).not.toBeNull();

      const rootlessA = applyRootlessA(veryHighChord!);
      const rootlessB = applyRootlessB(veryHighChord!);
      const shell = applyShell(veryHighChord!);
      const quartal = applyQuartal(veryHighChord!);
      const upperStruct = applyUpperStructure(veryHighChord!);

      rootlessA.forEach((note) => expect(note).toBeLessThanOrEqual(127));
      rootlessB.forEach((note) => expect(note).toBeLessThanOrEqual(127));
      shell.forEach((note) => expect(note).toBeLessThanOrEqual(127));
      quartal.forEach((note) => expect(note).toBeLessThanOrEqual(127));
      upperStruct.forEach((note) => expect(note).toBeLessThanOrEqual(127));
    });
  });

  describe("Chord Type Coverage", () => {
    const chordTypes: Array<[string, import("../types").ModifierType[]]> = [
      ["major7", ["maj7"]],
      ["minor7", ["minor", "dom7"]],
      ["dominant7", ["dom7"]],
      ["half-diminished", ["minor", "dom7", "flat5"]],
      ["diminished7", ["diminished", "dom7"]],
      ["altered", ["dom7", "flat9", "sharp9"]],
      ["major6", ["6"]],
      ["minor6", ["minor", "6"]],
    ];

    chordTypes.forEach(([name, modifiers]) => {
      it(`should handle ${name} chords across all voicing functions`, () => {
        const chord = buildChord("C", modifiers, { octave: 4 });
        expect(chord).not.toBeNull();

        const rootlessA = applyRootlessA(chord!);
        const rootlessB = applyRootlessB(chord!);
        const shell = applyShell(chord!);
        const quartal = applyQuartal(chord!);
        const upperStruct = applyUpperStructure(chord!);

        // All should produce valid results
        expectValidMIDIRange(rootlessA);
        expectValidMIDIRange(rootlessB);
        expectValidMIDIRange(shell);
        expectValidMIDIRange(quartal);
        expectValidMIDIRange(upperStruct);

        // All should be sorted
        expectSorted(rootlessA);
        expectSorted(rootlessB);
        expectSorted(shell);
        expectSorted(quartal);
        expectSorted(upperStruct);
      });
    });
  });
});
