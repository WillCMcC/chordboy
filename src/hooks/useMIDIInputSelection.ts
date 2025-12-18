/**
 * MIDI Input Selection Hook
 * Manages MIDI input device selection including BLE MIDI integration.
 *
 * @module hooks/useMIDIInputSelection
 */

import { useCallback } from "react";

/**
 * Props for useMIDIInputSelection hook
 */
export interface MIDIInputSelectionProps {
  selectedInput: MIDIInput | null;
  setSelectedInput: (input: MIDIInput | null) => void;
  bleEnableSync: () => void;
  bleDisableSync: () => void;
  inputs: { id: string; input: MIDIInput }[];
}

/**
 * Return type for useMIDIInputSelection hook
 */
export interface MIDIInputSelectionResult {
  selectInput: (inputId: string | null) => void;
}

/**
 * Hook to manage MIDI input selection including BLE MIDI sync.
 * Handles switching between regular MIDI inputs and BLE device.
 *
 * @param props - Input selection dependencies
 * @returns Input selection function
 *
 * @example
 * const { selectInput } = useMIDIInputSelection({
 *   selectedInput,
 *   setSelectedInput,
 *   bleEnableSync,
 *   bleDisableSync,
 *   inputs
 * });
 */
export function useMIDIInputSelection(
  props: MIDIInputSelectionProps
): MIDIInputSelectionResult {
  const {
    selectedInput,
    setSelectedInput,
    bleEnableSync,
    bleDisableSync,
    inputs,
  } = props;

  /**
   * Select a MIDI input device (for clock sync).
   * Supports both regular MIDI inputs and BLE device.
   */
  const selectInput = useCallback(
    (inputId: string | null): void => {
      // Handle clearing selection
      if (!inputId) {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(null);
        bleDisableSync();
        return;
      }

      // Handle BLE selection
      if (inputId === "ble") {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(null);
        bleEnableSync();
        return;
      }

      // Handle regular MIDI input selection
      const input = inputs.find((i) => i.id === inputId);
      if (input) {
        if (selectedInput) {
          selectedInput.onmidimessage = null;
        }
        setSelectedInput(input.input);
        bleDisableSync();
      }
    },
    [inputs, selectedInput, setSelectedInput, bleEnableSync, bleDisableSync]
  );

  return { selectInput };
}
