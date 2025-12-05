import { useState, useEffect } from "react";

/**
 * useIsMobile Hook
 * Detects whether the current device is mobile based on user agent and viewport width.
 * Automatically updates on window resize.
 *
 * @returns {boolean} True if device is mobile (UA match or width < 768px)
 *
 * @example
 * const isMobile = useIsMobile();
 * // Render mobile-specific UI when isMobile is true
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    /**
     * Check if current environment is mobile.
     * Uses both user agent detection and viewport width.
     */
    const checkMobile = () => {
      const userAgent =
        typeof window.navigator === "undefined" ? "" : navigator.userAgent;
      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        ) || window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}
