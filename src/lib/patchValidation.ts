/**
 * Patch validation for data loaded from IndexedDB
 * Validates CustomPatch structure to prevent corruption crashes
 *
 * @module lib/patchValidation
 */

import type {
  CustomPatch,
  OscillatorConfig,
  FilterConfig,
  EnvelopeConfig,
  FilterEnvelopeConfig,
  ModMatrix,
  EffectConfig,
} from "../types/synth";

/**
 * Validate that a value is a CustomPatch
 */
export function validatePatch(data: unknown): data is CustomPatch {
  if (typeof data !== "object" || data === null) return false;
  const patch = data as Record<string, unknown>;

  // Required string fields
  if (typeof patch.id !== "string" || patch.id.length === 0) return false;
  if (typeof patch.name !== "string") return false;
  if (typeof patch.description !== "string") return false;
  if (typeof patch.category !== "string") return false;

  // Required numeric fields with ranges
  if (
    typeof patch.masterVolume !== "number" ||
    patch.masterVolume < 0 ||
    patch.masterVolume > 1
  )
    return false;
  if (
    typeof patch.oscMix !== "number" ||
    patch.oscMix < 0 ||
    patch.oscMix > 1
  )
    return false;
  if (typeof patch.glide !== "number" || patch.glide < 0) return false;

  // Timestamps
  if (typeof patch.createdAt !== "number") return false;
  if (typeof patch.updatedAt !== "number") return false;

  // Oscillator configs
  if (!validateOscillator(patch.osc1)) return false;
  if (!validateOscillator(patch.osc2)) return false;

  // Filter config
  if (!validateFilter(patch.filter)) return false;

  // Envelope configs
  if (!validateEnvelope(patch.ampEnvelope)) return false;
  if (!validateFilterEnvelope(patch.filterEnvelope)) return false;

  // ModMatrix
  if (!validateModMatrix(patch.modMatrix)) return false;

  // Effects array
  if (!Array.isArray(patch.effects)) return false;
  if (!patch.effects.every((effect) => validateEffect(effect))) return false;

  return true;
}

function validateOscillator(osc: unknown): osc is OscillatorConfig {
  if (typeof osc !== "object" || osc === null) return false;
  const o = osc as Record<string, unknown>;
  if (typeof o.enabled !== "boolean") return false;
  if (typeof o.waveform !== "string") return false;
  if (typeof o.octave !== "number") return false;
  if (typeof o.detune !== "number") return false;
  if (typeof o.volume !== "number" || o.volume < 0 || o.volume > 1)
    return false;
  if (typeof o.pan !== "number" || o.pan < -1 || o.pan > 1) return false;

  // Optional fields
  if (o.spread !== undefined && typeof o.spread !== "number") return false;
  if (o.count !== undefined && typeof o.count !== "number") return false;

  return true;
}

function validateFilter(filter: unknown): filter is FilterConfig {
  if (typeof filter !== "object" || filter === null) return false;
  const f = filter as Record<string, unknown>;
  if (typeof f.enabled !== "boolean") return false;
  if (typeof f.type !== "string") return false;
  if (
    typeof f.frequency !== "number" ||
    f.frequency < 20 ||
    f.frequency > 20000
  )
    return false;
  if (typeof f.resonance !== "number") return false;
  if (typeof f.rolloff !== "number") return false;
  if (
    typeof f.envelopeAmount !== "number" ||
    f.envelopeAmount < -1 ||
    f.envelopeAmount > 1
  )
    return false;
  if (
    typeof f.keyTracking !== "number" ||
    f.keyTracking < 0 ||
    f.keyTracking > 1
  )
    return false;
  return true;
}

function validateEnvelope(env: unknown): env is EnvelopeConfig {
  if (typeof env !== "object" || env === null) return false;
  const e = env as Record<string, unknown>;
  if (typeof e.attack !== "number" || e.attack < 0) return false;
  if (typeof e.decay !== "number" || e.decay < 0) return false;
  if (typeof e.sustain !== "number" || e.sustain < 0 || e.sustain > 1)
    return false;
  if (typeof e.release !== "number" || e.release < 0) return false;

  // Optional curve fields
  if (e.attackCurve !== undefined && typeof e.attackCurve !== "string")
    return false;
  if (e.releaseCurve !== undefined && typeof e.releaseCurve !== "string")
    return false;

  return true;
}

function validateFilterEnvelope(env: unknown): env is FilterEnvelopeConfig {
  if (!validateEnvelope(env)) return false;
  const e = env as Record<string, unknown>;
  if (typeof e.octaves !== "number" || e.octaves < 0 || e.octaves > 8)
    return false;
  return true;
}

function validateModMatrix(modMatrix: unknown): modMatrix is ModMatrix {
  if (typeof modMatrix !== "object" || modMatrix === null) return false;
  const m = modMatrix as Record<string, unknown>;

  // Routings array
  if (!Array.isArray(m.routings)) return false;
  if (
    !m.routings.every((routing: unknown) => {
      if (typeof routing !== "object" || routing === null) return false;
      const r = routing as Record<string, unknown>;
      return (
        typeof r.id === "string" &&
        typeof r.source === "string" &&
        typeof r.destination === "string" &&
        typeof r.amount === "number" &&
        typeof r.enabled === "boolean"
      );
    })
  )
    return false;

  // LFO configs
  if (!validateLFO(m.lfo1)) return false;
  if (!validateLFO(m.lfo2)) return false;

  // Mod envelopes
  if (!validateEnvelope(m.modEnv1)) return false;
  if (!validateEnvelope(m.modEnv2)) return false;

  return true;
}

function validateLFO(lfo: unknown): boolean {
  if (typeof lfo !== "object" || lfo === null) return false;
  const l = lfo as Record<string, unknown>;
  if (typeof l.enabled !== "boolean") return false;
  if (typeof l.waveform !== "string") return false;
  if (typeof l.frequency !== "number") return false;
  if (typeof l.min !== "number") return false;
  if (typeof l.max !== "number") return false;
  if (typeof l.phase !== "number") return false;
  if (typeof l.sync !== "boolean") return false;
  return true;
}

function validateEffect(effect: unknown): effect is EffectConfig {
  if (typeof effect !== "object" || effect === null) return false;
  const e = effect as Record<string, unknown>;
  if (typeof e.type !== "string") return false;
  if (typeof e.enabled !== "boolean") return false;
  if (typeof e.wet !== "number" || e.wet < 0 || e.wet > 1) return false;
  if (typeof e.params !== "object" || e.params === null) return false;
  return true;
}

/**
 * Sanitize a patch by clamping values to valid ranges
 * Use this to fix patches that fail validation
 */
export function sanitizePatch(patch: CustomPatch): CustomPatch {
  return {
    ...patch,
    masterVolume: Math.max(0, Math.min(1, patch.masterVolume)),
    oscMix: Math.max(0, Math.min(1, patch.oscMix)),
    glide: Math.max(0, patch.glide),
    osc1: sanitizeOscillator(patch.osc1),
    osc2: sanitizeOscillator(patch.osc2),
    filter: sanitizeFilter(patch.filter),
    ampEnvelope: sanitizeEnvelope(patch.ampEnvelope),
    filterEnvelope: sanitizeFilterEnvelope(patch.filterEnvelope),
    effects: patch.effects.map((effect) => ({
      ...effect,
      wet: Math.max(0, Math.min(1, effect.wet)),
    })),
  };
}

function sanitizeOscillator(osc: OscillatorConfig): OscillatorConfig {
  return {
    ...osc,
    volume: Math.max(0, Math.min(1, osc.volume)),
    octave: Math.max(-4, Math.min(4, osc.octave)),
    detune: Math.max(-100, Math.min(100, osc.detune)),
    pan: Math.max(-1, Math.min(1, osc.pan)),
  };
}

function sanitizeFilter(filter: FilterConfig): FilterConfig {
  return {
    ...filter,
    frequency: Math.max(20, Math.min(20000, filter.frequency)),
    resonance: Math.max(0.1, Math.min(8, filter.resonance)),
    envelopeAmount: Math.max(-1, Math.min(1, filter.envelopeAmount)),
    keyTracking: Math.max(0, Math.min(1, filter.keyTracking)),
  };
}

function sanitizeEnvelope(env: EnvelopeConfig): EnvelopeConfig {
  return {
    ...env,
    attack: Math.max(0.001, Math.min(5, env.attack)),
    decay: Math.max(0.001, Math.min(5, env.decay)),
    sustain: Math.max(0, Math.min(1, env.sustain)),
    release: Math.max(0.001, Math.min(10, env.release)),
  };
}

function sanitizeFilterEnvelope(
  env: FilterEnvelopeConfig
): FilterEnvelopeConfig {
  return {
    ...sanitizeEnvelope(env),
    octaves: Math.max(0, Math.min(8, env.octaves)),
  };
}
