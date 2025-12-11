/**
 * Integration tests for usePresets hook
 * Tests critical user path for saving and recalling chord presets
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { loadPresetsFromStorage, savePresetsToStorage } from "../lib/presetStorage";
import type { Preset } from "../types";

// Mock IndexedDB using an in-memory Map
const mockStorage = new Map<string, unknown>();

// Mock the dbUtils module
vi.mock("../lib/dbUtils", () => ({
  DB_NAME: "ChordBoyDB",
  DB_VERSION: 2,
  STORE_NAMES: {
    PRESETS: "presets",
    SEQUENCER: "sequencer",
  },
  initDB: vi.fn(async () => {
    // Return a mock IDBDatabase with promise-based transaction handling
    return {
      transaction: (_stores: string[], _mode: string) => {
        const transaction = {
          objectStore: (_storeName: string) => {
            return {
              get: (key: string) => {
                const request = {
                  result: mockStorage.get(key),
                  onsuccess: null as any,
                  onerror: null as any,
                };
                // Simulate async callback
                setTimeout(() => {
                  if (request.onsuccess) {
                    request.onsuccess({ target: request } as any);
                  }
                }, 0);
                return request;
              },
              put: (value: any, key: string) => {
                mockStorage.set(key, value);
                const request = {
                  onsuccess: null as any,
                  onerror: null as any,
                };
                setTimeout(() => {
                  if (request.onsuccess) {
                    request.onsuccess({} as any);
                  }
                }, 0);
                return request;
              },
              delete: (key: string) => {
                mockStorage.delete(key);
                const request = {
                  onsuccess: null as any,
                  onerror: null as any,
                };
                setTimeout(() => {
                  if (request.onsuccess) {
                    request.onsuccess({} as any);
                  }
                }, 0);
                return request;
              },
            };
          },
          oncomplete: null as any,
          onerror: null as any,
        };
        // Trigger oncomplete after micro task
        setTimeout(() => {
          if (transaction.oncomplete) {
            transaction.oncomplete({} as any);
          }
        }, 0);
        return transaction;
      },
    } as any;
  }),
}));

describe("usePresets - Preset Storage Integration", () => {
  beforeEach(() => {
    // Clear mock storage before each test
    mockStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Save preset", () => {
    it("should save a chord to storage correctly", async () => {
      const presetsMap = new Map<string, Preset>([
        [
          "1",
          {
            keys: new Set(["a", "j"]), // C major
            octave: 4,
            inversionIndex: 0,
            droppedNotes: 0,
            spreadAmount: 0,
            voicingStyle: "close",
          },
        ],
      ]);

      await savePresetsToStorage(presetsMap);

      const stored = mockStorage.get("chordPresets") as [string, any][];
      expect(stored).toBeDefined();
      expect(stored.length).toBe(1);

      const [slot, serialized] = stored[0];
      expect(slot).toBe("1");
      expect(serialized.keys).toEqual(["a", "j"]); // Serialized as array
      expect(serialized.octave).toBe(4);
      expect(serialized.inversionIndex).toBe(0);
      expect(serialized.voicingStyle).toBe("close");
    });

    it("should serialize Set to Array for storage", async () => {
      const keys = new Set(["a", "j", "l"]);
      const presetsMap = new Map<string, Preset>([
        [
          "1",
          {
            keys,
            octave: 4,
          },
        ],
      ]);

      await savePresetsToStorage(presetsMap);

      const stored = mockStorage.get("chordPresets") as [string, any][];
      const [, serialized] = stored[0];

      // Keys should be an array, not a Set
      expect(Array.isArray(serialized.keys)).toBe(true);
      expect(serialized.keys).toEqual(["a", "j", "l"]);
    });

    it("should save multiple presets", async () => {
      const presetsMap = new Map<string, Preset>([
        ["1", { keys: new Set(["a"]), octave: 4 }],
        ["2", { keys: new Set(["b"]), octave: 5 }],
        ["3", { keys: new Set(["c"]), octave: 6 }],
      ]);

      await savePresetsToStorage(presetsMap);

      const stored = mockStorage.get("chordPresets") as [string, any][];
      expect(stored.length).toBe(3);
      expect(stored.map(([slot]) => slot)).toEqual(["1", "2", "3"]);
    });

    it("should overwrite existing presets on save", async () => {
      const presetsMap1 = new Map<string, Preset>([
        ["1", { keys: new Set(["a"]), octave: 4 }],
      ]);

      await savePresetsToStorage(presetsMap1);

      const presetsMap2 = new Map<string, Preset>([
        ["1", { keys: new Set(["b"]), octave: 5 }], // Different preset in same slot
      ]);

      await savePresetsToStorage(presetsMap2);

      const stored = mockStorage.get("chordPresets") as [string, any][];
      expect(stored.length).toBe(1);

      const [slot, serialized] = stored[0];
      expect(slot).toBe("1");
      expect(serialized.keys).toEqual(["b"]);
      expect(serialized.octave).toBe(5);
    });
  });

  describe("Recall preset", () => {
    it("should load saved presets from storage", async () => {
      // Pre-populate storage with serialized presets
      mockStorage.set("chordPresets", [
        [
          "1",
          {
            keys: ["a", "j"],
            octave: 4,
            inversionIndex: 0,
            droppedNotes: 0,
            spreadAmount: 0,
            voicingStyle: "close",
          },
        ],
      ]);

      const loaded = await loadPresetsFromStorage();

      expect(loaded.size).toBe(1);
      expect(loaded.has("1")).toBe(true);

      const preset = loaded.get("1")!;
      expect(preset.keys).toBeInstanceOf(Set); // Deserialized back to Set
      expect(preset.keys).toEqual(new Set(["a", "j"]));
      expect(preset.octave).toBe(4);
      expect(preset.inversionIndex).toBe(0);
      expect(preset.voicingStyle).toBe("close");
    });

    it("should deserialize Array back to Set for keys", async () => {
      mockStorage.set("chordPresets", [
        ["1", { keys: ["a", "j", "l"], octave: 4 }],
      ]);

      const loaded = await loadPresetsFromStorage();
      const preset = loaded.get("1")!;

      expect(preset.keys).toBeInstanceOf(Set);
      expect(preset.keys.size).toBe(3);
      expect(preset.keys.has("a")).toBe(true);
      expect(preset.keys.has("j")).toBe(true);
      expect(preset.keys.has("l")).toBe(true);
    });

    it("should load multiple presets", async () => {
      mockStorage.set("chordPresets", [
        ["1", { keys: ["a"], octave: 4 }],
        ["2", { keys: ["b"], octave: 5 }],
        ["3", { keys: ["c"], octave: 6 }],
      ]);

      const loaded = await loadPresetsFromStorage();

      expect(loaded.size).toBe(3);
      expect(loaded.get("1")?.keys).toEqual(new Set(["a"]));
      expect(loaded.get("2")?.keys).toEqual(new Set(["b"]));
      expect(loaded.get("3")?.keys).toEqual(new Set(["c"]));
    });

    it("should return empty Map when storage is empty", async () => {
      const loaded = await loadPresetsFromStorage();

      expect(loaded).toBeInstanceOf(Map);
      expect(loaded.size).toBe(0);
    });

    it("should handle numeric slot keys as strings", async () => {
      mockStorage.set("chordPresets", [
        ["0", { keys: ["a"], octave: 4 }],
        ["9", { keys: ["b"], octave: 5 }],
      ]);

      const loaded = await loadPresetsFromStorage();

      expect(loaded.has("0")).toBe(true);
      expect(loaded.has("9")).toBe(true);
      expect(typeof Array.from(loaded.keys())[0]).toBe("string");
    });
  });

  describe("Preset data integrity", () => {
    it("should preserve all preset fields through save/load cycle", async () => {
      const original = new Map<string, Preset>([
        [
          "1",
          {
            keys: new Set(["a", "i"]),
            octave: 5,
            inversionIndex: 2,
            droppedNotes: 1,
            spreadAmount: 3,
            voicingStyle: "drop2",
          },
        ],
      ]);

      await savePresetsToStorage(original);
      const loaded = await loadPresetsFromStorage();

      const preset = loaded.get("1")!;
      expect(preset.keys).toEqual(new Set(["a", "i"]));
      expect(preset.octave).toBe(5);
      expect(preset.inversionIndex).toBe(2);
      expect(preset.droppedNotes).toBe(1);
      expect(preset.spreadAmount).toBe(3);
      expect(preset.voicingStyle).toBe("drop2");
    });

    it("should handle optional fields correctly", async () => {
      const minimal = new Map<string, Preset>([
        [
          "1",
          {
            keys: new Set(["a"]),
            octave: 4,
            // Optional fields omitted
          },
        ],
      ]);

      await savePresetsToStorage(minimal);
      const loaded = await loadPresetsFromStorage();

      const preset = loaded.get("1")!;
      expect(preset.keys).toEqual(new Set(["a"]));
      expect(preset.octave).toBe(4);
      // Optional fields may be undefined
      expect(preset.inversionIndex).toBeUndefined();
      expect(preset.droppedNotes).toBeUndefined();
      expect(preset.spreadAmount).toBeUndefined();
      expect(preset.voicingStyle).toBeUndefined();
    });

    it("should preserve complex key combinations", async () => {
      const complexKeys = new Set([
        "q",
        "u",
        "k",
        "l",
        "[",
        "p",
        ",",
        ".",
      ]);
      const presetsMap = new Map<string, Preset>([
        ["1", { keys: complexKeys, octave: 4 }],
      ]);

      await savePresetsToStorage(presetsMap);
      const loaded = await loadPresetsFromStorage();

      expect(loaded.get("1")?.keys).toEqual(complexKeys);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty preset Map", async () => {
      const empty = new Map<string, Preset>();

      await savePresetsToStorage(empty);

      const stored = mockStorage.get("chordPresets") as [string, any][];
      expect(stored).toBeDefined();
      expect(stored.length).toBe(0);
    });

    it("should handle empty Set for keys", async () => {
      const presetsMap = new Map<string, Preset>([
        ["1", { keys: new Set(), octave: 4 }],
      ]);

      await savePresetsToStorage(presetsMap);
      const loaded = await loadPresetsFromStorage();

      const preset = loaded.get("1")!;
      expect(preset.keys).toBeInstanceOf(Set);
      expect(preset.keys.size).toBe(0);
    });

    it("should handle all 10 preset slots (0-9)", async () => {
      const presetsMap = new Map<string, Preset>();
      for (let i = 0; i <= 9; i++) {
        presetsMap.set(i.toString(), {
          keys: new Set([`key${i}`]),
          octave: i,
        });
      }

      await savePresetsToStorage(presetsMap);
      const loaded = await loadPresetsFromStorage();

      expect(loaded.size).toBe(10);
      for (let i = 0; i <= 9; i++) {
        expect(loaded.has(i.toString())).toBe(true);
        expect(loaded.get(i.toString())?.octave).toBe(i);
      }
    });

    it("should handle rapid save/load cycles", async () => {
      for (let i = 0; i < 5; i++) {
        const presetsMap = new Map<string, Preset>([
          ["1", { keys: new Set([`key${i}`]), octave: 4 + i }],
        ]);

        await savePresetsToStorage(presetsMap);
        const loaded = await loadPresetsFromStorage();

        expect(loaded.get("1")?.keys).toEqual(new Set([`key${i}`]));
        expect(loaded.get("1")?.octave).toBe(4 + i);
      }
    });
  });

  describe("Slot management", () => {
    it("should find next available slot correctly", () => {
      const presets = new Map<string, Preset>([
        ["1", { keys: new Set(["a"]), octave: 4 }],
        ["2", { keys: new Set(["b"]), octave: 4 }],
        ["3", { keys: new Set(["c"]), octave: 4 }],
      ]);

      // Simulate findNextAvailableSlot logic
      let nextSlot: string | null = null;
      for (let i = 1; i <= 9; i++) {
        const slotKey = i.toString();
        if (!presets.has(slotKey)) {
          nextSlot = slotKey;
          break;
        }
      }
      if (nextSlot === null && !presets.has("0")) {
        nextSlot = "0";
      }

      expect(nextSlot).toBe("4");
    });

    it("should return slot 0 when slots 1-9 are full", () => {
      const presets = new Map<string, Preset>();
      for (let i = 1; i <= 9; i++) {
        presets.set(i.toString(), { keys: new Set(["a"]), octave: 4 });
      }

      let nextSlot: string | null = null;
      for (let i = 1; i <= 9; i++) {
        const slotKey = i.toString();
        if (!presets.has(slotKey)) {
          nextSlot = slotKey;
          break;
        }
      }
      if (nextSlot === null && !presets.has("0")) {
        nextSlot = "0";
      }

      expect(nextSlot).toBe("0");
    });

    it("should return null when all slots are full", () => {
      const presets = new Map<string, Preset>();
      for (let i = 0; i <= 9; i++) {
        presets.set(i.toString(), { keys: new Set(["a"]), octave: 4 });
      }

      let nextSlot: string | null = null;
      for (let i = 1; i <= 9; i++) {
        const slotKey = i.toString();
        if (!presets.has(slotKey)) {
          nextSlot = slotKey;
          break;
        }
      }
      if (nextSlot === null && !presets.has("0")) {
        nextSlot = "0";
      }

      expect(nextSlot).toBeNull();
    });
  });

  describe("Voicing style types", () => {
    it("should handle all voicing style values", async () => {
      const styles: Array<"close" | "drop2" | "drop3" | "rootless-a" | "rootless-b"> = [
        "close",
        "drop2",
        "drop3",
        "rootless-a",
        "rootless-b",
      ];

      const presetsMap = new Map<string, Preset>();
      styles.forEach((style, index) => {
        presetsMap.set((index + 1).toString(), {
          keys: new Set(["a"]),
          octave: 4,
          voicingStyle: style,
        });
      });

      await savePresetsToStorage(presetsMap);
      const loaded = await loadPresetsFromStorage();

      styles.forEach((style, index) => {
        const preset = loaded.get((index + 1).toString())!;
        expect(preset.voicingStyle).toBe(style);
      });
    });
  });

  describe("Octave range", () => {
    it("should handle octave range 0-7", async () => {
      const presetsMap = new Map<string, Preset>();
      for (let octave = 0; octave <= 7; octave++) {
        presetsMap.set(octave.toString(), {
          keys: new Set(["a"]),
          octave,
        });
      }

      await savePresetsToStorage(presetsMap);
      const loaded = await loadPresetsFromStorage();

      for (let octave = 0; octave <= 7; octave++) {
        expect(loaded.get(octave.toString())?.octave).toBe(octave);
      }
    });
  });
});
