"use client";
import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertTriangle, WifiOff } from "lucide-react";
import Script from "next/script";

export interface RewardedVideoProps {
  onReward: () => void;
  onClose: () => void;
  zoneId?: number;
}

export default function RewardedVideo({ onReward, onClose, zoneId = 5848158 }: RewardedVideoProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState("Chargement...");
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  // --- CONFIGURATION ---
  // Mettre à FALSE quand tu seras validé par ExoClick pour la production
  const IS_TEST_MODE = true; 

  // Lien officiel ExoClick
  const liveVastUrl = `https://s.magsrv.com/v1/vast.php?idzone=${zoneId}`;
  
  // Lien de test Google (Marche toujours, utile pour le dev)
  const testVastUrl = "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=";

  const vastUrl = IS_TEST_MODE ? testVastUrl : liveVastUrl;

  const initPlayer = () => {
    if (!window.fluidPlayer || !videoRef.current) return;

    try {
      playerRef.current = window.fluidPlayer(videoRef.current, {
        layoutControls: {
          primaryColor: "#10B981",
          fillToContainer: true,
          autoPlay: true,
          mute: false,
          allowTheatre: false,
          keyboardControl: false, // Empêcher de passer la pub
          logo: { imageUrl: null, position: 'top right', clickUrl: null, opacity: 0 }
        },
        vastOptions: {
          adList: [{ roll: 'preRoll', vastTag: vastUrl, timer: 5 }],
          allowVPAID: true,
          showProgressbarMarkers: true,
          adCTAText: "Visiter",
          adCTATextPosition: "bottom right"
        }
      });

      // Événements
      playerRef.current.on('ended', () => {
        onReward();
      });

      // Si le VAST est vide (pas de pub dispo dans le pays) ou bloqué
      playerRef.current.on('adError', () => {
        console.error("Erreur VAST (No Fill)");
        setErrorMsg("Aucune publicité disponible pour votre région.");
        setStatus('error');
      });

      setStatus('ready');

    } catch (err) {
      setErrorMsg("Erreur lecteur vidéo.");
      setStatus('error');
    }
  };

  // Timeout de sécurité : Si après 10s rien ne se passe, on libère le client
  useEffect(() => {
    const timer = setTimeout(() => {
        if(status === 'loading') {
            setErrorMsg("La connexion est trop lente.");
            setStatus('error');
        }
    }, 10000); 
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md">
      
      <Script 
        src="https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js" 
        onLoad={initPlayer}
        onError={() => { setErrorMsg("Bloqueur de pub détecté"); setStatus('error'); }}
      />
      <link rel="stylesheet" href="https://cdn.fluidplayer.com/v3/current/fluidplayer.min.css" type="text/css" />

      <div className="relative w-full max-w-lg aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-center">
        
        {/* Le Lecteur */}
        <video ref={videoRef} className="w-full h-full" style={{ width: '100%', height: '100%' }}>
            <source src="https://cdn.fluidplayer.com/videos/valerian-1080p.mkv" type="video/mp4" />
        </video>

        {/* Écran de Chargement */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
            <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Chargement Sponsor...</p>
          </div>
        )}

        {/* Écran d'Erreur (Fallback) */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30 p-6 text-center">
            <WifiOff className="text-slate-600 mb-4" size={40} />
            <p className="text-white font-bold uppercase mb-2">Oups !</p>
            <p className="text-[10px] text-slate-400 mb-6">{errorMsg}</p>
            
            <div className="flex gap-3">
                <button onClick={onClose} className="px-6 py-3 bg-white/10 rounded-xl text-xs font-bold hover:bg-white/20 transition-colors">
                Abandonner
                </button>
                {/* En dev, on peut tricher pour tester le jeu même si la pub plante */}
                {IS_TEST_MODE && (
                    <button onClick={onReward} className="px-6 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-bold">
                    [DEV] Simuler Succès
                    </button>
                )}
            </div>
          </div>
        )}

        {/* Bouton fermeture secours (visible après 5s de lecture ou erreur) */}
        <button 
            onClick={onClose} 
            className="absolute top-2 right-2 p-2 bg-black/50 text-white/50 hover:text-white hover:bg-rose-600 rounded-full transition-colors z-50 active:scale-90"
        >
            <X size={16}/>
        </button>
      </div>

      <p className="text-[9px] text-slate-500 mt-4 uppercase tracking-[0.2em]">
        {IS_TEST_MODE ? "MODE TEST ACTIVÉ" : "Regardez jusqu'à la fin pour revivre"}
      </p>
    </div>
  );
}

declare global {
  interface Window {
    fluidPlayer: any;
  }
}
