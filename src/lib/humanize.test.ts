/**
 * Unit tests for Humanize Module
 * Tests timing humanization for natural-sounding MIDI note playback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getHumanizeOffsets,
  createHumanizeManager,
  MAX_HUMANIZE_DELAY,
} from "./humanize";

describe("Humanize Module", () => {
  describe("Constants", () => {
    it("should export MAX_HUMANIZE_DELAY constant", () => {
      expect(MAX_HUMANIZE_DELAY).toBe(150);
    });
  });

  describe("getHumanizeOffsets - Basic Functionality", () => {
    it("should return zero offsets when humanizeAmount is 0", () => {
      const offsets = getHumanizeOffsets(4, 0);

      expect(offsets).toEqual([0, 0, 0, 0]);
      expect(offsets.length).toBe(4);
    });

    it("should return zero offsets for single note", () => {
      const offsets = getHumanizeOffsets(1, 50);

      expect(offsets).toEqual([0]);
      expect(offsets.length).toBe(1);
    });

    it("should return empty array for zero notes", () => {
      const offsets = getHumanizeOffsets(0, 50);

      expect(offsets).toEqual([]);
      expect(offsets.length).toBe(0);
    });

    it("should return array with correct length", () => {
      const offsets = getHumanizeOffsets(5, 50);

      expect(offsets.length).toBe(5);
    });
  });

  describe("getHumanizeOffsets - Humanization Amounts", () => {
    it("should generate offsets up to maxDelay at 100% humanization", () => {
      const offsets = getHumanizeOffsets(10, 100);

      // All offsets should be between 0 and MAX_HUMANIZE_DELAY
      offsets.forEach((offset) => {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(MAX_HUMANIZE_DELAY);
      });
    });

    it("should generate offsets up to half maxDelay at 50% humanization", () => {
      const offsets = getHumanizeOffsets(10, 50);
      const expectedMaxDelay = (50 / 100) * MAX_HUMANIZE_DELAY;

      offsets.forEach((offset) => {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(expectedMaxDelay);
      });
    });

    it("should generate smaller offsets at 25% humanization", () => {
      const offsets = getHumanizeOffsets(10, 25);
      const expectedMaxDelay = (25 / 100) * MAX_HUMANIZE_DELAY;

      offsets.forEach((offset) => {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(expectedMaxDelay);
      });
    });

    it("should scale offsets proportionally to humanizeAmount", () => {
      // Test that 100% humanization produces larger offsets than 50%
      const offsets100 = getHumanizeOffsets(100, 100);
      const offsets50 = getHumanizeOffsets(100, 50);

      const avg100 =
        offsets100.reduce((sum, v) => sum + v, 0) / offsets100.length;
      const avg50 = offsets50.reduce((sum, v) => sum + v, 0) / offsets50.length;

      // Average offset at 100% should be roughly double that at 50%
      // Allow some variance due to randomness
      expect(avg100).toBeGreaterThan(avg50 * 1.5);
    });
  });

  describe("getHumanizeOffsets - Randomness", () => {
    beforeEach(() => {
      // Seed random for predictable tests
      vi.spyOn(Math, "random");
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should generate different offsets on each call", () => {
      const offsets1 = getHumanizeOffsets(5, 50);
      const offsets2 = getHumanizeOffsets(5, 50);

      // Should be different due to randomness
      // (extremely unlikely to be identical)
      expect(offsets1).not.toEqual(offsets2);
    });

    it("should use triangular distribution (sum of two random values)", () => {
      // Mock Math.random to return known values
      let callCount = 0;
      const randomValues = [0.2, 0.8, 0.4, 0.6, 0.1, 0.9];

      vi.mocked(Math.random).mockImplementation(() => {
        const value = randomValues[callCount % randomValues.length];
        callCount++;
        return value;
      });

      const offsets = getHumanizeOffsets(3, 100);

      // Triangular = (r1 + r2) / 2
      // First offset: (0.2 + 0.8) / 2 * 150 = 0.5 * 150 = 75
      // Second offset: (0.4 + 0.6) / 2 * 150 = 0.5 * 150 = 75
      // Third offset: (0.1 + 0.9) / 2 * 150 = 0.5 * 150 = 75
      expect(offsets[0]).toBe(75);
      expect(offsets[1]).toBe(75);
      expect(offsets[2]).toBe(75);
    });

    it("should call Math.random twice per note for triangular distribution", () => {
      const noteCount = 5;
      getHumanizeOffsets(noteCount, 50);

      // Should call Math.random twice per note (triangular distribution)
      expect(Math.random).toHaveBeenCalledTimes(noteCount * 2);
    });
  });

  describe("getHumanizeOffsets - Edge Cases", () => {
    it("should handle negative humanizeAmount", () => {
      const offsets = getHumanizeOffsets(4, -10);
      const expectedMaxDelay = (-10 / 100) * MAX_HUMANIZE_DELAY; // Negative delay

      // Negative values produce negative offsets
      offsets.forEach((offset) => {
        expect(offset).toBeLessThanOrEqual(0);
        expect(offset).toBeGreaterThanOrEqual(expectedMaxDelay);
      });
    });

    it("should handle very large humanizeAmount (>100%)", () => {
      const offsets = getHumanizeOffsets(5, 200);
      const expectedMaxDelay = (200 / 100) * MAX_HUMANIZE_DELAY; // 300ms

      offsets.forEach((offset) => {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(expectedMaxDelay);
      });
    });

    it("should handle large note counts", () => {
      const offsets = getHumanizeOffsets(100, 50);

      expect(offsets.length).toBe(100);
      offsets.forEach((offset) => {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(75); // 50% of 150ms
      });
    });

    it("should handle very small humanizeAmount", () => {
      const offsets = getHumanizeOffsets(5, 1);
      const expectedMaxDelay = (1 / 100) * MAX_HUMANIZE_DELAY; // 1.5ms

      offsets.forEach((offset) => {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(expectedMaxDelay);
      });
    });
  });

  describe("getHumanizeOffsets - Statistical Distribution", () => {
    it("should cluster values toward center (triangular distribution)", () => {
      // Generate many samples to test distribution
      const samples = 10000;
      const allOffsets = getHumanizeOffsets(samples, 100);

      // For triangular distribution (average of two uniforms),
      // mean should be around maxDelay/2 and values cluster toward center
      const mean = allOffsets.reduce((sum, v) => sum + v, 0) / samples;
      const expectedMean = MAX_HUMANIZE_DELAY / 2;

      // Mean should be close to expected (within 5%)
      expect(mean).toBeGreaterThan(expectedMean * 0.95);
      expect(mean).toBeLessThan(expectedMean * 1.05);

      // Values should be distributed across the full range
      const min = Math.min(...allOffsets);
      const max = Math.max(...allOffsets);
      expect(min).toBeLessThan(MAX_HUMANIZE_DELAY * 0.2);
      expect(max).toBeGreaterThan(MAX_HUMANIZE_DELAY * 0.8);
    });
  });
});

describe("HumanizeManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("createHumanizeManager - Basic Functionality", () => {
    it("should create a manager with schedule and clear methods", () => {
      const manager = createHumanizeManager();

      expect(manager).toHaveProperty("schedule");
      expect(manager).toHaveProperty("clear");
      expect(typeof manager.schedule).toBe("function");
      expect(typeof manager.clear).toBe("function");
    });

    it("should execute callback immediately when delay is 0", () => {
      const manager = createHumanizeManager();
      const callback = vi.fn();

      manager.schedule(callback, 0);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should schedule callback with delay", () => {
      const manager = createHumanizeManager();
      const callback = vi.fn();

      manager.schedule(callback, 100);

      // Should not execute immediately
      expect(callback).not.toHaveBeenCalled();

      // Fast-forward time
      vi.advanceTimersByTime(99);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should schedule multiple callbacks", () => {
      const manager = createHumanizeManager();
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      manager.schedule(callback1, 50);
      manager.schedule(callback2, 100);
      manager.schedule(callback3, 150);

      // Advance to 50ms
      vi.advanceTimersByTime(50);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();

      // Advance to 100ms
      vi.advanceTimersByTime(50);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).not.toHaveBeenCalled();

      // Advance to 150ms
      vi.advanceTimersByTime(50);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });
  });

  describe("createHumanizeManager - Clear Functionality", () => {
    it("should clear pending timeouts", () => {
      const manager = createHumanizeManager();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.schedule(callback1, 100);
      manager.schedule(callback2, 200);

      // Clear before any timeouts fire
      manager.clear();

      // Advance time past all scheduled callbacks
      vi.advanceTimersByTime(300);

      // Callbacks should not have been called
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it("should allow scheduling after clear", () => {
      const manager = createHumanizeManager();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.schedule(callback1, 100);
      manager.clear();

      // Schedule new callback after clear
      manager.schedule(callback2, 50);

      vi.advanceTimersByTime(50);
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it("should clear multiple pending timeouts", () => {
      const manager = createHumanizeManager();
      const callbacks = Array.from({ length: 10 }, () => vi.fn());

      callbacks.forEach((callback, i) => {
        manager.schedule(callback, (i + 1) * 10);
      });

      manager.clear();
      vi.advanceTimersByTime(200);

      callbacks.forEach((callback) => {
        expect(callback).not.toHaveBeenCalled();
      });
    });

    it("should not affect already-executed callbacks", () => {
      const manager = createHumanizeManager();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.schedule(callback1, 50);
      manager.schedule(callback2, 100);

      // Wait for first callback to execute
      vi.advanceTimersByTime(50);
      expect(callback1).toHaveBeenCalledTimes(1);

      // Clear remaining timeouts
      manager.clear();

      // Advance past second callback
      vi.advanceTimersByTime(100);

      // First callback already executed, second should not
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe("createHumanizeManager - Chord Change Scenario", () => {
    it("should clear pending notes when chord changes", () => {
      const manager = createHumanizeManager();

      // Simulate playing a chord with humanization
      const note1 = vi.fn();
      const note2 = vi.fn();
      const note3 = vi.fn();

      manager.schedule(note1, 0); // Plays immediately
      manager.schedule(note2, 25);
      manager.schedule(note3, 67);

      // First note plays immediately
      expect(note1).toHaveBeenCalledTimes(1);

      // User changes chord before other notes play
      manager.clear();

      // Advance time
      vi.advanceTimersByTime(100);

      // Only first note should have played
      expect(note1).toHaveBeenCalledTimes(1);
      expect(note2).not.toHaveBeenCalled();
      expect(note3).not.toHaveBeenCalled();
    });

    it("should handle rapid chord changes", () => {
      const manager = createHumanizeManager();

      // First chord
      const chord1 = [vi.fn(), vi.fn(), vi.fn()];
      chord1.forEach((fn, i) => manager.schedule(fn, i * 20));

      vi.advanceTimersByTime(10);

      // Clear and play second chord
      manager.clear();
      const chord2 = [vi.fn(), vi.fn(), vi.fn()];
      chord2.forEach((fn, i) => manager.schedule(fn, i * 20));

      vi.advanceTimersByTime(10);

      // Clear and play third chord
      manager.clear();
      const chord3 = [vi.fn(), vi.fn(), vi.fn()];
      chord3.forEach((fn, i) => manager.schedule(fn, i * 20));

      // Let third chord play out
      vi.advanceTimersByTime(100);

      // Only third chord should have fully executed
      chord3.forEach((fn) => expect(fn).toHaveBeenCalled());
    });
  });

  describe("createHumanizeManager - Real-world Usage", () => {
    it("should simulate humanized chord playback", () => {
      const manager = createHumanizeManager();
      const playNote = vi.fn((note: number) => `Playing note ${note}`);

      // Simulate a C major chord with humanization
      const notes = [60, 64, 67]; // C, E, G
      const offsets = [0, 23, 45]; // Humanized offsets

      notes.forEach((note, i) => {
        manager.schedule(() => playNote(note), offsets[i]);
      });

      // Advance time incrementally
      vi.advanceTimersByTime(10);
      expect(playNote).toHaveBeenCalledTimes(1);
      expect(playNote).toHaveBeenCalledWith(60);

      vi.advanceTimersByTime(15);
      expect(playNote).toHaveBeenCalledTimes(2);
      expect(playNote).toHaveBeenCalledWith(64);

      vi.advanceTimersByTime(25);
      expect(playNote).toHaveBeenCalledTimes(3);
      expect(playNote).toHaveBeenCalledWith(67);
    });

    it("should handle chord release with manager", () => {
      const manager = createHumanizeManager();
      const noteOn = vi.fn();
      const noteOff = vi.fn();

      // Play chord with humanization
      const notes = [60, 64, 67];
      const offsets = [0, 20, 40];

      notes.forEach((note, i) => {
        manager.schedule(() => noteOn(note), offsets[i]);
      });

      // User releases chord before all notes trigger
      vi.advanceTimersByTime(30);
      manager.clear();

      // Simulate note-off for already-playing notes
      noteOff(60);
      noteOff(64);

      vi.advanceTimersByTime(50);

      // Only first two notes should have triggered
      expect(noteOn).toHaveBeenCalledTimes(2);
      expect(noteOff).toHaveBeenCalledTimes(2);
    });
  });

  describe("createHumanizeManager - Edge Cases", () => {
    it("should handle clearing when no callbacks are scheduled", () => {
      const manager = createHumanizeManager();

      expect(() => {
        manager.clear();
      }).not.toThrow();
    });

    it("should handle calling clear multiple times", () => {
      const manager = createHumanizeManager();
      const callback = vi.fn();

      manager.schedule(callback, 100);
      manager.clear();
      manager.clear();
      manager.clear();

      vi.advanceTimersByTime(200);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle zero delay scheduling", () => {
      const manager = createHumanizeManager();
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      callbacks.forEach((callback) => {
        manager.schedule(callback, 0);
      });

      // All should execute immediately
      callbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });

    it("should isolate multiple manager instances", () => {
      const manager1 = createHumanizeManager();
      const manager2 = createHumanizeManager();

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager1.schedule(callback1, 100);
      manager2.schedule(callback2, 100);

      // Clear only manager1
      manager1.clear();

      vi.advanceTimersByTime(100);

      // Only manager2's callback should execute
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });
});
