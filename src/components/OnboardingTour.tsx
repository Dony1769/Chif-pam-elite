"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';

const STEPS = [
  { 
    target: "balance-card", 
    title: "VOS PORTEFEUILLES", 
    desc: "Voici votre tableau de bord. À gauche vos CP pour jouer, à droite vos Gourdes (HTG). Vous pouvez convertir vos CP en argent ici." 
  },
  { 
    target: "market-btn", 
    title: "BOUTIQUE ELITE", 
    desc: "Cliquez ici pour acheter des packs de Jetons CP ou pour accéder aux offres spéciales." 
  },
  { 
    target: "challenges-section", 
    title: "ARENA & DÉFIS", 
    desc: "C'est ici que l'action se passe. Rejoignez les défis à la une pour gagner de gros lots." 
  }
];

export default function OnboardingTour() {
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  
  // Démarrage automatique si pas encore vu (Version 3 pour forcer la maj)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('has_seen_home_tour_v3'); 
    if (!hasSeenTour) {
      // Délai un peu plus long pour s'assurer que tout est chargé (animations d'entrée etc.)
      const timer = setTimeout(() => setStepIndex(0), 1500);
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
        // Scroll fluide et centré vers l'élément
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

        const r = element.getBoundingClientRect();
        // Padding dynamique selon la taille de l'élément pour ne pas être trop serré
        const padding = 10;
        
        setRect({
          top: r.top - padding,
          left: r.left - padding,
          width: r.width + (padding * 2),
          height: r.height + (padding * 2)
        });
      }
    };

    // Petit délai pour laisser le scroll se finir avant de calculer le rect
    const scrollTimer = setTimeout(updatePosition, 100);
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
        clearTimeout(scrollTimer);
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

  // Logique intelligente pour placer la bulle (Haut ou Bas)
  // Si l'élément est dans la moitié basse de l'écran, on met la bulle au-dessus
  const isTooltipBelow = rect.top < window.innerHeight / 2;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none touch-none">
        
        {/* 1. LE SPOTLIGHT (L'effet sombre avec le trou) */}
        <motion.div
          className="absolute rounded-3xl border-2 border-emerald-500/50 shadow-[0_0_0_9999px_rgba(2,6,23,0.85)]"
          initial={false}
          animate={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
        >
            {/* Effet "Pulse" pour attirer l'attention */}
            <div className="absolute inset-0 rounded-3xl animate-pulse ring-4 ring-emerald-500/20"></div>
        </motion.div>

        {/* 2. LA CARTE D'INFO (TOOLTIP) */}
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="absolute pointer-events-auto left-4 right-4 mx-auto w-auto max-w-sm"
          style={{
            // Positionnement dynamique
            top: isTooltipBelow ? rect.top + rect.height + 20 : 'auto',
            bottom: !isTooltipBelow ? window.innerHeight - rect.top + 20 : 'auto',
          }}
        >
          <div className="bg-[#0f172a] border border-emerald-500/20 p-5 rounded-[1.5rem] shadow-2xl relative overflow-hidden">
            {/* Fond subtil */}
            <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-black text-[10px] font-black shadow-lg shadow-emerald-500/20">
                        {stepIndex + 1}
                    </span>
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-white">{currentStep.title}</h3>
                </div>
                <button onClick={finishTour} className="text-slate-500 hover:text-white transition-colors p-1 bg-white/5 rounded-full active:scale-90">
                    <X size={14} />
                </button>
            </div>

            {/* Description */}
            <p className="text-slate-300 text-xs leading-relaxed mb-6 font-medium relative z-10">
                {currentStep.desc}
            </p>

            {/* Footer / Actions */}
            <div className="flex justify-between items-center relative z-10">
                {/* Indicateurs de points */}
                <div className="flex gap-1.5">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/10'}`} />
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg active:scale-95"
                >
                    {isLastStep ? "C'EST PARTI" : "SUIVANT"} 
                    {isLastStep ? <Check size={14}/> : <ChevronRight size={14}/>}
                </button>
            </div>
          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
}
