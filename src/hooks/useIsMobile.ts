import { useState, useEffect } from "react";

/**
 * Check if current environment is mobile.
 * Uses both user agent detection and viewport width.
 */
function checkIsMobile(): boolean {
  const userAgent =
    typeof window.navigator === "undefined" ? "" : navigator.userAgent;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    ) || window.innerWidth < 768
  );
}

/**
 * useIsMobile Hook
 * Detects whether the current device is mobile based on user agent and viewport width.
 * Automatically updates on window resize.
 *
 * @returns True if device is mobile (UA match or width < 768px)
 *
 * @example
 * const isMobile = useIsMobile();
 * // Render mobile-specific UI when isMobile is true
 */
export function useIsMobile(): boolean {
  // Lazy initialization - run checkIsMobile only once on mount (not in useEffect!)
  const [isMobile, setIsMobile] = useState<boolean>(checkIsMobile);

  // Listen for resize events to update isMobile state
  useEffect(() => {
    const handleResize = (): void => {
      setIsMobile(checkIsMobile());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}
