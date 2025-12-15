/**
 * Tests for preset storage functions
 */

import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import type { Preset } from "../types";
import {
  savePresetsToStorage,
  savePresetToStorage,
  deletePresetFromStorage,
  loadPresetsFromStorage,
  clearPresetsFromStorage,
} from "./presetStorage";

describe("presetStorage", () => {
  beforeEach(() => {
    // Reset IndexedDB before each test
    indexedDB = new IDBFactory();
  });

  const createMockPreset = (octave: number = 4): Preset => ({
    keys: new Set(["q", "u"]),
    octave: octave as 3 | 4 | 5,
    inversionIndex: 0,
    spreadAmount: 0,
    voicingStyle: "close",
  });

  describe("savePresetsToStorage", () => {
    it("saves multiple presets to storage", async () => {
      const presetsMap = new Map<string, Preset>();
      presetsMap.set("1", createMockPreset(3));
      presetsMap.set("2", createMockPreset(4));
      presetsMap.set("3", createMockPreset(5));

      await savePresetsToStorage(presetsMap);

      const loaded = await loadPresetsFromStorage();
      expect(loaded.size).toBe(3);
      expect(loaded.get("1")?.octave).toBe(3);
      expect(loaded.get("2")?.octave).toBe(4);
      expect(loaded.get("3")?.octave).toBe(5);
    });

    it("serializes keys Set to array", async () => {
      const preset = createMockPreset();
      const presetsMap = new Map([["1", preset]]);

      await savePresetsToStorage(presetsMap);

      const loaded = await loadPresetsFromStorage();
      const loadedPreset = loaded.get("1");
      expect(loadedPreset).toBeDefined();
      expect(loadedPreset?.keys).toBeInstanceOf(Set);
      expect(loadedPreset?.keys.has("q")).toBe(true);
      expect(loadedPreset?.keys.has("u")).toBe(true);
    });

    it("overwrites existing presets", async () => {
      const preset1 = createMockPreset(3);
      await savePresetsToStorage(new Map([["1", preset1]]));

      const preset2 = createMockPreset(5);
      await savePresetsToStorage(new Map([["1", preset2]]));

      const loaded = await loadPresetsFromStorage();
      expect(loaded.get("1")?.octave).toBe(5);
    });

    it("handles storage success", async () => {
      const presetsMap = new Map([["1", createMockPreset()]]);

      // Real error handling is tested in the actual code
      await expect(savePresetsToStorage(presetsMap)).resolves.toBeUndefined();
    });
  });

  describe("savePresetToStorage", () => {
    it("saves a single preset atomically", async () => {
      const preset = createMockPreset(4);
      await savePresetToStorage("5", preset);

      const loaded = await loadPresetsFromStorage();
      expect(loaded.get("5")).toBeDefined();
      expect(loaded.get("5")?.octave).toBe(4);
    });

    it("does not affect other presets", async () => {
      await savePresetToStorage("1", createMockPreset(3));
      await savePresetToStorage("2", createMockPreset(4));

      const preset3 = createMockPreset(5);
      await savePresetToStorage("2", preset3);

      const loaded = await loadPresetsFromStorage();
      expect(loaded.get("1")?.octave).toBe(3);
      expect(loaded.get("2")?.octave).toBe(5);
    });

    it("handles concurrent saves to different slots", async () => {
      const promises = [
        savePresetToStorage("1", createMockPreset(3)),
        savePresetToStorage("2", createMockPreset(4)),
        savePresetToStorage("3", createMockPreset(5)),
      ];

      await Promise.all(promises);

      const loaded = await loadPresetsFromStorage();
      expect(loaded.size).toBe(3);
      expect(loaded.get("1")?.octave).toBe(3);
      expect(loaded.get("2")?.octave).toBe(4);
      expect(loaded.get("3")?.octave).toBe(5);
    });
  });

  describe("deletePresetFromStorage", () => {
    it("deletes a specific preset", async () => {
      await savePresetToStorage("1", createMockPreset(3));
      await savePresetToStorage("2", createMockPreset(4));

      await deletePresetFromStorage("1");

      const loaded = await loadPresetsFromStorage();
      expect(loaded.has("1")).toBe(false);
      expect(loaded.has("2")).toBe(true);
    });

    it("handles deleting non-existent preset", async () => {
      await expect(deletePresetFromStorage("999")).resolves.toBeUndefined();
    });
  });

  describe("loadPresetsFromStorage", () => {
    it("returns empty Map when no presets exist", async () => {
      const loaded = await loadPresetsFromStorage();
      expect(loaded).toBeInstanceOf(Map);
      expect(loaded.size).toBe(0);
    });

    it("loads all saved presets", async () => {
      const presetsMap = new Map<string, Preset>();
      for (let i = 0; i <= 9; i++) {
        presetsMap.set(String(i), createMockPreset((3 + (i % 3)) as 3 | 4 | 5));
      }

      await savePresetsToStorage(presetsMap);
      const loaded = await loadPresetsFromStorage();

      expect(loaded.size).toBe(10);
    });

    it("deserializes keys array to Set", async () => {
      const preset = createMockPreset();
      preset.keys = new Set(["q", "u", "j"]);
      await savePresetToStorage("1", preset);

      const loaded = await loadPresetsFromStorage();
      const loadedPreset = loaded.get("1");
      expect(loadedPreset?.keys).toBeInstanceOf(Set);
      expect(loadedPreset?.keys.size).toBe(3);
      expect(loadedPreset?.keys.has("q")).toBe(true);
      expect(loadedPreset?.keys.has("u")).toBe(true);
      expect(loadedPreset?.keys.has("j")).toBe(true);
    });

    it("handles legacy format migration", async () => {
      // Manually insert legacy format data
      const { initDB, STORE_NAMES } = await import("./dbUtils");
      const db = await initDB();
      const transaction = db.transaction([STORE_NAMES.PRESETS], "readwrite");
      const store = transaction.objectStore(STORE_NAMES.PRESETS);

      const legacyData = [
        ["1", { keys: ["q", "j"], octave: 4, inversionIndex: 0 }],
        ["2", { keys: ["w", "u"], octave: 3, inversionIndex: 1 }],
      ];

      store.put(legacyData, "chordPresets");

      await new Promise<void>((resolve) => {
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
      });

      // Load and verify migration
      const loaded = await loadPresetsFromStorage();
      expect(loaded.size).toBe(2);
      expect(loaded.get("1")?.keys).toBeInstanceOf(Set);
      expect(loaded.get("1")?.keys.has("q")).toBe(true);
      expect(loaded.get("2")?.octave).toBe(3);
    });

    it("returns empty Map on error", async () => {
      // Force an error by corrupting the database
      const { initDB, STORE_NAMES } = await import("./dbUtils");
      const db = await initDB();
      const transaction = db.transaction([STORE_NAMES.PRESETS], "readwrite");
      const store = transaction.objectStore(STORE_NAMES.PRESETS);

      // Store invalid data
      store.put("not an array or object", "chordPresets");

      await new Promise<void>((resolve) => {
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
      });

      const loaded = await loadPresetsFromStorage();
      expect(loaded).toBeInstanceOf(Map);
      expect(loaded.size).toBe(0);
    });
  });

  describe("clearPresetsFromStorage", () => {
    it("clears all presets", async () => {
      const presetsMap = new Map<string, Preset>();
      for (let i = 0; i <= 9; i++) {
        presetsMap.set(String(i), createMockPreset());
      }
      await savePresetsToStorage(presetsMap);

      await clearPresetsFromStorage();

      const loaded = await loadPresetsFromStorage();
      expect(loaded.size).toBe(0);
    });

    it("clears both new and legacy format", async () => {
      // Save new format
      await savePresetToStorage("1", createMockPreset());

      // Save legacy format
      const { initDB, STORE_NAMES } = await import("./dbUtils");
      const db = await initDB();
      const transaction = db.transaction([STORE_NAMES.PRESETS], "readwrite");
      const store = transaction.objectStore(STORE_NAMES.PRESETS);
      store.put([["2", { keys: ["q"], octave: 4 }]], "chordPresets");

      await new Promise<void>((resolve) => {
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
      });

      await clearPresetsFromStorage();

      const loaded = await loadPresetsFromStorage();
      expect(loaded.size).toBe(0);
    });

    it("handles clearing empty storage", async () => {
      await expect(clearPresetsFromStorage()).resolves.toBeUndefined();
    });
  });
});
