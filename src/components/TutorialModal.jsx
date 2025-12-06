/**
 * TutorialModal Component
 * Interactive first-time user tutorial.
 * Advances when users perform the described actions.
 *
 * @module components/TutorialModal
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TUTORIAL_STEPS,
  MOBILE_TUTORIAL_STEPS,
  buildTutorialState,
  isStepConditionMet,
  getNextStep,
} from "../lib/tutorialLogic";
import "./TutorialModal.css";

/**
 * Step content and hints (UI-specific, separate from logic).
 */
const STEP_CONTENT = [
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
    content: "Shape your voicing while holding a chord:\n\nShift = Cycle inversions\n← → = Change octave\n↑ ↓ = Spread voicing",
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
const MOBILE_STEP_CONTENT = [
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
    content: "Shape your voicing with the controls:\n\nINV = Cycle inversions\nOCT ← → = Change octave\nSPREAD = Spread voicing",
    hint: "Tap INV or use octave/spread controls",
  },
  {
    content: "Save chords to recall later:\n\nTap an empty preset slot to save\nTap a filled slot to recall",
    hint: "Save your chord to a preset slot",
  },
  {
    content: "Hold a chord while you switch:\n\nSwipe right on any key to lock it\nSwipe again or tap to release\n\nGreat for playing over changes!",
    hint: "Tap Next to continue",
  },
  {
    content: "You've learned the basics.\n\nConnect a MIDI device in Settings (gear icon) to send chords to your DAW or synth.",
    hint: "Tap Get Started to begin playing",
  },
];

/**
 * Interactive tutorial modal.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.currentChord - Current chord being played
 * @param {number} props.inversionIndex - Current inversion
 * @param {number} props.octave - Current octave
 * @param {number} props.spreadAmount - Current spread
 * @param {Map} props.savedPresets - Saved preset slots
 * @param {boolean} props.isMobile - Whether the device is mobile
 * @param {Function} props.setMobileKeys - Setter for mobile keys (mobile only)
 * @param {Function} props.onInversionChange - Callback to cycle inversions
 * @param {Function} props.onOctaveChange - Callback to change octave
 * @param {Function} props.onSpreadChange - Callback to cycle spread
 * @param {Function} props.onSavePreset - Callback to save preset
 * @returns {JSX.Element|null} The tutorial modal or null if closed
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
}) {
  // Select steps and content based on device type
  const steps = isMobile ? MOBILE_TUTORIAL_STEPS : TUTORIAL_STEPS;
  const stepContents = isMobile ? MOBILE_STEP_CONTENT : STEP_CONTENT;
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set([0])); // Step 0 is always "complete"
  const [initialOctave] = useState(octave);
  const [initialInversion] = useState(inversionIndex);
  const [initialSpread] = useState(spreadAmount);
  const [initialPresetCount] = useState(savedPresets?.size || 0);

  // Build current state for condition checking using extracted logic
  const tutorialState = buildTutorialState({
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
  const [stepCompleted, setStepCompleted] = useState(false);
  const [progressActive, setProgressActive] = useState(false);
  const advanceTimerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const prevConditionMetRef = useRef(false);

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
  }, [isOpen, conditionMet, stepCompleted, currentStep, steps, isMobile]);

  // Cleanup timers on unmount or when step changes
  useEffect(() => {
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
  }, [currentStep]);

  // Reset step completion state when step changes
  useEffect(() => {
    setStepCompleted(false);
    setProgressActive(false);
    prevConditionMetRef.current = false;
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep === steps.length - 1) {
      onClose();
      setCurrentStep(0);
      setCompletedSteps(new Set([0]));
    } else {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, onClose, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleClose = useCallback(() => {
    onClose();
    setCurrentStep(0);
    setCompletedSteps(new Set([0]));
  }, [onClose]);

  const handleSkip = useCallback(() => {
    onClose();
    setCurrentStep(0);
    setCompletedSteps(new Set([0]));
  }, [onClose]);

  // Mobile action button handlers - hold to sustain, release to stop
  // For tutorial, we use a simplified model: press adds, release removes
  const handleKeyDown = useCallback((key, isRoot = false) => {
    if (setMobileKeys) {
      setMobileKeys((prev) => {
        const next = new Set(prev);
        if (isRoot) {
          // Remove any existing root keys (radio behavior for roots)
          const rootKeys = ["q", "w", "e", "r", "a", "s", "d", "f", "z", "x", "c", "v"];
          rootKeys.forEach((k) => next.delete(k));
        }
        next.add(key);
        return next;
      });
    }
  }, [setMobileKeys]);

  const handleKeyUp = useCallback((key) => {
    if (setMobileKeys) {
      setMobileKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [setMobileKeys]);

  // Render action buttons for mobile based on current step
  const renderMobileActions = () => {
    if (!isMobile) return null;

    const stepId = step?.id;

    switch (stepId) {
      case "root":
        // Show a few root note buttons - hold to sustain
        return (
          <div className="tutorial-actions">
            <div className="tutorial-action-label">Hold to play:</div>
            <div className="tutorial-action-buttons">
              {[["q", "C"], ["e", "D"], ["s", "F"], ["f", "G"], ["x", "A"]].map(([key, note]) => (
                <button
                  key={key}
                  className="tutorial-action-btn tutorial-action-root"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleKeyDown(key, true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleKeyUp(key);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleKeyDown(key, true);
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    handleKeyUp(key);
                  }}
                  onMouseLeave={(e) => {
                    e.preventDefault();
                    handleKeyUp(key);
                  }}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>
        );

      case "quality":
        // Show minor button - hold root, add modifier
        return (
          <div className="tutorial-actions">
            <div className="tutorial-action-label">Hold root + modifier together:</div>
            <div className="tutorial-action-buttons">
              <button
                className="tutorial-action-btn tutorial-action-root"
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleKeyDown("q", true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleKeyUp("q");
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleKeyDown("q", true);
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  handleKeyUp("q");
                }}
                onMouseLeave={(e) => {
                  e.preventDefault();
                  handleKeyUp("q");
                }}
              >
                C
              </button>
              <span className="tutorial-action-plus">+</span>
              <button
                className="tutorial-action-btn tutorial-action-modifier"
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleKeyDown("u", false);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleKeyUp("u");
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleKeyDown("u", false);
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  handleKeyUp("u");
                }}
                onMouseLeave={(e) => {
                  e.preventDefault();
                  handleKeyUp("u");
                }}
              >
                min
              </button>
            </div>
          </div>
        );

      case "extension":
        // Show extension buttons - hold to play
        return (
          <div className="tutorial-actions">
            <div className="tutorial-action-label">Hold root + extensions:</div>
            <div className="tutorial-action-buttons">
              <button
                className="tutorial-action-btn tutorial-action-root"
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleKeyDown("q", true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleKeyUp("q");
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleKeyDown("q", true);
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  handleKeyUp("q");
                }}
                onMouseLeave={(e) => {
                  e.preventDefault();
                  handleKeyUp("q");
                }}
              >
                C
              </button>
              <span className="tutorial-action-plus">+</span>
              {[["k", "7"], ["i", "Maj7"], ["l", "9"]].map(([key, label]) => (
                <button
                  key={key}
                  className="tutorial-action-btn tutorial-action-modifier"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleKeyDown(key, false);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleKeyUp(key);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleKeyDown(key, false);
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    handleKeyUp(key);
                  }}
                  onMouseLeave={(e) => {
                    e.preventDefault();
                    handleKeyUp(key);
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
                onClick={() => onOctaveChange(-1)}
              >
                OCT-
              </button>
              <button
                className="tutorial-action-btn tutorial-action-control"
                onClick={() => onOctaveChange(1)}
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
                onClick={() => onSavePreset?.(1)}
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
          ×
        </button>

        <div className="tutorial-step-indicator">
          Step {currentStep + 1} of {steps.length}
        </div>

        <div className="tutorial-content">
          <h2 className="tutorial-title">{step.title}</h2>
          <p className="tutorial-text">{stepContent.content}</p>

          <div className={`tutorial-hint ${stepCompleted ? "completed" : ""}`}>
            <span className="tutorial-hint-text">
              {stepCompleted ? "✓ Great job!" : stepContent.hint}
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
