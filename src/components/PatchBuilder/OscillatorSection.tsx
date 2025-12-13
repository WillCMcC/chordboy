/**
 * OscillatorSection Component
 * Controls for a single oscillator in the patch builder
 */

import { KnobControl, DropdownControl, SectionHeader } from "./index";
import type { OscillatorConfig, OscillatorWaveform } from "../../types/synth";
import "./controls.css";
import "./sections.css";

interface OscillatorSectionProps {
  label: string;
  oscillator: OscillatorConfig;
  onChange: (config: OscillatorConfig) => void;
}

const waveformOptions = [
  { value: "sine", label: "Sine" },
  { value: "triangle", label: "Triangle" },
  { value: "sawtooth", label: "Sawtooth" },
  { value: "square", label: "Square" },
  { value: "fatsawtooth", label: "Fat Sawtooth" },
  { value: "fatsquare", label: "Fat Square" },
  { value: "pulse", label: "Pulse" },
  { value: "pwm", label: "PWM" },
];

export function OscillatorSection({ label, oscillator, onChange }: OscillatorSectionProps) {
  const handleEnabledToggle = (enabled: boolean) => {
    onChange({ ...oscillator, enabled });
  };

  const handleWaveformChange = (waveform: string | number) => {
    onChange({ ...oscillator, waveform: waveform as OscillatorWaveform });
  };

  const handleOctaveChange = (octave: number) => {
    onChange({ ...oscillator, octave });
  };

  const handleDetuneChange = (detune: number) => {
    onChange({ ...oscillator, detune });
  };

  const handleVolumeChange = (volume: number) => {
    onChange({ ...oscillator, volume });
  };

  const handlePanChange = (pan: number) => {
    onChange({ ...oscillator, pan });
  };

  return (
    <div className="oscillator-section">
      <SectionHeader
        title={label}
        enabled={oscillator.enabled}
        onToggle={handleEnabledToggle}
      >
        <div className="oscillator-controls">
          {/* Waveform dropdown */}
          <div className="control-row">
            <DropdownControl
              label="Waveform"
              value={oscillator.waveform}
              options={waveformOptions}
              onChange={handleWaveformChange}
              disabled={!oscillator.enabled}
            />
          </div>

          {/* Knobs grid */}
          <div className="control-grid">
            <KnobControl
              label="Octave"
              value={oscillator.octave}
              min={-2}
              max={2}
              step={1}
              onChange={handleOctaveChange}
              disabled={!oscillator.enabled}
            />
            <KnobControl
              label="Detune"
              value={oscillator.detune}
              min={-100}
              max={100}
              step={1}
              onChange={handleDetuneChange}
              unit="ct"
              disabled={!oscillator.enabled}
            />
            <KnobControl
              label="Volume"
              value={oscillator.volume}
              min={0}
              max={1}
              step={0.01}
              onChange={handleVolumeChange}
              disabled={!oscillator.enabled}
            />
            <KnobControl
              label="Pan"
              value={oscillator.pan}
              min={-1}
              max={1}
              step={0.01}
              onChange={handlePanChange}
              bipolar={true}
              disabled={!oscillator.enabled}
            />
          </div>
        </div>
      </SectionHeader>
    </div>
  );
}
