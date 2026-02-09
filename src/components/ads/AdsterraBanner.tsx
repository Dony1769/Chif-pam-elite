"use client";
import React, { useEffect, useRef } from 'react';

export default function AdsterraBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bannerRef.current && !bannerRef.current.firstChild) {
      // 1. Création de la configuration (atOptions)
      const confScript = document.createElement('script');
      confScript.type = 'text/javascript';
      confScript.innerHTML = `
        atOptions = {
          'key' : '2fac4a40f55e8095bcfabd3f74d716a9',
          'format' : 'iframe',
          'height' : 60,
          'width' : 468,
          'params' : {}
        };
      `;

      // 2. Création du script d'invocation
      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = "https://www.highperformanceformat.com/2fac4a40f55e8095bcfabd3f74d716a9/invoke.js";

      // 3. Injection dans le conteneur
      bannerRef.current.appendChild(confScript);
      bannerRef.current.appendChild(invokeScript);
    }
  }, []);

  return (
    <div className="flex justify-center items-center w-full my-4 overflow-hidden">
        {/* Conteneur pour la pub */}
        <div ref={bannerRef} className="bg-black/20 rounded-lg" />
    </div>
  );
}

