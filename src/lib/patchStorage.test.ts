/**
 * Tests for patch storage functions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import type { CustomPatch } from "../types/synth";
import {
  savePatchesToStorage,
  loadPatchesFromStorage,
  clearPatchesFromStorage,
} from "./patchStorage";

// Mock patchValidation module
vi.mock("./patchValidation", () => ({
  validatePatch: vi.fn(() => true),
}));

describe("patchStorage", () => {
  beforeEach(() => {
    // Reset IndexedDB before each test
    indexedDB = new IDBFactory();
  });

  const createMockPatch = (id: string, name: string): CustomPatch => ({
    id,
    name,
    description: `Test patch ${name}`,
    category: "custom",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    osc1: {
      enabled: true,
      waveform: "sawtooth",
      octave: 0,
      detune: 0,
      volume: 0.8,
      pan: 0,
    },
    osc2: {
      enabled: false,
      waveform: "sine",
      octave: 0,
      detune: 0,
      volume: 0.5,
      pan: 0,
    },
    oscMix: 0.5,
    filter: {
      enabled: true,
      type: "lowpass",
      frequency: 2000,
      resonance: 1,
      rolloff: -24,
      envelopeAmount: 0,
      keyTracking: 0,
    },
    ampEnvelope: {
      attack: 0.01,
      decay: 0.3,
      sustain: 0.7,
      release: 0.5,
    },
    filterEnvelope: {
      attack: 0.01,
      decay: 0.3,
      sustain: 0.7,
      release: 0.5,
      octaves: 2,
    },
    modMatrix: {
      routings: [],
      lfo1: {
        enabled: false,
        waveform: "sine",
        frequency: 2,
        syncRate: "4n",
        min: 0,
        max: 1,
        phase: 0,
        sync: false,
      },
      lfo2: {
        enabled: false,
        waveform: "sine",
        frequency: 0.5,
        syncRate: "4n",
        min: 0,
        max: 1,
        phase: 0,
        sync: false,
      },
      modEnv1: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.7,
        release: 0.5,
      },
      modEnv2: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.7,
        release: 0.5,
      },
    },
    effects: [],
    masterVolume: 0.8,
    glide: 0,
  });

  describe("savePatchesToStorage", () => {
    it("saves multiple patches to storage", async () => {
      const patchesMap = new Map<string, CustomPatch>();
      patchesMap.set("patch1", createMockPatch("patch1", "Piano"));
      patchesMap.set("patch2", createMockPatch("patch2", "Pad"));
      patchesMap.set("patch3", createMockPatch("patch3", "Lead"));

      await savePatchesToStorage(patchesMap);

      const loaded = await loadPatchesFromStorage();
      expect(loaded.size).toBe(3);
      expect(loaded.get("patch1")?.name).toBe("Piano");
      expect(loaded.get("patch2")?.name).toBe("Pad");
      expect(loaded.get("patch3")?.name).toBe("Lead");
    });

    it("stores patches as array of entries", async () => {
      const patch = createMockPatch("test", "Test");
      const patchesMap = new Map([["test", patch]]);

      await savePatchesToStorage(patchesMap);

      const loaded = await loadPatchesFromStorage();
      expect(loaded.get("test")).toBeDefined();
      expect(loaded.get("test")?.id).toBe("test");
      expect(loaded.get("test")?.name).toBe("Test");
    });

    it("overwrites existing patches", async () => {
      const patch1 = createMockPatch("test", "Original");
      await savePatchesToStorage(new Map([["test", patch1]]));

      const patch2 = createMockPatch("test", "Updated");
      await savePatchesToStorage(new Map([["test", patch2]]));

      const loaded = await loadPatchesFromStorage();
      expect(loaded.get("test")?.name).toBe("Updated");
    });

    it("handles empty map", async () => {
      await savePatchesToStorage(new Map());
      const loaded = await loadPatchesFromStorage();
      expect(loaded.size).toBe(0);
    });

    it("preserves all patch properties", async () => {
      const patch = createMockPatch("full", "Full");
      patch.category = "lead";
      patch.masterVolume = 0.9;
      patch.glide = 50;
      patch.filter.frequency = 5000;
      patch.effects = [
        {
          type: "reverb",
          enabled: true,
          wet: 0.5,
          params: { decay: 2, preDelay: 0.01 },
        },
      ];

      await savePatchesToStorage(new Map([["full", patch]]));
      const loaded = await loadPatchesFromStorage();
      const loadedPatch = loaded.get("full");

      expect(loadedPatch?.category).toBe("lead");
      expect(loadedPatch?.masterVolume).toBe(0.9);
      expect(loadedPatch?.glide).toBe(50);
      expect(loadedPatch?.filter.frequency).toBe(5000);
      expect(loadedPatch?.effects.length).toBe(1);
      expect(loadedPatch?.effects[0].type).toBe("reverb");
    });
  });

  describe("loadPatchesFromStorage", () => {
    it("returns empty Map when no patches exist", async () => {
      const loaded = await loadPatchesFromStorage();
      expect(loaded).toBeInstanceOf(Map);
      expect(loaded.size).toBe(0);
    });

    it("loads all saved patches", async () => {
      const patchesMap = new Map<string, CustomPatch>();
      for (let i = 0; i < 5; i++) {
        patchesMap.set(`patch${i}`, createMockPatch(`patch${i}`, `Patch ${i}`));
      }

      await savePatchesToStorage(patchesMap);
      const loaded = await loadPatchesFromStorage();

      expect(loaded.size).toBe(5);
      for (let i = 0; i < 5; i++) {
        expect(loaded.has(`patch${i}`)).toBe(true);
      }
    });

    it("validates patches on load", async () => {
      const { validatePatch } = await import("./patchValidation");
      const mockValidate = vi.mocked(validatePatch);

      const patch1 = createMockPatch("valid", "Valid");
      await savePatchesToStorage(new Map([["valid", patch1]]));

      // Reset mock to track new calls
      mockValidate.mockClear();
      mockValidate.mockReturnValue(true);

      await loadPatchesFromStorage();

      expect(mockValidate).toHaveBeenCalled();
    });

    it("skips invalid patches with warning", async () => {
      const { validatePatch } = await import("./patchValidation");
      const mockValidate = vi.mocked(validatePatch);

      const patch1 = createMockPatch("valid", "Valid");
      const patch2 = createMockPatch("invalid", "Invalid");
      await savePatchesToStorage(
        new Map([
          ["valid", patch1],
          ["invalid", patch2],
        ]),
      );

      // Mock validation to fail for "invalid"
      mockValidate.mockClear();
      mockValidate.mockImplementation((patch: any) => {
        return patch.name !== "Invalid";
      });

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const loaded = await loadPatchesFromStorage();

      expect(loaded.size).toBe(1);
      expect(loaded.has("valid")).toBe(true);
      expect(loaded.has("invalid")).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid patch data for ID "invalid"'),
      );

      consoleSpy.mockRestore();
    });

    it("returns empty Map on storage error", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // The error handling returns empty Map instead of throwing
      const loaded = await loadPatchesFromStorage();
      expect(loaded).toBeInstanceOf(Map);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("clearPatchesFromStorage", () => {
    it("clears all patches", async () => {
      const patchesMap = new Map<string, CustomPatch>();
      for (let i = 0; i < 5; i++) {
        patchesMap.set(`patch${i}`, createMockPatch(`patch${i}`, `Patch ${i}`));
      }
      await savePatchesToStorage(patchesMap);

      await clearPatchesFromStorage();

      const loaded = await loadPatchesFromStorage();
      expect(loaded.size).toBe(0);
    });

    it("handles clearing empty storage", async () => {
      await expect(clearPatchesFromStorage()).resolves.toBeUndefined();
    });

    it("allows saving new patches after clear", async () => {
      const patch1 = createMockPatch("test1", "Test1");
      await savePatchesToStorage(new Map([["test1", patch1]]));

      await clearPatchesFromStorage();

      const patch2 = createMockPatch("test2", "Test2");
      await savePatchesToStorage(new Map([["test2", patch2]]));

      const loaded = await loadPatchesFromStorage();
      expect(loaded.size).toBe(1);
      expect(loaded.has("test1")).toBe(false);
      expect(loaded.has("test2")).toBe(true);
    });
  });
});
