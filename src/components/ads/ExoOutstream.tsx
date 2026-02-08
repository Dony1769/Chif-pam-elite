"use client";

import { useEffect } from "react";
import Script from "next/script";

export default function ExoOutstream() {
  useEffect(() => {
    try {
      // Lance l'affichage de la pub après chargement
      // @ts-ignore
      (window.AdProvider = window.AdProvider || []).push({ serve: {} });
    } catch (e) {
      console.log("Ad error", e);
    }
  }, []);

  return (
    <div className="w-full flex justify-center my-6">
      {/* Script principal Exoclick */}
      <Script
        src="https://a.magsrv.com/ad-provider.js"
        strategy="afterInteractive"
      />

      {/* Emplacement de la vidéo */}
      <ins
        className="eas6a97888e37"
        data-zoneid="5848116"
        data-block-ad-types="0"
        style={{ display: "block" }}
      />
    </div>
  );
}
