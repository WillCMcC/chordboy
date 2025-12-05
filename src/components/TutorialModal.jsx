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
}) {
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
  const step = TUTORIAL_STEPS[currentStep];
  const stepContent = STEP_CONTENT[currentStep];
  const hasCondition = step?.hasCondition;
  const conditionMet = isStepConditionMet(currentStep, tutorialState);

  // Handle condition being met - start progress and schedule advance
  // Trigger when condition goes from false -> true
  useEffect(() => {
    const wasConditionMet = prevConditionMetRef.current;
    prevConditionMetRef.current = conditionMet;

    // Only trigger on rising edge: condition was false, now true
    if (!isOpen || !conditionMet || wasConditionMet || stepCompleted) {
      return;
    }

    console.log("Tutorial: condition met for step", currentStep);

    // Mark as completed
    setStepCompleted(true);
    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    // Small delay before starting progress animation
    progressTimerRef.current = setTimeout(() => {
      console.log("Tutorial: starting progress bar");
      setProgressActive(true);
    }, 50);

    // Auto-advance after 2 seconds
    advanceTimerRef.current = setTimeout(() => {
      console.log("Tutorial: auto-advancing to next step");
      const nextStep = getNextStep(currentStep);
      if (nextStep !== null) {
        setCurrentStep(nextStep);
      }
    }, 2100);
  }, [isOpen, conditionMet, stepCompleted, currentStep]);

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
    if (currentStep === TUTORIAL_STEPS.length - 1) {
      onClose();
      setCurrentStep(0);
      setCompletedSteps(new Set([0]));
    } else {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, onClose]);

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

  if (!isOpen) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">
        <button className="tutorial-close" onClick={handleClose} aria-label="Close">
          ×
        </button>

        <div className="tutorial-step-indicator">
          Step {currentStep + 1} of {TUTORIAL_STEPS.length}
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
        </div>

        <div className="tutorial-footer">
          <div className="tutorial-dots">
            {TUTORIAL_STEPS.map((_, index) => (
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
