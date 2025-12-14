import React, { useRef, useState, useCallback, useEffect } from "react";
import "./controls.css";

interface KnobControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  bipolar?: boolean;
  disabled?: boolean;
  /** Custom value formatter for display */
  formatValue?: (value: number) => string;
}

/**
 * Rotary knob control with drag-to-change behavior
 * - Drag up/down to adjust value (not circular motion)
 * - Hold Shift for fine control (0.1x sensitivity)
 * - Touch-friendly with 48px minimum target
 * - Visual indicator shows current position
 */
export function KnobControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = "",
  bipolar = false,
  disabled = false,
  formatValue,
}: KnobControlProps) {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartValue = useRef(0);

  // Clamp value to range
  const clampValue = useCallback(
    (val: number) => {
      const clamped = Math.max(min, Math.min(max, val));
      // Round to step
      return Math.round(clamped / step) * step;
    },
    [min, max, step],
  );

  // Convert value to rotation angle (270 degrees total range)
  const valueToAngle = useCallback(
    (val: number) => {
      const range = max - min;
      const normalized = (val - min) / range;
      return -135 + normalized * 270; // -135deg to +135deg
    },
    [min, max],
  );

  // Handle drag start
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartValue.current = value;
    },
    [disabled, value],
  );

  // Handle drag move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || disabled) return;

      e.preventDefault();
      e.stopPropagation();

      const deltaY = dragStartY.current - e.clientY; // Inverted: up = positive
      const sensitivity = e.shiftKey ? 0.5 : 2; // Shift for fine control
      const range = max - min;
      const pixelsPerRange = 150; // Drag 150px for full range

      const delta = (deltaY / pixelsPerRange) * range * sensitivity;
      const newValue = clampValue(dragStartValue.current + delta);

      if (newValue !== value) {
        onChange(newValue);
      }
    },
    [isDragging, disabled, max, min, value, onChange, clampValue],
  );

  // Handle drag end
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget;
      target.releasePointerCapture(e.pointerId);

      setIsDragging(false);
    },
    [isDragging],
  );

  // Handle keyboard control
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      const smallStep = e.shiftKey ? step * 0.1 : step;
      const largeStep = step * 10;
      let newValue = value;

      switch (e.key) {
        case "ArrowUp":
        case "ArrowRight":
          e.preventDefault();
          newValue = clampValue(value + smallStep);
          break;
        case "ArrowDown":
        case "ArrowLeft":
          e.preventDefault();
          newValue = clampValue(value - smallStep);
          break;
        case "PageUp":
          e.preventDefault();
          newValue = clampValue(value + largeStep);
          break;
        case "PageDown":
          e.preventDefault();
          newValue = clampValue(value - largeStep);
          break;
        case "Home":
          e.preventDefault();
          newValue = min;
          break;
        case "End":
          e.preventDefault();
          newValue = max;
          break;
        default:
          return;
      }

      if (newValue !== value) {
        onChange(newValue);
      }
    },
    [disabled, step, value, clampValue, min, max, onChange],
  );

  // Prevent default touch behavior
  useEffect(() => {
    const knob = knobRef.current;
    if (!knob) return;

    const preventTouch = (e: TouchEvent) => {
      e.preventDefault();
    };

    knob.addEventListener("touchstart", preventTouch, { passive: false });
    knob.addEventListener("touchmove", preventTouch, { passive: false });

    return () => {
      // Use captured ref value, not current (may be null in cleanup)
      knob.removeEventListener("touchstart", preventTouch);
      knob.removeEventListener("touchmove", preventTouch);
    };
  }, []);

  const angle = valueToAngle(value);
  // Calculate proper decimal places from step (e.g., step=0.01 -> 2 decimals)
  const decimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
  const displayValue = formatValue
    ? formatValue(value)
    : unit
      ? `${value.toFixed(decimals)}${unit}`
      : value.toFixed(decimals);

  return (
    <div
      className={`knob-control ${bipolar ? "bipolar" : ""} ${disabled ? "disabled" : ""}`}
    >
      <div className="knob-label">{label}</div>
      <div
        ref={knobRef}
        className="knob-wrapper"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-disabled={disabled}
      >
        <div className="knob-circle">
          <div
            className="knob-indicator"
            style={{
              transform: `rotate(${angle}deg)`,
            }}
          />
        </div>
      </div>
      <div className="knob-value">{displayValue}</div>
    </div>
  );
}
