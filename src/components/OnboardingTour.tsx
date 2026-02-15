"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check, Languages, Globe } from 'lucide-react';

// --- CONFIGURATION DU CONTENU (BILINGUE) ---
const TOUR_DATA = {
  fr: [
    { 
      target: "balance-card", 
      title: "VOS RESSOURCES", 
      desc: "Voici votre moteur de jeu ! Vos Jetons CP pour jouer et votre solde Gourdes (HTG). Vous pouvez convertir vos CP ici." 
    },
    { 
      target: "market-btn", 
      title: "BOUTIQUE ELITE", 
      desc: "Le raccourci rapide pour acheter des packs de CP ou échanger vos diamants contre des bonus." 
    },
    { 
      target: "challenges-section", 
      title: "ZONE DE MISSION", 
      desc: "C'est le cœur de l'action. Choisissez un défi, battez le score et remportez la cagnotte." 
    },
    { 
      target: "nav-profile", 
      title: "FINANCES & COMPTE", 
      desc: "C'est ici que ça se passe ! Pour effectuer un DÉPÔT ou un RETRAIT, accédez maintenant à votre Profil." 
    }
  ],
  ht: [
    { 
      target: "balance-card", 
      title: "RESOUSE OU YO", 
      desc: "Sa se motè jwèt ou ! Jeton CP pou jwe ak balans Goud (HTG) ou. Ou ka konvèti CP ou yo la." 
    },
    { 
      target: "market-btn", 
      title: "BOUTIK ELIT", 
      desc: "Chemen kout pou achte pake CP oswa chanje dyaman ou yo pou jwenn bonis." 
    },
    { 
      target: "challenges-section", 
      title: "ZÒN MISYON", 
      desc: "Se la aksyon an ye. Chwazi yon defi, bat skò a epi ranpòte lajan an." 
    },
    { 
      target: "nav-profile", 
      title: "FINANS & KONT", 
      desc: "Se la tout bagay fèt ! Pou fè yon DEPÒT oswa yon RETRÈ, ale kounye a nan pwofil ou." 
    }
  ]
};

// Clé de version pour forcer le redémarrage chez les anciens utilisateurs
const STORAGE_KEY = 'has_seen_home_tour_v6'; 

export default function OnboardingTour() {
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [lang, setLang] = useState<'fr' | 'ht'>('fr'); // Langue par défaut
  const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number, bottom: number } | null>(null);
  
  // 1. Démarrage automatique (Reset pour tout le monde via v5)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(STORAGE_KEY); 
    if (!hasSeenTour) {
      // Délai pour laisser le temps au DOM de se charger (surtout sur mobile lent)
      const timer = setTimeout(() => setStepIndex(0), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. Calculer la position et scroller vers l'élément
  useEffect(() => {
    if (stepIndex === -1) {
        setRect(null);
        return;
    }

    const updatePosition = () => {
      // On utilise les données FR pour cibler les IDs (les IDs sont les mêmes peu importe la langue)
      const targetId = TOUR_DATA['fr'][stepIndex]?.target;
      if (!targetId) return finishTour();

      const element = document.getElementById(targetId);

      if (element) {
        // Scroll intelligent : 'center' pour le haut, 'end' pour le bas (menu)
        const blockPosition = stepIndex >= 2 ? 'end' : 'center'; // Pour step 2, 3 (index 2, 3) on scroll en bas
        
        element.scrollIntoView({ behavior: 'smooth', block: blockPosition });

        const r = element.getBoundingClientRect();
        
        // On ajoute un padding dynamique
        const padding = 8;
        setRect({
          top: r.top - padding,
          left: r.left - padding,
          width: r.width + (padding * 2),
          height: r.height + (padding * 2),
          bottom: r.bottom + padding
        });
      } else {
        console.warn(`Element #${targetId} introuvable.`);
        // Si élément pas trouvé, on passe au suivant pour pas bloquer l'app
        handleNext(); 
      }
    };

    // Petit délai pour laisser le scroll se finir avant de calculer le rect
    const scrollTimer = setTimeout(updatePosition, 300); 
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
        clearTimeout(scrollTimer);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
    };
  }, [stepIndex]);

  const handleNext = () => {
    if (stepIndex < TOUR_DATA[lang].length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setStepIndex(-1);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const toggleLang = () => {
    setLang(prev => prev === 'fr' ? 'ht' : 'fr');
  };

  if (stepIndex === -1 || !rect) return null;

  const currentStep = TOUR_DATA[lang][stepIndex];
  const isLastStep = stepIndex === TOUR_DATA[lang].length - 1;

  // --- LOGIQUE INTELLIGENTE DE POSITIONNEMENT ---
  // Si l'élément est dans la moitié basse de l'écran (> 55% de la hauteur), on met la bulle AU-DESSUS.
  const isTooltipAbove = rect.top > window.innerHeight * 0.55;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none font-sans">
        
        {/* A. FOND SOMBRE (FOCUS) */}
        {/* On utilise un clip-path inversé ou un box-shadow géant pour assombrir le reste */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        />

        {/* B. LE SPOTLIGHT (L'anneau lumineux autour de l'élément) */}
        <motion.div
          className="absolute rounded-2xl pointer-events-none"
          initial={false}
          animate={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
            {/* Bordure animée et effet de lueur */}
            <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-pulse"></div>
            {/* Effet "Ping" pour attirer l'attention */}
            <div className="absolute -inset-4 border border-emerald-500/30 rounded-3xl animate-ping opacity-20"></div>
        </motion.div>

        {/* C. LA CARTE D'INFO (TOOLTIP) */}
        <motion.div
          key={stepIndex} // Clé unique pour forcer l'animation à chaque étape
          initial={{ opacity: 0, y: isTooltipAbove ? 20 : -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="absolute pointer-events-auto left-4 right-4 md:left-auto md:right-auto md:w-[340px] mx-auto z-[101]"
          style={{
            // Centrage horizontal (avec limites pour mobile)
            left: window.innerWidth > 768 ? rect.left + (rect.width/2) - 170 : 16, 
            right: window.innerWidth > 768 ? 'auto' : 16,
            
            // Positionnement Vertical Dynamique
            // Si Above: On colle le bas de la bulle au haut de l'élément (avec marge)
            // Si Below: On colle le haut de la bulle au bas de l'élément (avec marge)
            top: !isTooltipAbove ? rect.bottom + 20 : 'auto',
            bottom: isTooltipAbove ? (window.innerHeight - rect.top) + 20 : 'auto',
          }}
        >
          <div className="bg-[#0f172a] border border-emerald-500/30 p-5 rounded-[1.8rem] shadow-2xl relative overflow-hidden">
            
            {/* Fond décoratif subtil */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-3xl -z-10 rounded-full"></div>

            {/* Flèche indicative (Triangle CSS) */}
            <div 
                className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0f172a] border-l border-t border-emerald-500/30 transform rotate-45 
                ${isTooltipAbove ? '-bottom-2.5 border-l-0 border-t-0 border-r border-b' : '-top-2.5'}`}
            ></div>

            {/* --- HEADER : Titre + Langue + Fermer --- */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-black text-xs font-black shadow-lg shadow-emerald-500/20">
                        {stepIndex + 1}
                    </div>
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-white">{currentStep.title}</h3>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Switch Langue */}
                    <button 
                        onClick={toggleLang}
                        className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-emerald-400 border border-emerald-500/20 transition-colors"
                    >
                        <Globe size={10} />
                        {lang === 'fr' ? 'HT' : 'FR'}
                    </button>

                    <button onClick={finishTour} className="p-1 bg-white/5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* --- CONTENU --- */}
            <p className="text-slate-300 text-xs leading-relaxed mb-6 font-medium pl-2 border-l-2 border-emerald-500/20">
                {currentStep.desc}
            </p>

            {/* --- FOOTER : Progression + Bouton --- */}
            <div className="flex justify-between items-center">
                {/* Points de progression */}
                <div className="flex gap-1.5">
                    {TOUR_DATA[lang].map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === stepIndex ? 'w-6 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'w-1.5 bg-white/10'}`} />
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg active:scale-95 group"
                >
                    {isLastStep ? (lang === 'fr' ? "C'EST PARTI !" : "AN ALE !") : (lang === 'fr' ? "SUIVANT" : "KONTINYE")}
                    {isLastStep ? <Check size={14}/> : <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform"/>}
                </button>
            </div>
          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
}

