"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // SW principal
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW principal enregistré:", reg.scope))
        .catch((err) => console.error("Erreur SW principal:", err));

      // SW Monetag
      navigator.serviceWorker
        .register("/sw-monetag.js")
        .then((reg) => console.log("SW Monetag enregistré:", reg.scope))
        .catch((err) => console.error("Erreur SW Monetag:", err));
    }
  }, []);

  return null;
}
