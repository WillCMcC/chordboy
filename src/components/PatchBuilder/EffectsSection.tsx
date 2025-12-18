/**
 * EffectsSection Component
 * Reorderable effects chain with per-effect parameter controls.
 * Supports adding, removing, enabling/disabling, and reordering effects.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { EffectConfig, EffectType } from '../../types/synth';
import { KnobControl } from './KnobControl';
import { DropdownControl } from './DropdownControl';
import { SectionHeader } from './SectionHeader';
import { EFFECTS_CONFIG, EFFECT_OPTIONS } from './effectsConfig';
import './effects.css';

interface EffectsSectionProps {
  effects: EffectConfig[];
  onChange: (effects: EffectConfig[]) => void;
}

/**
 * Generic effect parameter controls - data-driven from config
 */
function EffectParams({
  effect,
  onChange,
}: {
  effect: EffectConfig;
  onChange: (params: Record<string, number | string | boolean>) => void;
}) {
  const disabled = !effect.enabled;
  const config = EFFECTS_CONFIG[effect.type];

  const updateParam = (key: string, value: number | string) => {
    onChange({ ...effect.params, [key]: value });
  };

  if (!config) return null;

  return (
    <div className="effect-params">
      {config.params.map((paramConfig) => {
        if (paramConfig.type === 'knob') {
          return (
            <KnobControl
              key={paramConfig.key}
              label={paramConfig.label}
              value={effect.params[paramConfig.key] as number}
              min={paramConfig.min}
              max={paramConfig.max}
              step={paramConfig.step}
              unit={paramConfig.unit}
              onChange={(v) => updateParam(paramConfig.key, v)}
              disabled={disabled}
            />
          );
        } else if (paramConfig.type === 'dropdown') {
          return (
            <DropdownControl
              key={paramConfig.key}
              label={paramConfig.label}
              value={effect.params[paramConfig.key] as string}
              options={paramConfig.options}
              onChange={(v) => updateParam(paramConfig.key, v)}
              disabled={disabled}
            />
          );
        }
        return null;
      })}
    </div>
  );
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
          title={EFFECTS_CONFIG[effect.type].label}
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
  // Add new effect
  const handleAddEffect = useCallback(
    (effectType: EffectType) => {
      const config = EFFECTS_CONFIG[effectType];
      const newEffect: EffectConfig = {
        type: effectType,
        enabled: true,
        wet: config.defaultWet,
        params: { ...config.defaultParams },
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
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Click-away listener to close dropdown
  useEffect(() => {
    if (!showEffectMenu) return;

    const handleClickAway = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setShowEffectMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
    };
  }, [showEffectMenu]);

  return (
    <div className="effects-section">
      <div className="effects-header">
        <h3>Effects Chain</h3>
        <div className="add-effect-container" ref={menuContainerRef}>
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
