"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check, Languages } from 'lucide-react';

// --- CONTENU DU TOUR (Français & Kreyòl) ---
const STEPS_CONTENT = {
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
      desc: "C'est ici que ça se passe ! Pour effectuer un DÉPÔT ou un RETRAIT, cliquez ici pour accéder à votre Profil." 
    }
  ],
  ht: [
    { 
      target: "balance-card", 
      title: "RESOUS OU YO", 
      desc: "Men motè jwèt ou a! Jetons CP pou jwe ak balans Goud (HTG) ou. Ou ka konvèti CP ou yo la a." 
    },
    { 
      target: "market-btn", 
      title: "BOUTIK ELIT", 
      desc: "Chemen kout pou achte pakèt CP rapid oswa chanje dyaman ou yo." 
    },
    { 
      target: "challenges-section", 
      title: "ZÒN MISYON", 
      desc: "Se la tout aksyon an ye. Chwazi yon defi, kraze skò a epi ranpòte miz la." 
    },
    { 
      target: "nav-profile", 
      title: "FINANS & KONT", 
      desc: "Se la tout bagay regle! Pou fè yon DEPÒT oswa yon RETRÈ, klike la a pou ale sou Pwofil ou." 
    }
  ]
};

export default function OnboardingTour() {
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [showLangSelect, setShowLangSelect] = useState(false);
  const [lang, setLang] = useState<'fr' | 'ht'>('fr');
  const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  
  // Démarrage automatique (v5 pour reset chez tout le monde)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('has_seen_home_tour_v5'); 
    if (!hasSeenTour) {
      // On lance d'abord le choix de langue après un petit délai
      const timer = setTimeout(() => setShowLangSelect(true), 1000); 
      return () => clearTimeout(timer);
    }
  }, []);

  // Lancer le tour après choix de langue
  const startTour = (selectedLang: 'fr' | 'ht') => {
    setLang(selectedLang);
    setShowLangSelect(false);
    setStepIndex(0);
  };

  // Calcul de la position
  useEffect(() => {
    if (stepIndex === -1 || stepIndex >= STEPS_CONTENT[lang].length) {
        setRect(null);
        return;
    }

    const updatePosition = () => {
      const targetId = STEPS_CONTENT[lang][stepIndex].target;
      const element = document.getElementById(targetId);

      if (element) {
        // Scroll intelligent : Si c'est les dernières étapes (3 ou 4), on scroll en bas
        const blockPosition = stepIndex >= 2 ? 'center' : 'center'; 
        // Note: pour le nav-profile (step 3/index 3), 'center' ou 'end' marche bien
        
        element.scrollIntoView({ behavior: 'smooth', block: blockPosition });

        const r = element.getBoundingClientRect();
        setRect({
          top: r.top - 8,
          left: r.left - 8,
          width: r.width + 16,
          height: r.height + 16
        });
      } else {
        console.warn(`Element #${targetId} non trouvé.`);
        // Si élément introuvable (ex: menu fermé), on passe
        handleNext(); 
      }
    };

    const scrollTimer = setTimeout(updatePosition, 300); // Délai un peu plus long pour le scroll
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
        clearTimeout(scrollTimer);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
    };
  }, [stepIndex, lang]);

  const handleNext = () => {
    if (stepIndex < STEPS_CONTENT[lang].length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setStepIndex(-1);
    localStorage.setItem('has_seen_home_tour_v5', 'true');
  };

  // --- RENDU : SÉLECTION DE LANGUE ---
  if (showLangSelect) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="bg-[#0f172a] border border-white/10 p-8 rounded-[2rem] w-full max-w-sm text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <Languages size={32} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-black italic uppercase text-white mb-2">Bienvenue / Byenveni</h2>
            <p className="text-slate-400 text-xs mb-8">Choisissez votre langue pour la visite guidée.<br/>Chwazi lang ou pou vizit la.</p>
            
            <div className="space-y-3">
              <button onClick={() => startTour('fr')} className="w-full py-4 bg-emerald-500 text-black rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all">
                Français 🇫🇷
              </button>
              <button onClick={() => startTour('ht')} className="w-full py-4 bg-slate-800 text-white border border-white/5 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-700">
                Kreyòl 🇭🇹
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // --- RENDU : TOUR ---
  if (stepIndex === -1 || !rect) return null;

  const currentStep = STEPS_CONTENT[lang][stepIndex];
  const isLastStep = stepIndex === STEPS_CONTENT[lang].length - 1;

  // LOGIQUE DE POSITIONNEMENT (RESPONSIVE)
  // Si l'élément est dans la moitié basse de l'écran, on met la bulle AU-DESSUS.
  const isTooltipAbove = rect.top > window.innerHeight * 0.55;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
        
        {/* 1. FOCUS RING */}
        <motion.div
          className="absolute rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.90)]" // Fond très sombre pour focus
          initial={false}
          animate={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          transition={{ type: "spring", stiffness: 80, damping: 25 }}
        >
            <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.6)]"></div>
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
            // Centrage horizontal sur l'élément si écran large, sinon marge standard mobile
            left: window.innerWidth > 768 ? rect.left + (rect.width/2) - 160 : 16, 
            
            // Positionnement Vertical
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
                    {STEPS_CONTENT[lang].map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/10'}`} />
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg active:scale-95"
                >
                    {isLastStep ? (lang === 'fr' ? "C'EST PARTI !" : "AN ALE !") : (lang === 'fr' ? "SUIVANT" : "KONTINYE")} 
                    {isLastStep ? <Check size={14}/> : <ChevronRight size={14}/>}
                </button>
            </div>
          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
}
