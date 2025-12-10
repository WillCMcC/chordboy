import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEventBus } from "./eventBus";
import type { EventBus, ChordChangedPayload, ChordClearedPayload, GraceNotePayload } from "../types";

describe("eventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = createEventBus();
  });

  describe("Basic event delivery", () => {
    it("should deliver events to all subscribers", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      bus.on("chord:changed", handler1);
      bus.on("chord:changed", handler2);
      bus.on("chord:changed", handler3);

      const payload: ChordChangedPayload = {
        notes: [60, 64, 67],
        name: "C",
        source: "test",
      };

      bus.emit("chord:changed", payload);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith(payload);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith(payload);
      expect(handler3).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledWith(payload);
    });

    it("should deliver events in the order handlers were registered", () => {
      const callOrder: number[] = [];

      bus.on("chord:changed", () => callOrder.push(1));
      bus.on("chord:changed", () => callOrder.push(2));
      bus.on("chord:changed", () => callOrder.push(3));

      bus.emit("chord:changed", { notes: [60], name: "C", source: "test" });

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it("should not call handlers for events they didn't subscribe to", () => {
      const chordHandler = vi.fn();
      const clearHandler = vi.fn();

      bus.on("chord:changed", chordHandler);
      bus.on("chord:cleared", clearHandler);

      bus.emit("chord:changed", { notes: [60], name: "C" });

      expect(chordHandler).toHaveBeenCalledTimes(1);
      expect(clearHandler).not.toHaveBeenCalled();
    });

    it("should handle emitting events with no subscribers", () => {
      expect(() => {
        bus.emit("chord:changed", { notes: [60], name: "C" });
      }).not.toThrow();
    });
  });

  describe("Subscription cleanup", () => {
    it("should remove handler when unsubscribe function is called", () => {
      const handler = vi.fn();
      const unsubscribe = bus.on("chord:changed", handler);

      bus.emit("chord:changed", { notes: [60], name: "C" });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      bus.emit("chord:changed", { notes: [64], name: "E" });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should remove correct handler when multiple handlers exist", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      bus.on("chord:changed", handler1);
      const unsubscribe2 = bus.on("chord:changed", handler2);
      bus.on("chord:changed", handler3);

      unsubscribe2();

      bus.emit("chord:changed", { notes: [60], name: "C" });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it("should allow calling unsubscribe multiple times safely", () => {
      const handler = vi.fn();
      const unsubscribe = bus.on("chord:changed", handler);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();

      bus.emit("chord:changed", { notes: [60], name: "C" });
      expect(handler).not.toHaveBeenCalled();
    });

    it("should remove handler via off method", () => {
      const handler = vi.fn();
      bus.on("chord:changed", handler);

      bus.off("chord:changed", handler);

      bus.emit("chord:changed", { notes: [60], name: "C" });
      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle off for non-existent handler gracefully", () => {
      const handler = vi.fn();

      expect(() => {
        bus.off("chord:changed", handler);
      }).not.toThrow();
    });
  });

  describe("Error handling", () => {
    it("should continue calling handlers if one throws an error", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn(() => {
        throw new Error("Handler 2 error");
      });
      const handler3 = vi.fn();

      bus.on("chord:changed", handler1);
      bus.on("chord:changed", handler2);
      bus.on("chord:changed", handler3);

      // Mock console.error to suppress error output during test
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      bus.emit("chord:changed", { notes: [60], name: "C" });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in event handler for "chord:changed":',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should log errors with the correct event name", () => {
      const errorHandler = vi.fn(() => {
        throw new Error("Test error");
      });

      bus.on("grace:note", errorHandler);

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      bus.emit("grace:note", { notes: [60], indices: [0], pattern: "single" });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in event handler for "grace:note":',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should allow subsequent emissions after a handler error", () => {
      const errorHandler = vi.fn(() => {
        throw new Error("Test error");
      });
      const normalHandler = vi.fn();

      bus.on("chord:changed", errorHandler);
      bus.on("chord:changed", normalHandler);

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      bus.emit("chord:changed", { notes: [60], name: "C" });
      bus.emit("chord:changed", { notes: [64], name: "E" });

      expect(errorHandler).toHaveBeenCalledTimes(2);
      expect(normalHandler).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Multiple event types", () => {
    it("should handle different event types independently", () => {
      const chordChangedHandler = vi.fn();
      const chordClearedHandler = vi.fn();
      const graceNoteHandler = vi.fn();

      bus.on("chord:changed", chordChangedHandler);
      bus.on("chord:cleared", chordClearedHandler);
      bus.on("grace:note", graceNoteHandler);

      const chordPayload: ChordChangedPayload = { notes: [60, 64, 67], name: "C" };
      const clearPayload: ChordClearedPayload = { source: "keyboard" };
      const gracePayload: GraceNotePayload = {
        notes: [60],
        indices: [0],
        pattern: "single",
      };

      bus.emit("chord:changed", chordPayload);
      bus.emit("chord:cleared", clearPayload);
      bus.emit("grace:note", gracePayload);

      expect(chordChangedHandler).toHaveBeenCalledTimes(1);
      expect(chordChangedHandler).toHaveBeenCalledWith(chordPayload);

      expect(chordClearedHandler).toHaveBeenCalledTimes(1);
      expect(chordClearedHandler).toHaveBeenCalledWith(clearPayload);

      expect(graceNoteHandler).toHaveBeenCalledTimes(1);
      expect(graceNoteHandler).toHaveBeenCalledWith(gracePayload);
    });

    it("should allow same handler function for different event types", () => {
      const handler = vi.fn();

      bus.on("chord:changed", handler);
      bus.on("chord:cleared", handler);

      bus.emit("chord:changed", { notes: [60], name: "C" });
      bus.emit("chord:cleared", { source: "test" });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("should unsubscribe from one event type without affecting others", () => {
      const handler = vi.fn();

      const unsubChordChanged = bus.on("chord:changed", handler);
      bus.on("chord:cleared", handler);

      unsubChordChanged();

      bus.emit("chord:changed", { notes: [60], name: "C" });
      bus.emit("chord:cleared", { source: "test" });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ source: "test" });
    });
  });

  describe("Event payload handling", () => {
    it("should pass chord:changed payload with all fields", () => {
      const handler = vi.fn();
      bus.on("chord:changed", handler);

      const payload: ChordChangedPayload = {
        notes: [60, 64, 67, 70],
        name: "Cmaj7",
        source: "keyboard",
        retrigger: true,
      };

      bus.emit("chord:changed", payload);

      expect(handler).toHaveBeenCalledWith(payload);
      expect(handler.mock.calls[0][0]).toEqual({
        notes: [60, 64, 67, 70],
        name: "Cmaj7",
        source: "keyboard",
        retrigger: true,
      });
    });

    it("should pass grace:note payload with correct structure", () => {
      const handler = vi.fn();
      bus.on("grace:note", handler);

      const payload: GraceNotePayload = {
        notes: [60, 64],
        indices: [0, 1],
        pattern: "pair",
      };

      bus.emit("grace:note", payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });

    it("should pass voicing:changed payload with all fields", () => {
      const handler = vi.fn();
      bus.on("voicing:changed", handler);

      const payload = {
        inversion: 1,
        drop: "drop2" as const,
        spread: 2,
        octave: 0,
      };

      bus.emit("voicing:changed", payload);

      expect(handler).toHaveBeenCalledWith(payload);
    });

    it("should preserve payload reference (not deep clone)", () => {
      const handler = vi.fn();
      bus.on("chord:changed", handler);

      const notes = [60, 64, 67];
      const payload: ChordChangedPayload = {
        notes,
        name: "C",
      };

      bus.emit("chord:changed", payload);

      // Should be the same array reference
      expect(handler.mock.calls[0][0].notes).toBe(notes);
    });

    it("should handle empty arrays in payloads", () => {
      const handler = vi.fn();
      bus.on("chord:changed", handler);

      const payload: ChordChangedPayload = {
        notes: [],
        name: "",
      };

      bus.emit("chord:changed", payload);

      expect(handler).toHaveBeenCalledWith(payload);
      expect(handler.mock.calls[0][0].notes).toEqual([]);
    });
  });

  describe("once method", () => {
    it("should call handler only once then auto-unsubscribe", () => {
      const handler = vi.fn();
      bus.once("chord:changed", handler);

      bus.emit("chord:changed", { notes: [60], name: "C" });
      bus.emit("chord:changed", { notes: [64], name: "E" });
      bus.emit("chord:changed", { notes: [67], name: "G" });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ notes: [60], name: "C" });
    });

    it("should allow manual unsubscribe before first emission", () => {
      const handler = vi.fn();
      const unsubscribe = bus.once("chord:changed", handler);

      unsubscribe();

      bus.emit("chord:changed", { notes: [60], name: "C" });

      expect(handler).not.toHaveBeenCalled();
    });

    it("should work alongside regular on subscriptions", () => {
      const onceHandler = vi.fn();
      const regularHandler = vi.fn();

      bus.once("chord:changed", onceHandler);
      bus.on("chord:changed", regularHandler);

      bus.emit("chord:changed", { notes: [60], name: "C" });
      bus.emit("chord:changed", { notes: [64], name: "E" });

      expect(onceHandler).toHaveBeenCalledTimes(1);
      expect(regularHandler).toHaveBeenCalledTimes(2);
    });

    it("should handle errors in once handlers without preventing auto-unsubscribe", () => {
      const handler = vi.fn(() => {
        throw new Error("Test error");
      });

      bus.once("chord:changed", handler);

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      bus.emit("chord:changed", { notes: [60], name: "C" });
      bus.emit("chord:changed", { notes: [64], name: "E" });

      expect(handler).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("clear method", () => {
    it("should clear all listeners for a specific event", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const otherHandler = vi.fn();

      bus.on("chord:changed", handler1);
      bus.on("chord:changed", handler2);
      bus.on("chord:cleared", otherHandler);

      bus.clear("chord:changed");

      bus.emit("chord:changed", { notes: [60], name: "C" });
      bus.emit("chord:cleared", { source: "test" });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(otherHandler).toHaveBeenCalledTimes(1);
    });

    it("should clear all listeners for all events when no event specified", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      bus.on("chord:changed", handler1);
      bus.on("chord:cleared", handler2);
      bus.on("grace:note", handler3);

      bus.clear();

      bus.emit("chord:changed", { notes: [60], name: "C" });
      bus.emit("chord:cleared", { source: "test" });
      bus.emit("grace:note", { notes: [60], indices: [0], pattern: "single" });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();
    });

    it("should handle clearing non-existent event gracefully", () => {
      expect(() => {
        bus.clear("chord:changed");
      }).not.toThrow();
    });
  });

  describe("listenerCount method", () => {
    it("should return 0 for events with no listeners", () => {
      expect(bus.listenerCount("chord:changed")).toBe(0);
    });

    it("should return correct count after adding listeners", () => {
      bus.on("chord:changed", vi.fn());
      expect(bus.listenerCount("chord:changed")).toBe(1);

      bus.on("chord:changed", vi.fn());
      expect(bus.listenerCount("chord:changed")).toBe(2);

      bus.on("chord:changed", vi.fn());
      expect(bus.listenerCount("chord:changed")).toBe(3);
    });

    it("should decrement count after unsubscribing", () => {
      const unsub1 = bus.on("chord:changed", vi.fn());
      const unsub2 = bus.on("chord:changed", vi.fn());
      const unsub3 = bus.on("chord:changed", vi.fn());

      expect(bus.listenerCount("chord:changed")).toBe(3);

      unsub2();
      expect(bus.listenerCount("chord:changed")).toBe(2);

      unsub1();
      expect(bus.listenerCount("chord:changed")).toBe(1);

      unsub3();
      expect(bus.listenerCount("chord:changed")).toBe(0);
    });

    it("should return 0 after clearing event listeners", () => {
      bus.on("chord:changed", vi.fn());
      bus.on("chord:changed", vi.fn());

      expect(bus.listenerCount("chord:changed")).toBe(2);

      bus.clear("chord:changed");

      expect(bus.listenerCount("chord:changed")).toBe(0);
    });

    it("should track counts independently for different events", () => {
      bus.on("chord:changed", vi.fn());
      bus.on("chord:changed", vi.fn());
      bus.on("chord:cleared", vi.fn());

      expect(bus.listenerCount("chord:changed")).toBe(2);
      expect(bus.listenerCount("chord:cleared")).toBe(1);
      expect(bus.listenerCount("grace:note")).toBe(0);
    });
  });

  describe("Integration scenarios", () => {
    it("should support typical chord engine -> MIDI flow", () => {
      const chordChangedHandler = vi.fn();
      const chordClearedHandler = vi.fn();

      bus.on("chord:changed", chordChangedHandler);
      bus.on("chord:cleared", chordClearedHandler);

      // Simulate chord engine emitting chord
      bus.emit("chord:changed", {
        notes: [60, 64, 67],
        name: "C",
        source: "keyboard",
      });

      expect(chordChangedHandler).toHaveBeenCalledTimes(1);

      // Simulate all keys released
      bus.emit("chord:cleared", { source: "keyboard" });

      expect(chordClearedHandler).toHaveBeenCalledTimes(1);
    });

    it("should support preset system event flow", () => {
      const presetSavedHandler = vi.fn();
      const presetRecalledHandler = vi.fn();
      const chordChangedHandler = vi.fn();

      bus.on("preset:saved", presetSavedHandler);
      bus.on("preset:recalled", presetRecalledHandler);
      bus.on("chord:changed", chordChangedHandler);

      // Save preset
      bus.emit("preset:saved", {
        slot: 0,
        keys: new Set(["q", "j"]),
        voicing: { inversion: 0, drop: "none", spread: 0, octave: 0 },
      });

      expect(presetSavedHandler).toHaveBeenCalledTimes(1);

      // Recall preset (which should trigger chord:changed)
      bus.emit("preset:recalled", {
        slot: 0,
        preset: {
          keys: ["q", "j"],
          voicing: { inversion: 0, drop: "none", spread: 0, octave: 0 },
        },
      });

      bus.emit("chord:changed", {
        notes: [60, 64, 67],
        name: "C",
        source: "preset",
      });

      expect(presetRecalledHandler).toHaveBeenCalledTimes(1);
      expect(chordChangedHandler).toHaveBeenCalledTimes(1);
    });

    it("should support grace note pattern with existing chord", () => {
      const graceNoteHandler = vi.fn();
      const chordChangedHandler = vi.fn();

      bus.on("grace:note", graceNoteHandler);
      bus.on("chord:changed", chordChangedHandler);

      // Initial chord
      bus.emit("chord:changed", {
        notes: [60, 64, 67, 71],
        name: "Cmaj7",
        source: "keyboard",
      });

      // Grace note retrigger
      bus.emit("grace:note", {
        notes: [60, 64],
        indices: [0, 1],
        pattern: "pair",
      });

      expect(chordChangedHandler).toHaveBeenCalledTimes(1);
      expect(graceNoteHandler).toHaveBeenCalledTimes(1);
    });

    it("should handle rapid successive events without issues", () => {
      const handler = vi.fn();
      bus.on("chord:changed", handler);

      // Simulate rapid key changes
      for (let i = 0; i < 50; i++) {
        bus.emit("chord:changed", { notes: [60 + i], name: `Note ${i}` });
      }

      expect(handler).toHaveBeenCalledTimes(50);
    });

    it("should support multiple independent bus instances", () => {
      const bus2 = createEventBus();

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on("chord:changed", handler1);
      bus2.on("chord:changed", handler2);

      bus.emit("chord:changed", { notes: [60], name: "C" });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();

      bus2.emit("chord:changed", { notes: [64], name: "E" });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });
});
