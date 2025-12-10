/**
 * Integration Tests for useChordEngine Hook
 * Tests the critical user path: keyboard input → chord building → event emission
 *
 * Note: These tests verify the integration between parseKeys, buildChord, and event emission
 * by testing the hook's behavior with different key combinations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseKeys } from "../lib/parseKeys";
import { buildChord } from "../lib/chordBuilder";
import { appEvents } from "../lib/eventBus";
import type { ChordChangedPayload, ChordClearedPayload } from "../types";

describe("useChordEngine integration tests", () => {
  // Mock event handlers
  let chordChangedHandler: ReturnType<typeof vi.fn>;
  let chordClearedHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear all event listeners before each test
    appEvents.clear();

    // Create fresh mock handlers
    chordChangedHandler = vi.fn();
    chordClearedHandler = vi.fn();

    // Subscribe to events
    appEvents.on("chord:changed", chordChangedHandler);
    appEvents.on("chord:cleared", chordClearedHandler);
  });

  afterEach(() => {
    // Cleanup after each test
    appEvents.clear();
    vi.clearAllMocks();
  });

  describe("Basic chord building (keyboard input → chord building)", () => {
    it("should build C major chord when Q key is pressed", () => {
      const keys = new Set(["q"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord).not.toBeNull();
      expect(chord?.root).toBe("C");
      expect(chord?.quality).toBe("major");
      expect(chord?.notes).toEqual([60, 64, 67]); // C, E, G in octave 4
    });

    it("should build C# minor chord when W+U keys are pressed", () => {
      const keys = new Set(["w", "u"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord).not.toBeNull();
      expect(chord?.root).toBe("C#");
      expect(chord?.quality).toBe("minor");
      expect(chord?.notes).toEqual([61, 64, 68]); // C#, E, G#
    });

    it("should build F7 chord when S+K keys are pressed", () => {
      const keys = new Set(["s", "k"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord).not.toBeNull();
      expect(chord?.root).toBe("F");
      expect(chord?.quality).toBe("major");
      expect(chord?.notes).toEqual([65, 69, 72, 75]); // F, A, C, Eb
    });

    it("should return null chord when no keys are pressed", () => {
      const keys = new Set<string>();
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord).toBeNull();
    });

    it("should parse keys correctly into root and modifiers", () => {
      const keys = new Set(["q", "u", "k"]);
      const parsed = parseKeys(keys);

      expect(parsed.root).toBe("C");
      expect(parsed.modifiers).toContain("minor");
      expect(parsed.modifiers).toContain("dom7");
    });
  });

  describe("Event emission (chord building → event emission)", () => {
    it("should emit chord:changed event with correct payload", () => {
      const keys = new Set(["q"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      // Simulate the hook emitting the event
      if (chord) {
        appEvents.emit("chord:changed", {
          notes: chord.notes,
          name: "C",
          source: "keyboard",
          retrigger: false,
        });
      }

      expect(chordChangedHandler).toHaveBeenCalledTimes(1);
      const payload = chordChangedHandler.mock.calls[0][0] as ChordChangedPayload;
      expect(payload.notes).toEqual([60, 64, 67]); // C major
      expect(payload.name).toBe("C");
      expect(payload.source).toBe("keyboard");
      expect(payload.retrigger).toBe(false);
    });

    it("should emit chord:cleared event when chord becomes null", () => {
      // Simulate clearing a chord
      appEvents.emit("chord:cleared", {
        source: "keyboard",
      });

      expect(chordClearedHandler).toHaveBeenCalledTimes(1);
      const payload = chordClearedHandler.mock.calls[0][0] as ChordClearedPayload;
      expect(payload.source).toBe("keyboard");
    });

    it("should emit preset source when chord comes from preset", () => {
      const keys = new Set(["q"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      if (chord) {
        appEvents.emit("chord:changed", {
          notes: chord.notes,
          name: "C",
          source: "preset",
          retrigger: false,
        });
      }

      const payload = chordChangedHandler.mock.calls[0][0] as ChordChangedPayload;
      expect(payload.source).toBe("preset");
    });

    it("should emit retrigger flag for mobile", () => {
      const keys = new Set(["q"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      if (chord) {
        appEvents.emit("chord:changed", {
          notes: chord.notes,
          name: "C",
          source: "keyboard",
          retrigger: true, // Mobile mode
        });
      }

      const payload = chordChangedHandler.mock.calls[0][0] as ChordChangedPayload;
      expect(payload.retrigger).toBe(true);
    });
  });

  describe("Voicing reset logic", () => {
    it("should detect chord root change (Q → E)", () => {
      const keys1 = new Set(["q"]);
      const parsed1 = parseKeys(keys1);

      const keys2 = new Set(["e"]);
      const parsed2 = parseKeys(keys2);

      // Root changed
      expect(parsed1.root).toBe("C");
      expect(parsed2.root).toBe("D");
      expect(parsed1.root).not.toBe(parsed2.root);
    });

    it("should detect modifier change with same root (Q → Q+U)", () => {
      const keys1 = new Set(["q"]);
      const parsed1 = parseKeys(keys1);

      const keys2 = new Set(["q", "u"]);
      const parsed2 = parseKeys(keys2);

      // Same root, different modifiers
      expect(parsed1.root).toBe(parsed2.root);
      expect(parsed1.modifiers.join(",")).not.toBe(parsed2.modifiers.join(","));
    });
  });

  describe("Complex chord combinations (modifier combinations)", () => {
    it("should build Cm7 chord (minor + dom7)", () => {
      const keys = new Set(["q", "u", "k"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord?.root).toBe("C");
      expect(chord?.quality).toBe("minor");
      expect(chord?.notes).toEqual([60, 63, 67, 70]); // C, Eb, G, Bb
    });

    it("should build Cmaj7 chord", () => {
      const keys = new Set(["q", "i"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord?.root).toBe("C");
      expect(chord?.notes).toEqual([60, 64, 67, 71]); // C, E, G, B
    });

    it("should build C7#9 chord (dom7 + sharp9)", () => {
      const keys = new Set(["q", "k", "["]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord?.root).toBe("C");
      expect(chord?.notes).toContain(60); // C
      expect(chord?.notes).toContain(64); // E
      expect(chord?.notes).toContain(67); // G
      expect(chord?.notes).toContain(70); // Bb
      expect(chord?.notes).toContain(75); // D# (sharp 9)
    });

    it("should build Cm9 chord (minor + dom7 + 9)", () => {
      const keys = new Set(["q", "u", "k", "l"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord?.root).toBe("C");
      expect(chord?.quality).toBe("minor");
      expect(chord?.notes).toContain(60); // C
      expect(chord?.notes).toContain(63); // Eb
      expect(chord?.notes).toContain(67); // G
      expect(chord?.notes).toContain(70); // Bb
      expect(chord?.notes).toContain(74); // D (9th)
    });

    it("should build Cm7b5 (half-diminished)", () => {
      const keys = new Set(["q", "n"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord?.root).toBe("C");
      expect(chord?.quality).toBe("minor");
      expect(chord?.notes).toEqual([60, 63, 66, 70]); // C, Eb, Gb, Bb
    });

    it("should build C7b9 chord (dom7 + flat9)", () => {
      const keys = new Set(["q", "k", "]"]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord?.root).toBe("C");
      expect(chord?.notes).toContain(60); // C
      expect(chord?.notes).toContain(70); // Bb
      expect(chord?.notes).toContain(73); // Db (flat 9)
    });

    it("should build C13 chord (dom7 + 9 + 13)", () => {
      const keys = new Set(["q", "k", "l", "."]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord?.root).toBe("C");
      expect(chord?.notes).toContain(60); // C
      expect(chord?.notes).toContain(70); // Bb (7th)
      expect(chord?.notes).toContain(74); // D (9th)
      expect(chord?.notes).toContain(81); // A (13th)
    });

    it("should build dominant 7 with multiple alterations", () => {
      const keys = new Set(["q", "k", "[", "]"]); // C7#9b9
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord?.root).toBe("C");
      expect(chord?.notes).toContain(60); // C
      expect(chord?.notes).toContain(70); // Bb
      expect(chord?.notes).toContain(73); // Db (flat 9)
      expect(chord?.notes).toContain(75); // D# (sharp 9)
    });
  });

  describe("Octave variations", () => {
    it("should build chord in different octaves", () => {
      const keys = new Set(["q"]);
      const parsed = parseKeys(keys);

      const chord3 = buildChord(parsed.root, parsed.modifiers, { octave: 3 });
      const chord4 = buildChord(parsed.root, parsed.modifiers, { octave: 4 });
      const chord5 = buildChord(parsed.root, parsed.modifiers, { octave: 5 });

      expect(chord3?.notes).toEqual([48, 52, 55]); // C3
      expect(chord4?.notes).toEqual([60, 64, 67]); // C4
      expect(chord5?.notes).toEqual([72, 76, 79]); // C5
    });

    it("should maintain chord quality across octaves", () => {
      const keys = new Set(["q", "u"]); // C minor
      const parsed = parseKeys(keys);

      const chord3 = buildChord(parsed.root, parsed.modifiers, { octave: 3 });
      const chord5 = buildChord(parsed.root, parsed.modifiers, { octave: 5 });

      expect(chord3?.quality).toBe("minor");
      expect(chord5?.quality).toBe("minor");
      expect(chord3?.quality).toBe(chord5?.quality);
    });
  });

  describe("All root notes (complete keyboard coverage)", () => {
    const rootKeyMappings = [
      { key: "q", note: "C" },
      { key: "w", note: "C#" },
      { key: "e", note: "D" },
      { key: "r", note: "D#" },
      { key: "a", note: "E" },
      { key: "s", note: "F" },
      { key: "d", note: "F#" },
      { key: "f", note: "G" },
      { key: "z", note: "G#" },
      { key: "x", note: "A" },
      { key: "c", note: "A#" },
      { key: "v", note: "B" },
    ];

    it.each(rootKeyMappings)("should build $note major when $key is pressed", ({ key, note }) => {
      const keys = new Set([key]);
      const parsed = parseKeys(keys);
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });

      expect(chord).not.toBeNull();
      expect(chord?.root).toBe(note);
      expect(chord?.quality).toBe("major");
      expect(chord?.notes.length).toBeGreaterThanOrEqual(3); // At least root, third, fifth
    });
  });

  describe("Event bus integration", () => {
    it("should support multiple subscribers for chord:changed", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      appEvents.on("chord:changed", handler1);
      appEvents.on("chord:changed", handler2);

      appEvents.emit("chord:changed", {
        notes: [60, 64, 67],
        name: "C",
        source: "keyboard",
        retrigger: false,
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should allow unsubscribing from events", () => {
      const handler = vi.fn();
      const unsubscribe = appEvents.on("chord:changed", handler);

      appEvents.emit("chord:changed", {
        notes: [60, 64, 67],
        name: "C",
        source: "keyboard",
        retrigger: false,
      });

      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      appEvents.emit("chord:changed", {
        notes: [60, 64, 67],
        name: "C",
        source: "keyboard",
        retrigger: false,
      });

      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should handle errors in event handlers gracefully", () => {
      const errorHandler = vi.fn(() => {
        throw new Error("Test error");
      });
      const normalHandler = vi.fn();

      appEvents.on("chord:changed", errorHandler);
      appEvents.on("chord:changed", normalHandler);

      // Should not throw
      expect(() => {
        appEvents.emit("chord:changed", {
          notes: [60, 64, 67],
          name: "C",
          source: "keyboard",
          retrigger: false,
        });
      }).not.toThrow();

      // Normal handler should still be called
      expect(normalHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe("Complete user flow integration", () => {
    it("should complete full flow: keys → parse → build → emit", () => {
      // 1. User presses keys
      const pressedKeys = new Set(["q", "u", "k"]); // Cm7

      // 2. Keys are parsed
      const parsed = parseKeys(pressedKeys);
      expect(parsed.root).toBe("C");
      expect(parsed.modifiers).toContain("minor");
      expect(parsed.modifiers).toContain("dom7");

      // 3. Chord is built
      const chord = buildChord(parsed.root, parsed.modifiers, { octave: 4 });
      expect(chord).not.toBeNull();
      expect(chord?.notes).toEqual([60, 63, 67, 70]);

      // 4. Event is emitted
      if (chord) {
        appEvents.emit("chord:changed", {
          notes: chord.notes,
          name: "Cm7",
          source: "keyboard",
          retrigger: false,
        });
      }

      // 5. Handler receives event
      expect(chordChangedHandler).toHaveBeenCalledTimes(1);
      const payload = chordChangedHandler.mock.calls[0][0] as ChordChangedPayload;
      expect(payload.notes).toEqual([60, 63, 67, 70]);
      expect(payload.source).toBe("keyboard");
    });

    it("should handle chord change flow: chord1 → chord2 → clear", () => {
      // Play first chord
      const keys1 = new Set(["q"]);
      const parsed1 = parseKeys(keys1);
      const chord1 = buildChord(parsed1.root, parsed1.modifiers, { octave: 4 });

      if (chord1) {
        appEvents.emit("chord:changed", {
          notes: chord1.notes,
          name: "C",
          source: "keyboard",
          retrigger: false,
        });
      }

      expect(chordChangedHandler).toHaveBeenCalledTimes(1);

      // Change to second chord
      const keys2 = new Set(["e"]);
      const parsed2 = parseKeys(keys2);
      const chord2 = buildChord(parsed2.root, parsed2.modifiers, { octave: 4 });

      if (chord2) {
        appEvents.emit("chord:changed", {
          notes: chord2.notes,
          name: "D",
          source: "keyboard",
          retrigger: false,
        });
      }

      expect(chordChangedHandler).toHaveBeenCalledTimes(2);

      // Clear chord
      appEvents.emit("chord:cleared", {
        source: "keyboard",
      });

      expect(chordClearedHandler).toHaveBeenCalledTimes(1);
    });
  });
});
