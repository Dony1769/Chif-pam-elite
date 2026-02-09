"use client";
import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import Script from "next/script";

export interface RewardedVideoProps {
  onReward: () => void;
  onClose: () => void;
  zoneId?: number;
}

export default function RewardedVideo({ onReward, onClose, zoneId = 5848158 }: RewardedVideoProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  // Le lien VAST officiel fourni par ExoClick
  // Lien de test Google (à utiliser juste pour vérifier que le lecteur s'affiche)
const vastUrl = "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=";

  const initPlayer = () => {
    if (!window.fluidPlayer || !videoRef.current) return;

    try {
      // Initialisation du lecteur Fluid Player
      playerRef.current = window.fluidPlayer(videoRef.current, {
        layoutControls: {
          primaryColor: "#10B981", // Couleur Emerald
          fillToContainer: true,
          autoPlay: true,
          mute: false,
          allowTheatre: false,
          logo: { imageUrl: null, position: 'top right', clickUrl: null, opacity: 1 } // Masquer logo si possible
        },
        vastOptions: {
          adList: [
            {
              roll: 'preRoll', // La pub se lance au début
              vastTag: vastUrl,
              timer: 5 // Timer avant de pouvoir passer (optionnel selon la pub)
            }
          ],
          allowVPAID: true, // Autorise les pubs interactives
          showProgressbarMarkers: true,
        }
      });

      // Écouteurs d'événements pour gérer la récompense
      playerRef.current.on('ended', () => {
        console.log("Publicité terminée - Récompense accordée");
        onReward();
      });

      playerRef.current.on('adError', () => {
        console.error("Erreur de chargement de la pub VAST (No Fill ou Bloqueur)");
        setStatus('error');
      });

      playerRef.current.on('adClick', () => {
        // Optionnel: mettre en pause si l'utilisateur clique
      });

      setStatus('ready');

    } catch (err) {
      console.error("Erreur init player:", err);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md">
      
      {/* Chargement des scripts Fluid Player */}
      <Script 
        src="https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js" 
        onLoad={initPlayer}
        strategy="afterInteractive"
      />
      {/* Feuille de style CSS requise pour Fluid Player */}
      <link rel="stylesheet" href="https://cdn.fluidplayer.com/v3/current/fluidplayer.min.css" type="text/css" />

      <div className="relative w-full max-w-lg aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        
        {/* Le lecteur vidéo */}
        <video ref={videoRef} className="w-full h-full" style={{ width: '100%', height: '100%' }}>
            <source src="https://cdn.fluidplayer.com/videos/valerian-1080p.mkv" type="video/mp4" />
        </video>

        {/* Message de chargement ou d'erreur par-dessus */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
            <Loader2 className="animate-spin text-emerald-500 mb-2" size={40} />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Chargement Publicité...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 text-center p-6">
            <AlertTriangle className="text-rose-500 mb-2" size={40} />
            <p className="text-white font-black italic uppercase mb-1">Aucune publicité disponible</p>
            <p className="text-[10px] text-slate-400 mb-4">Cela arrive parfois selon votre région.</p>
            <button onClick={onClose} className="px-6 py-3 bg-white/10 rounded-xl text-xs font-bold hover:bg-white/20 transition-colors">
              Fermer
            </button>
          </div>
        )}

        {/* Bouton de fermeture de secours (toujours visible au cas où) */}
        <button 
            onClick={onClose} 
            className="absolute top-2 right-2 p-2 bg-black/50 text-white/50 hover:text-white hover:bg-rose-600 rounded-full transition-colors z-50 active:scale-90"
        >
            <X size={16}/>
        </button>
      </div>

      <p className="text-[9px] text-slate-500 mt-4 uppercase tracking-[0.2em] animate-pulse">
        Regardez jusqu'à la fin pour revivre
      </p>
    </div>
  );
}

// Typage global pour window.fluidPlayer
declare global {
  interface Window {
    fluidPlayer: any;
  }
}
