import { useState, useEffect } from "react";

/**
 * BeforeInstallPromptEvent interface
 * Extended Event type for PWA install prompt
 */
interface BeforeInstallPromptEvent extends Event {
  /** Show the install prompt */
  prompt(): Promise<void>;
  /** The user's choice after the prompt */
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/** Return type for usePWAInstall hook */
export interface UsePWAInstallReturn {
  /** True if app can be installed */
  isInstallable: boolean;
  /** Function to trigger the install prompt */
  install: () => Promise<void>;
}

/**
 * usePWAInstall Hook
 * Manages the Progressive Web App install prompt.
 * Captures the beforeinstallprompt event and provides a way to trigger installation.
 *
 * @example
 * const { isInstallable, install } = usePWAInstall();
 * if (isInstallable) {
 *   return <button onClick={install}>Install App</button>;
 * }
 */
export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  useEffect(() => {
    /**
     * Handle the beforeinstallprompt event.
     * Stashes the event for later use and marks app as installable.
     */
    const handler = (e: Event): void => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  /**
   * Trigger the PWA install prompt.
   * Can only be called once per beforeinstallprompt event.
   */
  const install = async (): Promise<void> => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return { isInstallable, install };
}
