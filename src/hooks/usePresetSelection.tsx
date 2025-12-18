/**
 * Preset Selection Hook
 * Manages switching between factory presets and custom patches.
 *
 * @module hooks/usePresetSelection
 */

import { useState, useCallback } from "react";
import { getPresetById } from "../lib/synthPresets";
import type { ADSREnvelope } from "../lib/synthPresets";

/**
 * Hook to manage preset/patch selection state
 */
export function usePresetSelection(
  initialPresetId: string,
  initialEnvelope: ADSREnvelope,
  disposeCustomSynth: () => void,
  disposeFactorySynth: () => void,
  selectCustomPatchInternal: (patchId: string) => boolean,
  onPresetChange?: (presetId: string, envelope: ADSREnvelope) => void
) {
  const [currentPresetId, setCurrentPresetId] = useState(initialPresetId);
  const [isCustomPatch, setIsCustomPatch] = useState(false);
  const [customPatchId, setCustomPatchId] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<ADSREnvelope>(initialEnvelope);

  /**
   * Select a factory preset by ID
   */
  const selectPreset = useCallback(
    (presetId: string) => {
      const preset = getPresetById(presetId);
      if (preset) {
        // Dispose custom synth if active
        disposeCustomSynth();

        setIsCustomPatch(false);
        setCustomPatchId(null);
        setCurrentPresetId(presetId);
        // Reset envelope to preset default
        setEnvelope(preset.defaultEnvelope);

        // Notify parent of preset change (for settings persistence)
        onPresetChange?.(presetId, preset.defaultEnvelope);
      }
    },
    [disposeCustomSynth, onPresetChange]
  );

  /**
   * Select a custom patch by ID
   */
  const selectCustomPatch = useCallback(
    (patchId: string) => {
      // Dispose existing factory synth first
      disposeFactorySynth();

      const success = selectCustomPatchInternal(patchId);
      if (success) {
        setCustomPatchId(patchId);
        setIsCustomPatch(true);
      }
    },
    [selectCustomPatchInternal, disposeFactorySynth]
  );

  return {
    currentPresetId,
    isCustomPatch,
    customPatchId,
    envelope,
    setEnvelope,
    selectPreset,
    selectCustomPatch,
  };
}
