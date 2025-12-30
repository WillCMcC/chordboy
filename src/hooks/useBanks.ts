/**
 * useBanks Hook
 * Manages chord bank storage, switching, and persistence to IndexedDB.
 * Works alongside usePresets to provide bank-level organization.
 *
 * @module hooks/useBanks
 */

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useAsyncStorage } from "./usePersistence";
import {
  loadBanksFromStorage,
  saveBanksToStorage,
  loadActiveBankId,
  saveActiveBankId,
  migrateExistingPresets,
  DEFAULT_BANK_ID,
  DEFAULT_BANK_NAME,
} from "../lib/bankStorage";
import type { ChordBank, ChordBankEntry, Preset } from "../types";

/** Return type for useBanks hook */
export interface UseBanksReturn {
  /** Map of all banks by ID */
  banks: Map<string, ChordBank>;
  /** ID of currently active bank */
  activeBankId: string;
  /** Currently active bank data, or null if not loaded */
  activeBank: ChordBank | null;
  /** Sorted list of bank entries for UI display */
  bankList: ChordBankEntry[];
  /** True when banks and active bank ID are loaded */
  isLoaded: boolean;

  /** Create a new bank with the given name */
  createBank: (name: string) => ChordBank;
  /** Rename an existing bank */
  renameBank: (bankId: string, newName: string) => void;
  /** Delete a bank (returns false if it's the last bank) */
  deleteBank: (bankId: string) => boolean;
  /** Duplicate a bank with a new name */
  duplicateBank: (bankId: string, newName: string) => ChordBank | null;
  /** Switch to a different bank */
  switchBank: (bankId: string) => void;
  /** Update the presets in the active bank */
  updateBankPresets: (presets: Map<string, Preset>) => void;
}

/**
 * Hook for managing chord banks.
 * Provides CRUD operations for banks and coordinates with preset system.
 */
export function useBanks(): UseBanksReturn {
  // Banks storage with async persistence
  const loadBanks = useCallback(() => loadBanksFromStorage(), []);
  const saveBanks = useCallback(
    (banks: Map<string, ChordBank>) => saveBanksToStorage(banks),
    []
  );

  const {
    value: banks,
    setValue: setBanks,
    isLoaded: banksLoaded,
  } = useAsyncStorage({
    load: loadBanks,
    save: saveBanks,
    initialValue: new Map<string, ChordBank>(),
    debounceMs: 300,
  });

  // Track active bank ID separately (simpler storage)
  const [activeBankId, setActiveBankId] = useState<string>(DEFAULT_BANK_ID);
  const [activeBankLoaded, setActiveBankLoaded] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);

  // Ref for accessing current banks in callbacks
  const banksRef = useRef(banks);
  banksRef.current = banks;

  // Run migration on first load
  useEffect(() => {
    if (!migrationDone) {
      migrateExistingPresets()
        .then((migratedBank) => {
          if (migratedBank) {
            // Reload banks after migration
            loadBanksFromStorage().then((loadedBanks) => {
              setBanks(loadedBanks);
            });
          }
          setMigrationDone(true);
        })
        .catch(console.error);
    }
  }, [migrationDone, setBanks]);

  // Load active bank ID on mount
  useEffect(() => {
    loadActiveBankId()
      .then((id) => {
        if (id) {
          setActiveBankId(id);
        }
        setActiveBankLoaded(true);
      })
      .catch(() => {
        setActiveBankLoaded(true);
      });
  }, []);

  // Persist active bank ID changes
  useEffect(() => {
    if (activeBankLoaded) {
      saveActiveBankId(activeBankId).catch(console.error);
    }
  }, [activeBankId, activeBankLoaded]);

  // Create default bank if none exist after initial load
  useEffect(() => {
    if (banksLoaded && migrationDone && banks.size === 0) {
      const defaultBank: ChordBank = {
        id: DEFAULT_BANK_ID,
        name: DEFAULT_BANK_NAME,
        presets: new Map(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setBanks(new Map([[DEFAULT_BANK_ID, defaultBank]]));
    }
  }, [banksLoaded, migrationDone, banks.size, setBanks]);

  const isLoaded = banksLoaded && activeBankLoaded && migrationDone;

  // Active bank reference
  const activeBank = useMemo(
    () => banks.get(activeBankId) ?? null,
    [banks, activeBankId]
  );

  // Bank list for UI dropdown (sorted by name)
  const bankList = useMemo((): ChordBankEntry[] => {
    return Array.from(banks.values())
      .map((bank) => ({
        id: bank.id,
        name: bank.name,
        presetCount: bank.presets.size,
        updatedAt: bank.updatedAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [banks]);

  // Create a new bank
  const createBank = useCallback(
    (name: string): ChordBank => {
      const newBank: ChordBank = {
        id: crypto.randomUUID(),
        name,
        presets: new Map(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setBanks((prev) => new Map(prev).set(newBank.id, newBank));
      return newBank;
    },
    [setBanks]
  );

  // Rename a bank
  const renameBank = useCallback(
    (bankId: string, newName: string): void => {
      setBanks((prev) => {
        const newBanks = new Map(prev);
        const bank = newBanks.get(bankId);
        if (bank) {
          newBanks.set(bankId, {
            ...bank,
            name: newName,
            updatedAt: Date.now(),
          });
        }
        return newBanks;
      });
    },
    [setBanks]
  );

  // Delete a bank (cannot delete if it's the only one)
  const deleteBank = useCallback(
    (bankId: string): boolean => {
      const currentBanks = banksRef.current;
      if (currentBanks.size <= 1) {
        return false;
      }

      setBanks((prev) => {
        const newBanks = new Map(prev);
        newBanks.delete(bankId);
        return newBanks;
      });

      // Switch to another bank if deleting the active one
      if (activeBankId === bankId) {
        const remainingBanks = Array.from(banksRef.current.keys()).filter(
          (id) => id !== bankId
        );
        if (remainingBanks.length > 0) {
          setActiveBankId(remainingBanks[0]);
        }
      }

      return true;
    },
    [activeBankId, setBanks]
  );

  // Duplicate a bank
  const duplicateBank = useCallback(
    (bankId: string, newName: string): ChordBank | null => {
      const sourceBank = banksRef.current.get(bankId);
      if (!sourceBank) {
        return null;
      }

      // Deep copy presets (Set<string> needs to be cloned)
      const copiedPresets = new Map<string, Preset>();
      for (const [slot, preset] of sourceBank.presets.entries()) {
        copiedPresets.set(slot, {
          ...preset,
          keys: new Set(preset.keys),
        });
      }

      const newBank: ChordBank = {
        id: crypto.randomUUID(),
        name: newName,
        presets: copiedPresets,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setBanks((prev) => new Map(prev).set(newBank.id, newBank));
      return newBank;
    },
    [setBanks]
  );

  // Switch active bank
  const switchBank = useCallback((bankId: string): void => {
    if (banksRef.current.has(bankId)) {
      setActiveBankId(bankId);
    }
  }, []);

  // Update presets in active bank (called when preset changes)
  const updateBankPresets = useCallback(
    (presets: Map<string, Preset>): void => {
      setBanks((prev) => {
        const newBanks = new Map(prev);
        const bank = newBanks.get(activeBankId);
        if (bank) {
          // Deep copy presets to avoid mutation issues
          const copiedPresets = new Map<string, Preset>();
          for (const [slot, preset] of presets.entries()) {
            copiedPresets.set(slot, {
              ...preset,
              keys: new Set(preset.keys),
            });
          }
          newBanks.set(activeBankId, {
            ...bank,
            presets: copiedPresets,
            updatedAt: Date.now(),
          });
        }
        return newBanks;
      });
    },
    [activeBankId, setBanks]
  );

  return {
    banks,
    activeBankId,
    activeBank,
    bankList,
    isLoaded,
    createBank,
    renameBank,
    deleteBank,
    duplicateBank,
    switchBank,
    updateBankPresets,
  };
}
