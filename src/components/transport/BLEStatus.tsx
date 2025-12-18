/** Props for BLEStatus component */
export interface BLEStatusProps {
  /** Whether BLE is connected */
  bleConnected: boolean;
  /** BLE device info */
  bleDevice: { name?: string } | null;
}

/**
 * BLEStatus - BLE connection status display
 */
export function BLEStatus({ bleConnected, bleDevice }: BLEStatusProps) {
  if (!bleConnected) {
    return null;
  }

  return (
    <div className="ble-status">
      <span className="ble-indicator connected" />
      <span className="ble-name">{bleDevice?.name || "BLE MIDI"}</span>
    </div>
  );
}
