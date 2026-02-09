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
  const [errorMsg, setErrorMsg] = useState("Chargement publicité...");
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  
  // Variable pour suivre si une pub a réellement démarré
  const adStartedRef = useRef(false);

  // Lien officiel (Production)
  const vastUrl = `https://s.magsrv.com/v1/vast.php?idzone=${zoneId}`;

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
          keyboardControl: false, // Bloque les raccourcis clavier pour passer
          // On cache tout ce qui n'est pas la pub
          logo: { imageUrl: null, position: 'top right', clickUrl: null, opacity: 0 },
          controlBar: {
            autoHide: true,
            autoHideTimeout: 3,
            animated: true
          }
        },
        vastOptions: {
          adList: [
            {
              roll: 'preRoll',
              vastTag: vastUrl,
              timer: 5 // Oblige à regarder au moins 5s (selon la pub)
            }
          ],
          allowVPAID: true,
          showProgressbarMarkers: true,
          adCTAText: "VISITER",
          adCTATextPosition: "top right"
        }
      });

      // --- ÉVÉNEMENTS CRITIQUES ---

      // 1. La pub commence VRAIMENT
      playerRef.current.on('adImpression', () => {
        console.log("Pub démarrée");
        adStartedRef.current = true;
        setStatus('ready');
      });

      // 2. La pub est terminée -> RÉCOMPENSE
      playerRef.current.on('adFinished', () => {
        if (adStartedRef.current) {
            console.log("Pub terminée avec succès");
            onReward();
        }
      });

      // 3. Erreur de chargement (Pas de pub, Adblock, ou Site non validé)
      playerRef.current.on('adError', () => {
        console.error("Erreur VAST : Pas de publicité disponible");
        adStartedRef.current = false;
        setErrorMsg("Aucune publicité disponible pour le moment.");
        setStatus('error');
      });

      // 4. Sécurité : Si le lecteur finit la vidéo "principale" (le fond noir) sans avoir joué de pub
      playerRef.current.on('ended', () => {
        if (!adStartedRef.current) {
            // Si on arrive ici, c'est que le lecteur a sauté la pub et fini la vidéo de fond.
            // ON NE DONNE PAS LA RÉCOMPENSE.
            setErrorMsg("Publicité ignorée ou indisponible.");
            setStatus('error');
        }
      });

    } catch (err) {
      setErrorMsg("Erreur interne du lecteur.");
      setStatus('error');
    }
  };

  // Timeout de sécurité (15s max d'attente)
  useEffect(() => {
    const timer = setTimeout(() => {
        if (status === 'loading' && !adStartedRef.current) {
            setErrorMsg("Connexion trop lente ou pas de publicité.");
            setStatus('error');
        }
    }, 15000);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/98 flex flex-col items-center justify-center p-4 backdrop-blur-xl">
      
      <Script 
        src="https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js" 
        onLoad={initPlayer}
        onError={() => { setErrorMsg("Erreur chargement script"); setStatus('error'); }}
      />
      <link rel="stylesheet" href="https://cdn.fluidplayer.com/v3/current/fluidplayer.min.css" type="text/css" />

      <div className="relative w-full max-w-lg aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center">
        
        {/* Vidéo placeholder (Vide et muette, sert juste de support au VAST) */}
        <video ref={videoRef} className="w-full h-full">
            <source src="https://cdn.fluidplayer.com/videos/valerian-1080p.mkv" type="video/mp4" />
        </video>

        {/* --- ÉCRANS DE STATUT (S'affichent par dessus le lecteur) --- */}

        {/* Chargement */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
            <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
            <p className="text-[10px] text-white font-black uppercase tracking-widest animate-pulse">Recherche de sponsor...</p>
          </div>
        )}

        {/* Erreur / Pas de pub */}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-40 p-6 text-center">
            <WifiOff className="text-slate-500 mb-4" size={40} />
            <p className="text-white font-black uppercase mb-2 text-sm">Oups !</p>
            <p className="text-[10px] text-slate-400 mb-6 font-medium">{errorMsg}</p>
            
            <button 
                onClick={onClose} 
                className="px-8 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors active:scale-95"
            >
                Fermer
            </button>
          </div>
        )}

        {/* Bouton fermeture secours (Visible uniquement sur erreur ou chargement long) */}
        {(status === 'error' || status === 'loading') && (
            <button 
                onClick={onClose} 
                className="absolute top-3 right-3 p-2 bg-white/10 text-white rounded-full hover:bg-rose-600 transition-colors z-50"
            >
                <X size={16}/>
            </button>
        )}
      </div>

      <p className="text-[9px] text-slate-500 mt-6 uppercase tracking-[0.2em] font-medium text-center">
        {status === 'ready' ? "Publicité en cours - Ne fermez pas" : "Sponsorisé par nos partenaires"}
      </p>
    </div>
  );
}

declare global {
  interface Window {
    fluidPlayer: any;
  }
}
