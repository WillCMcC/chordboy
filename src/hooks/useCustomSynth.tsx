/**
 * Custom Synth Management Hook
 * Manages custom synthesis engine lifecycle and patch selection.
 *
 * @module hooks/useCustomSynth
 */

import { useRef, useCallback } from "react";
import type { CustomSynthEngine } from "../lib/customSynthEngine";
import type { ADSREnvelope } from "../lib/synthPresets";
import type { useCustomPatches } from "./useCustomPatches";

/**
 * Hook to manage custom synth engine
 */
export function useCustomSynth(
  customPatches: ReturnType<typeof useCustomPatches>,
  isInitialized: boolean
) {
  const customSynthRef = useRef<CustomSynthEngine | null>(null);

  /**
   * Select a custom patch by ID
   * Creates or updates the custom synth engine with the patch
   * Returns true if successful
   */
  const selectCustomPatch = useCallback(
    (patchId: string): boolean => {
      if (!isInitialized) return false;

      const patch = customPatches.patches.find((p) => p.id === patchId);
      if (!patch) return false;

      try {
        // Dispose existing custom synth if present
        if (customSynthRef.current) {
          customSynthRef.current.dispose();
          customSynthRef.current = null;
        }

        // Create new custom synth with patch
        // Note: CustomSynthEngine constructor will be imported dynamically
        // to avoid circular dependencies
        const { createCustomSynthEngine } = require("../lib/customSynthEngine");
        customSynthRef.current = createCustomSynthEngine(patch);

        return true;
      } catch (err) {
        console.error("Failed to create custom synth:", err);
        return false;
      }
    },
    [customPatches.patches, isInitialized]
  );

  /**
   * Update the envelope for the current custom patch
   */
  const updateCustomPatchEnvelope = useCallback(
    (patchId: string, newEnvelope: ADSREnvelope) => {
      const patch = customPatches.patches.find((p) => p.id === patchId);
      if (!patch) return;

      // Update the patch in storage
      customPatches.updatePatch({
        ...patch,
        envelope: newEnvelope,
      });

      // Update the live synth engine if it's the current patch
      if (customSynthRef.current) {
        customSynthRef.current.updateEnvelope(newEnvelope);
      }
    },
    [customPatches]
  );

  /**
   * Get the envelope from a custom patch
   */
  const getCustomPatchEnvelope = useCallback(
    (patchId: string): ADSREnvelope | null => {
      const patch = customPatches.patches.find((p) => p.id === patchId);
      return patch?.envelope ?? null;
    },
    [customPatches.patches]
  );

  /**
   * Dispose of the custom synth
   */
  const disposeCustomSynth = useCallback(() => {
    if (customSynthRef.current) {
      customSynthRef.current.dispose();
      customSynthRef.current = null;
    }
  }, []);

  return {
    customSynthRef,
    selectCustomPatch,
    updateCustomPatchEnvelope,
    getCustomPatchEnvelope,
    disposeCustomSynth,
  };
}
