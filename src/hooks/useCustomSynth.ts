/**
 * Custom Synth Management Hook
 * Manages custom synth engine lifecycle and patch updates.
 *
 * @module hooks/useCustomSynth
 */

import { useRef, useEffect, useCallback } from "react";
import { CustomSynthEngine } from "../lib/customSynthEngine";
import { enableSynthDebug } from "../lib/synthDebug";
import type { ADSREnvelope } from "../lib/synthPresets";
import type { useCustomPatches } from "./useCustomPatches";

/**
 * Hook for managing custom synth engine
 */
export function useCustomSynth(
  customPatches: ReturnType<typeof useCustomPatches>,
  isInitialized: boolean
) {
  const customSynthRef = useRef<CustomSynthEngine | null>(null);
  const lastPatchUpdateRef = useRef<number>(0);

  /**
   * Dispose of the custom synth
   */
  const disposeCustomSynth = useCallback(() => {
    if (customSynthRef.current) {
      customSynthRef.current.dispose();
      customSynthRef.current = null;
    }
  }, []);

  /**
   * Select a custom patch by ID
   */
  const selectCustomPatch = useCallback(
    (patchId: string): boolean => {
      const patch = customPatches.getPatch(patchId);
      if (!patch) {
        console.warn(`Custom patch not found: ${patchId}`);
        return false;
      }

      // Initialize audio context if needed (block until ready)
      if (!isInitialized) {
        console.error("Audio context not initialized. Cannot load custom patch.");
        return false;
      }

      // Dispose existing custom synth
      if (customSynthRef.current) {
        customSynthRef.current.dispose();
        customSynthRef.current = null;
      }

      // Create new custom synth engine
      // Note: CustomSynthEngine manages its own output chain and connects to destination
      customSynthRef.current = new CustomSynthEngine(patch);
      lastPatchUpdateRef.current = patch.updatedAt;

      // Enable debug hooks for E2E testing (development only)
      enableSynthDebug(customSynthRef.current);

      return true;
    },
    [customPatches, isInitialized]
  );

  /**
   * Update custom synth envelope
   */
  const updateCustomPatchEnvelope = useCallback(
    (patchId: string, newEnvelope: ADSREnvelope): void => {
      const patch = customPatches.getPatch(patchId);
      if (patch) {
        const updatedPatch = {
          ...patch,
          ampEnvelope: {
            ...patch.ampEnvelope,
            attack: newEnvelope.attack,
            decay: newEnvelope.decay,
            sustain: newEnvelope.sustain,
            release: newEnvelope.release,
          },
          updatedAt: Date.now(),
        };
        customPatches.savePatch(updatedPatch);
        // The useEffect watching customPatches.patches will update the synth
      }
    },
    [customPatches]
  );

  /**
   * Get envelope from custom patch
   */
  const getCustomPatchEnvelope = useCallback(
    (patchId: string): ADSREnvelope | null => {
      const patch = customPatches.getPatch(patchId);
      if (patch) {
        return {
          attack: patch.ampEnvelope.attack,
          decay: patch.ampEnvelope.decay,
          sustain: patch.ampEnvelope.sustain,
          release: patch.ampEnvelope.release,
        };
      }
      return null;
    },
    [customPatches]
  );

  /**
   * Update custom synth when patch is modified
   * Use a ref to track last patch update to avoid unnecessary rebuilds
   */
  useEffect(() => {
    if (customSynthRef.current && isInitialized) {
      // Check if any active patch has been updated
      const patches = customPatches.patches;

      // Find if we need to update the synth based on patch modifications
      for (const patch of patches) {
        if (patch.updatedAt > lastPatchUpdateRef.current) {
          // Check if this is the patch our current synth is using
          // We need to compare against the synth's internal patch
          const currentPatch = customSynthRef.current.getPatch?.();
          if (currentPatch && currentPatch.id === patch.id) {
            customSynthRef.current.updatePatch(patch);
            lastPatchUpdateRef.current = patch.updatedAt;
            break;
          }
        }
      }
    }
  }, [customPatches.patches, isInitialized]);

  return {
    customSynthRef,
    selectCustomPatch,
    updateCustomPatchEnvelope,
    getCustomPatchEnvelope,
    disposeCustomSynth,
  };
}
