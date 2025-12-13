/**
 * useCustomPatches Hook
 * Manages custom synth patch storage, creation, and persistence to IndexedDB.
 * Provides operations for creating, editing, duplicating, and managing patches.
 *
 * Architecture Note:
 * Uses useAsyncStorage for persistence, which handles load-on-mount
 * and save-on-change in a single consolidated pattern.
 * Combines factory patches (read-only) with user patches in a unified library.
 *
 * @module hooks/useCustomPatches
 */

import { useCallback, useMemo, useRef } from "react";
import {
  loadPatchesFromStorage,
  savePatchesToStorage,
} from "../lib/patchStorage";
import { createDefaultPatch, getFactoryPatches } from "../lib/defaultPatch";
import { useAsyncStorage } from "./usePersistence";
import type { CustomPatch, PatchLibraryEntry, PatchCategory } from "../types/synth";

/** Return type for useCustomPatches */
export interface UseCustomPatchesReturn {
  // State
  patches: Map<string, CustomPatch>;
  isLoaded: boolean;

  // Combined library (factory + custom)
  patchLibrary: PatchLibraryEntry[];

  // Actions
  savePatch: (patch: CustomPatch) => void;
  createNewPatch: (name?: string) => CustomPatch;
  duplicatePatch: (patchId: string, newName: string) => CustomPatch | null;
  deletePatch: (patchId: string) => void;
  renamePatch: (patchId: string, newName: string) => void;
  getPatch: (patchId: string) => CustomPatch | null;
}

/**
 * Hook for managing custom synth patches with persistence.
 *
 * @returns Patch management functions and state
 *
 * @example
 * const {
 *   patches,
 *   patchLibrary,
 *   createNewPatch,
 *   savePatch,
 *   deletePatch,
 * } = useCustomPatches();
 */
export function useCustomPatches(): UseCustomPatchesReturn {
  // Memoize storage functions to prevent re-subscriptions
  const storageConfig = useMemo(
    () => ({
      load: loadPatchesFromStorage,
      save: savePatchesToStorage,
      initialValue: new Map<string, CustomPatch>(),
      debounceMs: 300, // Debounce saves to avoid excessive writes
    }),
    []
  );

  // Use async storage for patch persistence
  const {
    value: patches,
    setValue: setPatches,
    isLoaded,
  } = useAsyncStorage(storageConfig);

  // Ref to always have current patches (avoids stale closure issues)
  const patchesRef = useRef<Map<string, CustomPatch>>(patches);
  patchesRef.current = patches;

  // Memoize factory patches (these are read-only presets)
  const factoryPatches = useMemo(() => getFactoryPatches(), []);

  /**
   * Combined library of factory patches and user patches
   * Factory patches come first, then user patches, sorted by category and name
   */
  const patchLibrary = useMemo((): PatchLibraryEntry[] => {
    // Factory patch entries
    const factoryEntries: PatchLibraryEntry[] = factoryPatches.map((patch) => ({
      id: patch.id,
      name: patch.name,
      category: patch.category,
      isFactory: true,
      updatedAt: patch.updatedAt,
    }));

    // User patch entries
    const userEntries: PatchLibraryEntry[] = Array.from(patches.values()).map(
      (patch) => ({
        id: patch.id,
        name: patch.name,
        category: patch.category,
        isFactory: false,
        updatedAt: patch.updatedAt,
      })
    );

    // Combine and sort by category, then name
    const allEntries = [...factoryEntries, ...userEntries];

    // Category order for sorting
    const categoryOrder: Record<PatchCategory, number> = {
      keys: 0,
      pad: 1,
      lead: 2,
      bass: 3,
      fx: 4,
      custom: 5,
    };

    return allEntries.sort((a, b) => {
      // First sort by category
      const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
      if (categoryDiff !== 0) return categoryDiff;
      // Then sort by name
      return a.name.localeCompare(b.name);
    });
  }, [factoryPatches, patches]);

  /**
   * Get a patch by ID from either factory or user patches
   * Uses patchesRef to always get current state.
   */
  const getPatch = useCallback(
    (patchId: string): CustomPatch | null => {
      // Check factory patches first
      const factoryPatch = factoryPatches.find((p) => p.id === patchId);
      if (factoryPatch) {
        return factoryPatch;
      }

      // Check user patches
      const currentPatches = patchesRef.current;
      return currentPatches.get(patchId) ?? null;
    },
    [factoryPatches]
  );

  /**
   * Save or update a custom patch
   */
  const savePatch = useCallback(
    (patch: CustomPatch): void => {
      setPatches((prev) => {
        const newPatches = new Map(prev);
        newPatches.set(patch.id, {
          ...patch,
          updatedAt: Date.now(),
        });
        return newPatches;
      });
    },
    [setPatches]
  );

  /**
   * Create a new patch with default values
   */
  const createNewPatch = useCallback((name?: string): CustomPatch => {
    const newPatch = createDefaultPatch(name);
    setPatches((prev) => {
      const newPatches = new Map(prev);
      newPatches.set(newPatch.id, newPatch);
      return newPatches;
    });
    return newPatch;
  }, [setPatches]);

  /**
   * Duplicate an existing patch with a new name and ID
   * Uses patchesRef to always get current state.
   */
  const duplicatePatch = useCallback(
    (patchId: string, newName: string): CustomPatch | null => {
      const sourcePatch = getPatch(patchId);
      if (!sourcePatch) {
        return null;
      }

      const now = Date.now();
      const duplicatedPatch: CustomPatch = {
        ...sourcePatch,
        id: crypto.randomUUID(),
        name: newName,
        createdAt: now,
        updatedAt: now,
        // Deep copy nested objects to avoid shared references
        osc1: { ...sourcePatch.osc1 },
        osc2: { ...sourcePatch.osc2 },
        filter: { ...sourcePatch.filter },
        ampEnvelope: { ...sourcePatch.ampEnvelope },
        filterEnvelope: { ...sourcePatch.filterEnvelope },
        modMatrix: {
          routings: sourcePatch.modMatrix.routings.map((r) => ({ ...r })),
          lfo1: { ...sourcePatch.modMatrix.lfo1 },
          lfo2: { ...sourcePatch.modMatrix.lfo2 },
          modEnv1: { ...sourcePatch.modMatrix.modEnv1 },
          modEnv2: { ...sourcePatch.modMatrix.modEnv2 },
        },
        effects: sourcePatch.effects.map((e) => ({
          ...e,
          params: { ...e.params },
        })),
      };

      setPatches((prev) => {
        const newPatches = new Map(prev);
        newPatches.set(duplicatedPatch.id, duplicatedPatch);
        return newPatches;
      });

      return duplicatedPatch;
    },
    [getPatch, setPatches]
  );

  /**
   * Delete a custom patch
   * Factory patches cannot be deleted
   */
  const deletePatch = useCallback(
    (patchId: string): void => {
      setPatches((prev) => {
        const newPatches = new Map(prev);
        newPatches.delete(patchId);
        return newPatches;
      });
    },
    [setPatches]
  );

  /**
   * Rename an existing patch
   * Uses patchesRef to always get current state.
   */
  const renamePatch = useCallback(
    (patchId: string, newName: string): void => {
      setPatches((prev) => {
        const newPatches = new Map(prev);
        const existingPatch = newPatches.get(patchId);

        if (existingPatch) {
          newPatches.set(patchId, {
            ...existingPatch,
            name: newName,
            updatedAt: Date.now(),
          });
        }

        return newPatches;
      });
    },
    [setPatches]
  );

  return {
    // State
    patches,
    isLoaded,

    // Combined library
    patchLibrary,

    // Actions
    savePatch,
    createNewPatch,
    duplicatePatch,
    deletePatch,
    renamePatch,
    getPatch,
  };
}
