// src/components/ads/ExoOutstream.tsx
"use client";

import { useEffect } from "react";

export default function ExoOutstream() {
  useEffect(() => {
    // ⚡ Évite de charger le script 2 fois
    if (!document.querySelector('script[src="https://a.magsrv.com/ad-provider.js"]')) {
      const script = document.createElement("script");
      script.src = "https://a.magsrv.com/ad-provider.js";
      script.async = true;
      script.type = "application/javascript";
      document.body.appendChild(script);
    }

    // ⚡ Lance la pub
    (window as any).AdProvider = (window as any).AdProvider || [];
    (window as any).AdProvider.push({ serve: {} });
  }, []);

  return (
    <div className="w-full my-6">
      <ins
        className="eas6a97888e37"
        data-zoneid="5848116"
        style={{ display: "block" }}
      />
    </div>
  );
}
