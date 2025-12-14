import React from "react";
import "./controls.css";

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
  unit = "",
  disabled = false,
}: SliderControlProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  // Calculate proper decimal places from step (e.g., step=0.01 -> 2 decimals)
  const decimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
  const displayValue = unit
    ? `${value.toFixed(decimals)}${unit}`
    : value.toFixed(decimals);

  return (
    <div className={`slider-control ${disabled ? "disabled" : ""}`}>
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
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  );
}
