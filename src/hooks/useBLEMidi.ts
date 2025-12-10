/**
 * BLE MIDI Hook
 * Handles Bluetooth Low Energy MIDI device connection, disconnection, and sync.
 *
 * @module hooks/useBLEMidi
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  isBLESupported,
  scanForBLEMidiDevice,
  connectToBLEMidiDevice,
  disconnectBLEMidiDevice,
  addBLEMidiListener,
} from "../lib/bleMidi";
import {
  MIDI_CLOCK,
  MIDI_START,
  MIDI_STOP,
  MIDI_CONTINUE,
} from "../lib/midi";

/** BLE state */
export interface BLEMidiState {
  bleSupported: boolean;
  bleDevice: BluetoothDevice | null;
  bleConnected: boolean;
  bleConnecting: boolean;
  bleError: string | null;
  bleSyncEnabled: boolean;
  bleCharacteristic: BluetoothRemoteGATTCharacteristic | null;
}

/** BLE actions */
export interface BLEMidiActions {
  connectBLE: () => Promise<void>;
  disconnectBLE: () => void;
  enableBLESync: () => void;
  disableBLESync: () => void;
}

/** Clock callbacks (passed from useTransport) */
export interface ClockCallbacks {
  onClock: () => void;
  onStart: () => void;
  onStop: () => void;
}

/**
 * Hook for BLE MIDI device management.
 * Handles connection, disconnection, and MIDI clock sync over BLE.
 *
 * @param clockCallbacks - Ref to clock callbacks (set by useTransport)
 * @returns BLE state and actions
 */
export function useBLEMidi(
  clockCallbacks: React.MutableRefObject<{
    onClock: (() => void) | null;
    onStart: (() => void) | null;
    onStop: (() => void) | null;
  }>
): BLEMidiState & BLEMidiActions {
  // BLE MIDI state
  const [bleSupported] = useState<boolean>(() => isBLESupported());
  const [bleDevice, setBleDevice] = useState<BluetoothDevice | null>(null);
  const [bleConnected, setBleConnected] = useState<boolean>(false);
  const [bleConnecting, setBleConnecting] = useState<boolean>(false);
  const [bleError, setBleError] = useState<string | null>(null);
  const [bleSyncEnabled, setBleSyncEnabled] = useState<boolean>(false);
  const [bleCharacteristic, setBleCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);

  // BLE refs
  const bleServerRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const bleSyncCleanupRef = useRef<(() => void) | null>(null);
  const bleDisconnectHandlerRef = useRef<(() => void) | null>(null);

  /**
   * Scan for and connect to a BLE MIDI device.
   */
  const connectBLE = useCallback(async (): Promise<void> => {
    if (!bleSupported) {
      setBleError("Bluetooth is not supported in this browser");
      return;
    }

    setBleConnecting(true);
    setBleError(null);

    try {
      const device = await scanForBLEMidiDevice();
      setBleDevice(device);

      const { server, characteristic } = await connectToBLEMidiDevice(device);
      bleServerRef.current = server;
      setBleCharacteristic(characteristic);
      setBleConnected(true);

      // Listen for disconnection AFTER successful connection
      // Store handler in ref for cleanup
      const disconnectHandler = (): void => {
        setBleConnected(false);
        bleServerRef.current = null;
        setBleCharacteristic(null);
      };
      bleDisconnectHandlerRef.current = disconnectHandler;
      device.addEventListener("gattserverdisconnected", disconnectHandler);
    } catch (err) {
      const error = err as Error & { name?: string };
      if (error.name !== "NotFoundError") {
        // NotFoundError means user cancelled the picker
        setBleError(error.message || error.toString() || "Connection failed");
        console.error("BLE MIDI connection error:", err);
      }
      setBleDevice(null);
      setBleConnected(false);
    } finally {
      setBleConnecting(false);
    }
  }, [bleSupported]);

  /**
   * Disconnect from the current BLE MIDI device.
   */
  const disconnectBLE = useCallback((): void => {
    // Clean up disconnect listener before disconnecting
    if (bleDevice && bleDisconnectHandlerRef.current) {
      bleDevice.removeEventListener("gattserverdisconnected", bleDisconnectHandlerRef.current);
      bleDisconnectHandlerRef.current = null;
    }
    if (bleServerRef.current) {
      disconnectBLEMidiDevice(bleServerRef.current);
    }
    bleServerRef.current = null;
    setBleCharacteristic(null);
    setBleDevice(null);
    setBleConnected(false);
    setBleError(null);
  }, [bleDevice]);

  /**
   * Enable BLE sync (receive MIDI clock from BLE device).
   */
  const enableBLESync = useCallback((): void => {
    setBleSyncEnabled(true);
  }, []);

  /**
   * Disable BLE sync.
   */
  const disableBLESync = useCallback((): void => {
    setBleSyncEnabled(false);
  }, []);

  /**
   * Handle incoming MIDI messages from BLE device when BLE sync is enabled.
   */
  useEffect(() => {
    // Clean up any existing listener
    if (bleSyncCleanupRef.current) {
      bleSyncCleanupRef.current();
      bleSyncCleanupRef.current = null;
    }

    if (!bleSyncEnabled || !bleConnected || !bleCharacteristic) {
      return;
    }

    const handleBleMessage = (msg: number[]): void => {
      const [status] = msg;

      switch (status) {
        case MIDI_CLOCK:
          clockCallbacks.current.onClock?.();
          break;
        case MIDI_START:
          clockCallbacks.current.onStart?.();
          break;
        case MIDI_STOP:
          clockCallbacks.current.onStop?.();
          break;
        case MIDI_CONTINUE:
          clockCallbacks.current.onStart?.();
          break;
      }
    };

    bleSyncCleanupRef.current = addBLEMidiListener(
      bleCharacteristic,
      handleBleMessage
    );

    return () => {
      if (bleSyncCleanupRef.current) {
        bleSyncCleanupRef.current();
        bleSyncCleanupRef.current = null;
      }
    };
  }, [bleSyncEnabled, bleConnected, bleCharacteristic, clockCallbacks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up BLE disconnect listener
      if (bleDevice && bleDisconnectHandlerRef.current) {
        bleDevice.removeEventListener("gattserverdisconnected", bleDisconnectHandlerRef.current);
        bleDisconnectHandlerRef.current = null;
      }
    };
  }, [bleDevice]);

  return {
    // State
    bleSupported,
    bleDevice,
    bleConnected,
    bleConnecting,
    bleError,
    bleSyncEnabled,
    bleCharacteristic,

    // Actions
    connectBLE,
    disconnectBLE,
    enableBLESync,
    disableBLESync,
  };
}
