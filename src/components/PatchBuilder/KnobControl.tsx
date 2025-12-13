import React, { useRef, useState, useCallback, useEffect } from 'react';
import './controls.css';

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
  unit = '',
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
    [min, max, step]
  );

  // Convert value to rotation angle (270 degrees total range)
  const valueToAngle = useCallback(
    (val: number) => {
      const range = max - min;
      const normalized = (val - min) / range;
      return -135 + normalized * 270; // -135deg to +135deg
    },
    [min, max]
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
    [disabled, value]
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
    [isDragging, disabled, max, min, value, onChange, clampValue]
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
    [isDragging]
  );

  // Prevent default touch behavior
  useEffect(() => {
    const knob = knobRef.current;
    if (!knob) return;

    const preventTouch = (e: TouchEvent) => {
      e.preventDefault();
    };

    knob.addEventListener('touchstart', preventTouch, { passive: false });
    knob.addEventListener('touchmove', preventTouch, { passive: false });

    return () => {
      knob.removeEventListener('touchstart', preventTouch);
      knob.removeEventListener('touchmove', preventTouch);
    };
  }, []);

  const angle = valueToAngle(value);
  const displayValue = formatValue
    ? formatValue(value)
    : unit
      ? `${value.toFixed(step < 1 ? 1 : 0)}${unit}`
      : value.toFixed(step < 1 ? 1 : 0);

  return (
    <div className={`knob-control ${bipolar ? 'bipolar' : ''} ${disabled ? 'disabled' : ''}`}>
      <div className="knob-label">{label}</div>
      <div
        ref={knobRef}
        className="knob-wrapper"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
