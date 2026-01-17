"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("SW enregistré avec scope:", reg.scope))
        .catch((err) => console.error("Erreur SW:", err));
    }
  }, []);

  return null;
}
