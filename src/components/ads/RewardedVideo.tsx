"use client";
import { useEffect, useState, useRef } from "react";
import { X, Loader2 } from "lucide-react";

// On exporte l'interface pour que TypeScript la reconnaisse partout
export interface RewardedVideoProps {
  onReward: () => void;
  onClose: () => void; // C'est cette ligne qui manquait ou était mal lue
  zoneId?: number;
}

export default function RewardedVideo({ onReward, onClose, zoneId = 5848158 }: RewardedVideoProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'playing' | 'error'>('loading');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Charger le script AdProvider si absent
    if (!document.querySelector('script[src="https://a.magsrv.com/ad-provider.js"]')) {
      const script = document.createElement("script");
      script.src = "https://a.magsrv.com/ad-provider.js";
      script.async = true;
      document.body.appendChild(script);
    }

    // 2. Attendre que l'AdProvider soit prêt
    const checkInterval = setInterval(() => {
      if ((window as any).AdProvider) {
        setStatus('ready');
        clearInterval(checkInterval);
        triggerAd();
      }
    }, 500);

    // Timeout de sécurité (5s)
    const timeout = setTimeout(() => {
        if(status === 'loading') setStatus('error');
    }, 5000);

    return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
    };
  }, []);

  const triggerAd = () => {
    if (!(window as any).AdProvider) return;
    
    setStatus('playing');
    (window as any).AdProvider.push({
      serve: {
        zoneId,
        type: 'vast',
        onAdLoaded: () => console.log("Ad Loaded"),
        onAdError: () => setStatus('error'),
        onAdClosed: () => onClose(), 
        onComplete: () => {
          onReward(); // VICTOIRE
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-md">
      <div ref={containerRef} className="w-full max-w-lg aspect-video bg-black rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden shadow-2xl">
        
        {status === 'loading' && (
            <div className="text-center">
                <Loader2 className="animate-spin text-emerald-500 mx-auto mb-2" size={40}/>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Chargement Publicité...</p>
            </div>
        )}

        {status === 'error' && (
            <div className="text-center p-6">
                <p className="text-rose-500 font-black italic mb-4">PUBLICITÉ INDISPONIBLE</p>
                <button onClick={onClose} className="px-6 py-3 bg-white/10 rounded-xl text-xs font-bold hover:bg-white/20">Fermer</button>
            </div>
        )}

        {/* Bouton de secours pour fermer si l'ad plante */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors z-50">
            <X size={20}/>
        </button>
      </div>
      <p className="text-[10px] text-slate-500 mt-6 uppercase tracking-widest">Regardez la vidéo complète pour revivre</p>
    </div>
  );
}
