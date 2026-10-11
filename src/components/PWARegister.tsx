"use client";
import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleWindow = window as IdleWindow;

    const registerWorker = () => {
      navigator.serviceWorker
        .getRegistration("/")
        .then((existing) => existing ?? navigator.serviceWorker.register("/sw.js"))
        .catch((err) => console.error("Erreur SW:", err));
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => registerWorker(), { timeout: 2000 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timer = setTimeout(registerWorker, 1200);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
