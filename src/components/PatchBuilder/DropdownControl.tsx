import React from 'react';
import './controls.css';

export interface DropdownOption {
  value: string | number;
  label: string;
}

interface DropdownControlProps {
  label: string;
  value: string | number;
  options: DropdownOption[];
  onChange: (value: string | number) => void;
  disabled?: boolean;
}

/**
 * Styled select dropdown control
 * - Custom styling matching glass-morphism theme
 * - Touch-friendly
 * - Supports string or number values
 */
export function DropdownControl({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: DropdownControlProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    // Find the matching option to preserve its original type
    // This avoids incorrectly converting "4x" to 4
    const option = options.find((opt) => String(opt.value) === selectedValue);
    onChange(option ? option.value : selectedValue);
  };

  return (
    <div className={`dropdown-control ${disabled ? 'disabled' : ''}`}>
      <div className="dropdown-label">{label}</div>
      <select
        className="dropdown-select"
        value={value}
        onChange={handleChange}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
