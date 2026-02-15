"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';

const STEPS = [
  { 
    target: "balance-card", 
    title: "VOTRE CARBURANT", 
    desc: "Voici vos Jetons CP. C'est la monnaie pour jouer. Si vous gagnez, utilisez le bouton 'CONVERTIR' pour transformer vos CP en Gourdes (HTG)." 
  },
  { 
    target: "market-btn", 
    title: "BOUTIQUE CP", 
    desc: "C'est ici qu'on recharge. Achetez des packs de CP ou échangez vos diamants contre des jetons de jeu." 
  },
  { 
    target: "challenges-section", 
    title: "L'ARÈNE", 
    desc: "C'est ici que l'action se passe. Choisissez un jeu (Quiz, Crash, etc.), misez vos CP et tentez de multiplier vos gains !" 
  }
];

export default function OnboardingTour() {
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  
  // Démarrage automatique si pas encore vu
  useEffect(() => {
    // J'ai mis 'v3' pour que tu puisses revoir le tour même si tu avais déjà vu la v2
    const hasSeenTour = localStorage.getItem('has_seen_home_tour_v3'); 
    if (!hasSeenTour) {
      // Petit délai pour laisser le DOM se construire complètement
      const timer = setTimeout(() => setStepIndex(0), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Calcul de la position de l'élément cible
  useEffect(() => {
    if (stepIndex === -1 || stepIndex >= STEPS.length) {
        setRect(null);
        return;
    }

    const updatePosition = () => {
      const targetId = STEPS[stepIndex].target;
      const element = document.getElementById(targetId);

      if (element) {
        // Scroll fluide vers l'élément
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const r = element.getBoundingClientRect();
        // On ajoute un peu de padding (10px) autour de l'élément pour le focus
        setRect({
          top: r.top - 10,
          left: r.left - 10,
          width: r.width + 20,
          height: r.height + 20
        });
      }
    };

    // Petit délai pour laisser le scroll se finir avant de calculer le rect
    const timer = setTimeout(updatePosition, 300);
    
    // Recalcul si la fenêtre change de taille
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
    };
  }, [stepIndex]);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setStepIndex(-1);
    localStorage.setItem('has_seen_home_tour_v3', 'true');
  };

  if (stepIndex === -1 || !rect) return null;

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  // Détermine si la bulle doit être en haut ou en bas de l'élément focus
  // Si l'élément est dans la moitié basse de l'écran, on met la bulle au-dessus
  const isTooltipBelow = rect.top < window.innerHeight / 2;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
        
        {/* 1. LE SPOTLIGHT (L'élément le plus important) */}
        <motion.div
          className="absolute rounded-3xl border-2 border-emerald-500/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]"
          initial={false}
          animate={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
        >
            {/* Effet "Pulse" autour du focus */}
            <div className="absolute inset-0 rounded-3xl animate-pulse ring-4 ring-emerald-500/20"></div>
        </motion.div>

        {/* 2. LA CARTE D'INFO (TOOLTIP) */}
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute pointer-events-auto left-0 right-0 mx-auto w-full max-w-xs px-4"
          style={{
            // Positionnement dynamique
            top: isTooltipBelow ? rect.top + rect.height + 20 : 'auto',
            bottom: !isTooltipBelow ? window.innerHeight - rect.top + 20 : 'auto',
          }}
        >
          <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-5 rounded-[1.5rem] shadow-2xl relative">
            
            {/* Flèche du tooltip */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-l border-t border-white/10 transform rotate-45 ${isTooltipBelow ? '-top-2.5' : '-bottom-2.5 border-l-0 border-t-0 border-r border-b'}`}></div>

            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-black text-[10px] font-black shadow-lg shadow-emerald-500/20">
                        {stepIndex + 1}
                    </span>
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-white">{currentStep.title}</h3>
                </div>
                <button onClick={finishTour} className="text-slate-500 hover:text-white transition-colors p-1 active:scale-90">
                    <X size={16} />
                </button>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-6 font-medium relative z-10">
                {currentStep.desc}
            </p>

            <div className="flex justify-between items-center relative z-10">
                {/* Indicateurs de points */}
                <div className="flex gap-1.5">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/20'}`} />
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg active:scale-95"
                >
                    {isLastStep ? "C'EST PARTI !" : "SUIVANT"} 
                    {isLastStep ? <Check size={14}/> : <ChevronRight size={14}/>}
                </button>
            </div>
          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
}
