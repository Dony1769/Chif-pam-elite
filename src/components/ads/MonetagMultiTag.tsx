// src/components/ads/MonetagMultiTag.tsx
"use client";
import Script from 'next/script';

export default function MonetagMultiTag() {
  return (
    <Script
      src="https://quge5.com/88/tag.min.js"
      data-zone="209451"
      async
      data-cfasync="false"
      strategy="afterInteractive" // Charge après que la page soit interactive pour ne pas ralentir le site
      onError={(e) => {
        console.error('Erreur chargement Monetag Multi Tag', e);
      }}
    />
  );
}
