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

  // Refs for synth and effects
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const effectsRef = useRef<Tone.ToneAudioNode[]>([]);
  const currentNotesRef = useRef<Set<string>>(new Set());
  const volumeNodeRef = useRef<Tone.Volume | null>(null);

  // Humanization manager for scheduling notes
  const humanizeManagerRef = useRef<HumanizeManager>(createHumanizeManager());

  // Track last strum direction for alternate mode
  const strumLastDirectionRef = useRef<StrumDirection>("up");

  // Refs for latest values (to avoid stale closures in event subscriptions)
  const isEnabledRef = useRef(false);
  const isInitializedRef = useRef(false);
  const triggerModeRef = useRef<TriggerMode>(triggerMode);

  // Get current preset
  const currentPreset = getPresetById(currentPresetId) ?? synthPresets[0];

  // Derived enabled state
  const isEnabled = audioMode === "synth" || audioMode === "both";

  // Keep refs in sync with state (for event subscription closures)
  isEnabledRef.current = isEnabled;
  isInitializedRef.current = isInitialized;

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
      setCurrentPresetId(presetId);
      // Reset envelope to preset default
      setEnvelopeState(preset.defaultEnvelope);
    }
  }, []);

  /**
   * Update ADSR envelope
   */
  const setEnvelope = useCallback((newEnvelope: ADSREnvelope) => {
    setEnvelopeState(newEnvelope);
  }, []);

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
      if (!isEnabled || !synthRef.current || !isInitialized) return;

      const freq = midiToFreq(note);
      const noteKey = note.toString();

      // Stop if already playing
      if (currentNotesRef.current.has(noteKey)) {
        synthRef.current.triggerRelease(freq, Tone.now());
      }

      currentNotesRef.current.add(noteKey);
      synthRef.current.triggerAttack(freq, Tone.now(), midiVelocityToTone(velocity));
    },
    [isEnabled, isInitialized]
  );

  /**
   * Stop a single note
   */
  const stopNote = useCallback(
    (note: MIDINote) => {
      if (!synthRef.current || !isInitialized) return;

      const freq = midiToFreq(note);
      const noteKey = note.toString();

      currentNotesRef.current.delete(noteKey);
      synthRef.current.triggerRelease(freq, Tone.now());
    },
    [isInitialized]
  );

  /**
   * Play a chord with expression (strum, humanize)
   */
  const playChord = useCallback(
    (notes: MIDINote[], velocity = 100, retrigger = false) => {
      if (!isEnabled || !synthRef.current || !isInitialized) return;

      // Clear any pending humanized notes
      humanizeManagerRef.current.clear();

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
    },
    [isEnabled, isInitialized, strumEnabled, strumSpread, strumDirection, humanize]
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

    if (!synthRef.current || !isInitialized) return;

    synthRef.current.releaseAll(Tone.now());
    currentNotesRef.current.clear();
  }, [isInitialized]);

  // Subscribe to chord events (use refs for latest values)
  useEventSubscription(appEvents, "chord:changed", (event: ChordChangedEvent) => {
    if (isEnabledRef.current && isInitializedRef.current && synthRef.current) {
      if (triggerModeRef.current === "glide") {
        // Use glide mode - smooth transition between chords
        playChordWithGlide(event.notes);
      } else {
        // Determine if we should retrigger all notes
        const shouldRetrigger = event.retrigger || triggerModeRef.current === "all";
        playChord(event.notes, 100, shouldRetrigger);
      }
    }
  });

  useEventSubscription(appEvents, "chord:cleared", () => {
    if (isEnabledRef.current && isInitializedRef.current) {
      stopAllNotes();
    }
  });

  // Subscribe to grace note events
  useEventSubscription(appEvents, "grace:note", (event: GraceNotePayload) => {
    if (!isEnabledRef.current || !isInitializedRef.current || !synthRef.current) return;

    // Grace notes: quick release and re-attack
    const graceVelocity = 85; // Slightly softer
    event.notes.forEach((note) => {
      const freq = midiToFreq(note);
      synthRef.current?.triggerRelease(freq, Tone.now());
      // Small delay before re-attack
      setTimeout(() => {
        synthRef.current?.triggerAttack(freq, Tone.now(), midiVelocityToTone(graceVelocity));
      }, 20);
    });
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      humanizeManagerRef.current.clear();
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
    envelope,
    volume,
    presets: synthPresets,

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
