/**
 * FilterSection Component
 * Visual filter editor with frequency response display
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { KnobControl, SectionHeader } from "./index";
import type { FilterConfig, FilterType, FilterRolloff } from "../../types/synth";
import "./controls.css";
import "./sections.css";

interface FilterSectionProps {
  filter: FilterConfig;
  onChange: (filter: FilterConfig) => void;
}

// Filter type icons (SVG paths)
const FILTER_ICONS: Record<FilterType, string> = {
  lowpass: "M 2 2 L 2 14 L 10 14 Q 14 14 14 10 L 14 2",
  highpass: "M 2 2 L 2 6 Q 2 14 10 14 L 14 14 L 14 2",
  bandpass: "M 2 14 Q 2 6 6 2 L 10 2 Q 14 6 14 14",
  notch: "M 2 2 L 2 8 Q 4 14 8 14 Q 12 14 14 8 L 14 2",
  lowshelf: "M 2 10 L 6 10 Q 10 10 10 6 L 14 6",
  highshelf: "M 2 6 L 6 6 Q 6 10 10 10 L 14 10",
  allpass: "M 2 8 L 14 8",
  peaking: "M 2 10 Q 8 2 14 10",
};

const MAIN_FILTER_TYPES: FilterType[] = ["lowpass", "highpass", "bandpass", "notch"];

const rolloffOptions: { value: FilterRolloff; label: string }[] = [
  { value: -12, label: "12" },
  { value: -24, label: "24" },
  { value: -48, label: "48" },
  { value: -96, label: "96" },
];

// Convert frequency to x position (log scale)
function freqToX(freq: number, width: number): number {
  const minFreq = 20;
  const maxFreq = 20000;
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  const logFreq = Math.log10(Math.max(minFreq, Math.min(maxFreq, freq)));
  return ((logFreq - logMin) / (logMax - logMin)) * width;
}

// Convert x position to frequency (log scale)
function xToFreq(x: number, width: number): number {
  const minFreq = 20;
  const maxFreq = 20000;
  const logMin = Math.log10(minFreq);
  const logMax = Math.log10(maxFreq);
  const logFreq = logMin + (x / width) * (logMax - logMin);
  return Math.pow(10, logFreq);
}

// Calculate filter response at a given frequency
function getFilterResponse(
  freq: number,
  cutoff: number,
  resonance: number,
  type: FilterType,
  rolloff: FilterRolloff
): number {
  const ratio = freq / cutoff;
  const Q = Math.max(0.5, resonance);
  const poles = Math.abs(rolloff) / 6; // -12dB = 2 poles, -24dB = 4 poles, etc.

  let magnitude = 0;

  switch (type) {
    case "lowpass": {
      // Butterworth-style lowpass approximation
      const order = poles / 2;
      magnitude = 1 / Math.sqrt(1 + Math.pow(ratio, 2 * order));
      // Add resonance peak
      if (ratio > 0.5 && ratio < 2) {
        const peakFreq = 1;
        const peakAmount = (Q - 0.5) / 10;
        const peakWidth = 0.5;
        const peakFactor = Math.exp(-Math.pow((ratio - peakFreq) / peakWidth, 2));
        magnitude *= 1 + peakAmount * peakFactor;
      }
      break;
    }
    case "highpass": {
      const order = poles / 2;
      magnitude = 1 / Math.sqrt(1 + Math.pow(1 / ratio, 2 * order));
      // Add resonance peak
      if (ratio > 0.5 && ratio < 2) {
        const peakFreq = 1;
        const peakAmount = (Q - 0.5) / 10;
        const peakWidth = 0.5;
        const peakFactor = Math.exp(-Math.pow((ratio - peakFreq) / peakWidth, 2));
        magnitude *= 1 + peakAmount * peakFactor;
      }
      break;
    }
    case "bandpass": {
      const bw = 1 / Q;
      const center = 1;
      magnitude = 1 / Math.sqrt(1 + Math.pow((ratio - center) / bw, 2));
      break;
    }
    case "notch": {
      const bw = 1 / Q;
      const center = 1;
      const notchDepth = Math.pow((ratio - center) / bw, 2);
      magnitude = notchDepth / (1 + notchDepth);
      break;
    }
    default:
      magnitude = 1;
  }

  // Convert to dB (clamped)
  const db = 20 * Math.log10(Math.max(0.001, magnitude));
  return Math.max(-60, Math.min(12, db));
}

export function FilterSection({ filter, onChange }: FilterSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 150 });

  // Resize observer for responsive canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setCanvasSize({ width: Math.max(300, width), height: 150 });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw filter response curve
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvasSize;
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with DPR
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;

    // Vertical grid (frequency markers: 100, 1k, 10k)
    const freqMarkers = [100, 1000, 10000];
    ctx.font = "10px system-ui";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";

    for (const freq of freqMarkers) {
      const x = freqToX(freq, width);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Label
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
      ctx.fillText(label, x + 2, height - 4);
    }

    // Horizontal grid (0dB line)
    const zeroDbY = height * 0.3; // 0dB at 30% from top
    ctx.beginPath();
    ctx.moveTo(0, zeroDbY);
    ctx.lineTo(width, zeroDbY);
    ctx.stroke();

    // Draw filter response curve
    ctx.beginPath();
    ctx.strokeStyle = filter.enabled ? "#f97316" : "rgba(249, 115, 22, 0.3)";
    ctx.lineWidth = 2;

    const dbRange = 60; // -48dB to +12dB
    const dbOffset = 12; // 12dB at top

    for (let x = 0; x <= width; x++) {
      const freq = xToFreq(x, width);
      const db = getFilterResponse(
        freq,
        filter.frequency,
        filter.resonance,
        filter.type,
        filter.rolloff
      );

      // Map dB to y position
      const y = ((dbOffset - db) / dbRange) * height;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = filter.enabled
      ? "rgba(249, 115, 22, 0.15)"
      : "rgba(249, 115, 22, 0.05)";
    ctx.fill();

    // Draw control point
    const pointX = freqToX(filter.frequency, width);
    const pointDb = getFilterResponse(
      filter.frequency,
      filter.frequency,
      filter.resonance,
      filter.type,
      filter.rolloff
    );
    const pointY = ((dbOffset - pointDb) / dbRange) * height;

    // Outer ring
    ctx.beginPath();
    ctx.arc(pointX, pointY, isDragging ? 12 : 10, 0, Math.PI * 2);
    ctx.strokeStyle = filter.enabled ? "#f97316" : "rgba(249, 115, 22, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(pointX, pointY, 4, 0, Math.PI * 2);
    ctx.fillStyle = filter.enabled ? "#f97316" : "rgba(249, 115, 22, 0.5)";
    ctx.fill();
  }, [filter, canvasSize, isDragging]);

  // Handle drag on canvas
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!filter.enabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.setPointerCapture(e.pointerId);
      setIsDragging(true);

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update frequency from x
      const newFreq = Math.round(xToFreq(x, canvasSize.width));

      // Update resonance from y (inverse mapping)
      // Max Q of 8 prevents self-oscillation while still being very resonant
      const normalizedY = y / canvasSize.height;
      const newResonance = Math.max(0.1, Math.min(8, (1 - normalizedY) * 8));

      onChange({
        ...filter,
        frequency: Math.max(20, Math.min(20000, newFreq)),
        resonance: Math.round(newResonance * 10) / 10,
      });
    },
    [filter, onChange, canvasSize]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDragging || !filter.enabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(canvasSize.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(canvasSize.height, e.clientY - rect.top));

      const newFreq = Math.round(xToFreq(x, canvasSize.width));
      // Max Q of 8 prevents self-oscillation while still being very resonant
      const normalizedY = y / canvasSize.height;
      const newResonance = Math.max(0.1, Math.min(8, (1 - normalizedY) * 8));

      onChange({
        ...filter,
        frequency: Math.max(20, Math.min(20000, newFreq)),
        resonance: Math.round(newResonance * 10) / 10,
      });
    },
    [isDragging, filter, onChange, canvasSize]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="filter-section">
      <SectionHeader
        title="Filter"
        enabled={filter.enabled}
        onToggle={(enabled) => onChange({ ...filter, enabled })}
      >
        <div className="filter-visual-editor" ref={containerRef}>
          {/* Filter type buttons */}
          <div className="filter-type-row">
            {MAIN_FILTER_TYPES.map((type) => (
              <button
                key={type}
                className={`filter-type-btn ${filter.type === type ? "active" : ""}`}
                onClick={() => onChange({ ...filter, type })}
                disabled={!filter.enabled}
                title={type.charAt(0).toUpperCase() + type.slice(1)}
              >
                <svg viewBox="0 0 16 16" width="20" height="20">
                  <path
                    d={FILTER_ICONS[type]}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}

            <div className="filter-type-divider" />

            {/* Rolloff selector */}
            <div className="rolloff-selector">
              {rolloffOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`rolloff-btn ${filter.rolloff === opt.value ? "active" : ""}`}
                  onClick={() => onChange({ ...filter, rolloff: opt.value })}
                  disabled={!filter.enabled}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas frequency response display */}
          <canvas
            ref={canvasRef}
            className="filter-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ cursor: filter.enabled ? "crosshair" : "default" }}
          />

          {/* Frequency/Resonance display */}
          <div className="filter-value-display">
            <span className="filter-value">
              <span className="filter-value-label">Freq</span>
              <span className="filter-value-num">
                {filter.frequency >= 1000
                  ? `${(filter.frequency / 1000).toFixed(1)}k`
                  : filter.frequency}
                Hz
              </span>
            </span>
            <span className="filter-value">
              <span className="filter-value-label">Res</span>
              <span className="filter-value-num">{filter.resonance.toFixed(1)}</span>
            </span>
          </div>

          {/* Additional controls */}
          <div className="filter-knobs">
            <KnobControl
              label="Env Amt"
              value={filter.envelopeAmount}
              min={-1}
              max={1}
              step={0.01}
              onChange={(envelopeAmount) => onChange({ ...filter, envelopeAmount })}
              bipolar={true}
              disabled={!filter.enabled}
            />
            <KnobControl
              label="Key Track"
              value={filter.keyTracking}
              min={0}
              max={1}
              step={0.01}
              onChange={(keyTracking) => onChange({ ...filter, keyTracking })}
              disabled={!filter.enabled}
            />
          </div>
        </div>
      </SectionHeader>
    </div>
  );
}
