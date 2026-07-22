"use client";
import { useEffect } from "react";

interface PWARegisterProps {
  propeller?: boolean;
  monetag?: boolean;
}

export default function PWARegister({ propeller = true, monetag = false }: PWARegisterProps) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleWindow = window as IdleWindow;

    const registerWorkers = () => {
      if (propeller) {
        navigator.serviceWorker
          .getRegistration("/")
          .then((existing) => existing ?? navigator.serviceWorker.register("/sw.js"))
          .catch((err) => console.error("Erreur SW Propeller:", err));
      }
      if (monetag) {
        navigator.serviceWorker
          .getRegistration("/sw-monetag.js")
          .then((existing) => existing ?? navigator.serviceWorker.register("/sw-monetag.js"))
          .catch((err) => console.error("Erreur SW Monetag:", err));
      }
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => registerWorkers(), { timeout: 2000 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timer = setTimeout(registerWorkers, 1200);
    return () => clearTimeout(timer);
  }, [propeller, monetag]);

  return null;
}
