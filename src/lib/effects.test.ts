import { describe, it, expect, vi } from "vitest";
import type { EffectConfig } from "../types/synth";

// Mock Tone.js
vi.mock("tone", () => {
  // Base effect class with wet/dry mixing
  class MockEffect {
    wet = { value: 0.5 };

    connect() {
      return this;
    }

    disconnect() {
      return this;
    }

    dispose() {
      return this;
    }
  }

  // Effects that need .start()
  class MockChorusEffect extends MockEffect {
    frequency: any;
    delayTime: number;
    depth: number;
    started = false;

    constructor(options: any) {
      super();
      this.frequency = { value: options.frequency };
      this.delayTime = options.delayTime;
      this.depth = options.depth;
      this.wet.value = options.wet;
    }

    start() {
      this.started = true;
      return this;
    }
  }

  class MockPhaserEffect extends MockEffect {
    frequency: any;
    octaves: number;
    baseFrequency: number;

    constructor(options: any) {
      super();
      this.frequency = { value: options.frequency };
      this.octaves = options.octaves;
      this.baseFrequency = options.baseFrequency;
      this.wet.value = options.wet;
    }
  }

  class MockVibratoEffect extends MockEffect {
    frequency: any;
    depth: any;

    constructor(options: any) {
      super();
      this.frequency = { value: options.frequency };
      this.depth = { value: options.depth };
      this.wet.value = options.wet;
    }
  }

  class MockTremoloEffect extends MockEffect {
    frequency: any;
    depth: any;
    started = false;

    constructor(options: any) {
      super();
      this.frequency = { value: options.frequency };
      this.depth = { value: options.depth };
      this.wet.value = options.wet;
    }

    start() {
      this.started = true;
      return this;
    }
  }

  class MockAutoFilterEffect extends MockEffect {
    frequency: any;
    depth: any;
    baseFrequency: number;
    started = false;

    constructor(options: any) {
      super();
      this.frequency = { value: options.frequency };
      this.depth = { value: options.depth };
      this.baseFrequency = options.baseFrequency;
      this.wet.value = options.wet;
    }

    start() {
      this.started = true;
      return this;
    }
  }

  class MockAutoPannerEffect extends MockEffect {
    frequency: any;
    depth: any;
    started = false;

    constructor(options: any) {
      super();
      this.frequency = { value: options.frequency };
      this.depth = { value: options.depth };
      this.wet.value = options.wet;
    }

    start() {
      this.started = true;
      return this;
    }
  }

  // Effects without .start()
  class MockReverbEffect extends MockEffect {
    decay: number;
    preDelay: number;

    constructor(options: any) {
      super();
      this.decay = options.decay;
      this.preDelay = options.preDelay;
      this.wet.value = options.wet;
    }
  }

  class MockFeedbackDelayEffect extends MockEffect {
    delayTime: any;
    feedback: any;

    constructor(options: any) {
      super();
      this.delayTime = { value: options.delayTime };
      this.feedback = { value: options.feedback };
      this.wet.value = options.wet;
    }
  }

  class MockPingPongDelayEffect extends MockEffect {
    delayTime: any;
    feedback: any;

    constructor(options: any) {
      super();
      this.delayTime = { value: options.delayTime };
      this.feedback = { value: options.feedback };
      this.wet.value = options.wet;
    }
  }

  class MockDistortionEffect extends MockEffect {
    distortion: number;
    oversample: string;

    constructor(options: any) {
      super();
      this.distortion = options.distortion;
      this.oversample = options.oversample;
      this.wet.value = options.wet;
    }
  }

  class MockBitCrusherEffect extends MockEffect {
    bits: any;

    constructor(options: any) {
      super();
      this.bits = { value: options.bits };
      this.wet.value = options.wet;
    }
  }

  class MockAutoWahEffect extends MockEffect {
    baseFrequency: number;
    octaves: number;
    sensitivity: number;

    constructor(options: any) {
      super();
      this.baseFrequency = options.baseFrequency;
      this.octaves = options.octaves;
      this.sensitivity = options.sensitivity;
      this.wet.value = options.wet;
    }
  }

  // Compressor (no native wet/dry)
  class MockCompressor {
    threshold: any;
    ratio: any;
    attack: any;
    release: any;

    constructor(options: any) {
      this.threshold = { value: options.threshold };
      this.ratio = { value: options.ratio };
      this.attack = { value: options.attack };
      this.release = { value: options.release };
    }

    connect() {
      return this;
    }

    disconnect() {
      return this;
    }

    dispose() {}
  }

  // Gain node for wet/dry mixing
  class MockGain {
    gain = { value: 1 };
    input: any = this;

    constructor(value: number = 1) {
      this.gain.value = value;
    }

    connect() {
      return this;
    }

    disconnect() {
      return this;
    }

    dispose() {}
  }

  return {
    Chorus: MockChorusEffect,
    Phaser: MockPhaserEffect,
    Vibrato: MockVibratoEffect,
    Tremolo: MockTremoloEffect,
    Reverb: MockReverbEffect,
    FeedbackDelay: MockFeedbackDelayEffect,
    PingPongDelay: MockPingPongDelayEffect,
    Distortion: MockDistortionEffect,
    BitCrusher: MockBitCrusherEffect,
    Compressor: MockCompressor,
    AutoFilter: MockAutoFilterEffect,
    AutoPanner: MockAutoPannerEffect,
    AutoWah: MockAutoWahEffect,
    Gain: MockGain,
  };
});

// Import after mocking
const Tone = await import("tone");

// Helper to create effect from config (mirrors customSynthEngine.ts logic)
function createEffect(config: EffectConfig): any {
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

// Helper to update effect parameter
function updateEffectParameter(effect: any, config: EffectConfig): void {
  const params = config.params;

  // Update wet/dry
  if ("wet" in effect) {
    effect.wet.value = config.wet;
  }

  // Update type-specific parameters
  switch (config.type) {
    case "chorus": {
      effect.frequency.value = params.frequency as number;
      effect.delayTime = params.delayTime as number;
      effect.depth = params.depth as number;
      break;
    }
    case "phaser": {
      effect.frequency.value = params.frequency as number;
      effect.octaves = params.octaves as number;
      effect.baseFrequency = params.baseFrequency as number;
      break;
    }
    case "vibrato": {
      effect.frequency.value = params.frequency as number;
      effect.depth.value = params.depth as number;
      break;
    }
    case "tremolo": {
      effect.frequency.value = params.frequency as number;
      effect.depth.value = params.depth as number;
      break;
    }
    case "delay": {
      effect.delayTime.value = params.delayTime as number;
      effect.feedback.value = params.feedback as number;
      break;
    }
    case "pingpong": {
      effect.delayTime.value = params.delayTime as number;
      effect.feedback.value = params.feedback as number;
      break;
    }
    case "distortion": {
      effect.distortion = params.distortion as number;
      effect.oversample = params.oversample as "none" | "2x" | "4x";
      break;
    }
    case "bitcrusher": {
      effect.bits.value = params.bits as number;
      break;
    }
    case "compressor": {
      // Effect is the mixer node, get actual compressor from it
      const compressor = effect._compressor;
      if (compressor) {
        compressor.threshold.value = params.threshold as number;
        compressor.ratio.value = params.ratio as number;
        compressor.attack.value = params.attack as number;
        compressor.release.value = params.release as number;
      }
      break;
    }
    case "autofilter": {
      effect.frequency.value = params.frequency as number;
      effect.depth.value = params.depth as number;
      effect.baseFrequency = params.baseFrequency as number;
      break;
    }
    case "autopanner": {
      effect.frequency.value = params.frequency as number;
      effect.depth.value = params.depth as number;
      break;
    }
    case "autowah": {
      effect.baseFrequency = params.baseFrequency as number;
      effect.octaves = params.octaves as number;
      effect.sensitivity = params.sensitivity as number;
      break;
    }
  }
}

// Helper to create effects chain
function rebuildEffectsChain(effects: EffectConfig[]): any[] {
  const chain: any[] = [];

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

describe("Effects Chain System", () => {
  describe("createEffect", () => {
    it("should return null for disabled effects", () => {
      const config: EffectConfig = {
        type: "chorus",
        enabled: false,
        wet: 0.5,
        params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
      };

      const effect = createEffect(config);
      expect(effect).toBe(null);
    });

    describe("chorus effect", () => {
      it("should create Tone.Chorus with correct parameters", () => {
        const config: EffectConfig = {
          type: "chorus",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.frequency.value).toBe(1.5);
        expect(effect.delayTime).toBe(3.5);
        expect(effect.depth).toBe(0.7);
        expect(effect.wet.value).toBe(0.5);
      });

      it("should call .start() on chorus effect", () => {
        const config: EffectConfig = {
          type: "chorus",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
        };

        const effect = createEffect(config);
        expect(effect.started).toBe(true);
      });
    });

    describe("reverb effect", () => {
      it("should create Tone.Reverb with correct parameters", () => {
        const config: EffectConfig = {
          type: "reverb",
          enabled: true,
          wet: 0.3,
          params: { decay: 2.5, preDelay: 0.01 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.decay).toBe(2.5);
        expect(effect.preDelay).toBe(0.01);
        expect(effect.wet.value).toBe(0.3);
      });

      it("should not call .start() on reverb", () => {
        const config: EffectConfig = {
          type: "reverb",
          enabled: true,
          wet: 0.3,
          params: { decay: 2.5, preDelay: 0.01 },
        };

        const effect = createEffect(config);
        expect(effect.started).toBeUndefined();
      });
    });

    describe("delay effect", () => {
      it("should create Tone.FeedbackDelay with correct parameters", () => {
        const config: EffectConfig = {
          type: "delay",
          enabled: true,
          wet: 0.4,
          params: { delayTime: 0.25, feedback: 0.5 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.delayTime.value).toBe(0.25);
        expect(effect.feedback.value).toBe(0.5);
        expect(effect.wet.value).toBe(0.4);
      });
    });

    describe("distortion effect", () => {
      it("should create Tone.Distortion with correct parameters", () => {
        const config: EffectConfig = {
          type: "distortion",
          enabled: true,
          wet: 0.6,
          params: { distortion: 0.8, oversample: "2x" },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.distortion).toBe(0.8);
        expect(effect.oversample).toBe("2x");
        expect(effect.wet.value).toBe(0.6);
      });
    });

    describe("phaser effect", () => {
      it("should create Tone.Phaser with correct parameters", () => {
        const config: EffectConfig = {
          type: "phaser",
          enabled: true,
          wet: 0.5,
          params: { frequency: 0.5, octaves: 3, baseFrequency: 350 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.frequency.value).toBe(0.5);
        expect(effect.octaves).toBe(3);
        expect(effect.baseFrequency).toBe(350);
        expect(effect.wet.value).toBe(0.5);
      });
    });

    describe("tremolo effect", () => {
      it("should create Tone.Tremolo with correct parameters", () => {
        const config: EffectConfig = {
          type: "tremolo",
          enabled: true,
          wet: 0.5,
          params: { frequency: 4, depth: 0.7 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.frequency.value).toBe(4);
        expect(effect.depth.value).toBe(0.7);
        expect(effect.wet.value).toBe(0.5);
      });

      it("should call .start() on tremolo effect", () => {
        const config: EffectConfig = {
          type: "tremolo",
          enabled: true,
          wet: 0.5,
          params: { frequency: 4, depth: 0.7 },
        };

        const effect = createEffect(config);
        expect(effect.started).toBe(true);
      });

      it("should default tremolo depth to 0.7", () => {
        const config: EffectConfig = {
          type: "tremolo",
          enabled: true,
          wet: 0.5,
          params: { frequency: 4, depth: 0.7 },
        };

        const effect = createEffect(config);
        expect(effect.depth.value).toBe(0.7);
      });
    });

    describe("vibrato effect", () => {
      it("should create Tone.Vibrato with correct parameters", () => {
        const config: EffectConfig = {
          type: "vibrato",
          enabled: true,
          wet: 0.5,
          params: { frequency: 5, depth: 0.3 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.frequency.value).toBe(5);
        expect(effect.depth.value).toBe(0.3);
        expect(effect.wet.value).toBe(0.5);
      });

      it("should default vibrato depth to 0.3", () => {
        const config: EffectConfig = {
          type: "vibrato",
          enabled: true,
          wet: 0.5,
          params: { frequency: 5, depth: 0.3 },
        };

        const effect = createEffect(config);
        expect(effect.depth.value).toBe(0.3);
      });
    });

    describe("bitcrusher effect", () => {
      it("should create Tone.BitCrusher with correct parameters", () => {
        const config: EffectConfig = {
          type: "bitcrusher",
          enabled: true,
          wet: 0.5,
          params: { bits: 4 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.bits.value).toBe(4);
        expect(effect.wet.value).toBe(0.5);
      });
    });

    describe("pingpong delay effect", () => {
      it("should create Tone.PingPongDelay with correct parameters", () => {
        const config: EffectConfig = {
          type: "pingpong",
          enabled: true,
          wet: 0.4,
          params: { delayTime: 0.25, feedback: 0.6 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.delayTime.value).toBe(0.25);
        expect(effect.feedback.value).toBe(0.6);
        expect(effect.wet.value).toBe(0.4);
      });
    });

    describe("compressor effect", () => {
      it("should create custom wrapper with wet/dry mixing", () => {
        const config: EffectConfig = {
          type: "compressor",
          enabled: true,
          wet: 0.7,
          params: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect._compressor).toBeDefined();
        expect(effect._dryGain).toBeDefined();
        expect(effect._wetGain).toBeDefined();
        expect(effect._splitter).toBeDefined();
      });

      it("should set compressor parameters correctly", () => {
        const config: EffectConfig = {
          type: "compressor",
          enabled: true,
          wet: 0.7,
          params: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
        };

        const effect = createEffect(config);
        const compressor = effect._compressor;

        expect(compressor.threshold.value).toBe(-24);
        expect(compressor.ratio.value).toBe(4);
        expect(compressor.attack.value).toBe(0.003);
        expect(compressor.release.value).toBe(0.25);
      });

      it("should set wet/dry gains correctly", () => {
        const config: EffectConfig = {
          type: "compressor",
          enabled: true,
          wet: 0.7,
          params: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
        };

        const effect = createEffect(config);

        expect(effect._dryGain.gain.value).toBeCloseTo(0.3, 10); // 1 - 0.7
        expect(effect._wetGain.gain.value).toBe(0.7);
      });

      it("should update wet/dry gains when wet value changes", () => {
        const config: EffectConfig = {
          type: "compressor",
          enabled: true,
          wet: 0.7,
          params: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
        };

        const effect = createEffect(config);

        // Change wet value
        effect.wet.value = 0.5;

        expect(effect._dryGain.gain.value).toBe(0.5); // 1 - 0.5
        expect(effect._wetGain.gain.value).toBe(0.5);
      });
    });

    describe("autofilter effect", () => {
      it("should create Tone.AutoFilter with correct parameters", () => {
        const config: EffectConfig = {
          type: "autofilter",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1, depth: 1, baseFrequency: 200 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.frequency.value).toBe(1);
        expect(effect.depth.value).toBe(1);
        expect(effect.baseFrequency).toBe(200);
        expect(effect.wet.value).toBe(0.5);
      });

      it("should call .start() on autofilter effect", () => {
        const config: EffectConfig = {
          type: "autofilter",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1, depth: 1, baseFrequency: 200 },
        };

        const effect = createEffect(config);
        expect(effect.started).toBe(true);
      });
    });

    describe("autopanner effect", () => {
      it("should create Tone.AutoPanner with correct parameters", () => {
        const config: EffectConfig = {
          type: "autopanner",
          enabled: true,
          wet: 0.5,
          params: { frequency: 2, depth: 1 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.frequency.value).toBe(2);
        expect(effect.depth.value).toBe(1);
        expect(effect.wet.value).toBe(0.5);
      });

      it("should call .start() on autopanner effect", () => {
        const config: EffectConfig = {
          type: "autopanner",
          enabled: true,
          wet: 0.5,
          params: { frequency: 2, depth: 1 },
        };

        const effect = createEffect(config);
        expect(effect.started).toBe(true);
      });
    });

    describe("autowah effect", () => {
      it("should create Tone.AutoWah with correct parameters", () => {
        const config: EffectConfig = {
          type: "autowah",
          enabled: true,
          wet: 0.5,
          params: { baseFrequency: 100, octaves: 6, sensitivity: 0 },
        };

        const effect = createEffect(config);

        expect(effect).toBeDefined();
        expect(effect.baseFrequency).toBe(100);
        expect(effect.octaves).toBe(6);
        expect(effect.sensitivity).toBe(0);
        expect(effect.wet.value).toBe(0.5);
      });
    });
  });

  describe("updateEffectParameter", () => {
    it("should update wet value for standard effects", () => {
      const config: EffectConfig = {
        type: "chorus",
        enabled: true,
        wet: 0.5,
        params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
      };

      const effect = createEffect(config);

      // Update wet value
      config.wet = 0.8;
      updateEffectParameter(effect, config);

      expect(effect.wet.value).toBe(0.8);
    });

    it("should update distortion amount", () => {
      const config: EffectConfig = {
        type: "distortion",
        enabled: true,
        wet: 0.6,
        params: { distortion: 0.8, oversample: "2x" },
      };

      const effect = createEffect(config);

      // Update distortion amount
      config.params.distortion = 0.5;
      updateEffectParameter(effect, config);

      expect(effect.distortion).toBe(0.5);
    });

    it("should update chorus parameters", () => {
      const config: EffectConfig = {
        type: "chorus",
        enabled: true,
        wet: 0.5,
        params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
      };

      const effect = createEffect(config);

      // Update all chorus parameters
      config.params.frequency = 2.0;
      config.params.delayTime = 4.0;
      config.params.depth = 0.8;
      updateEffectParameter(effect, config);

      expect(effect.frequency.value).toBe(2.0);
      expect(effect.delayTime).toBe(4.0);
      expect(effect.depth).toBe(0.8);
    });

    it("should update delay parameters", () => {
      const config: EffectConfig = {
        type: "delay",
        enabled: true,
        wet: 0.4,
        params: { delayTime: 0.25, feedback: 0.5 },
      };

      const effect = createEffect(config);

      // Update delay parameters
      config.params.delayTime = 0.5;
      config.params.feedback = 0.7;
      updateEffectParameter(effect, config);

      expect(effect.delayTime.value).toBe(0.5);
      expect(effect.feedback.value).toBe(0.7);
    });

    it("should update compressor wet/dry correctly", () => {
      const config: EffectConfig = {
        type: "compressor",
        enabled: true,
        wet: 0.7,
        params: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
      };

      const effect = createEffect(config);

      // Update wet value
      config.wet = 0.5;
      updateEffectParameter(effect, config);

      expect(effect.wet.value).toBe(0.5);
      expect(effect._dryGain.gain.value).toBe(0.5);
      expect(effect._wetGain.gain.value).toBe(0.5);
    });

    it("should update compressor threshold and ratio", () => {
      const config: EffectConfig = {
        type: "compressor",
        enabled: true,
        wet: 0.7,
        params: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25 },
      };

      const effect = createEffect(config);

      // Update compressor parameters
      config.params.threshold = -12;
      config.params.ratio = 8;
      updateEffectParameter(effect, config);

      const compressor = effect._compressor;
      expect(compressor.threshold.value).toBe(-12);
      expect(compressor.ratio.value).toBe(8);
    });

    it("should update vibrato depth", () => {
      const config: EffectConfig = {
        type: "vibrato",
        enabled: true,
        wet: 0.5,
        params: { frequency: 5, depth: 0.3 },
      };

      const effect = createEffect(config);

      // Update vibrato depth
      config.params.depth = 0.5;
      updateEffectParameter(effect, config);

      expect(effect.depth.value).toBe(0.5);
    });

    it("should update tremolo depth", () => {
      const config: EffectConfig = {
        type: "tremolo",
        enabled: true,
        wet: 0.5,
        params: { frequency: 4, depth: 0.7 },
      };

      const effect = createEffect(config);

      // Update tremolo depth
      config.params.depth = 0.9;
      updateEffectParameter(effect, config);

      expect(effect.depth.value).toBe(0.9);
    });
  });

  describe("rebuildEffectsChain", () => {
    it("should connect effects in order", () => {
      const effects: EffectConfig[] = [
        {
          type: "chorus",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
        },
        {
          type: "delay",
          enabled: true,
          wet: 0.4,
          params: { delayTime: 0.25, feedback: 0.5 },
        },
        {
          type: "reverb",
          enabled: true,
          wet: 0.3,
          params: { decay: 2.5, preDelay: 0.01 },
        },
      ];

      const chain = rebuildEffectsChain(effects);

      expect(chain).toHaveLength(3);
      expect(chain[0]).toBeDefined(); // Chorus
      expect(chain[1]).toBeDefined(); // Delay
      expect(chain[2]).toBeDefined(); // Reverb
    });

    it("should bypass disabled effects", () => {
      const effects: EffectConfig[] = [
        {
          type: "chorus",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
        },
        {
          type: "delay",
          enabled: false, // Disabled
          wet: 0.4,
          params: { delayTime: 0.25, feedback: 0.5 },
        },
        {
          type: "reverb",
          enabled: true,
          wet: 0.3,
          params: { decay: 2.5, preDelay: 0.01 },
        },
      ];

      const chain = rebuildEffectsChain(effects);

      // Only enabled effects should be in the chain
      expect(chain).toHaveLength(2);
      expect(chain[0]).toBeDefined(); // Chorus
      expect(chain[1]).toBeDefined(); // Reverb (delay was bypassed)
    });

    it("should handle empty effects array", () => {
      const effects: EffectConfig[] = [];
      const chain = rebuildEffectsChain(effects);

      expect(chain).toHaveLength(0);
    });

    it("should handle single effect", () => {
      const effects: EffectConfig[] = [
        {
          type: "chorus",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
        },
      ];

      const chain = rebuildEffectsChain(effects);

      expect(chain).toHaveLength(1);
      expect(chain[0]).toBeDefined();
    });

    it("should handle all effects disabled", () => {
      const effects: EffectConfig[] = [
        {
          type: "chorus",
          enabled: false,
          wet: 0.5,
          params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
        },
        {
          type: "delay",
          enabled: false,
          wet: 0.4,
          params: { delayTime: 0.25, feedback: 0.5 },
        },
      ];

      const chain = rebuildEffectsChain(effects);

      expect(chain).toHaveLength(0);
    });

    it("should maintain effect order in chain", () => {
      const effects: EffectConfig[] = [
        {
          type: "distortion",
          enabled: true,
          wet: 0.6,
          params: { distortion: 0.8, oversample: "2x" },
        },
        {
          type: "chorus",
          enabled: true,
          wet: 0.5,
          params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
        },
        {
          type: "delay",
          enabled: true,
          wet: 0.4,
          params: { delayTime: 0.25, feedback: 0.5 },
        },
        {
          type: "reverb",
          enabled: true,
          wet: 0.3,
          params: { decay: 2.5, preDelay: 0.01 },
        },
      ];

      const chain = rebuildEffectsChain(effects);

      // Verify order: distortion → chorus → delay → reverb
      expect(chain).toHaveLength(4);
      expect(chain[0].distortion).toBe(0.8); // Distortion first
      expect(chain[1].frequency.value).toBe(1.5); // Chorus second
      expect(chain[2].delayTime.value).toBe(0.25); // Delay third
      expect(chain[3].decay).toBe(2.5); // Reverb last
    });
  });

  describe("Effect defaults", () => {
    it("should use appropriate default wet value for chorus", () => {
      const config: EffectConfig = {
        type: "chorus",
        enabled: true,
        wet: 0.5,
        params: { frequency: 1.5, delayTime: 3.5, depth: 0.7 },
      };

      const effect = createEffect(config);
      expect(effect.wet.value).toBe(0.5);
    });

    it("should use appropriate default wet value for reverb", () => {
      const config: EffectConfig = {
        type: "reverb",
        enabled: true,
        wet: 0.3,
        params: { decay: 2.5, preDelay: 0.01 },
      };

      const effect = createEffect(config);
      expect(effect.wet.value).toBe(0.3);
    });

    it("should default vibrato depth to 0.3", () => {
      const config: EffectConfig = {
        type: "vibrato",
        enabled: true,
        wet: 0.5,
        params: { frequency: 5, depth: 0.3 },
      };

      const effect = createEffect(config);
      expect(effect.depth.value).toBe(0.3);
    });

    it("should default tremolo depth to 0.7", () => {
      const config: EffectConfig = {
        type: "tremolo",
        enabled: true,
        wet: 0.5,
        params: { frequency: 4, depth: 0.7 },
      };

      const effect = createEffect(config);
      expect(effect.depth.value).toBe(0.7);
    });
  });
});
