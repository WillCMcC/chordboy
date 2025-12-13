/**
 * EnvelopeEditor Component
 * Canvas-based ADSR envelope editor with draggable control points
 * Adapted from SynthPanel ADSREnvelope component
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { KnobControl } from "./index";
import type { EnvelopeConfig, FilterEnvelopeConfig } from "../../types/synth";
import "./controls.css";
import "./sections.css";

interface EnvelopeEditorProps {
  label: string;
  envelope: EnvelopeConfig | FilterEnvelopeConfig;
  onChange: (envelope: EnvelopeConfig | FilterEnvelopeConfig) => void;
  showOctaves?: boolean;
  disabled?: boolean;
}

/**
 * Interactive ADSR Envelope Visualizer
 * Canvas-based for smooth interaction
 */
export function EnvelopeEditor({
  label,
  envelope,
  onChange,
  showOctaves = false,
  disabled = false,
}: EnvelopeEditorProps) {
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
    ctx.fillStyle = disabled ? "rgba(100, 100, 100, 0.1)" : "rgba(139, 92, 246, 0.1)";
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
    ctx.strokeStyle = disabled ? "rgba(100, 100, 100, 0.5)" : "rgba(139, 92, 246, 0.8)";
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
    const drawPoint = (x: number, y: number, isActive: boolean) => {
      ctx.beginPath();
      ctx.arc(x, y, isActive ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = disabled
        ? "rgba(100, 100, 100, 0.5)"
        : isActive
          ? "#c4b5fd"
          : "#8b5cf6";
      ctx.fill();
      ctx.strokeStyle = disabled ? "rgba(200, 200, 200, 0.6)" : "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    if (!disabled) {
      drawPoint(points.attack.x, points.attack.y, dragging === "attack");
      drawPoint(points.decay.x, points.decay.y, dragging === "decay");
      drawPoint(points.sustain.x, points.sustain.y, dragging === "sustain");
      drawPoint(points.release.x, points.release.y, dragging === "release");
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [dimensions, getPoints, dragging, disabled]);

  // Hit test for control points
  const hitTest = useCallback(
    (x: number, y: number): string | null => {
      if (disabled) return null;

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
    [getPoints, disabled]
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
      if (disabled) return;

      e.preventDefault();
      const coords = getCanvasCoords(e);
      const hit = hitTest(coords.x, coords.y);
      if (hit) {
        setDragging(hit);
      }
    },
    [getCanvasCoords, hitTest, disabled]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragging || !canvasRef.current || disabled) return;

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
    [dragging, dimensions, envelope, onChange, getPoints, disabled]
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

  const handleOctavesChange = (octaves: number) => {
    if (showOctaves && "octaves" in envelope) {
      onChange({ ...envelope, octaves });
    }
  };

  return (
    <div className={`envelope-editor ${disabled ? "disabled" : ""}`}>
      <div className="envelope-label">{label}</div>
      <canvas
        ref={canvasRef}
        className="envelope-canvas"
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      />
      <div className="envelope-labels">
        <span className="envelope-param-label">A {envelope.attack.toFixed(2)}s</span>
        <span className="envelope-param-label">D {envelope.decay.toFixed(2)}s</span>
        <span className="envelope-param-label">S {Math.round(envelope.sustain * 100)}%</span>
        <span className="envelope-param-label">R {envelope.release.toFixed(2)}s</span>
      </div>
      {showOctaves && "octaves" in envelope && (
        <div className="envelope-octaves">
          <KnobControl
            label="Octaves"
            value={envelope.octaves}
            min={0}
            max={8}
            step={0.1}
            onChange={handleOctavesChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
