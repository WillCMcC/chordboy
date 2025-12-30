import type { Dispatch, SetStateAction } from "react";
import type {
  Preset,
  StrumDirection,
  MIDIInputInfoDisplay,
  VoicingStyle,
  PlaybackMode,
} from "../types";
import type { TriggerMode } from "../hooks/useMIDI";
import { TransportControls } from "./TransportControls";
import { PresetsSection } from "./mobile/PresetsSection";
import { VoicingControls } from "./mobile/VoicingControls";
import { RootNotesSection } from "./mobile/RootNotesSection";
import { ModifiersSection } from "./mobile/ModifiersSection";
import { KeyboardToggle } from "./mobile/KeyboardToggle";
import "./MobileControls.css";

/** Current voicing settings */
interface VoicingSettings {
  inversionIndex: number;
  spreadAmount: number;
  octave: number;
  voicingStyle: VoicingStyle;
}

/** Props for MobileControls component */
interface MobileControlsProps {
  /** Currently selected keys */
  mobileKeys: Set<string>;
  /** Setter for mobile keys */
  setMobileKeys: Dispatch<SetStateAction<Set<string>>>;
  /** Callback to cycle inversions */
  onInversionChange: () => void;
  /** Callback to cycle spread amount */
  onSpreadChange: () => void;
  /** Callback to shift octave (+1 or -1) */
  onOctaveChange: (delta: number) => void;
  /** Callback to cycle voicing style */
  onVoicingStyleChange: () => void;
  /** Current voicing settings */
  currentSettings: VoicingSettings;
  /** Map of saved presets by slot number */
  savedPresets: Map<string, Preset>;
  /** Callback to save current chord to slot, returns success */
  onSavePreset: (slot: string) => boolean;
  /** Callback to recall preset from slot */
  onRecallPreset: (slot: string) => void;
  /** Callback to clear a preset slot */
  onClearPreset: (slot: string) => void;
  /** Callback when preset recall ends */
  onStopRecall: () => void;
  /** Currently active preset slot */
  activePresetSlot: string | null;
  /** Whether piano keyboard is visible */
  showKeyboard: boolean;
  /** Callback to toggle keyboard visibility */
  onToggleKeyboard: () => void;
  /** Callback to solve voice leading for selected presets */
  onSolvePresets: (slots: string[], spreadPreference?: number) => boolean;
  // Transport props
  bpm: number;
  isPlaying: boolean;
  currentBeat: number;
  syncEnabled: boolean;
  onBpmChange: (bpm: number) => void;
  onTogglePlay: () => void;
  onSyncEnabledChange: (enabled: boolean) => void;
  midiInputs: MIDIInputInfoDisplay[];
  selectedInputId: string | null;
  onSelectInput: (inputId: string | null) => void;
  bleConnected: boolean;
  bleDevice: { name?: string } | null;
  bleSyncEnabled: boolean;
  humanize: number;
  onHumanizeChange: (amount: number) => void;
  strumEnabled: boolean;
  strumSpread: number;
  strumDirection: StrumDirection;
  onStrumEnabledChange: (enabled: boolean) => void;
  onStrumSpreadChange: (spread: number) => void;
  onStrumDirectionChange: (direction: StrumDirection) => void;
  triggerMode: TriggerMode;
  onTriggerModeChange: (mode: TriggerMode) => void;
  glideTime: number;
  onGlideTimeChange: (time: number) => void;
  sequencerEnabled: boolean;
  onOpenSequencer: () => void;
  isPatchBuilderOpen?: boolean;
  playbackMode: PlaybackMode;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
  onOpenGridSequencer: () => void;
  onOpenHistory?: () => void;
}

/**
 * MobileControls Component
 * Touch-friendly interface for mobile chord input.
 * Provides buttons for root notes, modifiers, voicing controls, and preset management.
 */
export function MobileControls({
  mobileKeys,
  setMobileKeys,
  onInversionChange,
  onSpreadChange,
  onOctaveChange,
  onVoicingStyleChange,
  currentSettings,
  savedPresets,
  onSavePreset,
  onRecallPreset,
  onClearPreset,
  onStopRecall,
  activePresetSlot,
  showKeyboard,
  onToggleKeyboard,
  onSolvePresets,
  // Transport props
  bpm,
  isPlaying,
  currentBeat,
  syncEnabled,
  onBpmChange,
  onTogglePlay,
  onSyncEnabledChange,
  midiInputs,
  selectedInputId,
  onSelectInput,
  bleConnected,
  bleDevice,
  bleSyncEnabled,
  humanize,
  onHumanizeChange,
  strumEnabled,
  strumSpread,
  strumDirection,
  onStrumEnabledChange,
  onStrumSpreadChange,
  onStrumDirectionChange,
  triggerMode,
  onTriggerModeChange,
  glideTime,
  onGlideTimeChange,
  sequencerEnabled,
  onOpenSequencer,
  isPatchBuilderOpen = false,
  playbackMode,
  onPlaybackModeChange,
  onOpenGridSequencer,
  onOpenHistory,
}: MobileControlsProps) {

  return (
    <div className={`mobile-controls ${isPatchBuilderOpen ? "presets-only" : ""}`}>
      {/* Transport controls - scrolls with content */}
      {!isPatchBuilderOpen && (
        <div className="mobile-controls-section transport-section" data-testid="mobile-transport">
          <TransportControls
            bpm={bpm}
            isPlaying={isPlaying}
            currentBeat={currentBeat}
            syncEnabled={syncEnabled}
            onBpmChange={onBpmChange}
            onTogglePlay={onTogglePlay}
            onSyncEnabledChange={onSyncEnabledChange}
            midiInputs={midiInputs}
            selectedInputId={selectedInputId}
            onSelectInput={onSelectInput}
            bleConnected={bleConnected}
            bleDevice={bleDevice}
            bleSyncEnabled={bleSyncEnabled}
            humanize={humanize}
            onHumanizeChange={onHumanizeChange}
            strumEnabled={strumEnabled}
            strumSpread={strumSpread}
            strumDirection={strumDirection}
            onStrumEnabledChange={onStrumEnabledChange}
            onStrumSpreadChange={onStrumSpreadChange}
            onStrumDirectionChange={onStrumDirectionChange}
            triggerMode={triggerMode}
            onTriggerModeChange={onTriggerModeChange}
            glideTime={glideTime}
            onGlideTimeChange={onGlideTimeChange}
            sequencerEnabled={sequencerEnabled}
            onOpenSequencer={onOpenSequencer}
            playbackMode={playbackMode}
            onPlaybackModeChange={onPlaybackModeChange}
            onOpenGridSequencer={onOpenGridSequencer}
          />
        </div>
      )}

      <PresetsSection
        savedPresets={savedPresets}
        onSavePreset={onSavePreset}
        onRecallPreset={onRecallPreset}
        onClearPreset={onClearPreset}
        onStopRecall={onStopRecall}
        activePresetSlot={activePresetSlot}
        onSolvePresets={onSolvePresets}
        setMobileKeys={setMobileKeys}
        onOpenHistory={onOpenHistory}
      />

      {!isPatchBuilderOpen && (
        <>
          <VoicingControls
            currentSettings={currentSettings}
            onInversionChange={onInversionChange}
            onSpreadChange={onSpreadChange}
            onOctaveChange={onOctaveChange}
            onVoicingStyleChange={onVoicingStyleChange}
          />

          <RootNotesSection
            mobileKeys={mobileKeys}
            setMobileKeys={setMobileKeys}
          />

          <ModifiersSection
            mobileKeys={mobileKeys}
            setMobileKeys={setMobileKeys}
          />

          <KeyboardToggle
            showKeyboard={showKeyboard}
            onToggleKeyboard={onToggleKeyboard}
          />
        </>
      )}
    </div>
  );
}
