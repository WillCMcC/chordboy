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
    <div className="mobile-controls-section" data-testid="mobile-voicing-controls">
      <span className="mobile-controls-label">Voicing</span>
      <div className="control-buttons">
        <button
          className="control-btn voicing-style-btn"
          onClick={onVoicingStyleChange}
          data-testid="mobile-voicing-style"
        >
          Style: {VOICING_STYLE_LABELS[currentSettings.voicingStyle]}
        </button>
      </div>
      <div className="control-buttons">
        <button
          className="control-btn"
          onClick={onInversionChange}
          data-testid="mobile-voicing-inversion"
        >
          Inv: {currentSettings.inversionIndex}
        </button>
        <button
          className="control-btn"
          onClick={onSpreadChange}
          data-testid="mobile-voicing-spread"
        >
          Spread: {currentSettings.spreadAmount}
        </button>
      </div>
      <div className="control-buttons">
        <button
          className="control-btn"
          onClick={() => onOctaveChange(-1)}
          data-testid="mobile-voicing-octave-down"
        >
          - Oct
        </button>
        <button
          className="control-btn"
          disabled
          data-testid="mobile-voicing-octave-display"
        >
          Oct: {currentSettings.octave}
        </button>
        <button
          className="control-btn"
          onClick={() => onOctaveChange(1)}
          data-testid="mobile-voicing-octave-up"
        >
          + Oct
        </button>
      </div>
    </div>
  );
}
