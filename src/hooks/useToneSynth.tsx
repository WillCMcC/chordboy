/**
 * Tone.js Synth Hook
 * Manages browser-based synthesizer as alternative to MIDI output.
 *
 * @module hooks/useToneSynth
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import * as Tone from "tone";
import { appEvents } from "../lib/eventBus";
import { useEventSubscription } from "./useEventSubscription";
import { useMIDI } from "./useMIDI";
import { getHumanizeOffsets, createHumanizeManager } from "../lib/humanize";
import { getStrumOffsets } from "../lib/strum";
import {
  synthPresets,
  getPresetById,
  DEFAULT_PRESET_ID,
  type SynthPreset,
  type ADSREnvelope,
} from "../lib/synthPresets";
import type { MIDINote, ChordChangedEvent, GraceNotePayload, StrumDirection, HumanizeManager } from "../types";
import type { TriggerMode } from "./useMIDI";
import { CustomSynthEngine } from "../lib/customSynthEngine";
import { useCustomPatches } from "./useCustomPatches";

/** Audio mode - MIDI only, Synth only, or both */
export type AudioMode = "midi" | "synth" | "both";

/** Tone Synth context value */
export interface ToneSynthContextValue {
  // State
  /** Whether the synth is initialized (AudioContext started) */
  isInitialized: boolean;
  /** Whether the synth is currently enabled for playback */
  isEnabled: boolean;
  /** Current audio mode */
  audioMode: AudioMode;
  /** Currently selected preset */
  currentPreset: SynthPreset;
  /** Current ADSR envelope */
  envelope: ADSREnvelope;
  /** Master volume (0-1) */
  volume: number;
  /** Available presets */
  presets: SynthPreset[];

  // Custom patch support
  /** Whether currently using a custom patch */
  isCustomPatch: boolean;
  /** ID of currently selected custom patch */
  customPatchId: string | null;
  /** Select a custom patch by ID */
  selectCustomPatch: (patchId: string) => void;
  /** Open the patch builder (with optional patch to edit) */
  openPatchBuilder: (patchId?: string | null) => void;
  /** Close the patch builder */
  closePatchBuilder: () => void;
  /** Whether the patch builder is open */
  isPatchBuilderOpen: boolean;
  /** ID of the patch being edited (null if creating new) */
  editingPatchId: string | null;
  /** Custom patches hook (exposed for UI) */
  customPatches: ReturnType<typeof useCustomPatches>;

  // Actions
  /** Initialize the audio context (requires user gesture) */
  initialize: () => Promise<void>;
  /** Set the audio mode */
  setAudioMode: (mode: AudioMode) => void;
  /** Select a preset by ID */
  selectPreset: (presetId: string) => void;
  /** Update ADSR envelope */
  setEnvelope: (envelope: ADSREnvelope) => void;
  /** Set master volume */
  setVolume: (volume: number) => void;
  /** Play a single note */
  playNote: (note: MIDINote, velocity?: number) => void;
  /** Stop a single note */
  stopNote: (note: MIDINote) => void;
  /** Play a chord */
  playChord: (notes: MIDINote[], velocity?: number) => void;
  /** Stop all notes */
  stopAllNotes: () => void;
}

const ToneSynthContext = createContext<ToneSynthContextValue | null>(null);

interface ToneSynthProviderProps {
  children: ReactNode;
}

/** Convert MIDI note to frequency */
function midiToFreq(midi: MIDINote): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Convert MIDI velocity (0-127) to Tone.js velocity (0-1) */
function midiVelocityToTone(velocity: number): number {
  return Math.min(1, Math.max(0, velocity / 127));
}

/** Storage key for synth settings */
const SYNTH_SETTINGS_KEY = "chordboy-synth-settings";

interface SynthSettings {
  audioMode: AudioMode;
  presetId: string;
  envelope: ADSREnvelope;
  volume: number;
}

/**
 * Tone Synth Provider
 * Manages Tone.js synthesizer lifecycle and provides synth functions.
 */
export function ToneSynthProvider({ children }: ToneSynthProviderProps): React.JSX.Element {
  // Get expression settings from MIDI context
  const {
    humanize,
    strumEnabled,
    strumSpread,
    strumDirection,
    triggerMode,
    glideTime,
  } = useMIDI();

  // Load saved settings
  const loadSettings = (): Partial<SynthSettings> => {
    try {
      const saved = localStorage.getItem(SYNTH_SETTINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse errors
    }
    return {};
  };

  const savedSettings = loadSettings();

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioMode, setAudioModeState] = useState<AudioMode>(
    savedSettings.audioMode ?? "midi"
  );
  const [currentPresetId, setCurrentPresetId] = useState(
    savedSettings.presetId ?? DEFAULT_PRESET_ID
  );
  const [envelope, setEnvelopeState] = useState<ADSREnvelope>(
    savedSettings.envelope ?? getPresetById(DEFAULT_PRESET_ID)!.defaultEnvelope
  );
  const [volume, setVolumeState] = useState(savedSettings.volume ?? 0.7);

  // Custom patch state
  const [isCustomPatch, setIsCustomPatch] = useState(false);
  const [customPatchId, setCustomPatchId] = useState<string | null>(null);
  const [isPatchBuilderOpen, setIsPatchBuilderOpen] = useState(false);
  const [editingPatchId, setEditingPatchId] = useState<string | null>(null);

  // Refs for synth and effects
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const effectsRef = useRef<Tone.ToneAudioNode[]>([]);
  const currentNotesRef = useRef<Set<string>>(new Set());
  const volumeNodeRef = useRef<Tone.Volume | null>(null);

  // Custom synth engine ref
  const customSynthRef = useRef<CustomSynthEngine | null>(null);

  // Use the custom patches hook
  const customPatches = useCustomPatches();

  // Humanization manager for scheduling notes
  const humanizeManagerRef = useRef<HumanizeManager>(createHumanizeManager());

  // Track last strum direction for alternate mode
  const strumLastDirectionRef = useRef<StrumDirection>("up");

  // Refs for latest values (to avoid stale closures in event subscriptions)
  const isEnabledRef = useRef(false);
  const isInitializedRef = useRef(false);
  const isPatchBuilderOpenRef = useRef(false);
  const isCustomPatchRef = useRef(false);
  const triggerModeRef = useRef<TriggerMode>(triggerMode);

  // Get current preset
  const currentPreset = getPresetById(currentPresetId) ?? synthPresets[0];

  // Derived enabled state
  const isEnabled = audioMode === "synth" || audioMode === "both";

  // Keep refs in sync with state (for event subscription closures)
  isEnabledRef.current = isEnabled;
  isInitializedRef.current = isInitialized;
  isPatchBuilderOpenRef.current = isPatchBuilderOpen;
  isCustomPatchRef.current = isCustomPatch;

  useEffect(() => {
    triggerModeRef.current = triggerMode;
  }, [triggerMode]);

  // Save settings on change
  useEffect(() => {
    const settings: SynthSettings = {
      audioMode,
      presetId: currentPresetId,
      envelope,
      volume,
    };
    localStorage.setItem(SYNTH_SETTINGS_KEY, JSON.stringify(settings));
  }, [audioMode, currentPresetId, envelope, volume]);

  /**
   * Dispose of current synth and effects
   */
  const disposeCurrentSynth = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.releaseAll();
      synthRef.current.disconnect();
      synthRef.current.dispose();
      synthRef.current = null;
    }
    effectsRef.current.forEach((effect) => {
      effect.disconnect();
      effect.dispose();
    });
    effectsRef.current = [];
  }, []);

  /**
   * Create synth with current preset and envelope
   */
  const createSynth = useCallback(() => {
    disposeCurrentSynth();

    // Create volume node if not exists
    if (!volumeNodeRef.current) {
      volumeNodeRef.current = new Tone.Volume(Tone.gainToDb(volume)).toDestination();
    }

    // Create new synth
    const synth = currentPreset.createSynth(envelope);

    // Create effects chain
    const effects = currentPreset.effects?.() ?? [];
    effectsRef.current = effects;

    // Connect: synth -> effects -> volume -> destination
    if (effects.length > 0) {
      synth.connect(effects[0]);
      for (let i = 0; i < effects.length - 1; i++) {
        effects[i].connect(effects[i + 1]);
      }
      effects[effects.length - 1].connect(volumeNodeRef.current);
    } else {
      synth.connect(volumeNodeRef.current);
    }

    synthRef.current = synth;
  }, [currentPreset, envelope, volume, disposeCurrentSynth]);

  /**
   * Initialize the audio context (requires user gesture)
   */
  const initialize = useCallback(async () => {
    if (isInitialized) return;

    try {
      await Tone.start();
      setIsInitialized(true);
      createSynth();
    } catch (err) {
      console.error("Failed to initialize Tone.js:", err);
    }
  }, [isInitialized, createSynth]);

  // Recreate synth when preset or envelope changes
  useEffect(() => {
    if (isInitialized) {
      createSynth();
    }
  }, [isInitialized, currentPresetId, envelope, createSynth]);

  // Auto-initialize if saved mode was synth/both (requires user interaction first)
  useEffect(() => {
    if ((audioMode === "synth" || audioMode === "both") && !isInitialized) {
      // Try to initialize - will work if user has interacted with page
      Tone.start().then(() => {
        setIsInitialized(true);
      }).catch(() => {
        // Will need user gesture - that's okay, clicking any button will trigger it
      });
    }
  }, [audioMode, isInitialized]);

  // Update volume when it changes
  useEffect(() => {
    if (volumeNodeRef.current) {
      volumeNodeRef.current.volume.value = Tone.gainToDb(volume);
    }
  }, [volume]);

  /**
   * Set audio mode
   */
  const setAudioMode = useCallback(async (mode: AudioMode) => {
    setAudioModeState(mode);
    // If enabling synth for the first time, initialize immediately
    if ((mode === "synth" || mode === "both") && !isInitialized) {
      try {
        await Tone.start();
        setIsInitialized(true);
        // createSynth will be called by the useEffect that watches isInitialized
      } catch (err) {
        console.error("Failed to initialize Tone.js:", err);
      }
    }
  }, [isInitialized]);

  /**
   * Select a preset
   */
  const selectPreset = useCallback((presetId: string) => {
    const preset = getPresetById(presetId);
    if (preset) {
      // Dispose custom synth if active
      if (customSynthRef.current) {
        customSynthRef.current.dispose();
        customSynthRef.current = null;
      }

      setIsCustomPatch(false);
      setCustomPatchId(null);
      setCurrentPresetId(presetId);
      // Reset envelope to preset default
      setEnvelopeState(preset.defaultEnvelope);
    }
  }, []);

  /**
   * Select a custom patch by ID
   */
  const selectCustomPatch = useCallback(
    (patchId: string) => {
      const patch = customPatches.getPatch(patchId);
      if (!patch) {
        console.warn(`Custom patch not found: ${patchId}`);
        return;
      }

      // Initialize audio context if needed (block until ready)
      if (!isInitialized) {
        console.error("Audio context not initialized. Cannot load custom patch.");
        return;
      }

      // Dispose existing custom synth
      if (customSynthRef.current) {
        customSynthRef.current.dispose();
        customSynthRef.current = null;
      }

      // Dispose existing factory synth
      disposeCurrentSynth();

      // Create new custom synth engine
      // Note: CustomSynthEngine manages its own output chain and connects to destination
      customSynthRef.current = new CustomSynthEngine(patch);

      setCustomPatchId(patchId);
      setIsCustomPatch(true);
    },
    [customPatches, isInitialized, disposeCurrentSynth]
  );

  /**
   * Open the patch builder
   * Starts Tone.js audio context immediately (requires user gesture)
   */
  const openPatchBuilder = useCallback(async (patchId?: string | null) => {
    // Start Tone.js immediately on user gesture before opening modal
    // This ensures audio context is unlocked by the button click
    // IMPORTANT: We must await Tone.start() to ensure context is running
    // before the patch builder creates its preview synth
    if (Tone.getContext().state !== "running") {
      try {
        await Tone.start();
      } catch (err) {
        console.error("Failed to start Tone.js:", err);
      }
    }
    setEditingPatchId(patchId ?? null);
    setIsPatchBuilderOpen(true);
  }, []);

  /**
   * Close the patch builder
   */
  const closePatchBuilder = useCallback(() => {
    setIsPatchBuilderOpen(false);
    setEditingPatchId(null);
  }, []);

  /**
   * Get the effective envelope (from custom patch if active, otherwise factory preset)
   */
  const effectiveEnvelope = useMemo((): ADSREnvelope => {
    if (isCustomPatch && customPatchId) {
      const patch = customPatches.getPatch(customPatchId);
      if (patch) {
        return {
          attack: patch.ampEnvelope.attack,
          decay: patch.ampEnvelope.decay,
          sustain: patch.ampEnvelope.sustain,
          release: patch.ampEnvelope.release,
        };
      }
    }
    return envelope;
  }, [isCustomPatch, customPatchId, customPatches, envelope]);

  /**
   * Update ADSR envelope
   * For custom patches, updates the patch itself and syncs to the engine
   */
  const setEnvelope = useCallback((newEnvelope: ADSREnvelope) => {
    if (isCustomPatch && customPatchId) {
      // Update the custom patch's ampEnvelope
      const patch = customPatches.getPatch(customPatchId);
      if (patch) {
        const updatedPatch = {
          ...patch,
          ampEnvelope: {
            ...patch.ampEnvelope,
            attack: newEnvelope.attack,
            decay: newEnvelope.decay,
            sustain: newEnvelope.sustain,
            release: newEnvelope.release,
          },
          updatedAt: Date.now(),
        };
        customPatches.savePatch(updatedPatch);
        // The useEffect watching customPatches.patches will update the synth
      }
    } else {
      // Update factory preset envelope state
      setEnvelopeState(newEnvelope);
    }
  }, [isCustomPatch, customPatchId, customPatches]);

  /**
   * Set master volume
   */
  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(Math.min(1, Math.max(0, newVolume)));
  }, []);

  /**
   * Play a single note
   */
  const playNote = useCallback(
    (note: MIDINote, velocity = 100) => {
      if (!isEnabled || !isInitialized) return;

      if (isCustomPatch && customSynthRef.current) {
        // Use custom synth engine
        customSynthRef.current.triggerAttack(note, midiVelocityToTone(velocity));
      } else if (synthRef.current) {
        // Use factory PolySynth
        const freq = midiToFreq(note);
        const noteKey = note.toString();

        // Stop if already playing
        if (currentNotesRef.current.has(noteKey)) {
          synthRef.current.triggerRelease(freq, Tone.now());
        }

        currentNotesRef.current.add(noteKey);
        synthRef.current.triggerAttack(freq, Tone.now(), midiVelocityToTone(velocity));
      }
    },
    [isEnabled, isInitialized, isCustomPatch]
  );

  /**
   * Stop a single note
   */
  const stopNote = useCallback(
    (note: MIDINote) => {
      if (!isInitialized) return;

      if (isCustomPatch && customSynthRef.current) {
        // Use custom synth engine
        customSynthRef.current.triggerRelease(note);
      } else if (synthRef.current) {
        // Use factory PolySynth
        const freq = midiToFreq(note);
        const noteKey = note.toString();

        currentNotesRef.current.delete(noteKey);
        synthRef.current.triggerRelease(freq, Tone.now());
      }
    },
    [isInitialized, isCustomPatch]
  );

  /**
   * Play a chord with expression (strum, humanize)
   */
  const playChord = useCallback(
    (notes: MIDINote[], velocity = 100, retrigger = false) => {
      if (!isEnabled || !isInitialized) return;

      // Clear any pending humanized notes
      humanizeManagerRef.current.clear();

      if (isCustomPatch && customSynthRef.current) {
        // Use custom synth engine with expression support
        const newNotesSet = new Set(notes.map((n) => n.toString()));
        const currentSet = currentNotesRef.current;

        // Stop notes that are no longer in the chord
        currentSet.forEach((noteKey) => {
          if (!newNotesSet.has(noteKey)) {
            customSynthRef.current?.triggerRelease(parseInt(noteKey, 10) as MIDINote);
          }
        });

        // Determine which notes to start
        const notesToStart = retrigger
          ? notes // Retrigger all notes
          : notes.filter((n) => !currentSet.has(n.toString())); // Only new notes

        if (notesToStart.length > 0) {
          // If retriggering, stop current notes first
          if (retrigger) {
            currentSet.forEach((noteKey) => {
              customSynthRef.current?.triggerRelease(parseInt(noteKey, 10) as MIDINote);
            });
          }

          if (strumEnabled && strumSpread > 0 && notesToStart.length > 1) {
            // Strum: evenly-spaced delays based on note pitch order
            const { offsets, nextDirection } = getStrumOffsets(
              notesToStart,
              strumSpread,
              strumDirection,
              strumLastDirectionRef.current
            );
            strumLastDirectionRef.current = nextDirection;

            notesToStart.forEach((note, i) => {
              humanizeManagerRef.current.schedule(() => {
                customSynthRef.current?.triggerAttack(note, midiVelocityToTone(velocity));
              }, offsets[i]);
            });
          } else if (humanize > 0 && notesToStart.length > 1) {
            // Humanization: stagger notes with random timing
            const offsets = getHumanizeOffsets(notesToStart.length, humanize);

            notesToStart.forEach((note, i) => {
              humanizeManagerRef.current.schedule(() => {
                customSynthRef.current?.triggerAttack(note, midiVelocityToTone(velocity));
              }, offsets[i]);
            });
          } else {
            // No expression - play all notes immediately
            notesToStart.forEach((note) => {
              customSynthRef.current?.triggerAttack(note, midiVelocityToTone(velocity));
            });
          }
        }

        currentNotesRef.current = newNotesSet;
      } else if (synthRef.current) {
        // Use factory PolySynth with full expression support
        const newNotesSet = new Set(notes.map((n) => n.toString()));
        const currentSet = currentNotesRef.current;

        // Stop notes that are no longer in the chord
        currentSet.forEach((noteKey) => {
          if (!newNotesSet.has(noteKey)) {
            const freq = midiToFreq(parseInt(noteKey, 10) as MIDINote);
            synthRef.current?.triggerRelease(freq, Tone.now());
          }
        });

        // Determine which notes to start
        const notesToStart = retrigger
          ? notes // Retrigger all notes
          : notes.filter((n) => !currentSet.has(n.toString())); // Only new notes

        if (notesToStart.length > 0) {
          // If retriggering, stop current notes first
          if (retrigger) {
            currentSet.forEach((noteKey) => {
              const freq = midiToFreq(parseInt(noteKey, 10) as MIDINote);
              synthRef.current?.triggerRelease(freq, Tone.now());
            });
          }

          if (strumEnabled && strumSpread > 0 && notesToStart.length > 1) {
            // Strum: evenly-spaced delays based on note pitch order
            const { offsets, nextDirection } = getStrumOffsets(
              notesToStart,
              strumSpread,
              strumDirection,
              strumLastDirectionRef.current
            );
            strumLastDirectionRef.current = nextDirection;

            notesToStart.forEach((note, i) => {
              humanizeManagerRef.current.schedule(() => {
                const freq = midiToFreq(note);
                synthRef.current?.triggerAttack(freq, Tone.now(), midiVelocityToTone(velocity));
              }, offsets[i]);
            });
          } else if (humanize > 0 && notesToStart.length > 1) {
            // Humanization: stagger notes with random timing
            const offsets = getHumanizeOffsets(notesToStart.length, humanize);

            notesToStart.forEach((note, i) => {
              humanizeManagerRef.current.schedule(() => {
                const freq = midiToFreq(note);
                synthRef.current?.triggerAttack(freq, Tone.now(), midiVelocityToTone(velocity));
              }, offsets[i]);
            });
          } else {
            // No expression: play all notes immediately
            notesToStart.forEach((note) => {
              const freq = midiToFreq(note);
              synthRef.current?.triggerAttack(freq, Tone.now(), midiVelocityToTone(velocity));
            });
          }
        }

        currentNotesRef.current = newNotesSet;
      }
    },
    [isEnabled, isInitialized, isCustomPatch, strumEnabled, strumSpread, strumDirection, humanize]
  );

  /**
   * Play a chord with glide (portamento-like effect)
   * Smoothly transitions from old chord to new chord
   */
  const playChordWithGlide = useCallback(
    (notes: MIDINote[], velocity = 100) => {
      if (!isEnabled || !synthRef.current || !isInitialized) return;

      humanizeManagerRef.current.clear();

      const currentSet = currentNotesRef.current;
      const newNotesSet = new Set(notes.map((n) => n.toString()));

      // If no current notes, just play normally
      if (currentSet.size === 0) {
        notes.forEach((note) => {
          const freq = midiToFreq(note);
          synthRef.current?.triggerAttack(freq, Tone.now(), midiVelocityToTone(velocity));
        });
        currentNotesRef.current = newNotesSet;
        return;
      }

      // Calculate pitch offset for glide effect
      const currentNotes = Array.from(currentSet).map((n) => parseInt(n, 10));
      const currentAvg = currentNotes.reduce((a, b) => a + b, 0) / currentNotes.length;
      const newAvg = notes.reduce((a, b) => a + b, 0) / notes.length;
      const pitchDiff = currentAvg - newAvg;

      // Release old notes
      currentSet.forEach((noteKey) => {
        const freq = midiToFreq(parseInt(noteKey, 10) as MIDINote);
        synthRef.current?.triggerRelease(freq, Tone.now());
      });

      // Calculate detune in cents (100 cents = 1 semitone)
      const startDetune = pitchDiff * 100;
      const glideMs = glideTime;

      // Start new notes with detune offset
      notes.forEach((note) => {
        const freq = midiToFreq(note);
        synthRef.current?.triggerAttack(freq, Tone.now(), midiVelocityToTone(velocity));
      });

      // Animate detune from offset back to zero
      if (synthRef.current && Math.abs(startDetune) > 10) {
        const synth = synthRef.current;
        const startTime = performance.now();

        const animateDetune = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(1, elapsed / glideMs);
          // Ease out cubic
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentDetune = startDetune * (1 - easeOut);

          // Apply detune to all voices
          synth.set({ detune: currentDetune });

          if (progress < 1) {
            requestAnimationFrame(animateDetune);
          } else {
            synth.set({ detune: 0 });
          }
        };

        requestAnimationFrame(animateDetune);
      }

      currentNotesRef.current = newNotesSet;
    },
    [isEnabled, isInitialized, glideTime]
  );

  /**
   * Stop all notes
   */
  const stopAllNotes = useCallback(() => {
    // Clear any pending humanized notes
    humanizeManagerRef.current.clear();

    if (!isInitialized) return;

    if (isCustomPatch && customSynthRef.current) {
      customSynthRef.current.releaseAll();
    } else if (synthRef.current) {
      synthRef.current.releaseAll(Tone.now());
    }

    currentNotesRef.current.clear();
  }, [isInitialized, isCustomPatch]);

  // Subscribe to chord events (use refs for latest values)
  // Skip playback when patch builder is open (it has its own preview synth)
  useEventSubscription(appEvents, "chord:changed", (event: ChordChangedEvent) => {
    if (isPatchBuilderOpenRef.current) return; // Let patch builder handle preview
    if (!isEnabledRef.current || !isInitializedRef.current) return;

    // Check if we have a valid synth (either custom or factory)
    const hasValidSynth = isCustomPatchRef.current
      ? customSynthRef.current !== null
      : synthRef.current !== null;

    if (!hasValidSynth) return;

    if (triggerModeRef.current === "glide" && !isCustomPatchRef.current) {
      // Use glide mode - smooth transition between chords (factory synth only)
      playChordWithGlide(event.notes);
    } else {
      // Determine if we should retrigger all notes
      const shouldRetrigger = event.retrigger || triggerModeRef.current === "all";
      playChord(event.notes, 100, shouldRetrigger);
    }
  });

  useEventSubscription(appEvents, "chord:cleared", () => {
    if (isPatchBuilderOpenRef.current) return; // Let patch builder handle preview
    if (isEnabledRef.current && isInitializedRef.current) {
      stopAllNotes();
    }
  });

  // Subscribe to grace note events
  useEventSubscription(appEvents, "grace:note", (event: GraceNotePayload) => {
    if (isPatchBuilderOpenRef.current) return; // Let patch builder handle preview
    if (!isEnabledRef.current || !isInitializedRef.current) return;

    // Grace notes: immediate release and re-attack
    // No delay needed - Tone.js handles the envelope transitions natively.
    // The release begins immediately and the new attack starts fresh.
    const graceVelocity = 85; // Slightly softer
    const now = Tone.now();

    if (isCustomPatchRef.current && customSynthRef.current) {
      // Custom synth grace notes - immediate re-trigger
      event.notes.forEach((note) => {
        customSynthRef.current?.triggerRelease(note, now);
        customSynthRef.current?.triggerAttack(note, midiVelocityToTone(graceVelocity));
      });
    } else if (synthRef.current) {
      // Factory synth grace notes - immediate re-trigger
      event.notes.forEach((note) => {
        const freq = midiToFreq(note);
        synthRef.current?.triggerRelease(freq, now);
        synthRef.current?.triggerAttack(freq, now, midiVelocityToTone(graceVelocity));
      });
    }
  });

  // Update custom synth when patch is modified
  // Use a ref to track last patch update to avoid unnecessary rebuilds
  const lastPatchUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (isCustomPatch && customPatchId && customSynthRef.current && isInitialized) {
      const patch = customPatches.getPatch(customPatchId);
      if (patch && patch.updatedAt > lastPatchUpdateRef.current) {
        // Update the synth engine with the new patch
        customSynthRef.current.updatePatch(patch);
        lastPatchUpdateRef.current = patch.updatedAt;
      }
    }
  }, [customPatches.patches, customPatchId, isCustomPatch, isInitialized, customPatches]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      humanizeManagerRef.current.clear();

      // Dispose custom synth first (before factory synth)
      if (customSynthRef.current) {
        customSynthRef.current.dispose();
        customSynthRef.current = null;
      }

      disposeCurrentSynth();

      if (volumeNodeRef.current) {
        volumeNodeRef.current.dispose();
        volumeNodeRef.current = null;
      }
    };
  }, [disposeCurrentSynth]);

  const value: ToneSynthContextValue = {
    isInitialized,
    isEnabled,
    audioMode,
    currentPreset,
    envelope: effectiveEnvelope,
    volume,
    presets: synthPresets,

    // Custom patch support
    isCustomPatch,
    customPatchId,
    selectCustomPatch,
    openPatchBuilder,
    closePatchBuilder,
    isPatchBuilderOpen,
    editingPatchId,
    customPatches,

    initialize,
    setAudioMode,
    selectPreset,
    setEnvelope,
    setVolume,
    playNote,
    stopNote,
    playChord,
    stopAllNotes,
  };

  return (
    <ToneSynthContext.Provider value={value}>{children}</ToneSynthContext.Provider>
  );
}

/**
 * Hook to access Tone synth context.
 * Must be used within a ToneSynthProvider.
 */
export function useToneSynth(): ToneSynthContextValue {
  const context = useContext(ToneSynthContext);
  if (!context) {
    throw new Error("useToneSynth must be used within a ToneSynthProvider");
  }
  return context;
}
