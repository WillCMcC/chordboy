interface KeyboardToggleProps {
  showKeyboard: boolean;
  onToggleKeyboard: () => void;
}

export function KeyboardToggle({
  showKeyboard,
  onToggleKeyboard,
}: KeyboardToggleProps) {
  return (
    <div className="mobile-controls-section">
      <button
        className={`control-btn keyboard-toggle ${showKeyboard ? "active" : ""}`}
        onClick={onToggleKeyboard}
      >
        {showKeyboard ? "Hide Piano" : "Show Piano"}
      </button>
    </div>
  );
}
