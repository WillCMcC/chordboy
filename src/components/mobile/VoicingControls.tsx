import type { VoicingStyle } from "../../types";
import { VOICING_STYLE_LABELS } from "../../types";

interface VoicingSettings {
  inversionIndex: number;
  spreadAmount: number;
  octave: number;
  voicingStyle: VoicingStyle;
}

interface VoicingControlsProps {
  currentSettings: VoicingSettings;
  onInversionChange: () => void;
  onSpreadChange: () => void;
  onOctaveChange: (delta: number) => void;
  onVoicingStyleChange: () => void;
}

export function VoicingControls({
  currentSettings,
  onInversionChange,
  onSpreadChange,
  onOctaveChange,
  onVoicingStyleChange,
}: VoicingControlsProps) {
  return (
    <div className="mobile-controls-section">
      <span className="mobile-controls-label">Voicing</span>
      <div className="control-buttons">
        <button
          className="control-btn voicing-style-btn"
          onClick={onVoicingStyleChange}
        >
          Style: {VOICING_STYLE_LABELS[currentSettings.voicingStyle]}
        </button>
      </div>
      <div className="control-buttons">
        <button className="control-btn" onClick={onInversionChange}>
          Inv: {currentSettings.inversionIndex}
        </button>
        <button className="control-btn" onClick={onSpreadChange}>
          Spread: {currentSettings.spreadAmount}
        </button>
      </div>
      <div className="control-buttons">
        <button className="control-btn" onClick={() => onOctaveChange(-1)}>
          - Oct
        </button>
        <button className="control-btn" disabled>
          Oct: {currentSettings.octave}
        </button>
        <button className="control-btn" onClick={() => onOctaveChange(1)}>
          + Oct
        </button>
      </div>
    </div>
  );
}
