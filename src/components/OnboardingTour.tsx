"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';

const STEPS = [
  { 
    target: "balance-card", 
    title: "VOS RESSOURCES", 
    desc: "Voici votre moteur de jeu ! Vos Jetons CP pour jouer et votre solde Gourdes (HTG). Vous pouvez convertir vos CP ici." 
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
    target: "nav-profile", // Nécessite l'ajout de id="nav-profile" dans la page Home
    title: "FINANCES & COMPTE", 
    desc: "C'est ici que ça se passe ! Pour effectuer un DÉPÔT ou un RETRAIT, accédez maintenant à votre Profil." 
  }
];

export default function OnboardingTour() {
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  
  // Démarrage automatique (v3 pour reset chez les utilisateurs)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('has_seen_home_tour_v3'); 
    if (!hasSeenTour) {
      const timer = setTimeout(() => setStepIndex(0), 1000); // Délai un peu plus long pour le chargement mobile
      return () => clearTimeout(timer);
    }
  }, []);

  // Calcul de la position
  useEffect(() => {
    if (stepIndex === -1 || stepIndex >= STEPS.length) {
        setRect(null);
        return;
    }

    const updatePosition = () => {
      const targetId = STEPS[stepIndex].target;
      const element = document.getElementById(targetId);

      if (element) {
        // Scroll intelligent : 'center' pour la plupart, 'end' pour le menu du bas
        const blockPosition = stepIndex === 3 ? 'end' : 'center';
        
        element.scrollIntoView({ behavior: 'smooth', block: blockPosition });

        const r = element.getBoundingClientRect();
        setRect({
          top: r.top - 8, // Padding ajusté
          left: r.left - 8,
          width: r.width + 16,
          height: r.height + 16
        });
      } else {
        // Si l'élément n'est pas trouvé (ex: id manquant), on passe à l'étape suivante pour éviter le blocage
        console.warn(`Element #${targetId} non trouvé pour le tour.`);
        handleNext(); 
      }
    };

    // Petit délai pour laisser le temps au scroll de se faire
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

  // Logique intelligente pour placer la bulle (Au-dessus ou en-dessous)
  // Si l'élément est dans le tiers bas de l'écran, on met la bulle au-dessus.
  const isTooltipAbove = rect.top > window.innerHeight * 0.6;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
        
        {/* 1. FOCUS RING (Le carré lumineux) */}
        <motion.div
          className="absolute rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.85)]" // Fond sombre très opaque
          initial={false}
          animate={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          transition={{ type: "spring", stiffness: 100, damping: 25 }}
        >
            {/* Bordure animée */}
            <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
        </motion.div>

        {/* 2. LA BULLE D'INFO */}
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: isTooltipAbove ? 10 : -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="absolute pointer-events-auto left-4 right-4 md:left-auto md:right-auto md:w-80 mx-auto"
          style={{
            // Positionnement horizontal centré sur l'élément si possible, sinon centré écran
            left: window.innerWidth > 768 ? rect.left + (rect.width/2) - 160 : 16, 
            // Positionnement vertical
            top: !isTooltipAbove ? rect.top + rect.height + 20 : 'auto',
            bottom: isTooltipAbove ? window.innerHeight - rect.top + 20 : 'auto',
          }}
        >
          <div className="bg-[#0f172a] border border-emerald-500/30 p-5 rounded-[1.5rem] shadow-2xl relative">
            
            {/* Flèche indicative */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0f172a] border-l border-t border-emerald-500/30 transform rotate-45 ${isTooltipAbove ? '-bottom-2.5 border-l-0 border-t-0 border-r border-b' : '-top-2.5'}`}></div>

            {/* En-tête */}
            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-black text-xs font-black shadow-lg shadow-emerald-500/20">
                        {stepIndex + 1}
                    </div>
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-white">{currentStep.title}</h3>
                </div>
                <button onClick={finishTour} className="p-1 bg-white/5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <X size={14} />
                </button>
            </div>

            {/* Description */}
            <p className="text-slate-300 text-xs leading-relaxed mb-6 font-medium border-l-2 border-white/10 pl-3">
                {currentStep.desc}
            </p>

            {/* Footer / Contrôles */}
            <div className="flex justify-between items-center">
                {/* Points de progression */}
                <div className="flex gap-1.5">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/10'}`} />
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
