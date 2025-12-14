/**
 * SynthPanel Component
 * Audio mode selector with synth controls, preset selection, and ADSR envelope.
 * Desktop: Compact top bar. Mobile: Pull-down tray.
 *
 * @module components/SynthPanel
 */

import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { useToneSynth, type AudioMode } from "../hooks/useToneSynth";
import { useEventSubscription } from "../hooks/useEventSubscription";
import { appEvents } from "../lib/eventBus";
import type { ADSREnvelope } from "../lib/synthPresets";
import type { ChordChangedEvent } from "../types";
import { PatchBuilderModal } from "./PatchBuilder";
import { validatePatch } from "../lib/patchValidation";
import { ErrorBoundary } from "./ErrorBoundary";
import "./SynthPanel.css";

/**
 * Interactive ADSR Envelope Visualizer
 * Canvas-based for smoother interaction
 */
function ADSREnvelope({
  envelope,
  onChange,
}: {
  envelope: ADSREnvelope;
  onChange: (envelope: ADSREnvelope) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Constants for layout
  const padding = 12;
  const maxTime = 2.5;

  // Calculate point positions
  const getPoints = useCallback(() => {
    const { width, height } = dimensions;
    if (width === 0) return null;

    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    // Time distribution: 30% attack, 25% decay, 25% sustain, 20% release
    const attackEndX = padding + (envelope.attack / maxTime) * innerWidth * 0.3;
    const decayEndX = attackEndX + (envelope.decay / maxTime) * innerWidth * 0.25;
    const sustainEndX = decayEndX + innerWidth * 0.25;
    const releaseEndX = sustainEndX + (envelope.release / maxTime) * innerWidth * 0.2;

    const sustainY = padding + (1 - envelope.sustain) * innerHeight;

    return {
      start: { x: padding, y: height - padding },
      attack: { x: attackEndX, y: padding },
      decay: { x: decayEndX, y: sustainY },
      sustain: { x: sustainEndX, y: sustainY },
      release: { x: Math.min(releaseEndX, width - padding), y: height - padding },
    };
  }, [dimensions, envelope]);

  // Setup canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      setDimensions({ width: rect.width, height: rect.height });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Draw the envelope
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const points = getPoints();
    if (!ctx || !points) return;

    const dpr = window.devicePixelRatio;
    ctx.clearRect(0, 0, canvas!.width, canvas!.height);
    ctx.scale(dpr, dpr);

    // Draw grid
    ctx.strokeStyle = "rgba(139, 92, 246, 0.1)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, dimensions.height / 2);
    ctx.lineTo(dimensions.width - padding, dimensions.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw filled area
    ctx.fillStyle = "rgba(139, 92, 246, 0.1)";
    ctx.beginPath();
    ctx.moveTo(points.start.x, points.start.y);
    ctx.lineTo(points.attack.x, points.attack.y);
    ctx.lineTo(points.decay.x, points.decay.y);
    ctx.lineTo(points.sustain.x, points.sustain.y);
    ctx.lineTo(points.release.x, points.release.y);
    ctx.lineTo(points.release.x, dimensions.height - padding);
    ctx.closePath();
    ctx.fill();

    // Draw envelope line
    ctx.strokeStyle = "rgba(139, 92, 246, 0.8)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points.start.x, points.start.y);
    ctx.lineTo(points.attack.x, points.attack.y);
    ctx.lineTo(points.decay.x, points.decay.y);
    ctx.lineTo(points.sustain.x, points.sustain.y);
    ctx.lineTo(points.release.x, points.release.y);
    ctx.stroke();

    // Draw control points
    const drawPoint = (x: number, y: number, isActive: boolean, _label: string) => {
      ctx.beginPath();
      ctx.arc(x, y, isActive ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "#c4b5fd" : "#8b5cf6";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawPoint(points.attack.x, points.attack.y, dragging === "attack", "A");
    drawPoint(points.decay.x, points.decay.y, dragging === "decay", "D");
    drawPoint(points.sustain.x, points.sustain.y, dragging === "sustain", "S");
    drawPoint(points.release.x, points.release.y, dragging === "release", "R");

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [dimensions, getPoints, dragging]);

  // Hit test for control points
  const hitTest = useCallback(
    (x: number, y: number): string | null => {
      const points = getPoints();
      if (!points) return null;

      const hitRadius = 16;
      const checkPoint = (px: number, py: number) => {
        const dx = x - px;
        const dy = y - py;
        return dx * dx + dy * dy < hitRadius * hitRadius;
      };

      if (checkPoint(points.attack.x, points.attack.y)) return "attack";
      if (checkPoint(points.decay.x, points.decay.y)) return "decay";
      if (checkPoint(points.sustain.x, points.sustain.y)) return "sustain";
      if (checkPoint(points.release.x, points.release.y)) return "release";
      return null;
    },
    [getPoints]
  );

  // Get canvas-relative coordinates
  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const coords = getCanvasCoords(e);
      const hit = hitTest(coords.x, coords.y);
      if (hit) {
        setDragging(hit);
      }
    },
    [getCanvasCoords, hitTest]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragging || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const { width, height } = dimensions;
      const innerWidth = width - padding * 2;
      const innerHeight = height - padding * 2;

      const newEnvelope = { ...envelope };
      const points = getPoints();
      if (!points) return;

      switch (dragging) {
        case "attack": {
          const attackTime = ((x - padding) / (innerWidth * 0.3)) * maxTime;
          newEnvelope.attack = Math.max(0.001, Math.min(maxTime, attackTime));
          break;
        }
        case "decay": {
          const attackEndX = points.attack.x;
          const decayTime = ((x - attackEndX) / (innerWidth * 0.25)) * maxTime;
          newEnvelope.decay = Math.max(0.01, Math.min(maxTime, decayTime));
          // Also update sustain from Y
          const sustainLevel = 1 - (y - padding) / innerHeight;
          newEnvelope.sustain = Math.max(0, Math.min(1, sustainLevel));
          break;
        }
        case "sustain": {
          const sustainLevel = 1 - (y - padding) / innerHeight;
          newEnvelope.sustain = Math.max(0, Math.min(1, sustainLevel));
          break;
        }
        case "release": {
          const sustainEndX = points.sustain.x;
          const releaseTime = ((x - sustainEndX) / (innerWidth * 0.2)) * maxTime;
          newEnvelope.release = Math.max(0.01, Math.min(maxTime * 2, releaseTime));
          break;
        }
      }

      onChange(newEnvelope);
    },
    [dragging, dimensions, envelope, onChange, getPoints]
  );

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Add/remove document listeners for drag
  useEffect(() => {
    if (dragging) {
      document.addEventListener("mousemove", handlePointerMove);
      document.addEventListener("mouseup", handlePointerUp);
      document.addEventListener("touchmove", handlePointerMove, { passive: false });
      document.addEventListener("touchend", handlePointerUp);
    }
    return () => {
      document.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mouseup", handlePointerUp);
      document.removeEventListener("touchmove", handlePointerMove);
      document.removeEventListener("touchend", handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  return (
    <div className="adsr-envelope">
      <canvas
        ref={canvasRef}
        className="adsr-canvas"
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      />
      <div className="adsr-labels">
        <span className="adsr-label">A {envelope.attack.toFixed(2)}s</span>
        <span className="adsr-label">D {envelope.decay.toFixed(2)}s</span>
        <span className="adsr-label">S {Math.round(envelope.sustain * 100)}%</span>
        <span className="adsr-label">R {envelope.release.toFixed(2)}s</span>
      </div>
    </div>
  );
}

/**
 * Compact Volume Slider
 */
function VolumeControl({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (volume: number) => void;
}) {
  return (
    <div className="volume-control">
      <span className="volume-icon">🔊</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="volume-slider"
      />
    </div>
  );
}

interface SynthPanelProps {
  onOpenSettings?: () => void;
}

/**
 * SynthPanel - Main audio mode and synth control panel
 */
export function SynthPanel({ onOpenSettings }: SynthPanelProps) {
  const {
    isInitialized,
    audioMode,
    currentPreset,
    envelope,
    volume,
    presets,
    initialize,
    setAudioMode,
    selectPreset,
    setEnvelope,
    setVolume,
    isCustomPatch,
    customPatchId,
    selectCustomPatch,
    openPatchBuilder,
    closePatchBuilder,
    isPatchBuilderOpen,
    editingPatchId,
    customPatches,
  } = useToneSynth();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);

  // Track if audio needs enabling (for wiggle trigger)
  const needsAudioEnableRef = useRef(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle mode change
  const handleModeChange = useCallback(
    async (mode: AudioMode) => {
      if ((mode === "synth" || mode === "both") && !isInitialized) {
        await initialize();
      }
      setAudioMode(mode);
    },
    [isInitialized, initialize, setAudioMode]
  );

  // Show synth controls when mode includes synth
  const showSynthControls = audioMode === "synth" || audioMode === "both";

  // Show audio enable prompt if synth mode but not initialized
  const needsAudioEnable = showSynthControls && !isInitialized;

  // Keep ref in sync for event handler
  needsAudioEnableRef.current = needsAudioEnable;

  // Wiggle the enable button when user tries to play without audio
  useEventSubscription(appEvents, "chord:changed", (_event: ChordChangedEvent) => {
    if (needsAudioEnableRef.current) {
      setIsWiggling(true);
      setTimeout(() => setIsWiggling(false), 500);
    }
  });

  // Group presets by category
  const presetsByCategory = useMemo(() => {
    const categories: Record<string, typeof presets> = {};
    presets.forEach((p) => {
      if (!categories[p.category]) categories[p.category] = [];
      categories[p.category].push(p);
    });
    return categories;
  }, [presets]);

  // Handle preset change (including custom patches)
  const handlePresetChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value.startsWith("custom:")) {
        const patchId = value.replace("custom:", "");
        selectCustomPatch(patchId);
      } else {
        selectPreset(value);
      }
    },
    [selectCustomPatch, selectPreset]
  );

  return (
    <div className={`synth-panel ${isExpanded ? "expanded" : ""} ${isMobile ? "mobile" : ""}`}>
      {/* Compact Top Bar */}
      <div className="synth-bar">
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${audioMode === "midi" ? "active" : ""}`}
            onClick={() => handleModeChange("midi")}
            title="MIDI output only"
          >
            MIDI
          </button>
          <button
            className={`mode-btn ${audioMode === "synth" ? "active" : ""}`}
            onClick={() => handleModeChange("synth")}
            title="Browser synth only"
          >
            SYNTH
          </button>
          <button
            className={`mode-btn ${audioMode === "both" ? "active" : ""}`}
            onClick={() => handleModeChange("both")}
            title="Both MIDI and synth"
          >
            BOTH
          </button>
        </div>

        {/* Configure button for MIDI mode */}
        {(audioMode === "midi" || audioMode === "both") && onOpenSettings && (
          <>
            <div className="synth-bar-divider" />
            <button
              className="configure-btn"
              onClick={onOpenSettings}
              title="Configure MIDI settings"
            >
              Configure
            </button>
          </>
        )}

        {/* Audio enable button - shows when synth mode but not initialized */}
        {needsAudioEnable && (
          <>
            <div className="synth-bar-divider" />
            <button
              className={`enable-audio-btn ${isWiggling ? "wiggle" : ""}`}
              onClick={initialize}
              title="Click to enable audio"
            >
              Enable Audio
            </button>
          </>
        )}

        {/* Synth controls (when enabled and initialized) */}
        {showSynthControls && !needsAudioEnable && (
          <>
            {!isMobile && <div className="synth-bar-divider" />}

            <div className="synth-controls-row">
              {/* Preset selector */}
              <select
                value={isCustomPatch ? `custom:${customPatchId}` : currentPreset.id}
                onChange={handlePresetChange}
                className="preset-select-compact"
              >
                {/* Factory presets by category */}
                {Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
                  <optgroup key={category} label={category.toUpperCase()}>
                    {categoryPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </optgroup>
                ))}

                {/* Custom patches */}
                {customPatches.patchLibrary.filter((p) => !p.isFactory).length > 0 && (
                  <optgroup label="CUSTOM">
                    {customPatches.patchLibrary
                      .filter((p) => !p.isFactory)
                      .map((patch) => (
                        <option key={`custom:${patch.id}`} value={`custom:${patch.id}`}>
                          {patch.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>

              {/* Edit/New patch button */}
              <button
                className="edit-patch-btn"
                onClick={() => openPatchBuilder(isCustomPatch ? customPatchId : null)}
                title={isCustomPatch ? "Edit patch" : "Create custom patch"}
              >
                {isCustomPatch ? "Edit" : "+ New"}
              </button>

              {/* Volume */}
              <VolumeControl volume={volume} onChange={setVolume} />

              {/* Expand button */}
              <button
                className={`expand-btn ${isExpanded ? "expanded" : ""}`}
                onClick={() => setIsExpanded(!isExpanded)}
                title="ADSR Envelope"
              >
                <span className="expand-label">ENV</span>
                <span className="expand-arrow">{isExpanded ? "▲" : "▼"}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Expanded ADSR Panel */}
      {showSynthControls && isExpanded && (
        <div className="synth-expanded">
          {!isCustomPatch && (
            <div className="preset-description">{currentPreset.description}</div>
          )}
          <ADSREnvelope envelope={envelope} onChange={setEnvelope} />
        </div>
      )}

      {/* Mobile pull handle */}
      {isMobile && (
        <div
          className="mobile-pull-handle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="pull-bar" />
        </div>
      )}

      {/* Patch Builder Modal */}
      <ErrorBoundary>
        <PatchBuilderModal
          isOpen={isPatchBuilderOpen}
          onClose={closePatchBuilder}
          patchId={editingPatchId}
          onSave={(patch) => {
            if (!validatePatch(patch)) {
              console.error('Invalid patch, cannot save');
              return;
            }
            customPatches.savePatch(patch);
            selectCustomPatch(patch.id);
            closePatchBuilder();
          }}
        />
      </ErrorBoundary>
    </div>
  );
}
