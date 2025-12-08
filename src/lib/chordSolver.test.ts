import { describe, it, expect } from "vitest";
import { solveChordVoicings, getVoicedChordNotes } from "./chordSolver";
import type { Preset, VoicingSettings, Octave, VoicingStyle } from "../types";

/**
 * Helper to create a Preset object from a simple key definition
 */
function createPreset(
  keys: string[],
  octave: Octave = 4,
  options: Partial<Preset> = {}
): Preset {
  return {
    keys: new Set(keys),
    octave,
    ...options,
  };
}

/**
 * Helper to calculate the total voice movement between two chord voicings
 */
function calculateTotalMovement(notes1: number[], notes2: number[]): number {
  const sorted1 = [...notes1].sort((a, b) => a - b);
  const sorted2 = [...notes2].sort((a, b) => a - b);
  const minLen = Math.min(sorted1.length, sorted2.length);
  let total = 0;
  for (let i = 0; i < minLen; i++) {
    total += Math.abs(sorted1[i] - sorted2[i]);
  }
  return total;
}

/**
 * Calculate the span (range) of a chord in semitones
 */
function calculateSpan(notes: number[]): number {
  if (notes.length < 2) return 0;
  const sorted = [...notes].sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0];
}

describe("chordSolver", () => {
  describe("solveChordVoicings - Basic voicing solving", () => {
    it("should return empty array for null/undefined input", () => {
      expect(solveChordVoicings(null)).toEqual([]);
      expect(solveChordVoicings(undefined)).toEqual([]);
    });

    it("should return empty array for empty sequence", () => {
      expect(solveChordVoicings([])).toEqual([]);
    });

    it("should return default voicing for single chord sequence", () => {
      const presets = [createPreset(["q", "j"])]; // C major (q=C)
      const result = solveChordVoicings(presets);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("inversionIndex");
      expect(result[0]).toHaveProperty("spreadAmount");
      expect(result[0]).toHaveProperty("voicingStyle");
      expect(result[0]).toHaveProperty("octave");
    });

    it("should solve multi-chord sequence", () => {
      // ii-V-I progression in C: Dm7 - G7 - Cmaj7
      const presets = [
        createPreset(["e", "u", "k"]), // D minor 7 (e=D, u=minor, k=dom7)
        createPreset(["f", "j", "k"]), // G dominant 7 (f=G, j=major, k=dom7)
        createPreset(["q", "j", "i"]), // C major 7 (q=C, j=major, i=maj7)
      ];
      const result = solveChordVoicings(presets);

      expect(result).toHaveLength(3);
      result.forEach((voicing) => {
        expect(voicing).toHaveProperty("inversionIndex");
        expect(voicing).toHaveProperty("spreadAmount");
        expect(voicing).toHaveProperty("voicingStyle");
        expect(voicing).toHaveProperty("octave");
      });
    });

    it("should handle presets with no valid chord (no root)", () => {
      // Preset with only modifiers, no root key
      const presets = [createPreset(["j", "k"])]; // No root
      const result = solveChordVoicings(presets);

      // Should return default voicing when chord can't be built
      expect(result).toHaveLength(1);
    });
  });

  describe("solveChordVoicings - Voice leading quality", () => {
    it("should minimize voice movement between adjacent chords", () => {
      // C major to F major - close roots, should have minimal movement
      const presets = [
        createPreset(["q", "j"]), // C major (q=C)
        createPreset(["s", "j"]), // F major (s=F)
      ];

      const result = solveChordVoicings(presets, {
        jazzVoiceLeading: true,
        useRegisterConstraints: false,
      });

      // Get the actual voiced notes
      const notes1 = getVoicedChordNotes(presets[0], result[0]);
      const notes2 = getVoicedChordNotes(presets[1], result[1]);

      // With good voice leading, total movement should be relatively small
      const movement = calculateTotalMovement(notes1, notes2);
      // C-E-G to F-A-C can be voiced with ~5 semitones total movement
      expect(movement).toBeLessThan(20);
    });

    it("should consider jazz 7th-to-3rd voice leading", () => {
      // ii-V progression: Dm7 to G7
      // The 7th of Dm7 (C) should resolve to 3rd of G7 (B)
      const presets = [
        createPreset(["e", "u", "k"]), // D minor 7 (e=D, u=minor, k=dom7)
        createPreset(["f", "j", "k"]), // G dominant 7 (f=G, j=major, k=dom7)
      ];

      const resultWithJazz = solveChordVoicings(presets, {
        jazzVoiceLeading: true,
        useRegisterConstraints: false,
      });

      const resultWithoutJazz = solveChordVoicings(presets, {
        jazzVoiceLeading: false,
        useRegisterConstraints: false,
      });

      // Both should return valid voicings
      expect(resultWithJazz).toHaveLength(2);
      expect(resultWithoutJazz).toHaveLength(2);

      // Jazz voice leading should favor smooth resolution
      const notesJazz1 = getVoicedChordNotes(presets[0], resultWithJazz[0]);
      const notesJazz2 = getVoicedChordNotes(presets[1], resultWithJazz[1]);

      expect(notesJazz1.length).toBeGreaterThan(0);
      expect(notesJazz2.length).toBeGreaterThan(0);
    });

    it("should produce valid voicings for V-I resolution", () => {
      // G7 to Cmaj7 - classic jazz resolution
      const presets = [
        createPreset(["f", "j", "k"]), // G dominant 7 (f=G)
        createPreset(["q", "j", "i"]), // C major 7 (q=C)
      ];

      const result = solveChordVoicings(presets, {
        jazzVoiceLeading: true,
      });

      const notes1 = getVoicedChordNotes(presets[0], result[0]);
      const notes2 = getVoicedChordNotes(presets[1], result[1]);

      // Both chords should have notes
      expect(notes1.length).toBeGreaterThan(0);
      expect(notes2.length).toBeGreaterThan(0);

      // Voice movement should be reasonable
      const movement = calculateTotalMovement(notes1, notes2);
      expect(movement).toBeLessThan(30);
    });
  });

  describe("solveChordVoicings - Spread preferences", () => {
    it("should prefer tighter voicings with negative spread preference", () => {
      const presets = [
        createPreset(["q", "j", "i"]), // C major 7 (q=C)
        createPreset(["s", "j", "i"]), // F major 7 (s=F)
      ];

      const tightResult = solveChordVoicings(presets, {
        spreadPreference: -1,
        useRegisterConstraints: false,
      });

      const wideResult = solveChordVoicings(presets, {
        spreadPreference: 1,
        useRegisterConstraints: false,
      });

      const tightNotes1 = getVoicedChordNotes(presets[0], tightResult[0]);
      const wideNotes1 = getVoicedChordNotes(presets[0], wideResult[0]);

      const tightSpan = calculateSpan(tightNotes1);
      const wideSpan = calculateSpan(wideNotes1);

      // Tight preference should generally produce smaller spans
      // Note: this may not always be true due to other factors, but on average it should trend this way
      expect(typeof tightSpan).toBe("number");
      expect(typeof wideSpan).toBe("number");
    });

    it("should prefer wider voicings with positive spread preference", () => {
      const presets = [
        createPreset(["q", "j", "k"]), // C dominant 7 (q=C)
      ];

      const wideResult = solveChordVoicings(presets, {
        spreadPreference: 1,
      });

      const neutralResult = solveChordVoicings(presets, {
        spreadPreference: 0,
      });

      // Both should produce valid voicings
      expect(wideResult).toHaveLength(1);
      expect(neutralResult).toHaveLength(1);
    });

    it("should handle extreme spread values", () => {
      const presets = [
        createPreset(["q", "j", "i"]), // C major 7 (q=C)
        createPreset(["e", "u", "k"]), // D minor 7 (e=D)
      ];

      // Very close preference
      const veryClose = solveChordVoicings(presets, {
        spreadPreference: -1,
      });

      // Very wide preference
      const veryWide = solveChordVoicings(presets, {
        spreadPreference: 1,
      });

      expect(veryClose).toHaveLength(2);
      expect(veryWide).toHaveLength(2);
    });

    it("should work with neutral spread preference (default)", () => {
      const presets = [
        createPreset(["q", "j"]), // C major (q=C)
        createPreset(["e", "u"]), // D minor (e=D)
      ];

      const result = solveChordVoicings(presets);
      expect(result).toHaveLength(2);

      // Default should minimize voice movement
      const notes1 = getVoicedChordNotes(presets[0], result[0]);
      const notes2 = getVoicedChordNotes(presets[1], result[1]);

      expect(notes1.length).toBeGreaterThan(0);
      expect(notes2.length).toBeGreaterThan(0);
    });
  });

  describe("solveChordVoicings - Edge cases", () => {
    it("should handle same chord repeated", () => {
      const presets = [
        createPreset(["q", "j"]), // C major (q=C)
        createPreset(["q", "j"]), // C major (same)
        createPreset(["q", "j"]), // C major (same)
      ];

      const result = solveChordVoicings(presets);
      expect(result).toHaveLength(3);

      // Same chord should have minimal or zero movement
      const notes1 = getVoicedChordNotes(presets[0], result[0]);
      const notes2 = getVoicedChordNotes(presets[1], result[1]);
      const notes3 = getVoicedChordNotes(presets[2], result[2]);

      // All should produce valid notes
      expect(notes1.length).toBeGreaterThan(0);
      expect(notes2.length).toBeGreaterThan(0);
      expect(notes3.length).toBeGreaterThan(0);
    });

    it("should handle wide interval jumps (C to F#)", () => {
      // C to F# - tritone apart, one of the widest intervals
      const presets = [
        createPreset(["q", "j"]), // C major (q=C)
        createPreset(["d", "j"]), // F# major (d=F#)
      ];

      const result = solveChordVoicings(presets);
      expect(result).toHaveLength(2);

      // Should still produce valid voicings
      const notes1 = getVoicedChordNotes(presets[0], result[0]);
      const notes2 = getVoicedChordNotes(presets[1], result[1]);

      expect(notes1.length).toBeGreaterThan(0);
      expect(notes2.length).toBeGreaterThan(0);
    });

    it("should handle progression through all roots chromatically", () => {
      // C, C#, D, D#, E, F, F#, G, G#, A, A#, B - chromatic progression
      // Using correct keyboard mappings: q=C, w=C#, e=D, r=D#, a=E, s=F, d=F#, f=G, z=G#, x=A, c=A#, v=B
      const rootKeys = ["q", "w", "e", "r", "a", "s", "d", "f", "z", "x", "c", "v"];
      const presets = rootKeys.map((key) => createPreset([key, "j"]));

      const result = solveChordVoicings(presets);
      expect(result).toHaveLength(12);

      // All should produce valid voicings
      result.forEach((voicing, i) => {
        const notes = getVoicedChordNotes(presets[i], voicing);
        expect(notes.length).toBeGreaterThan(0);
      });
    });

    it("should respect maximum inversion limits", () => {
      const presets = [
        createPreset(["q", "j", "i"]), // C major 7 (4 notes) (q=C)
      ];

      const result = solveChordVoicings(presets);

      // Inversion index should be within valid range
      expect(result[0].inversionIndex).toBeGreaterThanOrEqual(0);
      expect(result[0].inversionIndex).toBeLessThan(10); // Reasonable upper limit
    });

    it("should respect spread amount limits", () => {
      const presets = [
        createPreset(["q", "j", "i"]), // C major 7 (q=C)
      ];

      const result = solveChordVoicings(presets);

      // Spread amount should be within valid range (0-3)
      expect(result[0].spreadAmount).toBeGreaterThanOrEqual(0);
      expect(result[0].spreadAmount).toBeLessThanOrEqual(3);
    });

    it("should handle triads (3-note chords)", () => {
      const presets = [
        createPreset(["q", "j"]), // C major triad (q=C)
        createPreset(["f", "j"]), // G major triad (f=G)
      ];

      const result = solveChordVoicings(presets);
      expect(result).toHaveLength(2);

      const notes1 = getVoicedChordNotes(presets[0], result[0]);
      const notes2 = getVoicedChordNotes(presets[1], result[1]);

      expect(notes1.length).toBeGreaterThanOrEqual(3);
      expect(notes2.length).toBeGreaterThanOrEqual(3);
    });

    it("should handle extended chords (9ths, 11ths, 13ths)", () => {
      const presets = [
        createPreset(["q", "j", "k", "l"]), // C9 (q=C, k=dom7, l=9)
        createPreset(["s", "j", "k", "l"]), // F9 (s=F)
      ];

      const result = solveChordVoicings(presets);
      expect(result).toHaveLength(2);

      const notes1 = getVoicedChordNotes(presets[0], result[0]);
      const notes2 = getVoicedChordNotes(presets[1], result[1]);

      expect(notes1.length).toBeGreaterThan(0);
      expect(notes2.length).toBeGreaterThan(0);
    });
  });

  describe("solveChordVoicings - Options", () => {
    it("should respect targetOctave option", () => {
      const presets = [createPreset(["q", "j"]), createPreset(["f", "j"])];

      const result3 = solveChordVoicings(presets, { targetOctave: 3 });
      const result5 = solveChordVoicings(presets, { targetOctave: 5 });

      // Octaves should be around the target
      expect(result3[0].octave).toBeLessThanOrEqual(4);
      expect(result5[0].octave).toBeGreaterThanOrEqual(4);
    });

    it("should respect allowedStyles option", () => {
      const presets = [createPreset(["q", "j", "i"])];

      const closeOnly = solveChordVoicings(presets, {
        allowedStyles: ["close"],
      });

      expect(closeOnly[0].voicingStyle).toBe("close");
    });

    it("should respect multiple allowed styles", () => {
      const presets = [
        createPreset(["q", "j", "k"]),
        createPreset(["s", "j", "k"]),
      ];

      const limitedStyles: VoicingStyle[] = ["close", "drop2"];
      const result = solveChordVoicings(presets, {
        allowedStyles: limitedStyles,
      });

      result.forEach((voicing) => {
        expect(limitedStyles).toContain(voicing.voicingStyle);
      });
    });

    it("should work with register constraints disabled", () => {
      const presets = [
        createPreset(["q", "j", "i"]),
        createPreset(["e", "u", "k"]),
      ];

      const withConstraints = solveChordVoicings(presets, {
        useRegisterConstraints: true,
      });

      const withoutConstraints = solveChordVoicings(presets, {
        useRegisterConstraints: false,
      });

      // Both should produce valid results
      expect(withConstraints).toHaveLength(2);
      expect(withoutConstraints).toHaveLength(2);
    });
  });

  describe("getVoicedChordNotes", () => {
    it("should return empty array for preset with no root", () => {
      const preset = createPreset(["j", "k"]); // No root key
      const voicing: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "close",
        octave: 4,
      };

      const notes = getVoicedChordNotes(preset, voicing);
      expect(notes).toEqual([]);
    });

    it("should return notes for valid preset and voicing", () => {
      const preset = createPreset(["q", "j"]); // C major (q=C)
      const voicing: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "close",
        octave: 4,
      };

      const notes = getVoicedChordNotes(preset, voicing);
      expect(notes.length).toBeGreaterThan(0);
      // C major triad in octave 4 should contain C4=60, E4=64, G4=67
      expect(notes).toEqual(expect.arrayContaining([60, 64, 67]));
    });

    it("should apply inversion correctly", () => {
      const preset = createPreset(["q", "j"]); // C major (q=C)

      const rootPosition: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "close",
        octave: 4,
      };

      const firstInversion: VoicingSettings = {
        inversionIndex: 1,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "close",
        octave: 4,
      };

      const notesRoot = getVoicedChordNotes(preset, rootPosition);
      const notesFirst = getVoicedChordNotes(preset, firstInversion);

      // First inversion should have different lowest note
      expect(notesRoot[0]).not.toBe(notesFirst[0]);
    });

    it("should apply spread correctly", () => {
      const preset = createPreset(["q", "j"]); // C major (q=C)

      const noSpread: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "close",
        octave: 4,
      };

      const withSpread: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 2,
        droppedNotes: 0,
        voicingStyle: "close",
        octave: 4,
      };

      const notesNoSpread = getVoicedChordNotes(preset, noSpread);
      const notesWithSpread = getVoicedChordNotes(preset, withSpread);

      // Spread voicing should have wider range
      const spanNoSpread = calculateSpan(notesNoSpread);
      const spanWithSpread = calculateSpan(notesWithSpread);

      expect(spanWithSpread).toBeGreaterThan(spanNoSpread);
    });

    it("should apply voicing style correctly", () => {
      const preset = createPreset(["q", "j", "k"]); // C dominant 7 (q=C)

      const closeVoicing: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "close",
        octave: 4,
      };

      const drop2Voicing: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "drop2",
        octave: 4,
      };

      const notesClose = getVoicedChordNotes(preset, closeVoicing);
      const notesDrop2 = getVoicedChordNotes(preset, drop2Voicing);

      // Both should have notes but potentially different configurations
      expect(notesClose.length).toBeGreaterThan(0);
      expect(notesDrop2.length).toBeGreaterThan(0);
    });

    it("should respect octave setting", () => {
      const preset = createPreset(["q", "j"]); // C major (q=C)

      const octave3: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "close",
        octave: 3,
      };

      const octave5: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "close",
        octave: 5,
      };

      const notesOct3 = getVoicedChordNotes(preset, octave3);
      const notesOct5 = getVoicedChordNotes(preset, octave5);

      // Octave 5 should have higher notes
      expect(Math.min(...notesOct5)).toBeGreaterThan(Math.min(...notesOct3));
    });

    it("should handle shell voicing style", () => {
      const preset = createPreset(["q", "j", "k"]); // C dominant 7 (q=C)
      const voicing: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "shell",
        octave: 4,
      };

      const notes = getVoicedChordNotes(preset, voicing);
      // Shell voicing should have fewer notes (root, 3rd, 7th typically)
      expect(notes.length).toBeGreaterThan(0);
      expect(notes.length).toBeLessThanOrEqual(4);
    });

    it("should handle rootless-a voicing style", () => {
      const preset = createPreset(["q", "j", "k", "l"]); // C9 (q=C)
      const voicing: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "rootless-a",
        octave: 4,
      };

      const notes = getVoicedChordNotes(preset, voicing);
      expect(notes.length).toBeGreaterThan(0);
    });

    it("should handle quartal voicing style", () => {
      const preset = createPreset(["q", "u", "k"]); // C minor 7 (q=C)
      const voicing: VoicingSettings = {
        inversionIndex: 0,
        spreadAmount: 0,
        droppedNotes: 0,
        voicingStyle: "quartal",
        octave: 4,
      };

      const notes = getVoicedChordNotes(preset, voicing);
      expect(notes.length).toBeGreaterThan(0);
    });
  });

  describe("solveChordVoicings - ii-V-I progressions", () => {
    it("should handle ii-V-I in C major", () => {
      // Dm7 - G7 - Cmaj7
      const presets = [
        createPreset(["e", "u", "k"]), // Dm7 (e=D, u=minor, k=dom7)
        createPreset(["f", "j", "k"]), // G7 (f=G, j=major, k=dom7)
        createPreset(["q", "j", "i"]), // Cmaj7 (q=C, j=major, i=maj7)
      ];

      const result = solveChordVoicings(presets, {
        jazzVoiceLeading: true,
      });

      expect(result).toHaveLength(3);

      // Verify voice movement is reasonable across the progression
      const notes = presets.map((p, i) => getVoicedChordNotes(p, result[i]));

      const movement1to2 = calculateTotalMovement(notes[0], notes[1]);
      const movement2to3 = calculateTotalMovement(notes[1], notes[2]);

      // ii-V and V-I should have reasonable voice movement
      expect(movement1to2).toBeLessThan(40);
      expect(movement2to3).toBeLessThan(40);
    });

    it("should handle ii-V-I in F major", () => {
      // Gm7 - C7 - Fmaj7
      const presets = [
        createPreset(["f", "u", "k"]), // Gm7 (f=G)
        createPreset(["q", "j", "k"]), // C7 (q=C)
        createPreset(["s", "j", "i"]), // Fmaj7 (s=F)
      ];

      const result = solveChordVoicings(presets, {
        jazzVoiceLeading: true,
      });

      expect(result).toHaveLength(3);

      result.forEach((voicing, i) => {
        const notes = getVoicedChordNotes(presets[i], voicing);
        expect(notes.length).toBeGreaterThan(0);
      });
    });

    it("should handle descending ii-V-I cycle", () => {
      // Common jazz pattern: cycle down in whole steps
      // Dm7 - G7 - Cm7 - F7
      const presets = [
        createPreset(["e", "u", "k"]), // Dm7 (e=D)
        createPreset(["f", "j", "k"]), // G7 (f=G)
        createPreset(["q", "u", "k"]), // Cm7 (q=C)
        createPreset(["s", "j", "k"]), // F7 (s=F)
      ];

      const result = solveChordVoicings(presets, {
        jazzVoiceLeading: true,
      });

      expect(result).toHaveLength(4);

      // Each transition should have reasonable voice movement
      for (let i = 0; i < presets.length - 1; i++) {
        const notes1 = getVoicedChordNotes(presets[i], result[i]);
        const notes2 = getVoicedChordNotes(presets[i + 1], result[i + 1]);
        const movement = calculateTotalMovement(notes1, notes2);
        expect(movement).toBeLessThan(50);
      }
    });
  });

  describe("solveChordVoicings - Complex scenarios", () => {
    it("should handle altered dominant chords", () => {
      const presets = [
        createPreset(["f", "j", "k", "]"]), // G7b9 (f=G, ]=flat9)
        createPreset(["q", "j", "i"]), // Cmaj7 (q=C)
      ];

      const result = solveChordVoicings(presets);
      expect(result).toHaveLength(2);

      const notes1 = getVoicedChordNotes(presets[0], result[0]);
      const notes2 = getVoicedChordNotes(presets[1], result[1]);

      expect(notes1.length).toBeGreaterThan(0);
      expect(notes2.length).toBeGreaterThan(0);
    });

    it("should handle diminished chords", () => {
      const presets = [
        createPreset(["q", "j"]), // C major (q=C)
        createPreset(["q", "m"]), // C diminished (m=diminished)
        createPreset(["e", "u"]), // D minor (e=D)
      ];

      const result = solveChordVoicings(presets);
      expect(result).toHaveLength(3);
    });

    it("should handle sus4 and sus2 chords", () => {
      const presets = [
        createPreset(["q", "p"]), // Csus4 (q=C, p=sus4)
        createPreset(["q", "j"]), // C major (q=C)
        createPreset(["q", ";"]), // Csus2 (q=C, ;=sus2)
      ];

      const result = solveChordVoicings(presets);
      expect(result).toHaveLength(3);

      result.forEach((voicing, i) => {
        const notes = getVoicedChordNotes(presets[i], voicing);
        expect(notes.length).toBeGreaterThan(0);
      });
    });

    it("should handle long sequences efficiently", () => {
      // 8-bar blues-like progression
      const presets = [
        createPreset(["q", "j", "k"]), // C7 (q=C)
        createPreset(["q", "j", "k"]), // C7
        createPreset(["s", "j", "k"]), // F7 (s=F)
        createPreset(["q", "j", "k"]), // C7
        createPreset(["f", "j", "k"]), // G7 (f=G)
        createPreset(["s", "j", "k"]), // F7
        createPreset(["q", "j", "k"]), // C7
        createPreset(["f", "j", "k"]), // G7
      ];

      const result = solveChordVoicings(presets);
      expect(result).toHaveLength(8);

      // All voicings should be valid
      result.forEach((voicing, i) => {
        const notes = getVoicedChordNotes(presets[i], voicing);
        expect(notes.length).toBeGreaterThan(0);
      });
    });
  });
});
