/**
 * PatchBuilderModal Component
 * Main container for the patch builder interface with tabbed navigation.
 * Allows users to create, edit, and save custom synth patches.
 * Includes a live preview synth so users can hear changes in real-time.
 *
 * @module components/PatchBuilder/PatchBuilderModal
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
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
import { GainMeter } from "./GainMeter";
import "./PatchBuilderModal.css";

type TabType = "osc" | "filter" | "env" | "mod" | "fx" | "browse";

interface PatchBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  patchId: string | null; // null = creating new
  onSave: (patch: CustomPatch) => void;
}

const CATEGORIES: PatchCategory[] = [
  "keys",
  "pad",
  "lead",
  "bass",
  "fx",
  "custom",
];

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

  // Filter modulation for visual feedback
  const [filterModulation, setFilterModulation] = useState<{
    frequencyOffset: number;
    resonanceOffset: number;
  }>({ frequencyOffset: 0, resonanceOffset: 0 });
  const filterModAnimationRef = useRef<number | null>(null);

  // Modal container ref for focus management
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus the modal container when it opens to prevent input auto-focus
  // This ensures keyboard events are captured for chord playing
  useLayoutEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

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
          effects: patch.effects.map((e) => ({
            ...e,
            params: { ...e.params },
          })),
        });
      }
    } else {
      // Create new patch
      setEditingPatch(createDefaultPatch());
    }
  }, [isOpen, patchId, getPatch]);

  // Update patch helper
  const updatePatch = useCallback((updates: Partial<CustomPatch>) => {
    setEditingPatch((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updates,
        updatedAt: Date.now(),
      };
    });
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!editingPatch) return;
    onSave(editingPatch);
    onClose();
  }, [editingPatch, onSave, onClose]);

  // Handle escape key and Cmd/Ctrl+S
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleSave]);

  // Create preview synth and subscribe to chord events when patch is ready
  // Use editingPatch?.id to only recreate synth when loading a different patch
  const currentPatchId = editingPatch?.id;
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

    // Create preview synth with current patch
    let synth: CustomSynthEngine;
    try {
      synth = new CustomSynthEngine(editingPatch);
      previewSynthRef.current = synth;
    } catch (err) {
      console.error("Failed to create preview synth:", err);
      return;
    }

    // Subscribe to chord events - use synth directly in closure
    const handleChordChanged = (payload: {
      notes: number[];
      velocity?: number;
    }) => {
      const newNotes = new Set(payload.notes);
      const currentNotes = activeNotesRef.current;

      // Release notes that are no longer held
      for (const note of currentNotes) {
        if (!newNotes.has(note)) {
          synth.triggerRelease(note);
        }
      }

      // Trigger new notes
      for (const note of newNotes) {
        if (!currentNotes.has(note)) {
          synth.triggerAttack(note, payload.velocity ?? 0.7);
        }
      }

      activeNotesRef.current = newNotes;
    };

    const handleChordCleared = () => {
      synth.releaseAll();
      activeNotesRef.current.clear();
    };

    const unsubChanged = appEvents.on("chord:changed", handleChordChanged);
    const unsubCleared = appEvents.on("chord:cleared", handleChordCleared);

    return () => {
      unsubChanged();
      unsubCleared();
      synth.releaseAll();
      synth.dispose();
      previewSynthRef.current = null;
      activeNotesRef.current.clear();
    };
  }, [isOpen, currentPatchId]); // Only recreate when patch ID changes, not on every param edit

  // Update preview synth when patch parameters change (live updates for continuous playback)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isOpen || !editingPatch || !previewSynthRef.current) return;

    // Try live update first (doesn't interrupt playback)
    const liveUpdateSucceeded =
      previewSynthRef.current.updatePatchLive(editingPatch);

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

      debounceTimeoutRef.current = timeoutId;

      return () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
      };
    }
  }, [isOpen, editingPatch]);

  // Poll filter modulation for visual feedback when on filter tab
  // Calculate LFO values mathematically for accurate visual sync
  useEffect(() => {
    if (!isOpen || activeTab !== "filter" || !editingPatch) {
      if (filterModAnimationRef.current) {
        cancelAnimationFrame(filterModAnimationRef.current);
        filterModAnimationRef.current = null;
      }
      setFilterModulation({ frequencyOffset: 0, resonanceOffset: 0 });
      return;
    }

    const startTime = performance.now() / 1000; // Convert to seconds

    const calculateModulation = () => {
      const now = performance.now() / 1000;
      const elapsed = now - startTime;

      let frequencyOffset = 0;
      let resonanceOffset = 0;

      // Calculate modulation from active routings
      for (const routing of editingPatch.modMatrix.routings) {
        if (!routing.enabled || routing.amount === 0) continue;

        // Get LFO value based on source
        let lfoValue = 0.5; // Default center
        let lfoEnabled = false;
        let lfoFreq = 1;
        let lfoWaveform = "sine";

        if (routing.source === "lfo1" && editingPatch.modMatrix.lfo1.enabled) {
          lfoEnabled = true;
          lfoFreq = editingPatch.modMatrix.lfo1.frequency;
          lfoWaveform = editingPatch.modMatrix.lfo1.waveform;
        } else if (routing.source === "lfo2" && editingPatch.modMatrix.lfo2.enabled) {
          lfoEnabled = true;
          lfoFreq = editingPatch.modMatrix.lfo2.frequency;
          lfoWaveform = editingPatch.modMatrix.lfo2.waveform;
        }

        if (!lfoEnabled) continue;

        // Calculate LFO value mathematically (0-1 range)
        const phase = (elapsed * lfoFreq) % 1;
        switch (lfoWaveform) {
          case "sine":
            lfoValue = (Math.sin(phase * Math.PI * 2) + 1) / 2;
            break;
          case "triangle":
            lfoValue = phase < 0.5 ? phase * 2 : 2 - phase * 2;
            break;
          case "sawtooth":
            lfoValue = phase;
            break;
          case "square":
            lfoValue = phase < 0.5 ? 1 : 0;
            break;
          default:
            lfoValue = (Math.sin(phase * Math.PI * 2) + 1) / 2;
        }

        // Center around 0 (-0.5 to +0.5)
        const centered = lfoValue - 0.5;

        if (routing.destination === "filter_freq") {
          // Octave-based modulation: ±2 octaves at 100% amount
          const octaves = centered * routing.amount * 4;
          const multiplier = Math.pow(2, octaves);
          const baseFreq = editingPatch.filter.frequency;
          frequencyOffset = baseFreq * multiplier - baseFreq;
        } else if (routing.destination === "filter_res") {
          resonanceOffset = centered * routing.amount * 12;
        }
      }

      setFilterModulation({ frequencyOffset, resonanceOffset });
      filterModAnimationRef.current = requestAnimationFrame(calculateModulation);
    };

    filterModAnimationRef.current = requestAnimationFrame(calculateModulation);

    return () => {
      if (filterModAnimationRef.current) {
        cancelAnimationFrame(filterModAnimationRef.current);
      }
    };
  }, [isOpen, activeTab, editingPatch]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

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
          effects: patch.effects.map((e) => ({
            ...e,
            params: { ...e.params },
          })),
        });
        // Switch to OSC tab after loading
        setActiveTab("osc");
      }
    },
    [getPatch],
  );

  if (!isOpen || !editingPatch) return null;

  return (
    <div className="patch-builder-overlay" onMouseDown={handleOverlayClick}>
      <div
        ref={modalRef}
        className="patch-builder-modal"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
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
          <GainMeter compact />
          <div className="patch-builder-actions">
            <button
              className="patch-action-button save-button"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="patch-action-button cancel-button"
              onClick={onClose}
            >
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
          <button
            className={`patch-tab ${activeTab === "mod" ? "active" : ""}`}
            onClick={() => setActiveTab("mod")}
          >
            MOD
          </button>
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
                modulation={filterModulation}
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
                onChange={(filterEnvelope) =>
                  updatePatch({
                    filterEnvelope:
                      filterEnvelope as typeof editingPatch.filterEnvelope,
                  })
                }
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
