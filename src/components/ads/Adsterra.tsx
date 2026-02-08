"use client";
import Script from "next/script";

interface AdsterraProps {
  active?: boolean; // si true, le script s'active
}

export default function Adsterra({ active = false }: AdsterraProps) {
  if (!active) return null;

  return (
    <>
      {/* Script Adsterra Popunder */}
      <Script
        src="https://pl28672994.effectivegatecpm.com/af/7b/10/af7b10323fc42bb7579d732a374f47a3.js"
        strategy="afterInteractive"
      />
    </>
  );
}
