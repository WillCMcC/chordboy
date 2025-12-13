/**
 * EffectsSection Component
 * Reorderable effects chain with per-effect parameter controls.
 * Supports adding, removing, enabling/disabling, and reordering effects.
 */

import { useState, useCallback } from 'react';
import type { EffectConfig, EffectType } from '../../types/synth';
import { KnobControl } from './KnobControl';
import { DropdownControl, type DropdownOption } from './DropdownControl';
import { SectionHeader } from './SectionHeader';
import './effects.css';

interface EffectsSectionProps {
  effects: EffectConfig[];
  onChange: (effects: EffectConfig[]) => void;
}

// Available effect types
const EFFECT_OPTIONS: DropdownOption[] = [
  { value: 'chorus', label: 'Chorus' },
  { value: 'reverb', label: 'Reverb' },
  { value: 'delay', label: 'Delay' },
  { value: 'pingpong', label: 'Ping Pong Delay' },
  { value: 'distortion', label: 'Distortion' },
  { value: 'phaser', label: 'Phaser' },
  { value: 'tremolo', label: 'Tremolo' },
  { value: 'vibrato', label: 'Vibrato' },
  { value: 'compressor', label: 'Compressor' },
  { value: 'bitcrusher', label: 'Bitcrusher' },
  { value: 'autofilter', label: 'Auto Filter' },
  { value: 'autopanner', label: 'Auto Panner' },
  { value: 'autowah', label: 'Auto Wah' },
];

// Default parameters for each effect type (optimized for audibility)
const DEFAULT_EFFECT_PARAMS: Record<EffectType, Record<string, number | string>> = {
  chorus: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
  reverb: { decay: 1.5, preDelay: 0.01 },
  delay: { delayTime: 0.25, feedback: 0.3 },
  pingpong: { delayTime: 0.25, feedback: 0.3 },
  phaser: { frequency: 0.5, octaves: 3, baseFrequency: 350 },
  distortion: { distortion: 0.4, oversample: 'none' },
  bitcrusher: { bits: 4 },
  compressor: { threshold: -24, ratio: 3, attack: 0.003, release: 0.25 },
  tremolo: { frequency: 10, depth: 0.7 }, // Increased from 0.5 for more obvious amplitude modulation
  vibrato: { frequency: 5, depth: 0.3 }, // Increased from 0.1 for more audible pitch modulation
  autofilter: { frequency: 1, depth: 1, baseFrequency: 200 },
  autopanner: { frequency: 1, depth: 1 },
  autowah: { baseFrequency: 100, octaves: 6, sensitivity: 0 }, // 0 = max sensitivity
};

// Human-readable effect names
const EFFECT_LABELS: Record<EffectType, string> = {
  chorus: 'Chorus',
  reverb: 'Reverb',
  delay: 'Delay',
  pingpong: 'Ping Pong Delay',
  phaser: 'Phaser',
  distortion: 'Distortion',
  bitcrusher: 'Bitcrusher',
  compressor: 'Compressor',
  tremolo: 'Tremolo',
  vibrato: 'Vibrato',
  autofilter: 'Auto Filter',
  autopanner: 'Auto Panner',
  autowah: 'Auto Wah',
};

/**
 * Effect parameter controls based on effect type
 */
function EffectParams({
  effect,
  onChange,
}: {
  effect: EffectConfig;
  onChange: (params: Record<string, number | string | boolean>) => void;
}) {
  const disabled = !effect.enabled;

  const updateParam = (key: string, value: number | string) => {
    onChange({ ...effect.params, [key]: value });
  };

  switch (effect.type) {
    case 'chorus':
      return (
        <div className="effect-params">
          <KnobControl
            label="Frequency"
            value={effect.params.frequency as number}
            min={0.1}
            max={10}
            step={0.1}
            unit="Hz"
            onChange={(v) => updateParam('frequency', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Delay Time"
            value={effect.params.delayTime as number}
            min={0}
            max={20}
            step={0.1}
            unit="ms"
            onChange={(v) => updateParam('delayTime', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Depth"
            value={effect.params.depth as number}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateParam('depth', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'reverb':
      return (
        <div className="effect-params">
          <KnobControl
            label="Decay"
            value={effect.params.decay as number}
            min={0.1}
            max={10}
            step={0.1}
            unit="s"
            onChange={(v) => updateParam('decay', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Pre-Delay"
            value={effect.params.preDelay as number}
            min={0}
            max={0.5}
            step={0.01}
            unit="s"
            onChange={(v) => updateParam('preDelay', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'delay':
    case 'pingpong':
      return (
        <div className="effect-params">
          <KnobControl
            label="Delay Time"
            value={effect.params.delayTime as number}
            min={0}
            max={1}
            step={0.01}
            unit="s"
            onChange={(v) => updateParam('delayTime', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Feedback"
            value={effect.params.feedback as number}
            min={0}
            max={0.95}
            step={0.01}
            onChange={(v) => updateParam('feedback', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'distortion':
      return (
        <div className="effect-params">
          <KnobControl
            label="Distortion"
            value={effect.params.distortion as number}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateParam('distortion', v)}
            disabled={disabled}
          />
          <DropdownControl
            label="Oversample"
            value={effect.params.oversample as string}
            options={[
              { value: 'none', label: 'None' },
              { value: '2x', label: '2x' },
              { value: '4x', label: '4x' },
            ]}
            onChange={(v) => updateParam('oversample', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'phaser':
      return (
        <div className="effect-params">
          <KnobControl
            label="Frequency"
            value={effect.params.frequency as number}
            min={0.1}
            max={10}
            step={0.1}
            unit="Hz"
            onChange={(v) => updateParam('frequency', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Octaves"
            value={effect.params.octaves as number}
            min={1}
            max={8}
            step={1}
            onChange={(v) => updateParam('octaves', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Base Freq"
            value={effect.params.baseFrequency as number}
            min={100}
            max={1000}
            step={10}
            unit="Hz"
            onChange={(v) => updateParam('baseFrequency', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'tremolo':
      return (
        <div className="effect-params">
          <KnobControl
            label="Frequency"
            value={effect.params.frequency as number}
            min={0.1}
            max={50}
            step={0.1}
            unit="Hz"
            onChange={(v) => updateParam('frequency', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Depth"
            value={effect.params.depth as number}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateParam('depth', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'vibrato':
      return (
        <div className="effect-params">
          <KnobControl
            label="Frequency"
            value={effect.params.frequency as number}
            min={0.1}
            max={50}
            step={0.1}
            unit="Hz"
            onChange={(v) => updateParam('frequency', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Depth"
            value={effect.params.depth as number}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateParam('depth', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'compressor':
      return (
        <div className="effect-params">
          <KnobControl
            label="Threshold"
            value={effect.params.threshold as number}
            min={-100}
            max={0}
            step={1}
            unit="dB"
            onChange={(v) => updateParam('threshold', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Ratio"
            value={effect.params.ratio as number}
            min={1}
            max={20}
            step={0.1}
            onChange={(v) => updateParam('ratio', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Attack"
            value={effect.params.attack as number}
            min={0}
            max={1}
            step={0.001}
            unit="s"
            onChange={(v) => updateParam('attack', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Release"
            value={effect.params.release as number}
            min={0}
            max={1}
            step={0.001}
            unit="s"
            onChange={(v) => updateParam('release', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'bitcrusher':
      return (
        <div className="effect-params">
          <KnobControl
            label="Bits"
            value={effect.params.bits as number}
            min={1}
            max={16}
            step={1}
            onChange={(v) => updateParam('bits', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'autofilter':
      return (
        <div className="effect-params">
          <KnobControl
            label="Frequency"
            value={effect.params.frequency as number}
            min={0.1}
            max={10}
            step={0.1}
            unit="Hz"
            onChange={(v) => updateParam('frequency', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Depth"
            value={effect.params.depth as number}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateParam('depth', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Base Freq"
            value={effect.params.baseFrequency as number}
            min={20}
            max={5000}
            step={10}
            unit="Hz"
            onChange={(v) => updateParam('baseFrequency', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'autopanner':
      return (
        <div className="effect-params">
          <KnobControl
            label="Frequency"
            value={effect.params.frequency as number}
            min={0.1}
            max={10}
            step={0.1}
            unit="Hz"
            onChange={(v) => updateParam('frequency', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Depth"
            value={effect.params.depth as number}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateParam('depth', v)}
            disabled={disabled}
          />
        </div>
      );

    case 'autowah':
      return (
        <div className="effect-params">
          <KnobControl
            label="Base Freq"
            value={effect.params.baseFrequency as number}
            min={50}
            max={500}
            step={10}
            unit="Hz"
            onChange={(v) => updateParam('baseFrequency', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Octaves"
            value={effect.params.octaves as number}
            min={1}
            max={8}
            step={1}
            onChange={(v) => updateParam('octaves', v)}
            disabled={disabled}
          />
          <KnobControl
            label="Sensitivity"
            value={effect.params.sensitivity as number}
            min={-40}
            max={0}
            step={1}
            unit="dB"
            onChange={(v) => updateParam('sensitivity', v)}
            disabled={disabled}
          />
        </div>
      );

    default:
      return null;
  }
}

/**
 * Single effect panel with controls
 */
function EffectPanel({
  effect,
  index,
  totalEffects,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  effect: EffectConfig;
  index: number;
  totalEffects: number;
  onChange: (effect: EffectConfig) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const canMoveUp = index > 0;
  const canMoveDown = index < totalEffects - 1;

  return (
    <div className={`effect-panel ${!effect.enabled ? 'disabled' : ''}`}>
      <div className="effect-header">
        <SectionHeader
          title={EFFECT_LABELS[effect.type]}
          enabled={effect.enabled}
          onToggle={(enabled) => onChange({ ...effect, enabled })}
        />
        <div className="effect-header-actions">
          <button
            className="effect-move-btn"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move effect up"
            title="Move up"
          >
            ↑
          </button>
          <button
            className="effect-move-btn"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move effect down"
            title="Move down"
          >
            ↓
          </button>
          <button
            className="effect-delete-btn"
            onClick={onDelete}
            aria-label="Delete effect"
            title="Delete effect"
          >
            ×
          </button>
        </div>
      </div>

      <div className="effect-controls">
        <KnobControl
          label="Wet"
          value={effect.wet}
          min={0}
          max={1}
          step={0.01}
          onChange={(wet) => onChange({ ...effect, wet })}
          disabled={!effect.enabled}
        />
        <EffectParams
          effect={effect}
          onChange={(params) => onChange({ ...effect, params })}
        />
      </div>
    </div>
  );
}

/**
 * EffectsSection Component
 * Main component for managing effects chain.
 */
export function EffectsSection({ effects, onChange }: EffectsSectionProps) {
  // Default wet values per effect type (optimized for audibility)
  const getDefaultWet = (effectType: EffectType): number => {
    switch (effectType) {
      // Time-based effects - moderate mix
      case 'reverb':
      case 'delay':
      case 'pingpong':
        return 0.4;

      // Modulation effects - higher mix for clarity
      case 'chorus':
      case 'phaser':
      case 'vibrato':
      case 'autofilter':
      case 'autopanner':
      case 'autowah':
        return 0.6;

      // Amplitude effects - higher mix
      case 'tremolo':
        return 0.7;

      // Distortion effects - higher mix for obvious effect
      case 'distortion':
      case 'bitcrusher':
        return 0.75;

      // Dynamics - full wet (compressor now has working wet/dry)
      case 'compressor':
        return 0.7;

      default:
        return 0.5;
    }
  };

  // Add new effect
  const handleAddEffect = useCallback(
    (effectType: EffectType) => {
      const newEffect: EffectConfig = {
        type: effectType,
        enabled: true,
        wet: getDefaultWet(effectType),
        params: { ...DEFAULT_EFFECT_PARAMS[effectType] },
      };

      onChange([...effects, newEffect]);
    },
    [effects, onChange]
  );

  // Update effect
  const handleEffectChange = useCallback(
    (index: number, effect: EffectConfig) => {
      const newEffects = [...effects];
      newEffects[index] = effect;
      onChange(newEffects);
    },
    [effects, onChange]
  );

  // Delete effect
  const handleEffectDelete = useCallback(
    (index: number) => {
      const newEffects = effects.filter((_, i) => i !== index);
      onChange(newEffects);
    },
    [effects, onChange]
  );

  // Move effect up in chain
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newEffects = [...effects];
      [newEffects[index - 1], newEffects[index]] = [newEffects[index], newEffects[index - 1]];
      onChange(newEffects);
    },
    [effects, onChange]
  );

  // Move effect down in chain
  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === effects.length - 1) return;
      const newEffects = [...effects];
      [newEffects[index], newEffects[index + 1]] = [newEffects[index + 1], newEffects[index]];
      onChange(newEffects);
    },
    [effects, onChange]
  );

  // Show dropdown state
  const [showEffectMenu, setShowEffectMenu] = useState(false);

  return (
    <div className="effects-section">
      <div className="effects-header">
        <h3>Effects Chain</h3>
        <div className="add-effect-container">
          <button
            className="add-effect-btn"
            onClick={() => setShowEffectMenu(!showEffectMenu)}
            aria-label="Add effect"
          >
            + Add Effect
          </button>
          {showEffectMenu && (
            <div className="effect-menu">
              {EFFECT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className="effect-menu-item"
                  onClick={() => {
                    handleAddEffect(option.value as EffectType);
                    setShowEffectMenu(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {effects.length === 0 ? (
        <div className="effects-empty">
          No effects in chain. Click "Add Effect" to add one.
        </div>
      ) : (
        <div className="effects-list">
          {effects.map((effect, index) => (
            <EffectPanel
              key={`${effect.type}-${index}`}
              effect={effect}
              index={index}
              totalEffects={effects.length}
              onChange={(e) => handleEffectChange(index, e)}
              onDelete={() => handleEffectDelete(index)}
              onMoveUp={() => handleMoveUp(index)}
              onMoveDown={() => handleMoveDown(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
