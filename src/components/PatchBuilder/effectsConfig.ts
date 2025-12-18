/**
 * Effect configuration - defines all parameters for each effect type
 * This data-driven approach eliminates the need for large switch statements
 */

import type { EffectType } from '../../types/synth';
import type { DropdownOption } from './DropdownControl';

export type ParamType = 'knob' | 'dropdown';

export interface KnobParamConfig {
  type: 'knob';
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface DropdownParamConfig {
  type: 'dropdown';
  key: string;
  label: string;
  options: DropdownOption[];
}

export type ParamConfig = KnobParamConfig | DropdownParamConfig;

export interface EffectTypeConfig {
  label: string;
  defaultParams: Record<string, number | string>;
  defaultWet: number;
  params: ParamConfig[];
}

// Effect type configurations
export const EFFECTS_CONFIG: Record<EffectType, EffectTypeConfig> = {
  chorus: {
    label: 'Chorus',
    defaultParams: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
    defaultWet: 0.6,
    params: [
      { type: 'knob', key: 'frequency', label: 'Frequency', min: 0.1, max: 10, step: 0.1, unit: 'Hz' },
      { type: 'knob', key: 'delayTime', label: 'Delay Time', min: 0, max: 20, step: 0.1, unit: 'ms' },
      { type: 'knob', key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
    ],
  },
  reverb: {
    label: 'Reverb',
    defaultParams: { decay: 1.5, preDelay: 0.01 },
    defaultWet: 0.4,
    params: [
      { type: 'knob', key: 'decay', label: 'Decay', min: 0.1, max: 10, step: 0.1, unit: 's' },
      { type: 'knob', key: 'preDelay', label: 'Pre-Delay', min: 0, max: 0.5, step: 0.01, unit: 's' },
    ],
  },
  delay: {
    label: 'Delay',
    defaultParams: { delayTime: 0.25, feedback: 0.3 },
    defaultWet: 0.4,
    params: [
      { type: 'knob', key: 'delayTime', label: 'Delay Time', min: 0, max: 1, step: 0.01, unit: 's' },
      { type: 'knob', key: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.01 },
    ],
  },
  pingpong: {
    label: 'Ping Pong Delay',
    defaultParams: { delayTime: 0.25, feedback: 0.3 },
    defaultWet: 0.4,
    params: [
      { type: 'knob', key: 'delayTime', label: 'Delay Time', min: 0, max: 1, step: 0.01, unit: 's' },
      { type: 'knob', key: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.01 },
    ],
  },
  phaser: {
    label: 'Phaser',
    defaultParams: { frequency: 0.5, octaves: 3, baseFrequency: 350 },
    defaultWet: 0.6,
    params: [
      { type: 'knob', key: 'frequency', label: 'Frequency', min: 0.1, max: 10, step: 0.1, unit: 'Hz' },
      { type: 'knob', key: 'octaves', label: 'Octaves', min: 1, max: 8, step: 1 },
      { type: 'knob', key: 'baseFrequency', label: 'Base Freq', min: 100, max: 1000, step: 10, unit: 'Hz' },
    ],
  },
  distortion: {
    label: 'Distortion',
    defaultParams: { distortion: 0.4, oversample: 'none' },
    defaultWet: 0.75,
    params: [
      { type: 'knob', key: 'distortion', label: 'Distortion', min: 0, max: 1, step: 0.01 },
      {
        type: 'dropdown',
        key: 'oversample',
        label: 'Oversample',
        options: [
          { value: 'none', label: 'None' },
          { value: '2x', label: '2x' },
          { value: '4x', label: '4x' },
        ],
      },
    ],
  },
  bitcrusher: {
    label: 'Bitcrusher',
    defaultParams: { bits: 4 },
    defaultWet: 0.75,
    params: [
      { type: 'knob', key: 'bits', label: 'Bits', min: 1, max: 16, step: 1 },
    ],
  },
  compressor: {
    label: 'Compressor',
    defaultParams: { threshold: -24, ratio: 3, attack: 0.003, release: 0.25 },
    defaultWet: 0.7,
    params: [
      { type: 'knob', key: 'threshold', label: 'Threshold', min: -100, max: 0, step: 1, unit: 'dB' },
      { type: 'knob', key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.1 },
      { type: 'knob', key: 'attack', label: 'Attack', min: 0, max: 1, step: 0.001, unit: 's' },
      { type: 'knob', key: 'release', label: 'Release', min: 0, max: 1, step: 0.001, unit: 's' },
    ],
  },
  tremolo: {
    label: 'Tremolo',
    defaultParams: { frequency: 10, depth: 0.7 },
    defaultWet: 0.7,
    params: [
      { type: 'knob', key: 'frequency', label: 'Frequency', min: 0.1, max: 50, step: 0.1, unit: 'Hz' },
      { type: 'knob', key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
    ],
  },
  vibrato: {
    label: 'Vibrato',
    defaultParams: { frequency: 5, depth: 0.3 },
    defaultWet: 0.6,
    params: [
      { type: 'knob', key: 'frequency', label: 'Frequency', min: 0.1, max: 50, step: 0.1, unit: 'Hz' },
      { type: 'knob', key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
    ],
  },
  autofilter: {
    label: 'Auto Filter',
    defaultParams: { frequency: 1, depth: 1, baseFrequency: 200 },
    defaultWet: 0.6,
    params: [
      { type: 'knob', key: 'frequency', label: 'Frequency', min: 0.1, max: 10, step: 0.1, unit: 'Hz' },
      { type: 'knob', key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
      { type: 'knob', key: 'baseFrequency', label: 'Base Freq', min: 20, max: 5000, step: 10, unit: 'Hz' },
    ],
  },
  autopanner: {
    label: 'Auto Panner',
    defaultParams: { frequency: 1, depth: 1 },
    defaultWet: 0.6,
    params: [
      { type: 'knob', key: 'frequency', label: 'Frequency', min: 0.1, max: 10, step: 0.1, unit: 'Hz' },
      { type: 'knob', key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
    ],
  },
  autowah: {
    label: 'Auto Wah',
    defaultParams: { baseFrequency: 100, octaves: 6, sensitivity: 0 },
    defaultWet: 0.6,
    params: [
      { type: 'knob', key: 'baseFrequency', label: 'Base Freq', min: 50, max: 500, step: 10, unit: 'Hz' },
      { type: 'knob', key: 'octaves', label: 'Octaves', min: 1, max: 8, step: 1 },
      { type: 'knob', key: 'sensitivity', label: 'Sensitivity', min: -40, max: 0, step: 1, unit: 'dB' },
    ],
  },
};

// Available effect options for dropdown
export const EFFECT_OPTIONS: DropdownOption[] = Object.entries(EFFECTS_CONFIG).map(([type, config]) => ({
  value: type,
  label: config.label,
}));
