"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check, Languages } from 'lucide-react';

// --- CONTENU TRADUIT ---
const STEPS_DATA = {
  fr: [
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
      target: "nav-profile", 
      title: "FINANCES & COMPTE", 
      desc: "C'est ici que ça se passe ! Pour effectuer un DÉPÔT ou un RETRAIT, cliquez sur votre Profil ici." 
    }
  ],
  ht: [
    { 
      target: "balance-card", 
      title: "RESOUS OU YO", 
      desc: "Sa a se motè jwèt ou! Jetons CP pou jwe ak balans Goud (HTG) ou. Ou ka konvèti CP ou yo la a." 
    },
    { 
      target: "market-btn", 
      title: "BOUTIK ELITE", 
      desc: "Wout kout pou achte pakèt CP oswa chanje Diaman ou yo byen rapid." 
    },
    { 
      target: "challenges-section", 
      title: "ZÒN MISYON", 
      desc: "Se la aksyon an ye. Chwazi yon defi, fè gwo nòt epi ranpòte lajan an." 
    },
    { 
      target: "nav-profile", 
      title: "FINANS & KONT", 
      desc: "Se la tout bagay regle! Pou fè yon DEPÒT oswa yon RETRÈ, klike sou Profil ou anba a." 
    }
  ]
};

export default function OnboardingTour() {
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [showLanguageSelect, setShowLanguageSelect] = useState(false);
  const [lang, setLang] = useState<'fr' | 'ht'>('fr');
  const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  
  // Clé unique pour forcer le reset chez tout le monde (v4)
  const STORAGE_KEY = 'has_seen_home_tour_v4_multilang';

  // 1. VÉRIFICATION AU CHARGEMENT
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(STORAGE_KEY); 
    if (!hasSeenTour) {
      // On lance le sélecteur de langue après un petit délai
      const timer = setTimeout(() => setShowLanguageSelect(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. CALCUL DE LA POSITION (Responsive Fix)
  useEffect(() => {
    if (stepIndex === -1) {
        setRect(null);
        return;
    }

    const steps = STEPS_DATA[lang];
    if (stepIndex >= steps.length) return;

    const updatePosition = () => {
      const targetId = steps[stepIndex].target;
      const element = document.getElementById(targetId);

      if (element) {
        // Pour le dernier élément (Menu du bas), on scroll tout en bas
        const blockPosition = stepIndex === steps.length - 1 ? 'end' : 'center';
        
        element.scrollIntoView({ behavior: 'smooth', block: blockPosition });

        const r = element.getBoundingClientRect();
        setRect({
          top: r.top - 5, 
          left: r.left - 5,
          width: r.width + 10,
          height: r.height + 10
        });
      } else {
        // Si l'élément n'est pas trouvé (ex: pas chargé), on saute l'étape
        handleNext(); 
      }
    };

    // Petit délai pour laisser le temps au scroll de se faire
    const scrollTimer = setTimeout(updatePosition, 300); 
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
        clearTimeout(scrollTimer);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
    };
  }, [stepIndex, lang]);

  const startTour = (selectedLang: 'fr' | 'ht') => {
    setLang(selectedLang);
    setShowLanguageSelect(false);
    setStepIndex(0);
  };

  const handleNext = () => {
    if (stepIndex < STEPS_DATA[lang].length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setStepIndex(-1);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  // --- RENDER : SÉLECTEUR DE LANGUE ---
  if (showLanguageSelect) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="bg-[#0f172a] border border-emerald-500/30 p-8 rounded-[2rem] shadow-2xl w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <Languages size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black italic text-white mb-2 uppercase">Bienvenue / Byenveni</h2>
            <p className="text-slate-400 text-xs mb-8 font-medium">Chwazi lang ou pou kòmanse vizit la.</p>
            
            <div className="space-y-3">
                <button onClick={() => startTour('ht')} className="w-full py-4 bg-emerald-500 text-black rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                    KREYÒL 🇭🇹
                </button>
                <button onClick={() => startTour('fr')} className="w-full py-4 bg-slate-800 text-white border border-white/10 rounded-xl font-black uppercase tracking-widest hover:bg-slate-700 active:scale-95 transition-all">
                    FRANÇAIS 🇫🇷
                </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // --- RENDER : TOUR GUIDÉ ---
  if (stepIndex === -1 || !rect) return null;

  const currentSteps = STEPS_DATA[lang];
  const currentStep = currentSteps[stepIndex];
  const isLastStep = stepIndex === currentSteps.length - 1;

  // Logique positionnement bulle (Si élément est dans le tiers bas, bulle en haut)
  const isTooltipAbove = rect.top > window.innerHeight * 0.65;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
        
        {/* 1. FOCUS RING */}
        <motion.div
          className="absolute rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.85)]"
          initial={false}
          animate={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
            <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.4)]"></div>
        </motion.div>

        {/* 2. LA BULLE D'INFO */}
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: isTooltipAbove ? 20 : -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="absolute pointer-events-auto left-4 right-4 md:left-auto md:right-auto md:w-80 mx-auto"
          style={{
            // Position horizontale
            left: window.innerWidth > 768 ? rect.left + (rect.width/2) - 160 : 16, 
            
            // Position verticale (Correction Responsivité)
            // Si on est en haut : Top = rect.bottom + 20px
            // Si on est en bas : Bottom = (Hauteur Ecran - rect.top) + 20px
            top: !isTooltipAbove ? rect.top + rect.height + 20 : 'auto',
            bottom: isTooltipAbove ? (window.innerHeight - rect.top) + 20 : 'auto',
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
                <div className="flex gap-1.5">
                    {currentSteps.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/10'}`} />
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg active:scale-95"
                >
                    {isLastStep ? (lang === 'ht' ? "ALE JWE !" : "C'EST PARTI !") : (lang === 'ht' ? "KONTINYE" : "SUIVANT")} 
                    {isLastStep ? <Check size={14}/> : <ChevronRight size={14}/>}
                </button>
            </div>
          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
}
