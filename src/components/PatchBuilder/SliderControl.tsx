import React from 'react';
import './controls.css';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
  disabled?: boolean;
}

/**
 * Horizontal slider control
 * - CSS-styled range input
 * - Touch-friendly
 * - Value display with unit
 */
export function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
  disabled = false,
}: SliderControlProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  const displayValue = unit ? `${value.toFixed(step < 1 ? 1 : 0)}${unit}` : value.toFixed(step < 1 ? 1 : 0);

  return (
    <div className={`slider-control ${disabled ? 'disabled' : ''}`}>
      <div className="slider-header">
        <div className="slider-label">{label}</div>
        <div className="slider-value">{displayValue}</div>
      </div>
      <input
        type="range"
        className="slider-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
