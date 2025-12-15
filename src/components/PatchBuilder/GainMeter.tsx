/**
 * GainMeter Component
 * Real-time audio level meter with clipping indicator
 * Compact variant for header integration
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as Tone from "tone";
import "./controls.css";

interface GainMeterProps {
  /** Compact mode for header placement */
  compact?: boolean;
}

// Clip indicator hold time in ms
const CLIP_HOLD_TIME = 1000;

export function GainMeter({ compact = false }: GainMeterProps) {
  const meterRef = useRef<Tone.Meter | null>(null);
  const animationRef = useRef<number | null>(null);
  const [level, setLevel] = useState(-Infinity);
  const [isClipping, setIsClipping] = useState(false);
  const clipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create meter and connect to master output
  useEffect(() => {
    const meter = new Tone.Meter({ smoothing: 0.8 });
    Tone.getDestination().connect(meter);
    meterRef.current = meter;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (clipTimeoutRef.current) {
        clearTimeout(clipTimeoutRef.current);
      }
      try {
        Tone.getDestination().disconnect(meter);
        meter.dispose();
      } catch {
        // Ignore disconnection errors during cleanup
      }
    };
  }, []);

  // Animation loop to read meter values
  useEffect(() => {
    const updateMeter = () => {
      if (meterRef.current) {
        const value = meterRef.current.getValue();
        const db = typeof value === "number" ? value : Math.max(...value);
        setLevel(db);

        // Check for clipping (> -0.5 dB is considered clipping)
        if (db > -0.5) {
          setIsClipping(true);
          if (clipTimeoutRef.current) {
            clearTimeout(clipTimeoutRef.current);
          }
          clipTimeoutRef.current = setTimeout(() => {
            setIsClipping(false);
          }, CLIP_HOLD_TIME);
        }
      }
      animationRef.current = requestAnimationFrame(updateMeter);
    };

    animationRef.current = requestAnimationFrame(updateMeter);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Convert dB to percentage (0-100) for the meter bar
  const dbToPercent = useCallback((db: number): number => {
    if (db <= -60) return 0;
    if (db >= 0) return 100;
    return ((db + 60) / 60) * 100;
  }, []);

  const percent = dbToPercent(level);

  // Compact inline meter for header
  if (compact) {
    return (
      <div className="gain-meter-compact">
        <div className="gain-meter-compact-bar">
          <div
            className="gain-meter-compact-fill"
            style={{ width: `${percent}%` }}
            data-level={percent > 90 ? "clip" : percent > 70 ? "warn" : "ok"}
          />
        </div>
        <div
          className={`gain-meter-compact-clip ${isClipping ? "active" : ""}`}
          title="Clipping indicator"
        />
      </div>
    );
  }

  // Full meter (unused for now, but available)
  const displayDb = level === -Infinity ? "-∞" : level.toFixed(1);
  const getMeterColor = (pct: number): string => {
    if (pct > 90) return "var(--error)";
    if (pct > 75) return "#f59e0b";
    if (pct > 50) return "#eab308";
    return "#22c55e";
  };

  return (
    <div className="gain-meter">
      <div className="gain-meter-header">
        <span className="gain-meter-label">OUTPUT</span>
        <span className={`gain-meter-clip ${isClipping ? "active" : ""}`}>
          CLIP
        </span>
      </div>
      <div className="gain-meter-bar-container">
        <div
          className="gain-meter-bar"
          style={{
            width: `${percent}%`,
            backgroundColor: getMeterColor(percent),
          }}
        />
        <div className="gain-meter-threshold" style={{ left: "75%" }} />
        <div className="gain-meter-threshold danger" style={{ left: "90%" }} />
      </div>
      <div className="gain-meter-scale">
        <span>-60</span>
        <span>-40</span>
        <span>-20</span>
        <span>-10</span>
        <span>0 dB</span>
      </div>
      <div className="gain-meter-value">{displayDb} dB</div>
    </div>
  );
}
