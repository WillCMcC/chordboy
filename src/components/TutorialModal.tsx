/**
 * TutorialModal Component
 * Interactive first-time user tutorial.
 * Advances when users perform the described actions.
 *
 * @module components/TutorialModal
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Dispatch, SetStateAction, PointerEvent } from "react";
import type { Preset, TutorialStep, TutorialState, NoteName, MIDINote } from "../types";
import {
  TUTORIAL_STEPS,
  MOBILE_TUTORIAL_STEPS,
  buildTutorialState,
  isStepConditionMet,
  getNextStep,
} from "../lib/tutorialLogic";
import "./TutorialModal.css";

/** Step content for display */
interface StepContent {
  content: string;
  hint: string;
}

/** Current chord data for tutorial state - matches ChordData in tutorialLogic */
interface CurrentChordData {
  root?: NoteName | null;
  name?: string;
  notes?: MIDINote[];
  quality?: string;
  modifiers?: string[];
}

/**
 * Step content and hints (UI-specific, separate from logic).
 */
const STEP_CONTENT: StepContent[] = [
  {
    content: "A MIDI chord controller designed for jazz performance.\n\nPlay complex chords with simple key combinations.",
    hint: "Press Next to begin",
  },
  {
    content: "Use the left side of your keyboard:\n\nQ W E R = C C# D D#\nA S D F = E F F# G\nZ X C V = G# A A# B",
    hint: "Try pressing Q for C, or any root note key",
  },
  {
    content: "Hold the root and add a quality:\n\nJ = Major (default)\nU = Minor\nM = Diminished\n7 = Augmented",
    hint: "Hold your root note and press U for Minor",
  },
  {
    content: "Make it jazzy with extensions:\n\nK = Dom7    I = Maj7    , = 6th\nL = 9th     O = 11th    . = 13th",
    hint: "Add K for a dominant 7th chord",
  },
  {
    content: "Shape your voicing while holding a chord:\n\nShift = Cycle inversions\n<- -> = Change octave\n^ v = Spread voicing",
    hint: "Press Shift to invert, or arrow keys",
  },
  {
    content: "Save your chord to recall later:\n\nSpace = Save to next available slot\n1-9 = Recall saved preset\nHold 1-9 = Save to specific slot",
    hint: "Press Space to save your chord",
  },
  {
    content: "You've learned the basics.\n\nConnect a MIDI device in Settings (gear icon) to send chords to your DAW or synth.",
    hint: "Press Get Started to begin playing",
  },
];

/**
 * Mobile step content and hints.
 */
const MOBILE_STEP_CONTENT: StepContent[] = [
  {
    content: "A MIDI chord controller designed for jazz performance.\n\nPlay complex chords with simple taps.",
    hint: "Tap Next to begin",
  },
  {
    content: "Tap any note on the piano keyboard below.\n\nThis sets the root note of your chord.",
    hint: "Tap any piano key to select a root note",
  },
  {
    content: "Use the modifier buttons to change chord quality:\n\nmin = Minor\ndim = Diminished\naug = Augmented",
    hint: "Tap 'min' to make a minor chord",
  },
  {
    content: "Add extensions for jazzy sounds:\n\n7 = Dominant 7th\nMaj7 = Major 7th\n9, 11, 13 = Extensions",
    hint: "Tap any extension button (7, Maj7, 9, etc.)",
  },
  {
    content: "Shape your voicing with the controls:\n\nINV = Cycle inversions\nOCT <- -> = Change octave\nSPREAD = Spread voicing",
    hint: "Tap INV or use octave/spread controls",
  },
  {
    content: "Save chords to recall later:\n\nTap an empty preset slot to save\nTap a filled slot to recall",
    hint: "Save your chord to a preset slot",
  },
  {
    content: "Using presets live:\n\nHold a preset to play it\nSwipe while holding to lock\nTap a locked preset to release\n\nGreat for playing over changes!",
    hint: "Tap Next to continue",
  },
  {
    content: "You've learned the basics.\n\nConnect a MIDI device in Settings (gear icon) to send chords to your DAW or synth.",
    hint: "Tap Get Started to begin playing",
  },
];

/** Props for TutorialModal component */
interface TutorialModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Current chord being played */
  currentChord: CurrentChordData | null;
  /** Current inversion */
  inversionIndex: number;
  /** Current octave */
  octave: number;
  /** Current spread */
  spreadAmount: number;
  /** Saved preset slots */
  savedPresets: Map<string, Preset>;
  /** Whether the device is mobile */
  isMobile?: boolean;
  /** Setter for mobile keys (mobile only) */
  setMobileKeys?: Dispatch<SetStateAction<Set<string>>>;
  /** Callback to cycle inversions */
  onInversionChange?: () => void;
  /** Callback to change octave */
  onOctaveChange?: (delta: number) => void;
  /** Callback to cycle spread */
  onSpreadChange?: () => void;
  /** Callback to save preset */
  onSavePreset?: (slot: string) => boolean;
}

/**
 * Interactive tutorial modal.
 */
export function TutorialModal({
  isOpen,
  onClose,
  currentChord,
  inversionIndex,
  octave,
  spreadAmount,
  savedPresets,
  isMobile = false,
  setMobileKeys,
  onInversionChange,
  onOctaveChange,
  onSpreadChange,
  onSavePreset,
}: TutorialModalProps) {
  // Select steps and content based on device type
  const steps: TutorialStep[] = isMobile ? MOBILE_TUTORIAL_STEPS : TUTORIAL_STEPS;
  const stepContents: StepContent[] = isMobile ? MOBILE_STEP_CONTENT : STEP_CONTENT;
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set([0])); // Step 0 is always "complete"
  const [initialOctave] = useState<number>(octave);
  const [initialInversion] = useState<number>(inversionIndex);
  const [initialSpread] = useState<number>(spreadAmount);
  const [initialPresetCount] = useState<number>(savedPresets?.size || 0);

  // Build current state for condition checking using extracted logic
  const tutorialState: TutorialState = buildTutorialState({
    currentChord,
    inversionIndex,
    octave,
    spreadAmount,
    presetCount: savedPresets?.size || 0,
    initialInversion,
    initialOctave,
    initialSpread,
    initialPresetCount,
  });

  // Track if current step condition is met and progress
  const [stepCompleted, setStepCompleted] = useState<boolean>(false);
  const [progressActive, setProgressActive] = useState<boolean>(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConditionMetRef = useRef<boolean>(false);

  // Check if current step's condition is met using extracted logic
  const step = steps[currentStep];
  const stepContent = stepContents[currentStep];
  const hasCondition = step?.hasCondition;
  const conditionMet = isStepConditionMet(currentStep, tutorialState, steps);

  // Handle condition being met - start progress and schedule advance (desktop only)
  // Trigger when condition goes from false -> true
  useEffect(() => {
    const wasConditionMet = prevConditionMetRef.current;
    prevConditionMetRef.current = conditionMet;

    // Only trigger on rising edge: condition was false, now true
    if (!isOpen || !conditionMet || wasConditionMet || stepCompleted) {
      return;
    }

    // Mark as completed
    setStepCompleted(true);
    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    // On mobile, don't auto-advance - let user tap Next
    if (isMobile) {
      return;
    }

    // Desktop: small delay before starting progress animation
    progressTimerRef.current = setTimeout(() => {
      setProgressActive(true);
    }, 50);

    // Desktop: auto-advance after 2 seconds
    advanceTimerRef.current = setTimeout(() => {
      const nextStep = getNextStep(currentStep, steps);
      if (nextStep !== null) {
        setCurrentStep(nextStep);
      }
    }, 2100);

    // Cleanup timers when effect re-runs or component unmounts
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isOpen, conditionMet, stepCompleted, currentStep, steps, isMobile]);

  // Reset step completion state when step changes
  useEffect(() => {
    setStepCompleted(false);
    setProgressActive(false);
    prevConditionMetRef.current = false;
  }, [currentStep]);

  const handleNext = useCallback((): void => {
    if (currentStep === steps.length - 1) {
      onClose();
      setCurrentStep(0);
      setCompletedSteps(new Set([0]));
    } else {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, onClose, steps.length]);

  const handlePrev = useCallback((): void => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleClose = useCallback((): void => {
    onClose();
    setCurrentStep(0);
    setCompletedSteps(new Set([0]));
  }, [onClose]);

  const handleSkip = useCallback((): void => {
    onClose();
    setCurrentStep(0);
    setCompletedSteps(new Set([0]));
  }, [onClose]);

  // Mobile action button handlers - tap to toggle (sustain on tap)
  const handleRootTap = useCallback((key: string): void => {
    if (setMobileKeys) {
      const rootKeys = ["q", "w", "e", "r", "a", "s", "d", "f", "z", "x", "c", "v"];
      setMobileKeys((prev) => {
        const next = new Set(prev);
        if (prev.has(key)) {
          next.delete(key);
        } else {
          // Remove any existing root keys (radio behavior for roots)
          rootKeys.forEach((k) => next.delete(k));
          next.add(key);
        }
        return next;
      });
    }
  }, [setMobileKeys]);

  const handleModifierTap = useCallback((key: string): void => {
    if (setMobileKeys) {
      setMobileKeys((prev) => {
        const next = new Set(prev);
        if (prev.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    }
  }, [setMobileKeys]);

  // Render action buttons for mobile based on current step
  const renderMobileActions = (): React.ReactElement | null => {
    if (!isMobile) return null;

    const stepId = step?.id;

    switch (stepId) {
      case "root":
        // Show a few root note buttons - tap to toggle
        return (
          <div className="tutorial-actions">
            <div className="tutorial-action-label">Tap to select:</div>
            <div className="tutorial-action-buttons">
              {([["q", "C"], ["e", "D"], ["s", "F"], ["f", "G"], ["x", "A"]] as [string, string][]).map(([key, note]) => (
                <button
                  key={key}
                  className="tutorial-action-btn tutorial-action-root"
                  onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    handleRootTap(key);
                  }}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>
        );

      case "quality":
        // Show minor button - tap root, then tap modifier
        return (
          <div className="tutorial-actions">
            <div className="tutorial-action-label">Tap root, then add modifier:</div>
            <div className="tutorial-action-buttons">
              <button
                className="tutorial-action-btn tutorial-action-root"
                onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  handleRootTap("q");
                }}
              >
                C
              </button>
              <span className="tutorial-action-plus">+</span>
              <button
                className="tutorial-action-btn tutorial-action-modifier"
                onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  handleModifierTap("u");
                }}
              >
                min
              </button>
            </div>
          </div>
        );

      case "extension":
        // Show extension buttons - tap to toggle
        return (
          <div className="tutorial-actions">
            <div className="tutorial-action-label">Tap root, then add extensions:</div>
            <div className="tutorial-action-buttons">
              <button
                className="tutorial-action-btn tutorial-action-root"
                onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  handleRootTap("q");
                }}
              >
                C
              </button>
              <span className="tutorial-action-plus">+</span>
              {([["k", "7"], ["i", "Maj7"], ["l", "9"]] as [string, string][]).map(([key, label]) => (
                <button
                  key={key}
                  className="tutorial-action-btn tutorial-action-modifier"
                  onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    handleModifierTap(key);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        );

      case "voicing":
        // Show voicing control buttons
        return (
          <div className="tutorial-actions">
            <div className="tutorial-action-label">Try these controls:</div>
            <div className="tutorial-action-buttons">
              <button
                className="tutorial-action-btn tutorial-action-control"
                onClick={onInversionChange}
              >
                INV
              </button>
              <button
                className="tutorial-action-btn tutorial-action-control"
                onClick={() => onOctaveChange?.(-1)}
              >
                OCT-
              </button>
              <button
                className="tutorial-action-btn tutorial-action-control"
                onClick={() => onOctaveChange?.(1)}
              >
                OCT+
              </button>
              <button
                className="tutorial-action-btn tutorial-action-control"
                onClick={onSpreadChange}
              >
                SPREAD
              </button>
            </div>
          </div>
        );

      case "preset":
        // Show save preset button
        return (
          <div className="tutorial-actions">
            <div className="tutorial-action-label">Save your chord:</div>
            <div className="tutorial-action-buttons">
              <button
                className="tutorial-action-btn tutorial-action-control tutorial-action-save"
                onClick={() => onSavePreset?.("1")}
              >
                Save to Slot 1
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">
        <button className="tutorial-close" onClick={handleClose} aria-label="Close">
          x
        </button>

        <div className="tutorial-step-indicator">
          Step {currentStep + 1} of {steps.length}
        </div>

        <div className="tutorial-content">
          <h2 className="tutorial-title">{step.title}</h2>
          <p className="tutorial-text">{stepContent.content}</p>

          <div className={`tutorial-hint ${stepCompleted ? "completed" : ""}`}>
            <span className="tutorial-hint-text">
              {stepCompleted ? "Great job!" : stepContent.hint}
            </span>
            {stepCompleted && (
              <div className={`tutorial-progress ${progressActive ? "active" : ""}`} />
            )}
          </div>

          {renderMobileActions()}
        </div>

        <div className="tutorial-footer">
          <div className="tutorial-dots">
            {steps.map((_, index) => (
              <span
                key={index}
                className={`tutorial-dot ${index === currentStep ? "active" : ""} ${
                  completedSteps.has(index) ? "completed" : ""
                }`}
              />
            ))}
          </div>

          <div className="tutorial-buttons">
            {isFirstStep ? (
              <button className="tutorial-btn tutorial-btn-ghost" onClick={handleSkip}>
                Skip Tutorial
              </button>
            ) : (
              <button className="tutorial-btn tutorial-btn-secondary" onClick={handlePrev}>
                Back
              </button>
            )}
            <button
              className="tutorial-btn tutorial-btn-primary"
              onClick={handleNext}
            >
              {isLastStep ? "Get Started" : hasCondition && !stepCompleted ? "Skip" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
