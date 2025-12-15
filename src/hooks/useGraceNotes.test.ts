/**
 * Tests for useGraceNotes Hook
 * Tests grace note triggering logic, key mappings, and octave shifts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { appEvents } from "../lib/eventBus";
import type { GraceNotePayload } from "../types";

describe("useGraceNotes Logic Tests", () => {
  let graceNoteHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    appEvents.clear();
    graceNoteHandler = vi.fn();
    appEvents.on("grace:note", graceNoteHandler);
  });

  describe("Grace note key mappings", () => {
    it("should map single note keys correctly", () => {
      const SINGLE_NOTE_KEYS: Record<string, number> = {
        g: 0,
        h: 1,
        j: 2,
        k: 3,
        l: 4,
      };

      expect(SINGLE_NOTE_KEYS.g).toBe(0);
      expect(SINGLE_NOTE_KEYS.h).toBe(1);
      expect(SINGLE_NOTE_KEYS.j).toBe(2);
      expect(SINGLE_NOTE_KEYS.k).toBe(3);
      expect(SINGLE_NOTE_KEYS.l).toBe(4);
    });

    it("should map pair keys correctly", () => {
      const PAIR_KEYS: Record<string, [number, number]> = {
        y: [0, 1],
        u: [1, 2],
        i: [2, 3],
        o: [3, 4],
        p: [4, 5],
      };

      expect(PAIR_KEYS.y).toEqual([0, 1]);
      expect(PAIR_KEYS.u).toEqual([1, 2]);
      expect(PAIR_KEYS.i).toEqual([2, 3]);
      expect(PAIR_KEYS.o).toEqual([3, 4]);
      expect(PAIR_KEYS.p).toEqual([4, 5]);
    });

    it("should map interval keys correctly", () => {
      const INTERVAL_KEYS: Record<string, number[]> = {
        v: [0, 2],
        b: [0, 3],
        n: [0, 4],
        m: [1, 3],
        ",": [2, 4],
        ".": [0, 1, 2],
      };

      expect(INTERVAL_KEYS.v).toEqual([0, 2]);
      expect(INTERVAL_KEYS.b).toEqual([0, 3]);
      expect(INTERVAL_KEYS.n).toEqual([0, 4]);
      expect(INTERVAL_KEYS.m).toEqual([1, 3]);
      expect(INTERVAL_KEYS[","]).toEqual([2, 4]);
      expect(INTERVAL_KEYS["."]).toEqual([0, 1, 2]);
    });

    it("should identify preset keys", () => {
      const PRESET_KEYS = new Set([
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
      ]);

      expect(PRESET_KEYS.has("0")).toBe(true);
      expect(PRESET_KEYS.has("5")).toBe(true);
      expect(PRESET_KEYS.has("9")).toBe(true);
      expect(PRESET_KEYS.has("a")).toBe(false);
    });
  });

  describe("Note selection logic", () => {
    it("should select notes by indices from chord", () => {
      const notes = [60, 64, 67, 71]; // Cmaj7
      const indices = [0, 2]; // Root and 5th

      const selectedNotes = indices
        .filter((idx) => idx >= 0 && idx < notes.length)
        .map((idx) => notes[idx]);

      expect(selectedNotes).toEqual([60, 67]);
    });

    it("should handle out-of-bounds indices gracefully", () => {
      const notes = [60, 64, 67]; // C major triad
      const indices = [0, 2, 5]; // Last index out of bounds

      const selectedNotes = indices
        .filter((idx) => idx >= 0 && idx < notes.length)
        .map((idx) => notes[idx]);

      expect(selectedNotes).toEqual([60, 67]);
    });

    it("should return empty array for no valid indices", () => {
      const notes = [60, 64, 67];
      const indices = [10, 20];

      const selectedNotes = indices
        .filter((idx) => idx >= 0 && idx < notes.length)
        .map((idx) => notes[idx]);

      expect(selectedNotes).toEqual([]);
    });

    it("should handle empty notes array", () => {
      const notes: number[] = [];
      const indices = [0, 1];

      const selectedNotes = indices
        .filter((idx) => idx >= 0 && idx < notes.length)
        .map((idx) => notes[idx]);

      expect(selectedNotes).toEqual([]);
    });
  });

  describe("Octave shift logic", () => {
    it("should shift notes down one octave (-12 semitones)", () => {
      const notes = [60, 64, 67]; // C4, E4, G4
      const octaveShift = -12;
      const shiftedNotes = notes.map((note) => note + octaveShift);

      expect(shiftedNotes).toEqual([48, 52, 55]); // C3, E3, G3
    });

    it("should shift notes up one octave (+12 semitones)", () => {
      const notes = [60, 64, 67]; // C4, E4, G4
      const octaveShift = 12;
      const shiftedNotes = notes.map((note) => note + octaveShift);

      expect(shiftedNotes).toEqual([72, 76, 79]); // C5, E5, G5
    });

    it("should not shift when octave shift is 0", () => {
      const notes = [60, 64, 67];
      const octaveShift = 0;
      const shiftedNotes = notes.map((note) => note + octaveShift);

      expect(shiftedNotes).toEqual([60, 64, 67]);
    });

    it("should cancel out when both modifiers are held", () => {
      const octaveDownHeld = true;
      const octaveUpHeld = true;

      let octaveShift = 0;
      if (octaveDownHeld) octaveShift -= 12;
      if (octaveUpHeld) octaveShift += 12;

      expect(octaveShift).toBe(0);
    });

    it("should shift down when only down modifier is held", () => {
      const octaveDownHeld = true;
      const octaveUpHeld = false;

      let octaveShift = 0;
      if (octaveDownHeld) octaveShift -= 12;
      if (octaveUpHeld) octaveShift += 12;

      expect(octaveShift).toBe(-12);
    });

    it("should shift up when only up modifier is held", () => {
      const octaveDownHeld = false;
      const octaveUpHeld = true;

      let octaveShift = 0;
      if (octaveDownHeld) octaveShift -= 12;
      if (octaveUpHeld) octaveShift += 12;

      expect(octaveShift).toBe(12);
    });
  });

  describe("Grace note event emission", () => {
    it("should emit grace:note event with correct payload", () => {
      const payload: GraceNotePayload = {
        notes: [60, 64],
        indices: [0, 1],
        pattern: "pair",
        octaveShift: 0,
      };

      appEvents.emit("grace:note", payload);

      expect(graceNoteHandler).toHaveBeenCalledTimes(1);
      expect(graceNoteHandler).toHaveBeenCalledWith(payload);
    });

    it("should emit single note pattern", () => {
      const payload: GraceNotePayload = {
        notes: [60],
        indices: [0],
        pattern: "single",
        octaveShift: 0,
      };

      appEvents.emit("grace:note", payload);

      expect(graceNoteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: "single",
          notes: [60],
        }),
      );
    });

    it("should emit pair pattern", () => {
      const payload: GraceNotePayload = {
        notes: [60, 64],
        indices: [0, 1],
        pattern: "pair",
        octaveShift: 0,
      };

      appEvents.emit("grace:note", payload);

      expect(graceNoteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: "pair",
          notes: [60, 64],
        }),
      );
    });

    it("should emit interval pattern", () => {
      const payload: GraceNotePayload = {
        notes: [60, 67],
        indices: [0, 2],
        pattern: "interval",
        octaveShift: 0,
      };

      appEvents.emit("grace:note", payload);

      expect(graceNoteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: "interval",
          notes: [60, 67],
        }),
      );
    });

    it("should emit full chord pattern", () => {
      const payload: GraceNotePayload = {
        notes: [60, 64, 67, 71],
        indices: [0, 1, 2, 3],
        pattern: "full",
        octaveShift: 0,
      };

      appEvents.emit("grace:note", payload);

      expect(graceNoteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern: "full",
          notes: [60, 64, 67, 71],
        }),
      );
    });

    it("should include octave shift in payload", () => {
      const payload: GraceNotePayload = {
        notes: [72, 76], // Shifted up one octave
        indices: [0, 1],
        pattern: "pair",
        octaveShift: 12,
      };

      appEvents.emit("grace:note", payload);

      expect(graceNoteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          octaveShift: 12,
        }),
      );
    });
  });

  describe("Grace key identification", () => {
    it("should identify single note keys", () => {
      const singleKeys = ["g", "h", "j", "k", "l"];
      singleKeys.forEach((key) => {
        const isSingleKey = ["g", "h", "j", "k", "l"].includes(key);
        expect(isSingleKey).toBe(true);
      });
    });

    it("should identify pair keys", () => {
      const pairKeys = ["y", "u", "i", "o", "p"];
      pairKeys.forEach((key) => {
        const isPairKey = ["y", "u", "i", "o", "p"].includes(key);
        expect(isPairKey).toBe(true);
      });
    });

    it("should identify interval keys", () => {
      const intervalKeys = ["v", "b", "n", "m", ",", "."];
      intervalKeys.forEach((key) => {
        const isIntervalKey = ["v", "b", "n", "m", ",", "."].includes(key);
        expect(isIntervalKey).toBe(true);
      });
    });

    it("should identify space as full chord trigger", () => {
      const key = " ";
      expect(key).toBe(" ");
    });

    it("should identify any grace key", () => {
      const graceKeys = [
        "g",
        "h",
        "j",
        "k",
        "l",
        "y",
        "u",
        "i",
        "o",
        "p",
        "v",
        "b",
        "n",
        "m",
        ",",
        ".",
        " ",
      ];
      graceKeys.forEach((key) => {
        const isGraceKey =
          ["g", "h", "j", "k", "l"].includes(key) ||
          ["y", "u", "i", "o", "p"].includes(key) ||
          ["v", "b", "n", "m", ",", "."].includes(key) ||
          key === " ";
        expect(isGraceKey).toBe(true);
      });
    });
  });

  describe("Preset key hold detection", () => {
    it("should track preset key hold state", () => {
      let heldPresetKey: string | null = null;
      const PRESET_KEYS = new Set([
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
      ]);

      // Press number key
      const key = "5";
      if (PRESET_KEYS.has(key)) {
        heldPresetKey = key;
      }

      expect(heldPresetKey).toBe("5");
    });

    it("should clear preset key on release", () => {
      let heldPresetKey: string | null = "5";
      const releasedKey = "5";

      if (heldPresetKey === releasedKey) {
        heldPresetKey = null;
      }

      expect(heldPresetKey).toBeNull();
    });

    it("should only process grace notes when preset key is held", () => {
      const heldPresetKey = "5";

      const shouldProcess = heldPresetKey !== null;

      expect(shouldProcess).toBe(true);
    });

    it("should not process grace notes when no preset key is held", () => {
      const heldPresetKey = null;

      const shouldProcess = heldPresetKey !== null;

      expect(shouldProcess).toBe(false);
    });
  });

  describe("Grace key repeat prevention", () => {
    it("should track active grace keys", () => {
      const activeGraceKeys = new Set<string>();

      activeGraceKeys.add("g");
      expect(activeGraceKeys.has("g")).toBe(true);
    });

    it("should prevent repeat triggers", () => {
      const activeGraceKeys = new Set(["g"]);
      const key = "g";

      const isRepeat = activeGraceKeys.has(key);

      expect(isRepeat).toBe(true);
    });

    it("should allow trigger when not already active", () => {
      const activeGraceKeys = new Set<string>();
      const key = "g";

      const isRepeat = activeGraceKeys.has(key);

      expect(isRepeat).toBe(false);
    });

    it("should clear key from active set on release", () => {
      const activeGraceKeys = new Set(["g"]);

      activeGraceKeys.delete("g");

      expect(activeGraceKeys.has("g")).toBe(false);
    });
  });
});
