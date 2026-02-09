// src/components/ads/RewardedVideo.tsx
"use client";

import { useEffect, useState } from "react";

interface RewardedVideoProps {
  onReward?: () => void; // callback quand la vidéo est terminée
  zoneId?: number;       // ID VAST ExoClick, par défaut celui que tu as donné
}

export default function RewardedVideo({ onReward, zoneId = 5848158 }: RewardedVideoProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // ⚡ Charger le script ExoClick une seule fois
    if (!document.querySelector('script[src="https://a.magsrv.com/ad-provider.js"]')) {
      const script = document.createElement("script");
      script.src = "https://a.magsrv.com/ad-provider.js";
      script.async = true;
      script.type = "application/javascript";
      document.body.appendChild(script);
    }

    // ⚡ Initialiser le VAST rewarded
    const interval = setInterval(() => {
      if ((window as any).AdProvider) {
        (window as any).AdProvider.push({
          serve: {
            zoneId,
            type: 'vast',
            onComplete: () => {
              if (onReward) onReward(); // donne le bonus
              alert("🎉 Vidéo terminée ! Tu as gagné ton bonus !");
            }
          }
        });
        setIsLoaded(true);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [zoneId, onReward]);

  return (
    <div className="w-full h-[360px] bg-black flex items-center justify-center rounded-lg my-4 relative">
      {!isLoaded && <p className="text-white">Chargement de la vidéo...</p>}
    </div>
  );
}
