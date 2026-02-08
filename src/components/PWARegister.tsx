"use client";
import { useEffect } from "react";

interface PWARegisterProps {
  propeller?: boolean;
  monetag?: boolean;
}

export default function PWARegister({ propeller = true, monetag = false }: PWARegisterProps) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (propeller) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("SW Propeller enregistré:", reg.scope))
          .catch((err) => console.error("Erreur SW Propeller:", err));
      }
      if (monetag) {
        navigator.serviceWorker
          .register("/sw-monetag.js")
          .then((reg) => console.log("SW Monetag enregistré:", reg.scope))
          .catch((err) => console.error("Erreur SW Monetag:", err));
      }
    }
  }, [propeller, monetag]);

  return null;
}
