/**
 * Tests for Note Colors Module
 * Validates ROYGBIV color mapping and gradient generation
 *
 * @module lib/noteColors.test
 */

import { describe, it, expect } from "vitest";
import {
  NOTE_COLORS,
  getNoteColor,
  buildNorthernLightsGradient,
} from "./noteColors";
import type { MIDINote } from "../types";

describe("noteColors", () => {
  describe("NOTE_COLORS constant", () => {
    it("should have colors for all 12 pitch classes", () => {
      expect(Object.keys(NOTE_COLORS).length).toBe(12);

      for (let i = 0; i < 12; i++) {
        expect(NOTE_COLORS[i]).toBeDefined();
      }
    });

    it("should return valid hex color strings", () => {
      const hexColorRegex = /^#[0-9a-f]{6}$/i;

      for (let i = 0; i < 12; i++) {
        expect(NOTE_COLORS[i]).toMatch(hexColorRegex);
      }
    });

    it("should have unique colors for each pitch class", () => {
      const colors = Object.values(NOTE_COLORS);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(12);
    });

    it("should map specific pitch classes to expected ROYGBIV colors", () => {
      // C = 0, should be red
      expect(NOTE_COLORS[0]).toMatch(/^#ff/i); // Starts with red

      // E = 4, should be yellow
      expect(NOTE_COLORS[4]).toMatch(/^#ffff/i); // Yellow (high red + green)

      // G = 7, should be blue
      expect(NOTE_COLORS[7]).toMatch(/33.*ff/i); // Contains blue
    });

    it("should have all colors as lowercase hex values", () => {
      for (let i = 0; i < 12; i++) {
        const color = NOTE_COLORS[i];
        expect(color).toBe(color.toLowerCase());
      }
    });
  });

  describe("getNoteColor", () => {
    it("should return correct color for middle C (60)", () => {
      const color = getNoteColor(60 as MIDINote);
      expect(color).toBe(NOTE_COLORS[0]); // 60 % 12 = 0 (C)
    });

    it("should return correct color for all pitch classes in octave 4", () => {
      for (let i = 0; i < 12; i++) {
        const midiNote = (60 + i) as MIDINote; // C4 through B4
        const color = getNoteColor(midiNote);
        expect(color).toBe(NOTE_COLORS[i]);
      }
    });

    it("should wrap correctly for different octaves", () => {
      // C in different octaves should all be the same color
      const c3 = getNoteColor(48 as MIDINote); // C3
      const c4 = getNoteColor(60 as MIDINote); // C4
      const c5 = getNoteColor(72 as MIDINote); // C5

      expect(c3).toBe(c4);
      expect(c4).toBe(c5);
      expect(c3).toBe(NOTE_COLORS[0]);
    });

    it("should handle lowest MIDI note (0)", () => {
      const color = getNoteColor(0 as MIDINote);
      expect(color).toBe(NOTE_COLORS[0]);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should handle highest MIDI note (127)", () => {
      const color = getNoteColor(127 as MIDINote);
      const expectedIndex = 127 % 12; // = 7 (G)
      expect(color).toBe(NOTE_COLORS[expectedIndex]);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should return the same color for notes an octave apart", () => {
      for (let baseNote = 36; baseNote < 72; baseNote++) {
        const color1 = getNoteColor(baseNote as MIDINote);
        const color2 = getNoteColor((baseNote + 12) as MIDINote);
        expect(color1).toBe(color2);
      }
    });

    it("should handle all valid MIDI notes (0-127)", () => {
      for (let note = 0; note <= 127; note++) {
        const color = getNoteColor(note as MIDINote);
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(color).toBe(NOTE_COLORS[note % 12]);
      }
    });
  });

  describe("buildNorthernLightsGradient", () => {
    describe("edge cases", () => {
      it("should return null for empty array", () => {
        const gradient = buildNorthernLightsGradient([]);
        expect(gradient).toBeNull();
      });

      it("should return null for null input", () => {
        const gradient = buildNorthernLightsGradient(null);
        expect(gradient).toBeNull();
      });

      it("should return null for undefined input", () => {
        const gradient = buildNorthernLightsGradient(undefined);
        expect(gradient).toBeNull();
      });
    });

    describe("single note gradients", () => {
      it("should return radial gradient for single note", () => {
        const gradient = buildNorthernLightsGradient([60 as MIDINote]); // C
        expect(gradient).toBeDefined();
        expect(gradient).toContain("radial-gradient");
        expect(gradient).toContain(NOTE_COLORS[0]); // C color
      });

      it("should create radial gradient with opacity", () => {
        const gradient = buildNorthernLightsGradient([64 as MIDINote]); // E
        expect(gradient).toContain("radial-gradient");
        expect(gradient).toContain("40"); // Opacity value
        expect(gradient).toContain("20"); // Different opacity
      });

      it("should handle single note in different octaves", () => {
        const gradient1 = buildNorthernLightsGradient([48 as MIDINote]); // C3
        const gradient2 = buildNorthernLightsGradient([60 as MIDINote]); // C4
        const gradient3 = buildNorthernLightsGradient([72 as MIDINote]); // C5

        // All should contain the same base color (C)
        expect(gradient1).toContain(NOTE_COLORS[0]);
        expect(gradient2).toContain(NOTE_COLORS[0]);
        expect(gradient3).toContain(NOTE_COLORS[0]);
      });
    });

    describe("multiple note gradients", () => {
      it("should return linear gradient for multiple notes", () => {
        const notes = [60, 64, 67] as MIDINote[]; // C major chord
        const gradient = buildNorthernLightsGradient(notes);

        expect(gradient).toBeDefined();
        expect(gradient).toContain("linear-gradient");
        expect(gradient).toContain("90deg"); // Horizontal gradient
      });

      it("should include all unique pitch class colors", () => {
        const notes = [60, 64, 67] as MIDINote[]; // C, E, G
        const gradient = buildNorthernLightsGradient(notes);

        expect(gradient).toContain(NOTE_COLORS[0]); // C
        expect(gradient).toContain(NOTE_COLORS[4]); // E
        expect(gradient).toContain(NOTE_COLORS[7]); // G
      });

      it("should deduplicate notes in same pitch class", () => {
        const notes = [60, 72, 84] as MIDINote[]; // Multiple C's across octaves
        const gradient = buildNorthernLightsGradient(notes);

        // Should only have one color (single radial gradient)
        expect(gradient).toContain("radial-gradient");
        expect(gradient).toContain(NOTE_COLORS[0]);
      });

      it("should sort pitch classes in the gradient", () => {
        // Notes in random order
        const notes = [67, 60, 64] as MIDINote[]; // G, C, E
        const gradient = buildNorthernLightsGradient(notes);

        // Should be sorted: C(0), E(4), G(7)
        const cIndex = gradient!.indexOf(NOTE_COLORS[0]);
        const eIndex = gradient!.indexOf(NOTE_COLORS[4]);
        const gIndex = gradient!.indexOf(NOTE_COLORS[7]);

        expect(cIndex).toBeLessThan(eIndex);
        expect(eIndex).toBeLessThan(gIndex);
      });

      it("should create gradient with opacity values", () => {
        const notes = [60, 64] as MIDINote[];
        const gradient = buildNorthernLightsGradient(notes);

        expect(gradient).toContain("35"); // Opacity suffix
      });

      it("should include percentage stops", () => {
        const notes = [60, 62, 64] as MIDINote[]; // C, D, E
        const gradient = buildNorthernLightsGradient(notes);

        expect(gradient).toContain("0%"); // First stop
        expect(gradient).toContain("100%"); // Last stop
      });
    });

    describe("complex chord voicings", () => {
      it("should handle jazz voicing with extensions", () => {
        // Cmaj9: C, E, G, B, D
        const notes = [60, 64, 67, 71, 74] as MIDINote[];
        const gradient = buildNorthernLightsGradient(notes);

        expect(gradient).toContain("linear-gradient");
        expect(gradient).toContain(NOTE_COLORS[0]); // C
        expect(gradient).toContain(NOTE_COLORS[4]); // E
        expect(gradient).toContain(NOTE_COLORS[7]); // G
        expect(gradient).toContain(NOTE_COLORS[11]); // B
        expect(gradient).toContain(NOTE_COLORS[2]); // D
      });

      it("should handle dense cluster voicing", () => {
        // Chromatic cluster: C, C#, D
        const notes = [60, 61, 62] as MIDINote[];
        const gradient = buildNorthernLightsGradient(notes);

        expect(gradient).toContain("linear-gradient");
        expect(gradient).toContain(NOTE_COLORS[0]); // C
        expect(gradient).toContain(NOTE_COLORS[1]); // C#
        expect(gradient).toContain(NOTE_COLORS[2]); // D
      });

      it("should handle duplicate notes across octaves", () => {
        // Multiple C's and E's
        const notes = [48, 60, 72, 52, 64, 76] as MIDINote[];
        const gradient = buildNorthernLightsGradient(notes);

        // Should only have 2 unique pitch classes
        expect(gradient).toContain("linear-gradient");
        expect(gradient).toContain(NOTE_COLORS[0]); // C
        expect(gradient).toContain(NOTE_COLORS[4]); // E
      });
    });

    describe("gradient format validation", () => {
      it("should return valid CSS gradient string", () => {
        const notes = [60, 64, 67] as MIDINote[];
        const gradient = buildNorthernLightsGradient(notes);

        expect(gradient).toBeDefined();
        expect(typeof gradient).toBe("string");

        // Should be a valid CSS gradient
        expect(gradient).toMatch(
          /^(linear-gradient|radial-gradient)\([^)]+\)$/,
        );
      });

      it("should have proper gradient syntax for radial", () => {
        const gradient = buildNorthernLightsGradient([60 as MIDINote]);

        expect(gradient).toMatch(
          /^radial-gradient\(ellipse at 50% 100%, #[0-9a-f]{6}40 0%, #[0-9a-f]{6}20 40%, transparent 70%\)$/i,
        );
      });

      it("should have proper gradient syntax for linear", () => {
        const notes = [60, 64] as MIDINote[];
        const gradient = buildNorthernLightsGradient(notes);

        expect(gradient).toMatch(/^linear-gradient\(90deg, .+\)$/);
      });
    });

    describe("visual consistency", () => {
      it("should produce same gradient for same chord in different octaves", () => {
        const chord1 = [48, 52, 55] as MIDINote[]; // C major in lower octave
        const chord2 = [60, 64, 67] as MIDINote[]; // C major in middle octave
        const chord3 = [72, 76, 79] as MIDINote[]; // C major in higher octave

        const gradient1 = buildNorthernLightsGradient(chord1);
        const gradient2 = buildNorthernLightsGradient(chord2);
        const gradient3 = buildNorthernLightsGradient(chord3);

        // All should be equal (same pitch classes)
        expect(gradient1).toBe(gradient2);
        expect(gradient2).toBe(gradient3);
      });

      it("should produce different gradients for different chords", () => {
        const cMajor = [60, 64, 67] as MIDINote[]; // C, E, G
        const cMinor = [60, 63, 67] as MIDINote[]; // C, Eb, G

        const gradient1 = buildNorthernLightsGradient(cMajor);
        const gradient2 = buildNorthernLightsGradient(cMinor);

        expect(gradient1).not.toBe(gradient2);
      });
    });
  });

  describe("integration with piano keyboard", () => {
    it("should provide colors for standard 88-key piano range", () => {
      // A0 (21) to C8 (108)
      for (let note = 21; note <= 108; note++) {
        const color = getNoteColor(note as MIDINote);
        expect(color).toBeDefined();
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    it("should show color pattern repeating every octave", () => {
      const octave1Colors = [];
      const octave2Colors = [];

      for (let i = 0; i < 12; i++) {
        octave1Colors.push(getNoteColor((60 + i) as MIDINote));
        octave2Colors.push(getNoteColor((72 + i) as MIDINote));
      }

      expect(octave1Colors).toEqual(octave2Colors);
    });
  });

  describe("color accessibility", () => {
    it("should not use pure black or white", () => {
      for (let i = 0; i < 12; i++) {
        expect(NOTE_COLORS[i]).not.toBe("#000000");
        expect(NOTE_COLORS[i]).not.toBe("#ffffff");
      }
    });

    it("should use vivid, high-saturation colors", () => {
      for (let i = 0; i < 12; i++) {
        const color = NOTE_COLORS[i];
        // Vivid colors typically have at least one channel at high value
        // This is a rough heuristic
        const hasHighChannel =
          color.includes("ff") || color.includes("33") || color.includes("99");
        expect(hasHighChannel).toBe(true);
      }
    });
  });
});
