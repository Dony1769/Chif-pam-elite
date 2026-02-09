// src/components/ads/ExoClickBanner.tsx
"use client";
import { useEffect } from 'react';
import Script from 'next/script';

export default function ExoClickBanner() {
  const ZONE_ID = "5849090"; // Votre ID de zone Mobile Banner

  return (
    <div className="flex justify-center items-center w-full my-4 min-h-[250px] bg-black/20 rounded-2xl overflow-hidden">
      {/* 1. Script Principal */}
      <Script 
        src="https://a.magsrv.com/ad-provider.js" 
        strategy="afterInteractive" 
      />
      
      {/* 2. Balise d'insertion (La classe et l'ID doivent correspondre exactement à ce qu'ExoClick vous a donné) */}
      <ins className="eas6a97888e10" data-zoneid={ZONE_ID}></ins>
      
      {/* 3. Activation */}
      <Script id="exoclick-banner-init" strategy="lazyOnload">
        {`(AdProvider = window.AdProvider || []).push({"serve": {}});`}
      </Script>
    </div>
  );
}
