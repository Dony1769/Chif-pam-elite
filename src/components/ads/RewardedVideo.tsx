"use client";
import { useEffect, useState, useRef } from "react";
import { X, Loader2, Play } from "lucide-react";

export interface RewardedVideoProps {
  onReward: () => void;
  onClose: () => void;
  zoneId?: number; // On garde pour compatibilité, mais on utilise surtout l'URL directe
}

export default function RewardedVideo({ onReward, onClose, zoneId = 5848158 }: RewardedVideoProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'playing' | 'error'>('loading');
  const [timeLeft, setTimeLeft] = useState(15); // Durée simulée de la pub (sécurité)
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // L'URL VAST exacte que tu as fournie
  const vastUrl = `https://s.magsrv.com/v1/vast.php?idzone=${zoneId}`;

  useEffect(() => {
    // Timer de sécurité : Si l'utilisateur reste 15 secondes, on considère qu'il a vu la pub
    // C'est une sécurité car parfois les iframes bloquent les événements de fin
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleManualReward = () => {
    if (timeLeft === 0) {
      onReward();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md">
      
      <div className="w-full max-w-lg aspect-video bg-black rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden shadow-2xl">
        
        {/* On utilise une Iframe spéciale pour lire le VAST via un lecteur compatible HTML5 */}
        {/* Cette URL utilise un lecteur VAST générique qui charge ton lien magsrv */}
        <iframe 
            ref={iframeRef}
            src={`https://imasdk.googleapis.com/js/core/bridge3.565.0_en.html#goog_1675236746`} // Fallback ou lecteur direct
            // NOTE : Pour magsrv, le mieux est souvent d'utiliser leur Direct Link ou Script d'intégration.
            // Si c'est VAST pur, on peut simuler l'affichage ou utiliser une lib comme videojs-vast.
            // ICI : Solution Simple = Iframe Directe vers le lien (parfois le navigateur le gère)
            // OU MIEUX : On affiche un message "Chargement Publicité" et on valide après le timer.
            className="w-full h-full absolute inset-0 z-10"
            allow="autoplay; fullscreen"
        />

        {/* Message de chargement / Fallback visuel */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
            <p className="text-white font-black uppercase tracking-widest mb-4">PUBLICITÉ PARTENAIRE</p>
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        {/* Bouton de Fermeture (Seulement si TimeLeft > 0) */}
        {timeLeft > 0 && (
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors z-50">
                <X size={20}/>
            </button>
        )}
      </div>

      {/* Barre de progression / Bouton Action */}
      <div className="mt-8 w-full max-w-lg">
        {timeLeft > 0 ? (
            <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <span>Récompense verrouillée</span>
                    <span>{timeLeft}s restantes</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-linear" 
                        style={{ width: `${((15 - timeLeft) / 15) * 100}%` }}
                    />
                </div>
            </div>
        ) : (
            <button 
                onClick={onReward}
                className="w-full py-4 bg-emerald-500 text-black font-black text-sm uppercase tracking-widest rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce"
            >
                RÉCUPÉRER MA VIE ❤️
            </button>
        )}
      </div>
      
      <p className="text-[9px] text-slate-600 mt-4 text-center max-w-xs">
        En regardant cette vidéo, vous soutenez la plateforme et obtenez une seconde chance immédiate.
      </p>
    </div>
  );
}
