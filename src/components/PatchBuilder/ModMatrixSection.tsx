/**
 * ModMatrixSection Component
 * Full modulation routing matrix UI with LFO controls and flexible routing.
 * Allows users to create custom modulation routings from sources to destinations.
 */

import { useCallback } from 'react';
import type {
  ModMatrix,
  ModRouting,
  LFOConfig,
  ModSource,
  ModDestination,
  LFOWaveform,
} from '../../types/synth';
import { KnobControl } from './KnobControl';
import { DropdownControl, type DropdownOption } from './DropdownControl';
import { SectionHeader } from './SectionHeader';
import './mod-matrix.css';

interface ModMatrixSectionProps {
  modMatrix: ModMatrix;
  onChange: (matrix: ModMatrix) => void;
}

// Dropdown options for mod sources
const MOD_SOURCE_OPTIONS: DropdownOption[] = [
  { value: 'lfo1', label: 'LFO 1' },
  { value: 'lfo2', label: 'LFO 2' },
  { value: 'env1', label: 'Mod Env 1' },
  { value: 'env2', label: 'Mod Env 2' },
  { value: 'velocity', label: 'Velocity' },
  { value: 'keytrack', label: 'Key Track' },
  { value: 'modwheel', label: 'Mod Wheel' },
  { value: 'aftertouch', label: 'Aftertouch' },
];

// Dropdown options for mod destinations
// Only showing implemented destinations
const MOD_DESTINATION_OPTIONS: DropdownOption[] = [
  { value: 'filter_freq', label: 'Filter Freq' },
  { value: 'filter_res', label: 'Filter Res' },
  { value: 'amp_volume', label: 'Amp Volume' },
  { value: 'lfo1_rate', label: 'LFO1 Rate' },
  { value: 'lfo2_rate', label: 'LFO2 Rate' },
];

// Dropdown options for LFO waveforms
const LFO_WAVEFORM_OPTIONS: DropdownOption[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'square', label: 'Square' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sawtooth', label: 'Sawtooth' },
];

/**
 * LFO Panel Component
 * Displays controls for a single LFO with enable toggle, waveform, rate, and sync.
 */
function LFOPanel({
  lfo,
  label,
  onChange,
}: {
  lfo: LFOConfig;
  label: string;
  onChange: (lfo: LFOConfig) => void;
}) {
  return (
    <div className="lfo-panel">
      <SectionHeader
        title={label}
        enabled={lfo.enabled}
        onToggle={(enabled) => onChange({ ...lfo, enabled })}
      />
      <div className="lfo-controls">
        <DropdownControl
          label="Waveform"
          value={lfo.waveform}
          options={LFO_WAVEFORM_OPTIONS}
          onChange={(value) => onChange({ ...lfo, waveform: value as LFOWaveform })}
          disabled={!lfo.enabled}
        />
        <KnobControl
          label="Rate"
          value={lfo.frequency}
          min={0.01}
          max={50}
          step={0.01}
          unit="Hz"
          onChange={(frequency) => onChange({ ...lfo, frequency })}
          disabled={!lfo.enabled}
        />
        <button
          className={`lfo-sync-btn ${lfo.sync ? 'active' : ''} ${!lfo.enabled ? 'disabled' : ''}`}
          onClick={() => onChange({ ...lfo, sync: !lfo.sync })}
          disabled={!lfo.enabled}
          aria-label={`${lfo.sync ? 'Disable' : 'Enable'} sync to transport`}
        >
          Sync
        </button>
      </div>
    </div>
  );
}

/**
 * Routing Row Component
 * Single modulation routing with source, destination, amount, enable, and delete controls.
 */
function RoutingRow({
  routing,
  onChange,
  onDelete,
}: {
  routing: ModRouting;
  onChange: (routing: ModRouting) => void;
  onDelete: () => void;
}) {
  return (
    <div className="routing-row">
      <button
        className={`routing-toggle ${routing.enabled ? 'active' : ''}`}
        onClick={() => onChange({ ...routing, enabled: !routing.enabled })}
        aria-label={`${routing.enabled ? 'Disable' : 'Enable'} routing`}
      >
        {routing.enabled ? '✓' : ''}
      </button>
      <div className="routing-controls">
        <DropdownControl
          label="Source"
          value={routing.source}
          options={MOD_SOURCE_OPTIONS}
          onChange={(value) => onChange({ ...routing, source: value as ModSource })}
          disabled={!routing.enabled}
        />
        <DropdownControl
          label="Destination"
          value={routing.destination}
          options={MOD_DESTINATION_OPTIONS}
          onChange={(value) => onChange({ ...routing, destination: value as ModDestination })}
          disabled={!routing.enabled}
        />
        <KnobControl
          label="Amount"
          value={routing.amount}
          min={-1}
          max={1}
          step={0.01}
          bipolar={true}
          onChange={(amount) => onChange({ ...routing, amount })}
          disabled={!routing.enabled}
        />
      </div>
      <button
        className="routing-delete-btn"
        onClick={onDelete}
        aria-label="Delete routing"
        title="Delete routing"
      >
        ×
      </button>
    </div>
  );
}

/**
 * ModMatrixSection Component
 * Main component displaying LFOs and modulation routings.
 */
export function ModMatrixSection({ modMatrix, onChange }: ModMatrixSectionProps) {
  // Update LFO 1
  const handleLFO1Change = useCallback(
    (lfo1: LFOConfig) => {
      onChange({ ...modMatrix, lfo1 });
    },
    [modMatrix, onChange]
  );

  // Update LFO 2
  const handleLFO2Change = useCallback(
    (lfo2: LFOConfig) => {
      onChange({ ...modMatrix, lfo2 });
    },
    [modMatrix, onChange]
  );

  // Add new routing
  const handleAddRouting = useCallback(() => {
    const newRouting: ModRouting = {
      id: crypto.randomUUID(),
      source: 'lfo1',
      destination: 'filter_freq',
      amount: 0.5,
      enabled: true,
    };

    onChange({
      ...modMatrix,
      routings: [...modMatrix.routings, newRouting],
    });
  }, [modMatrix, onChange]);

  // Update routing
  const handleRoutingChange = useCallback(
    (index: number, routing: ModRouting) => {
      const newRoutings = [...modMatrix.routings];
      newRoutings[index] = routing;
      onChange({ ...modMatrix, routings: newRoutings });
    },
    [modMatrix, onChange]
  );

  // Delete routing
  const handleRoutingDelete = useCallback(
    (index: number) => {
      const newRoutings = modMatrix.routings.filter((_, i) => i !== index);
      onChange({ ...modMatrix, routings: newRoutings });
    },
    [modMatrix, onChange]
  );

  const maxRoutings = 8;
  const canAddRouting = modMatrix.routings.length < maxRoutings;

  return (
    <div className="mod-matrix-section">
      <div className="mod-matrix-header">
        <h3>Modulation Matrix</h3>
      </div>

      {/* LFO Panels */}
      <div className="lfo-panels">
        <LFOPanel lfo={modMatrix.lfo1} label="LFO 1" onChange={handleLFO1Change} />
        <LFOPanel lfo={modMatrix.lfo2} label="LFO 2" onChange={handleLFO2Change} />
      </div>

      {/* Routings Section */}
      <div className="routings-section">
        <div className="routings-header">
          <h4>Modulation Routings</h4>
          <button
            className="add-routing-btn"
            onClick={handleAddRouting}
            disabled={!canAddRouting}
            aria-label="Add modulation routing"
          >
            + Add Routing
          </button>
        </div>

        {modMatrix.routings.length === 0 ? (
          <div className="routings-empty">
            No modulation routings. Click "Add Routing" to create one.
          </div>
        ) : (
          <div className="routings-list">
            {modMatrix.routings.map((routing, index) => (
              <RoutingRow
                key={routing.id}
                routing={routing}
                onChange={(r) => handleRoutingChange(index, r)}
                onDelete={() => handleRoutingDelete(index)}
              />
            ))}
          </div>
        )}

        {!canAddRouting && (
          <div className="routings-max-notice">
            Maximum of {maxRoutings} routings reached
          </div>
        )}
      </div>
    </div>
  );
}
