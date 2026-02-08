"use client";
import { useEffect } from "react";

export default function VideoSliderAd() {
  useEffect(() => {
    // Évite de charger le script 2 fois
    if (!document.querySelector('script[src="https://a.magsrv.com/ad-provider.js"]')) {
      const script = document.createElement("script");
      script.src = "https://a.magsrv.com/ad-provider.js";
      script.async = true;
      script.type = "application/javascript";
      document.body.appendChild(script);
    }

    // Lance la pub
    (window as any).AdProvider = (window as any).AdProvider || [];
    (window as any).AdProvider.push({ serve: {} });

  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9998]">
      <ins
        className="eas6a97888e31"
        data-zoneid="5848136"
      />
    </div>
  );
}
