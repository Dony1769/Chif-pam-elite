"use client";
import React from "react";
import Script from "next/script";

export default function AdsterraNativeBanner() {
  return (
    <div className="my-6">
      {/* Script Adsterra Native Banner */}
      <Script
        async
        data-cfasync="false"
        src="https://pl28677610.effectivegatecpm.com/f4b47e2c6dd29de22a85a86f7ad6483f/invoke.js"
        strategy="afterInteractive"
      />
      <div id="container-f4b47e2c6dd29de22a85a86f7ad6483f" className="mx-auto max-w-lg" />
    </div>
  );
}
