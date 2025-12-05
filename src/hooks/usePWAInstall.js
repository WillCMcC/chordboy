import { useState, useEffect } from "react";

/**
 * usePWAInstall Hook
 * Manages the Progressive Web App install prompt.
 * Captures the beforeinstallprompt event and provides a way to trigger installation.
 *
 * @returns {Object} PWA install state and methods
 * @returns {boolean} returns.isInstallable - True if app can be installed
 * @returns {Function} returns.install - Function to trigger the install prompt
 *
 * @example
 * const { isInstallable, install } = usePWAInstall();
 * if (isInstallable) {
 *   return <button onClick={install}>Install App</button>;
 * }
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    /**
     * Handle the beforeinstallprompt event.
     * Stashes the event for later use and marks app as installable.
     */
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  /**
   * Trigger the PWA install prompt.
   * Can only be called once per beforeinstallprompt event.
   */
  const install = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return { isInstallable, install };
}
