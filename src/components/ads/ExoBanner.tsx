"use client";

import { useEffect } from "react";

export default function ExoBanner() {
  useEffect(() => {
    // Évite double chargement du script
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
    <div className="w-full flex justify-center my-6">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
        Publicité
      </div>

      <ins
        className="eas6a97888e2"
        data-zoneid="5851196"
        style={{ display: "block" }}
      />
    </div>
  );
}
