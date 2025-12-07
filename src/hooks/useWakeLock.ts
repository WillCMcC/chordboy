/**
 * useWakeLock - Manages the Screen Wake Lock API to keep the display on
 *
 * Useful for music performance apps where the phone needs to stay on
 * while sitting on a music stand.
 *
 * @module hooks/useWakeLock
 */

import { useState, useEffect, useCallback, useRef } from "react";

/** Return type for useWakeLock hook */
export interface UseWakeLockReturn {
  /** True if Wake Lock API is supported */
  isSupported: boolean;
  /** True if wake lock is currently active */
  isActive: boolean;
  /** Request wake lock */
  request: () => Promise<void>;
  /** Release wake lock */
  release: () => Promise<void>;
}

/**
 * Hook to manage screen wake lock.
 * Automatically re-acquires wake lock when page becomes visible again.
 *
 * @param enabled - Whether wake lock should be active
 * @returns Wake lock state and controls
 */
export function useWakeLock(enabled: boolean = false): UseWakeLockReturn {
  const [isSupported] = useState<boolean>(() => "wakeLock" in navigator);
  const [isActive, setIsActive] = useState<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  /**
   * Request wake lock from the browser.
   */
  const requestWakeLock = useCallback(async (): Promise<void> => {
    if (!isSupported || !enabled) return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setIsActive(true);

      // Listen for release (e.g., when tab loses visibility)
      wakeLockRef.current.addEventListener("release", () => {
        setIsActive(false);
      });
    } catch (err) {
      // Wake lock request can fail if:
      // - Page is not visible
      // - Low battery mode on some devices
      // - User denied permission
      console.warn("Wake lock request failed:", (err as Error).message);
      setIsActive(false);
    }
  }, [isSupported, enabled]);

  /**
   * Release the current wake lock.
   */
  const releaseWakeLock = useCallback(async (): Promise<void> => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
      } catch (err) {
        console.warn("Wake lock release failed:", (err as Error).message);
      }
    }
  }, []);

  // Request/release wake lock when enabled changes
  useEffect(() => {
    if (enabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    if (!isSupported || !enabled) return;

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible" && enabled) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSupported, enabled, requestWakeLock]);

  return {
    isSupported,
    isActive,
    request: requestWakeLock,
    release: releaseWakeLock,
  };
}
