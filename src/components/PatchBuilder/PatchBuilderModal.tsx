/**
 * PatchBuilderModal Component
 * Main container for the patch builder interface with tabbed navigation.
 * Allows users to create, edit, and save custom synth patches.
 * Includes a live preview synth so users can hear changes in real-time.
 *
 * @module components/PatchBuilder/PatchBuilderModal
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as Tone from "tone";
import type { CustomPatch, PatchCategory } from "../../types/synth";
import { createDefaultPatch } from "../../lib/defaultPatch";
import { useCustomPatches } from "../../hooks/useCustomPatches";
import { CustomSynthEngine } from "../../lib/customSynthEngine";
import { appEvents } from "../../lib/eventBus";
import { OscillatorSection } from "./OscillatorSection";
import { FilterSection } from "./FilterSection";
import { EnvelopeEditor } from "./EnvelopeEditor";
import { ModMatrixSection } from "./ModMatrixSection";
import { EffectsSection } from "./EffectsSection";
import { PatchBrowser } from "./PatchBrowser";
import { SliderControl } from "./SliderControl";
import "./PatchBuilderModal.css";

type TabType = "osc" | "filter" | "env" | "mod" | "fx" | "browse";

interface PatchBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  patchId: string | null; // null = creating new
  onSave: (patch: CustomPatch) => void;
}

const CATEGORIES: PatchCategory[] = ["keys", "pad", "lead", "bass", "fx", "custom"];

export function PatchBuilderModal({
  isOpen,
  onClose,
  patchId,
  onSave,
}: PatchBuilderModalProps) {
  const { getPatch } = useCustomPatches();
  const [editingPatch, setEditingPatch] = useState<CustomPatch | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("osc");

  // Preview synth for live audio feedback while editing
  const previewSynthRef = useRef<CustomSynthEngine | null>(null);
  const activeNotesRef = useRef<Set<number>>(new Set());

  // Load or create patch on mount/patchId change
  useEffect(() => {
    if (!isOpen) return;

    if (patchId) {
      // Load existing patch
      const patch = getPatch(patchId);
      if (patch) {
        // Deep copy to avoid mutating the original
        setEditingPatch({
          ...patch,
          osc1: { ...patch.osc1 },
          osc2: { ...patch.osc2 },
          filter: { ...patch.filter },
          ampEnvelope: { ...patch.ampEnvelope },
          filterEnvelope: { ...patch.filterEnvelope },
          modMatrix: {
            routings: patch.modMatrix.routings.map((r) => ({ ...r })),
            lfo1: { ...patch.modMatrix.lfo1 },
            lfo2: { ...patch.modMatrix.lfo2 },
            modEnv1: { ...patch.modMatrix.modEnv1 },
            modEnv2: { ...patch.modMatrix.modEnv2 },
          },
          effects: patch.effects.map((e) => ({ ...e, params: { ...e.params } })),
        });
      }
    } else {
      // Create new patch
      setEditingPatch(createDefaultPatch());
    }
  }, [isOpen, patchId, getPatch]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Create/dispose preview synth when modal opens/closes
  useEffect(() => {
    if (!isOpen || !editingPatch) {
      // Dispose preview synth when closing
      if (previewSynthRef.current) {
        previewSynthRef.current.releaseAll();
        previewSynthRef.current.dispose();
        previewSynthRef.current = null;
      }
      activeNotesRef.current.clear();
      return;
    }

    // Ensure Tone.js is started
    if (Tone.getContext().state !== "running") {
      Tone.start().catch(console.error);
    }

    // Create preview synth with current patch
    if (!previewSynthRef.current) {
      previewSynthRef.current = new CustomSynthEngine(editingPatch);
    }

    return () => {
      if (previewSynthRef.current) {
        previewSynthRef.current.releaseAll();
        previewSynthRef.current.dispose();
        previewSynthRef.current = null;
      }
      activeNotesRef.current.clear();
    };
  }, [isOpen, editingPatch !== null]);

  // Update preview synth when patch parameters change (live updates for continuous playback)
  useEffect(() => {
    if (!isOpen || !editingPatch || !previewSynthRef.current) return;

    // Try live update first (doesn't interrupt playback)
    const liveUpdateSucceeded = previewSynthRef.current.updatePatchLive(editingPatch);

    if (!liveUpdateSucceeded) {
      // Fall back to full rebuild only when necessary (e.g., effects chain changed)
      // Use small debounce to batch rapid changes
      const timeoutId = setTimeout(() => {
        if (previewSynthRef.current) {
          previewSynthRef.current.releaseAll();
          activeNotesRef.current.clear();
          previewSynthRef.current.updatePatch(editingPatch);
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, editingPatch]);

  // Subscribe to chord events for preview playback
  useEffect(() => {
    if (!isOpen || !editingPatch) return;

    const handleChordChanged = (payload: { notes: number[]; velocity?: number }) => {
      if (!previewSynthRef.current) return;

      const newNotes = new Set(payload.notes);
      const currentNotes = activeNotesRef.current;

      // Release notes that are no longer held
      for (const note of currentNotes) {
        if (!newNotes.has(note)) {
          previewSynthRef.current.triggerRelease(note);
        }
      }

      // Trigger new notes
      for (const note of newNotes) {
        if (!currentNotes.has(note)) {
          previewSynthRef.current.triggerAttack(note, payload.velocity ?? 0.7);
        }
      }

      activeNotesRef.current = newNotes;
    };

    const handleChordCleared = () => {
      if (!previewSynthRef.current) return;
      previewSynthRef.current.releaseAll();
      activeNotesRef.current.clear();
    };

    const unsubChanged = appEvents.on("chord:changed", handleChordChanged);
    const unsubCleared = appEvents.on("chord:cleared", handleChordCleared);

    return () => {
      unsubChanged();
      unsubCleared();
      // Release any held notes when unsubscribing
      if (previewSynthRef.current) {
        previewSynthRef.current.releaseAll();
      }
      activeNotesRef.current.clear();
    };
  }, [isOpen, editingPatch !== null]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Update patch helper
  const updatePatch = useCallback(
    (updates: Partial<CustomPatch>) => {
      setEditingPatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...updates,
          updatedAt: Date.now(),
        };
      });
    },
    []
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (!editingPatch) return;
    onSave(editingPatch);
    onClose();
  }, [editingPatch, onSave, onClose]);

  // Handle patch selection from browser
  const handlePatchSelect = useCallback(
    (selectedPatchId: string) => {
      const patch = getPatch(selectedPatchId);
      if (patch) {
        // Deep copy the selected patch
        setEditingPatch({
          ...patch,
          osc1: { ...patch.osc1 },
          osc2: { ...patch.osc2 },
          filter: { ...patch.filter },
          ampEnvelope: { ...patch.ampEnvelope },
          filterEnvelope: { ...patch.filterEnvelope },
          modMatrix: {
            routings: patch.modMatrix.routings.map((r) => ({ ...r })),
            lfo1: { ...patch.modMatrix.lfo1 },
            lfo2: { ...patch.modMatrix.lfo2 },
            modEnv1: { ...patch.modMatrix.modEnv1 },
            modEnv2: { ...patch.modMatrix.modEnv2 },
          },
          effects: patch.effects.map((e) => ({ ...e, params: { ...e.params } })),
        });
        // Switch to OSC tab after loading
        setActiveTab("osc");
      }
    },
    [getPatch]
  );

  if (!isOpen || !editingPatch) return null;

  return (
    <div className="patch-builder-overlay" onClick={handleOverlayClick}>
      <div className="patch-builder-modal">
        <header className="patch-builder-header">
          <div className="patch-builder-header-left">
            <input
              type="text"
              className="patch-name-input"
              value={editingPatch.name}
              onChange={(e) => updatePatch({ name: e.target.value })}
              placeholder="Patch Name"
            />
            <select
              className="patch-category-select"
              value={editingPatch.category}
              onChange={(e) =>
                updatePatch({ category: e.target.value as PatchCategory })
              }
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="patch-builder-actions">
            <button className="patch-action-button save-button" onClick={handleSave}>
              Save
            </button>
            <button className="patch-action-button cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </header>

        <nav className="patch-builder-tabs">
          <button
            className={`patch-tab ${activeTab === "osc" ? "active" : ""}`}
            onClick={() => setActiveTab("osc")}
          >
            OSC
          </button>
          <button
            className={`patch-tab ${activeTab === "filter" ? "active" : ""}`}
            onClick={() => setActiveTab("filter")}
          >
            FILTER
          </button>
          <button
            className={`patch-tab ${activeTab === "env" ? "active" : ""}`}
            onClick={() => setActiveTab("env")}
          >
            ENV
          </button>
          {/* MOD tab hidden for now - LFO routing needs more work
          <button
            className={`patch-tab ${activeTab === "mod" ? "active" : ""}`}
            onClick={() => setActiveTab("mod")}
          >
            MOD
          </button>
          */}
          <button
            className={`patch-tab ${activeTab === "fx" ? "active" : ""}`}
            onClick={() => setActiveTab("fx")}
          >
            FX
          </button>
          <button
            className={`patch-tab ${activeTab === "browse" ? "active" : ""}`}
            onClick={() => setActiveTab("browse")}
          >
            BROWSE
          </button>
        </nav>

        <main className="patch-builder-content">
          {activeTab === "osc" && (
            <div className="patch-builder-section">
              <OscillatorSection
                oscillator={editingPatch.osc1}
                label="OSC 1"
                onChange={(osc1) => updatePatch({ osc1 })}
              />
              <OscillatorSection
                oscillator={editingPatch.osc2}
                label="OSC 2"
                onChange={(osc2) => updatePatch({ osc2 })}
              />
              <div className="osc-mix-section">
                <SliderControl
                  label="OSC MIX"
                  value={editingPatch.oscMix}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(oscMix) => updatePatch({ oscMix })}
                />
                <span className="osc-mix-labels">
                  <span>OSC 1</span>
                  <span>OSC 2</span>
                </span>
              </div>
            </div>
          )}

          {activeTab === "filter" && (
            <div className="patch-builder-section">
              <FilterSection
                filter={editingPatch.filter}
                onChange={(filter) => updatePatch({ filter })}
              />
            </div>
          )}

          {activeTab === "env" && (
            <div className="patch-builder-section">
              <EnvelopeEditor
                envelope={editingPatch.ampEnvelope}
                label="Amp Envelope"
                onChange={(ampEnvelope) => updatePatch({ ampEnvelope })}
              />
              <EnvelopeEditor
                envelope={editingPatch.filterEnvelope}
                label="Filter Envelope"
                onChange={(filterEnvelope) => updatePatch({ filterEnvelope: filterEnvelope as typeof editingPatch.filterEnvelope })}
                showOctaves={true}
              />
            </div>
          )}

          {activeTab === "mod" && (
            <div className="patch-builder-section">
              <ModMatrixSection
                modMatrix={editingPatch.modMatrix}
                onChange={(modMatrix) => updatePatch({ modMatrix })}
              />
            </div>
          )}

          {activeTab === "fx" && (
            <div className="patch-builder-section">
              <EffectsSection
                effects={editingPatch.effects}
                onChange={(effects) => updatePatch({ effects })}
              />
            </div>
          )}

          {activeTab === "browse" && (
            <div className="patch-builder-section">
              <PatchBrowser
                onSelect={handlePatchSelect}
                currentPatchId={editingPatch.id}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
