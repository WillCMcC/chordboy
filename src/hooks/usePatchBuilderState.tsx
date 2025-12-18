/**
 * Patch Builder State Hook
 * Manages UI state for the patch builder modal.
 *
 * @module hooks/usePatchBuilderState
 */

import { useState, useCallback } from "react";
import * as Tone from "tone";

/**
 * Hook to manage patch builder modal state
 */
export function usePatchBuilderState() {
  const [isPatchBuilderOpen, setIsPatchBuilderOpen] = useState(false);
  const [editingPatchId, setEditingPatchId] = useState<string | null>(null);

  /**
   * Open the patch builder
   * Starts Tone.js audio context immediately (requires user gesture)
   */
  const openPatchBuilder = useCallback(async (patchId?: string | null) => {
    // Start Tone.js immediately on user gesture before opening modal
    // This ensures audio context is unlocked by the button click
    // IMPORTANT: We must await Tone.start() to ensure context is running
    // before the patch builder creates its preview synth
    if (Tone.getContext().state !== "running") {
      try {
        await Tone.start();
      } catch (err) {
        console.error("Failed to start Tone.js:", err);
      }
    }
    setEditingPatchId(patchId ?? null);
    setIsPatchBuilderOpen(true);
  }, []);

  /**
   * Close the patch builder
   */
  const closePatchBuilder = useCallback(() => {
    setIsPatchBuilderOpen(false);
    setEditingPatchId(null);
  }, []);

  return {
    isPatchBuilderOpen,
    editingPatchId,
    openPatchBuilder,
    closePatchBuilder,
  };
}
