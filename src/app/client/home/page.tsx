"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check, Globe } from 'lucide-react';

// --- CONFIGURATION DU CONTENU (BILINGUE) ---
const TOUR_DATA = {
  fr: [
    { 
      target: "balance-card", 
      title: "VOS RESSOURCES", 
      desc: "Voici votre moteur de jeu ! Vos Jetons CP pour jouer et votre solde Gourdes (HTG). Convertissez vos CP ici." 
    },
    { 
      target: "market-btn", 
      title: "BOUTIQUE ELITE", 
      desc: "Le raccourci rapide pour acheter des packs de CP ou échanger vos diamants." 
    },
    { 
      target: "challenges-section", 
      title: "ZONE DE MISSION", 
      desc: "C'est le cœur de l'action. Choisissez un défi, battez le score et remportez la mise." 
    },
    { 
      target: "nav-profile", // Cible le bouton Compte en bas
      title: "DÉPÔT & RETRAIT", 
      desc: "C'est ici maintenant ! Pour recharger votre compte ou retirer vos gains, cliquez sur votre Profil." 
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
      desc: "Chemen kout pou achte pake CP oswa chanje dyaman ou yo." 
    },
    { 
      target: "challenges-section", 
      title: "ZÒN MISYON", 
      desc: "Se la aksyon an ye. Chwazi yon defi, bat skò a epi ranpòte lajan an." 
    },
    { 
      target: "nav-profile", 
      title: "DEPÒT & RETRÈ", 
      desc: "Se la sa ye kounye a! Pou mete lajan sou kont ou oswa fè retrè, klike sou Pwofil ou anba a." 
    }
  ]
};

// Clé v9 pour forcer le reset chez tout le monde
const STORAGE_KEY = 'has_seen_home_tour_v9'; 

export default function OnboardingTour() {
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [lang, setLang] = useState<'fr' | 'ht'>('fr'); 
  const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number, bottom: number } | null>(null);
  
  // 1. Démarrage automatique avec délai de sécurité
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(STORAGE_KEY); 
    if (!hasSeenTour) {
      // On attend 1.5s que l'interface principale soit bien chargée
      const timer = setTimeout(() => setStepIndex(0), 1500); 
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. Moteur de recherche d'élément (Radar)
  useEffect(() => {
    if (stepIndex === -1) {
        setRect(null);
        return;
    }

    const targetId = TOUR_DATA['fr'][stepIndex]?.target;
    if (!targetId) return finishTour();

    let attempts = 0;
    const maxAttempts = 30; // Essaie pendant 3 secondes (30 * 100ms)

    const findElementInterval = setInterval(() => {
        const element = document.getElementById(targetId);

        if (element) {
            // ÉLÉMENT TROUVÉ !
            clearInterval(findElementInterval);
            
            // Scroll intelligent
            // Pour le dernier élément (menu bas), on scroll juste vers le bas sans forcer le centrage
            const blockPosition = stepIndex >= 3 ? 'end' : 'center';
            
            element.scrollIntoView({ behavior: 'smooth', block: blockPosition });

            const r = element.getBoundingClientRect();
            
            // Marge dynamique
            const padding = stepIndex >= 3 ? 4 : 8; // Marge plus petite pour le menu
            
            setRect({
                top: r.top - padding,
                left: r.left - padding,
                width: r.width + (padding * 2),
                height: r.height + (padding * 2),
                bottom: r.bottom + padding
            });
        } else {
            // PAS ENCORE TROUVÉ, ON RÉESSAYE
            attempts++;
            if (attempts >= maxAttempts) {
                console.warn(`Element #${targetId} introuvable après 3s. Passage à la suite.`);
                clearInterval(findElementInterval);
                handleNext(); // Abandon et suite
            }
        }
    }, 100); // Vérifie toutes les 100ms

    return () => clearInterval(findElementInterval);
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

  // --- LOGIQUE DE POSITIONNEMENT INTELLIGENTE ---
  // Si on est à l'étape 4 (index 3) ou si l'élément est bas, on force l'affichage AU-DESSUS
  const isMenuStep = stepIndex === 3; // L'étape du profil
  const spaceBelow = window.innerHeight - rect.bottom;
  const isTooltipAbove = isMenuStep || spaceBelow < 260 || rect.top > window.innerHeight * 0.6;

  return (
    <AnimatePresence>
      {/* Z-Index 100 pour passer au dessus du menu fixe */}
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none font-sans">
        
        {/* A. FOND SOMBRE */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        />

        {/* B. FOCUS RING */}
        <motion.div
          className="absolute rounded-2xl pointer-events-none"
          initial={false}
          animate={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 25 }}
        >
            <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.6)] animate-pulse"></div>
        </motion.div>

        {/* C. LA BULLE D'INFO */}
        <motion.div
          key={stepIndex} 
          initial={{ opacity: 0, y: isTooltipAbove ? 20 : -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="absolute pointer-events-auto left-4 right-4 md:left-auto md:right-auto md:w-[340px] mx-auto z-[101]"
          style={{
            left: window.innerWidth > 768 ? rect.left + (rect.width/2) - 170 : 16, 
            right: window.innerWidth > 768 ? 'auto' : 16,
            // Si c'est le menu, on décale un peu plus vers le haut (30px) pour ne pas coller au doigt
            top: !isTooltipAbove ? rect.bottom + 20 : 'auto',
            bottom: isTooltipAbove ? (window.innerHeight - rect.top) + (isMenuStep ? 30 : 20) : 'auto',
          }}
        >
          <div className="bg-[#0f172a] border border-emerald-500/30 p-5 rounded-[1.8rem] shadow-2xl relative overflow-hidden">
            
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -z-10 rounded-full"></div>

            <div 
                className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0f172a] border-l border-t border-emerald-500/30 transform rotate-45 
                ${isTooltipAbove ? '-bottom-2.5 border-l-0 border-t-0 border-r border-b' : '-top-2.5'}`}
            ></div>

            {/* En-tête */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-black text-xs font-black shadow-lg shadow-emerald-500/20">
                        {stepIndex + 1}
                    </div>
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-white">{currentStep.title}</h3>
                </div>
                
                <div className="flex items-center gap-2">
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

            {/* Texte */}
            <p className="text-slate-300 text-xs leading-relaxed mb-6 font-medium pl-2 border-l-2 border-emerald-500/20">
                {currentStep.desc}
            </p>

            {/* Footer */}
            <div className="flex justify-between items-center">
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

