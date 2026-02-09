// src/components/ads/ExoClickInterstitial.tsx
"use client";
import Script from 'next/script';

export default function ExoClickInterstitial() {
  return (
    <>
      {/* Script principal du fournisseur de publicité */}
      <Script 
        src="https://a.pemsrv.com/ad-provider.js" 
        strategy="afterInteractive" 
      />
      
      {/* Balise d'insertion spécifique à votre zone (Ne pas modifier les classes/ids fournis) */}
      <ins className="eas6a97888e33" data-zoneid="5848748"></ins>
      
      {/* Script d'initialisation */}
      <Script id="exoclick-init" strategy="lazyOnload">
        {`(AdProvider = window.AdProvider || []).push({"serve": {}});`}
      </Script>
    </>
  );
}

