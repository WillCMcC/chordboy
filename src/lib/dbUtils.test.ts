/**
 * Tests for IndexedDB utility functions
 */

import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { initDB, DB_NAME, DB_VERSION, STORE_NAMES } from "./dbUtils";

describe("dbUtils", () => {
  beforeEach(() => {
    // Reset IndexedDB before each test
    indexedDB = new IDBFactory();
  });

  describe("initDB", () => {
    it("creates database with correct name and version", async () => {
      const db = await initDB();
      expect(db.name).toBe(DB_NAME);
      expect(db.version).toBe(DB_VERSION);
      db.close();
    });

    it("creates all required object stores", async () => {
      const db = await initDB();
      expect(db.objectStoreNames.contains(STORE_NAMES.PRESETS)).toBe(true);
      expect(db.objectStoreNames.contains(STORE_NAMES.SEQUENCER)).toBe(true);
      expect(db.objectStoreNames.contains(STORE_NAMES.PATCHES)).toBe(true);
      expect(db.objectStoreNames.contains(STORE_NAMES.BANKS)).toBe(true);
      db.close();
    });

    it("handles multiple calls without error", async () => {
      const db1 = await initDB();
      const db2 = await initDB();
      expect(db1.name).toBe(DB_NAME);
      expect(db2.name).toBe(DB_NAME);
      db1.close();
      db2.close();
    });

    it("handles version upgrades correctly", async () => {
      // Create database with old version
      const oldRequest = indexedDB.open(DB_NAME, 2);
      await new Promise<void>((resolve, reject) => {
        oldRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAMES.PRESETS)) {
            db.createObjectStore(STORE_NAMES.PRESETS);
          }
          if (!db.objectStoreNames.contains(STORE_NAMES.SEQUENCER)) {
            db.createObjectStore(STORE_NAMES.SEQUENCER);
          }
        };
        oldRequest.onsuccess = () => {
          oldRequest.result.close();
          resolve();
        };
        oldRequest.onerror = () => reject(oldRequest.error);
      });

      // Upgrade to new version
      const db = await initDB();
      expect(db.version).toBe(DB_VERSION);
      expect(db.objectStoreNames.contains(STORE_NAMES.PATCHES)).toBe(true);
      db.close();
    });

    it("rejects on database open failure", async () => {
      // Mock indexedDB.open to simulate failure
      const originalOpen = indexedDB.open;
      indexedDB.open = (() => {
        const request = {
          error: new Error("Database access denied"),
          onerror: null as ((ev: Event) => any) | null,
        } as unknown as IDBOpenDBRequest;
        setTimeout(() => {
          if (request.onerror) {
            request.onerror(new Event("error"));
          }
        }, 0);
        return request;
      }) as typeof indexedDB.open;

      await expect(initDB()).rejects.toThrow();

      // Restore original
      indexedDB.open = originalOpen;
    });
  });

  describe("STORE_NAMES", () => {
    it("exports correct store name constants", () => {
      expect(STORE_NAMES.PRESETS).toBe("presets");
      expect(STORE_NAMES.SEQUENCER).toBe("sequencer");
      expect(STORE_NAMES.PATCHES).toBe("patches");
      expect(STORE_NAMES.BANKS).toBe("banks");
    });
  });

  describe("DB_VERSION", () => {
    it("is version 4", () => {
      expect(DB_VERSION).toBe(4);
    });
  });

  describe("DB_NAME", () => {
    it("is ChordBoyDB", () => {
      expect(DB_NAME).toBe("ChordBoyDB");
    });
  });
});
