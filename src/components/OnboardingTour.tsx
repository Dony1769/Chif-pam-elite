"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

const STEPS = [
  { 
    target: "balance-card", 
    title: "VOTRE PORTFEUILLE", 
    desc: "Ici vous voyez vos Jetons CP (Jeu) et vos Gourdes (Cash). Convertissez vos gains facilement." 
  },
  { 
    target: "market-btn", 
    title: "BOUTIQUE ELITE", 
    desc: "Achetez des packs de jetons ou utilisez vos diamants ici." 
  },
  { 
    target: "challenges-section", 
    title: "DÉFIS DU JOUR", 
    desc: "Participez aux défis pour gagner de l'XP et des récompenses exclusives." 
  }
];

export default function OnboardingTour() {
  const [stepIndex, setStepIndex] = useState(-1);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('has_seen_home_tour');
    if (!hasSeenTour) {
      setTimeout(() => setStepIndex(0), 1000); // Petit délai pour laisser charger l'UI
    }
  }, []);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      setStepIndex(-1);
      localStorage.setItem('has_seen_home_tour', 'true');
    }
  };

  const handleSkip = () => {
    setStepIndex(-1);
    localStorage.setItem('has_seen_home_tour', 'true');
  };

  if (stepIndex === -1) return null;

  const currentStep = STEPS[stepIndex];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center px-6">
        {/* Overlay sombre */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-black/80 pointer-events-auto"
          onClick={handleNext}
        />

        {/* Pop-up Card */}
        <motion.div 
          key={stepIndex}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -20 }}
          className="bg-slate-900 border border-emerald-500/30 p-6 rounded-[2rem] shadow-2xl relative z-[101] pointer-events-auto max-w-sm w-full"
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-emerald-500 font-black italic uppercase tracking-wider">{currentStep.title}</h3>
            <button onClick={handleSkip} className="p-1 bg-white/5 rounded-full text-slate-500 hover:text-white"><X size={16}/></button>
          </div>
          
          <p className="text-slate-300 text-xs leading-relaxed mb-6 font-medium">{currentStep.desc}</p>

          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/10'}`} />
              ))}
            </div>
            <button onClick={handleNext} className="bg-white text-black px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-400 transition-colors">
              {stepIndex === STEPS.length - 1 ? "C'EST PARTI" : "SUIVANT"} <ChevronRight size={12}/>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

