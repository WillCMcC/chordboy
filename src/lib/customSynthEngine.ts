/**
 * Custom Synth Engine for ChordBoy
 * 2-oscillator subtractive synthesizer with full modulation matrix
 *
 * @module lib/customSynthEngine
 */

import * as Tone from "tone";
import type {
  CustomPatch,
  EffectConfig,
} from "../types/synth";
import { VoicePool } from "./synth/VoicePool";
import { ModulationManager, frequencyToSyncedValue } from "./synth/ModulationManager";

// ============================================================================
// Effects Chain Helper
// ============================================================================

/**
 * Create Tone.js effect from configuration
 */
function createEffect(config: EffectConfig): Tone.ToneAudioNode | null {
  if (!config.enabled) return null;

  const params = config.params;

  switch (config.type) {
    case "chorus":
      return new Tone.Chorus({
        frequency: params.frequency as number,
        delayTime: params.delayTime as number,
        depth: params.depth as number,
        wet: config.wet,
      }).start();

    case "phaser":
      return new Tone.Phaser({
        frequency: params.frequency as number,
        octaves: params.octaves as number,
        baseFrequency: params.baseFrequency as number,
        wet: config.wet,
      });

    case "vibrato":
      return new Tone.Vibrato({
        frequency: params.frequency as number,
        depth: params.depth as number,
        wet: config.wet,
      });

    case "tremolo":
      return new Tone.Tremolo({
        frequency: params.frequency as number,
        depth: params.depth as number,
        wet: config.wet,
      }).start();

    case "reverb":
      return new Tone.Reverb({
        decay: params.decay as number,
        preDelay: params.preDelay as number,
        wet: config.wet,
      });

    case "delay":
      return new Tone.FeedbackDelay({
        delayTime: params.delayTime as number,
        feedback: params.feedback as number,
        wet: config.wet,
      });

    case "pingpong":
      return new Tone.PingPongDelay({
        delayTime: params.delayTime as number,
        feedback: params.feedback as number,
        wet: config.wet,
      });

    case "distortion":
      return new Tone.Distortion({
        distortion: params.distortion as number,
        oversample: params.oversample as "none" | "2x" | "4x",
        wet: config.wet,
      });

    case "bitcrusher": {
      const bitcrusher = new Tone.BitCrusher({
        bits: params.bits as number,
      });
      bitcrusher.wet.value = config.wet;
      return bitcrusher;
    }

    case "compressor": {
      // Compressor doesn't have native wet/dry, so create manual wet/dry mixing
      const compressor = new Tone.Compressor({
        threshold: params.threshold as number,
        ratio: params.ratio as number,
        attack: params.attack as number,
        release: params.release as number,
      });

      // Create parallel dry/wet paths with proper wet/dry mixing
      const dryGain = new Tone.Gain(1 - config.wet);
      const wetGain = new Tone.Gain(config.wet);
      const mixer = new Tone.Gain(1);

      // Input splitter
      const splitter = new Tone.Gain(1);

      // Connect: input -> splitter -> [dry path, compressed path] -> mixer
      splitter.connect(dryGain);
      splitter.connect(compressor);
      compressor.connect(wetGain);
      dryGain.connect(mixer);
      wetGain.connect(mixer);

      // Store internal nodes for disposal and wet/dry updates
      (mixer as any)._compressor = compressor;
      (mixer as any)._dryGain = dryGain;
      (mixer as any)._wetGain = wetGain;
      (mixer as any)._splitter = splitter;
      (mixer as any).input = splitter;

      // Create a wet control that updates both gains
      (mixer as any).wet = {
        get value() {
          return (mixer as any)._wetValue || config.wet;
        },
        set value(v: number) {
          (mixer as any)._wetValue = v;
          dryGain.gain.value = 1 - v;
          wetGain.gain.value = v;
        },
      };
      (mixer as any)._wetValue = config.wet;

      // Override dispose to clean up all internal nodes
      const originalDispose = mixer.dispose.bind(mixer);
      (mixer as any).dispose = () => {
        try {
          splitter.disconnect();
          dryGain.disconnect();
          compressor.disconnect();
          wetGain.disconnect();

          splitter.dispose();
          dryGain.dispose();
          compressor.dispose();
          wetGain.dispose();
          originalDispose();
        } catch (e) {
          // Ignore disposal errors
        }
      };

      return mixer;
    }

    case "autofilter":
      return new Tone.AutoFilter({
        frequency: params.frequency as number,
        depth: params.depth as number,
        baseFrequency: params.baseFrequency as number,
        wet: config.wet,
      }).start();

    case "autopanner":
      return new Tone.AutoPanner({
        frequency: params.frequency as number,
        depth: params.depth as number,
        wet: config.wet,
      }).start();

    case "autowah":
      return new Tone.AutoWah({
        baseFrequency: params.baseFrequency as number,
        octaves: params.octaves as number,
        sensitivity: params.sensitivity as number,
        wet: config.wet,
      });

    default:
      console.warn(`Unknown effect type: ${config.type}`);
      return null;
  }
}

/**
 * Create and chain effects from configs
 */
function createEffectsChain(effects: EffectConfig[]): Tone.ToneAudioNode[] {
  const chain: Tone.ToneAudioNode[] = [];

  for (const effectConfig of effects) {
    const effect = createEffect(effectConfig);
    if (effect) {
      chain.push(effect);
    }
  }

  // Chain effects together
  for (let i = 0; i < chain.length - 1; i++) {
    chain[i].connect(chain[i + 1]);
  }

  return chain;
}

// ============================================================================
// CustomSynthEngine - Main synth engine
// ============================================================================

/**
 * Main custom synthesizer engine
 * Manages voice pool, modulation, and effects chain
 */
export class CustomSynthEngine {
  private voicePool: VoicePool;
  private modManager: ModulationManager;
  private effectsChain: Tone.ToneAudioNode[] = [];
  private masterGain: Tone.Gain;
  private patch: CustomPatch;

  constructor(patch: CustomPatch) {
    this.patch = patch;

    // Master output gain
    this.masterGain = new Tone.Gain(patch.masterVolume);

    // Create effects chain
    this.effectsChain = createEffectsChain(patch.effects);

    // Determine voice pool destination
    const voiceDestination =
      this.effectsChain.length > 0 ? this.effectsChain[0] : this.masterGain;

    // Create voice pool
    this.voicePool = new VoicePool(patch, voiceDestination);

    // Connect effects chain to master
    if (this.effectsChain.length > 0) {
      this.effectsChain[this.effectsChain.length - 1].connect(this.masterGain);
    }

    // Connect master to destination
    this.masterGain.toDestination();

    // Create modulation manager
    this.modManager = new ModulationManager(patch);

    // Apply modulation routings
    this.applyModulationRoutings();
  }

  /**
   * Apply modulation matrix routings
   * Connects mod sources to engine-level destinations (lfo rates, filter freq, master volume)
   */
  private applyModulationRoutings(): void {
    for (const routing of this.patch.modMatrix.routings) {
      if (!routing.enabled || routing.amount === 0) continue;

      // Skip routing if its source LFO is disabled (would output static 0 causing filter issues)
      if (routing.source === "lfo1" && !this.patch.modMatrix.lfo1.enabled)
        continue;
      if (routing.source === "lfo2" && !this.patch.modMatrix.lfo2.enabled)
        continue;

      const source = this.modManager.getModSource(routing.source);
      if (!source) {
        console.debug(`Unknown mod source: ${routing.source}`);
        continue;
      }

      let target: Tone.Signal<any> | Tone.Param<any> | null = null;

      // Get target based on destination
      switch (routing.destination) {
        case "lfo1_rate":
        case "lfo2_rate":
          target = this.modManager.getModTarget(routing.destination);
          break;
        case "filter_freq":
          // Connect filter mod signals to voices on-demand (only when routing exists)
          this.voicePool.connectFilterMod();
          target = this.voicePool.getFilterFrequencyParam();
          break;
        case "filter_res":
          // Connect filter mod signals to voices on-demand (only when routing exists)
          this.voicePool.connectFilterMod();
          target = this.voicePool.getFilterResonanceParam();
          break;
        case "amp_volume":
          target = this.masterGain.gain;
          break;
        default:
          console.debug(
            `Unimplemented mod destination: ${routing.destination}`,
          );
          continue;
      }

      if (!target) continue;

      // Create modulation connection with destination-specific scaling
      // For filter frequency, we need to scale to an audible range (Hz)
      // For amp/volume, we keep normalized values

      let scaledSource: Tone.ToneAudioNode;

      switch (routing.destination) {
        case "filter_freq": {
          // Filter frequency modulation: octave-based scaling
          // LFO outputs 0-1, center around 0 (-0.5 to +0.5)
          // Scale to ±2 octaves at 100% amount (multiplied by base freq)
          // This makes modulation musically consistent regardless of cutoff position
          const baseFreq = this.patch.filter.frequency;
          const center = new Tone.Add(-0.5);
          // At 100% amount: ±2 octaves = freq * 4 to freq / 4
          // We use linear approximation: offset = baseFreq * (2^(octaves) - 1)
          // For small amounts this approximates well
          const maxOctaves = 2 * routing.amount; // ±2 octaves at full amount
          const maxOffset = baseFreq * (Math.pow(2, maxOctaves) - 1);
          const scale = new Tone.Multiply(maxOffset * 2); // *2 because centered range is ±0.5
          source.connect(center);
          center.connect(scale);
          scaledSource = scale;

          // Store intermediate nodes for cleanup
          this.modManager.storeConnection(`${routing.id}-center`, center);
          this.modManager.storeConnection(`${routing.id}-scale`, scale);
          break;
        }
        case "filter_res": {
          // Filter resonance modulation: scale to ±6 Q range at 100%
          // LFO outputs 0-1, center around 0 and scale by amount
          const center = new Tone.Add(-0.5);
          const scale = new Tone.Multiply(routing.amount * 12); // ±6 Q at full amount
          source.connect(center);
          center.connect(scale);
          scaledSource = scale;

          this.modManager.storeConnection(`${routing.id}-center`, center);
          this.modManager.storeConnection(`${routing.id}-scale`, scale);
          break;
        }
        case "amp_volume": {
          // Amplitude modulation (tremolo): scale to ±0.5 gain at 100%
          // LFO outputs 0-1, center around 0 and scale by amount
          const center = new Tone.Add(-0.5);
          const scale = new Tone.Multiply(routing.amount); // ±0.5 gain at full amount
          source.connect(center);
          center.connect(scale);
          scaledSource = scale;
          this.modManager.storeConnection(`${routing.id}-center`, center);
          this.modManager.storeConnection(`${routing.id}-scale`, scale);
          break;
        }
        default: {
          // Default: just multiply by amount
          const multiply = new Tone.Multiply(routing.amount);
          source.connect(multiply);
          scaledSource = multiply;
          this.modManager.storeConnection(`${routing.id}-multiply`, multiply);
          break;
        }
      }

      // Connect to target
      scaledSource.connect(target);
    }
  }

  /**
   * Trigger note attack
   */
  triggerAttack(note: number, velocity: number = 1): void {
    this.voicePool.triggerAttack(note, velocity);
    this.modManager.setVelocity(velocity);
    this.modManager.setKeytrack(note);
    this.modManager.triggerAttack();
  }

  /**
   * Trigger note release
   */
  triggerRelease(note: number): void {
    this.voicePool.triggerRelease(note);
    this.modManager.triggerRelease();
  }

  /**
   * Release all notes
   */
  releaseAll(): void {
    this.voicePool.releaseAll();
  }

  /**
   * Update single parameter (for live tweaking)
   */
  updateParameter(param: string, value: number): void {
    const parts = param.split(".");

    switch (parts[0]) {
      case "oscMix":
        this.voicePool.setOscMix(value);
        break;

      case "masterVolume":
        this.masterGain.gain.rampTo(value, 0.05);
        break;

      case "lfo1":
        this.modManager.updateLFO(1, parts[1], value);
        break;

      case "lfo2":
        this.modManager.updateLFO(2, parts[1], value);
        break;

      default:
        console.warn(`Unknown parameter: ${param}`);
    }
  }

  /**
   * Update patch parameters live without rebuilding (for continuous playback during editing)
   * Only rebuilds if effects chain structure changes
   */
  updatePatchLive(newPatch: CustomPatch): boolean {
    const oldPatch = this.patch;

    // Check if effects chain structure changed (requires rebuild)
    const effectsChanged =
      oldPatch.effects.length !== newPatch.effects.length ||
      oldPatch.effects.some(
        (e, i) =>
          e.type !== newPatch.effects[i]?.type ||
          e.enabled !== newPatch.effects[i]?.enabled,
      );

    // Check if filter rolloff changed (requires rebuild - can't change live)
    const rolloffChanged = oldPatch.filter.rolloff !== newPatch.filter.rolloff;

    if (effectsChanged || rolloffChanged) {
      // Need full rebuild for effects chain, enabled toggle, or rolloff changes
      return false;
    }

    // Update oscillators
    if (JSON.stringify(oldPatch.osc1) !== JSON.stringify(newPatch.osc1)) {
      this.voicePool.updateOscillator(1, newPatch.osc1);
    }
    if (JSON.stringify(oldPatch.osc2) !== JSON.stringify(newPatch.osc2)) {
      this.voicePool.updateOscillator(2, newPatch.osc2);
    }

    // Update osc mix
    if (oldPatch.oscMix !== newPatch.oscMix) {
      this.voicePool.setOscMix(newPatch.oscMix);
    }

    // Update filter
    const filterFreqChanged =
      oldPatch.filter.frequency !== newPatch.filter.frequency;
    const filterResonanceChanged =
      oldPatch.filter.resonance !== newPatch.filter.resonance;
    const filterTypeChanged = oldPatch.filter.type !== newPatch.filter.type;

    if (filterFreqChanged || filterResonanceChanged || filterTypeChanged) {
      this.voicePool.updateFilter(
        newPatch.filter.frequency,
        newPatch.filter.resonance,
        newPatch.filter.type,
      );
    }

    // Update amp envelope
    if (
      JSON.stringify(oldPatch.ampEnvelope) !==
      JSON.stringify(newPatch.ampEnvelope)
    ) {
      this.voicePool.updateAmpEnvelope(newPatch.ampEnvelope);
    }

    // Update filter envelope - ALSO update when filter frequency changes
    // because the envelope's baseFrequency needs to track the filter frequency
    const filterEnvChanged =
      JSON.stringify(oldPatch.filterEnvelope) !==
      JSON.stringify(newPatch.filterEnvelope);
    const envAmountChanged =
      oldPatch.filter.envelopeAmount !== newPatch.filter.envelopeAmount;

    if (filterEnvChanged || envAmountChanged || filterFreqChanged) {
      this.voicePool.updateFilterEnvelope(
        newPatch.filterEnvelope,
        newPatch.filter.frequency,
        newPatch.filter.envelopeAmount,
      );
    }

    // Update master volume
    if (oldPatch.masterVolume !== newPatch.masterVolume) {
      this.masterGain.gain.rampTo(newPatch.masterVolume, 0.05);
    }

    // Update LFOs - track if enabled state changed so we can re-apply routings
    let lfoEnabledChanged = false;

    if (
      JSON.stringify(oldPatch.modMatrix.lfo1) !==
      JSON.stringify(newPatch.modMatrix.lfo1)
    ) {
      const lfo1 = newPatch.modMatrix.lfo1;
      const oldLfo1 = oldPatch.modMatrix.lfo1;

      // Handle enabled state changes FIRST (before modifying other params)
      if (lfo1.enabled !== oldLfo1.enabled) {
        lfoEnabledChanged = true;
        try {
          if (lfo1.enabled) {
            this.modManager.lfo1.start();
          } else {
            this.modManager.lfo1.stop();
          }
        } catch {
          // Ignore start/stop errors
        }
      }

      // Only update params if LFO is enabled
      if (lfo1.enabled) {
        try {
          this.modManager.lfo1.type = lfo1.waveform;
        } catch {
          // Some waveform changes may fail
        }
        this.modManager.lfo1.min = lfo1.min;
        this.modManager.lfo1.max = lfo1.max;

        // Handle sync state changes
        if (lfo1.sync !== oldLfo1.sync) {
          try {
            if (lfo1.sync) {
              this.modManager.lfo1.sync();
            } else {
              this.modManager.lfo1.unsync();
            }
          } catch {
            // Ignore sync errors
          }
        }

        // Update frequency based on sync state
        try {
          if (lfo1.sync) {
            // Use syncRate if available, otherwise fall back to frequency conversion
            this.modManager.lfo1.frequency.value =
              lfo1.syncRate || frequencyToSyncedValue(lfo1.frequency);
          } else {
            this.modManager.lfo1.frequency.value = lfo1.frequency;
          }
        } catch {
          // Ignore frequency errors
        }
      }
    }

    if (
      JSON.stringify(oldPatch.modMatrix.lfo2) !==
      JSON.stringify(newPatch.modMatrix.lfo2)
    ) {
      const lfo2 = newPatch.modMatrix.lfo2;
      const oldLfo2 = oldPatch.modMatrix.lfo2;

      // Handle enabled state changes FIRST (before modifying other params)
      if (lfo2.enabled !== oldLfo2.enabled) {
        lfoEnabledChanged = true;
        try {
          if (lfo2.enabled) {
            this.modManager.lfo2.start();
          } else {
            this.modManager.lfo2.stop();
          }
        } catch {
          // Ignore start/stop errors
        }
      }

      // Only update params if LFO is enabled
      if (lfo2.enabled) {
        try {
          this.modManager.lfo2.type = lfo2.waveform;
        } catch {
          // Some waveform changes may fail
        }
        this.modManager.lfo2.min = lfo2.min;
        this.modManager.lfo2.max = lfo2.max;

        // Handle sync state changes
        if (lfo2.sync !== oldLfo2.sync) {
          try {
            if (lfo2.sync) {
              this.modManager.lfo2.sync();
            } else {
              this.modManager.lfo2.unsync();
            }
          } catch {
            // Ignore sync errors
          }
        }

        // Update frequency based on sync state
        try {
          if (lfo2.sync) {
            // Use syncRate if available, otherwise fall back to frequency conversion
            this.modManager.lfo2.frequency.value =
              lfo2.syncRate || frequencyToSyncedValue(lfo2.frequency);
          } else {
            this.modManager.lfo2.frequency.value = lfo2.frequency;
          }
        } catch {
          // Ignore frequency errors
        }
      }
    }

    // Re-apply modulation routings if LFO enabled state changed
    // (disabled LFOs should have their routings disconnected)
    if (lfoEnabledChanged) {
      // CRITICAL: Reset filter mod connections FIRST (disconnects from voices)
      // THEN clear modulation connections (disposes intermediate nodes)
      // This order prevents disposed nodes from corrupting the audio signal chain
      this.voicePool.resetFilterModConnection();
      this.modManager.clearModConnections();
      this.patch = newPatch;
      this.applyModulationRoutings();
    }

    // Update effect parameters (without rebuilding chain)
    for (
      let i = 0;
      i < this.effectsChain.length && i < newPatch.effects.length;
      i++
    ) {
      const effect = this.effectsChain[i];
      const config = newPatch.effects[i];
      const params = config.params;

      // Update wet/dry
      if ("wet" in effect) {
        (effect as { wet: { value: number } }).wet.value = config.wet;
      }

      // Update type-specific parameters
      try {
        switch (config.type) {
          case "chorus": {
            const chorus = effect as Tone.Chorus;
            chorus.frequency.value = params.frequency as number;
            chorus.delayTime = params.delayTime as number;
            chorus.depth = params.depth as number;
            break;
          }
          case "phaser": {
            const phaser = effect as Tone.Phaser;
            phaser.frequency.value = params.frequency as number;
            phaser.octaves = params.octaves as number;
            phaser.baseFrequency = params.baseFrequency as number;
            break;
          }
          case "vibrato": {
            const vibrato = effect as Tone.Vibrato;
            vibrato.frequency.value = params.frequency as number;
            vibrato.depth.value = params.depth as number;
            break;
          }
          case "tremolo": {
            const tremolo = effect as Tone.Tremolo;
            tremolo.frequency.value = params.frequency as number;
            tremolo.depth.value = params.depth as number;
            break;
          }
          case "delay": {
            const delay = effect as Tone.FeedbackDelay;
            delay.delayTime.value = params.delayTime as number;
            delay.feedback.value = params.feedback as number;
            break;
          }
          case "pingpong": {
            const pingpong = effect as Tone.PingPongDelay;
            pingpong.delayTime.value = params.delayTime as number;
            pingpong.feedback.value = params.feedback as number;
            break;
          }
          case "distortion": {
            const distortion = effect as Tone.Distortion;
            distortion.distortion = params.distortion as number;
            distortion.oversample = params.oversample as "none" | "2x" | "4x";
            break;
          }
          case "bitcrusher": {
            const bitcrusher = effect as Tone.BitCrusher;
            bitcrusher.bits.value = params.bits as number;
            break;
          }
          case "compressor": {
            // Effect is the mixer node, get actual compressor from it
            const compressor = (effect as any)._compressor as Tone.Compressor;
            if (compressor) {
              compressor.threshold.value = params.threshold as number;
              compressor.ratio.value = params.ratio as number;
              compressor.attack.value = params.attack as number;
              compressor.release.value = params.release as number;
            }
            break;
          }
          case "autofilter": {
            const autofilter = effect as Tone.AutoFilter;
            autofilter.frequency.value = params.frequency as number;
            autofilter.depth.value = params.depth as number;
            autofilter.baseFrequency = params.baseFrequency as number;
            break;
          }
          case "autopanner": {
            const autopanner = effect as Tone.AutoPanner;
            autopanner.frequency.value = params.frequency as number;
            autopanner.depth.value = params.depth as number;
            break;
          }
          case "autowah": {
            const autowah = effect as Tone.AutoWah;
            autowah.baseFrequency = params.baseFrequency as number;
            autowah.octaves = params.octaves as number;
            autowah.sensitivity = params.sensitivity as number;
            break;
          }
          case "reverb":
            // Reverb decay/preDelay can't be changed live - requires rebuild
            break;
        }
      } catch {
        // Some parameter updates may fail, ignore
      }
    }

    // Update modulation routings if changed
    const routingsChanged =
      JSON.stringify(oldPatch.modMatrix.routings) !==
      JSON.stringify(newPatch.modMatrix.routings);

    if (routingsChanged) {
      // CRITICAL: Reset filter mod connections FIRST (disconnects from voices)
      // THEN clear modulation connections (disposes intermediate nodes)
      // This order prevents disposed nodes from corrupting the audio signal chain
      this.voicePool.resetFilterModConnection();
      this.modManager.clearModConnections();

      this.patch = newPatch; // Update patch first so applyModulationRoutings uses new routings
      this.applyModulationRoutings();
    } else {
      this.patch = newPatch;
    }

    return true; // Successfully updated live
  }

  /**
   * Update entire patch (full rebuild) - use when live update isn't possible
   */
  updatePatch(patch: CustomPatch): void {
    this.releaseAll();

    // Disconnect master from destination first
    this.masterGain.disconnect();

    // Dispose of old resources in proper order (voices first, then effects, then master)
    this.modManager.dispose();
    this.voicePool.dispose();

    for (const effect of this.effectsChain) {
      try {
        effect.disconnect();
      } catch {
        // Ignore disconnection errors
      }
      effect.dispose();
    }
    this.effectsChain = [];

    this.masterGain.dispose();

    this.patch = patch;

    // Rebuild everything
    this.masterGain = new Tone.Gain(patch.masterVolume);
    this.effectsChain = createEffectsChain(patch.effects);

    const voiceDestination =
      this.effectsChain.length > 0 ? this.effectsChain[0] : this.masterGain;

    this.voicePool = new VoicePool(patch, voiceDestination);

    if (this.effectsChain.length > 0) {
      this.effectsChain[this.effectsChain.length - 1].connect(this.masterGain);
    }

    this.masterGain.toDestination();
    this.modManager = new ModulationManager(patch);
    this.applyModulationRoutings();
  }

  /**
   * Get current patch
   */
  getPatch(): CustomPatch {
    return this.patch;
  }

  /**
   * Get current filter modulation info for visual feedback
   * Returns the current modulated frequency offset in Hz
   */
  getFilterModulation(): { frequencyOffset: number; resonanceOffset: number } {
    let frequencyOffset = 0;
    let resonanceOffset = 0;

    // Find filter_freq and filter_res routings and calculate current offsets
    for (const routing of this.patch.modMatrix.routings) {
      if (!routing.enabled || routing.amount === 0) continue;

      // Get current LFO value (0-1)
      let lfoValue = 0.5; // Default center
      if (routing.source === "lfo1" && this.patch.modMatrix.lfo1.enabled) {
        try {
          // Note: LFO doesn't have getValue() method in Tone.js
          // This is a placeholder - would need to sample the LFO output signal
          // For now, just use center value
          lfoValue = 0.5;
        } catch {
          lfoValue = 0.5;
        }
      } else if (routing.source === "lfo2" && this.patch.modMatrix.lfo2.enabled) {
        try {
          // Note: LFO doesn't have getValue() method in Tone.js
          // This is a placeholder - would need to sample the LFO output signal
          // For now, just use center value
          lfoValue = 0.5;
        } catch {
          lfoValue = 0.5;
        }
      } else {
        continue; // Skip non-LFO sources for now
      }

      // Center the LFO value around 0 (-0.5 to +0.5)
      const centered = lfoValue - 0.5;

      if (routing.destination === "filter_freq") {
        // Octave-based modulation: ±2 octaves at 100% amount
        // Convert to frequency multiplier then to Hz offset
        const octaves = centered * routing.amount * 4; // ±2 octaves at full amount
        const multiplier = Math.pow(2, octaves);
        const baseFreq = this.patch.filter.frequency;
        frequencyOffset = baseFreq * multiplier - baseFreq;
      } else if (routing.destination === "filter_res") {
        resonanceOffset = centered * routing.amount * 12; // ±6 Q at full amount
      }
    }

    return { frequencyOffset, resonanceOffset };
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.voicePool.dispose();
    this.modManager.dispose();

    for (const effect of this.effectsChain) {
      effect.dispose();
    }
    this.effectsChain = [];

    this.masterGain.dispose();
  }
}
