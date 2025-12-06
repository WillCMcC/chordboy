/**
 * useWakeLock - Manages the Screen Wake Lock API to keep the display on
 *
 * Useful for music performance apps where the phone needs to stay on
 * while sitting on a music stand.
 *
 * @module hooks/useWakeLock
 */

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook to manage screen wake lock.
 * Automatically re-acquires wake lock when page becomes visible again.
 *
 * @param {boolean} enabled - Whether wake lock should be active
 * @returns {Object} Wake lock state and controls
 */
export function useWakeLock(enabled = false) {
  const [isSupported] = useState(() => "wakeLock" in navigator);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef(null);

  /**
   * Request wake lock from the browser.
   */
  const requestWakeLock = useCallback(async () => {
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
      console.warn("Wake lock request failed:", err.message);
      setIsActive(false);
    }
  }, [isSupported, enabled]);

  /**
   * Release the current wake lock.
   */
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
      } catch (err) {
        console.warn("Wake lock release failed:", err.message);
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

    const handleVisibilityChange = () => {
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
