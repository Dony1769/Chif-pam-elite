"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check, Globe } from 'lucide-react';

// --- CONTENU MULTILINGUE ---
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
      desc: "C'est ici que ça se passe ! Pour effectuer un DÉPÔT ou un RETRAIT, accédez maintenant à votre Profil (Compte)." 
    }
  ],
  ht: [
    { 
      target: "balance-card", 
      title: "RESOUS OU YO", 
      desc: "Sa se motè jwèt ou! Jeton CP pou jwe ak balans Goud (HTG) ou. Ou ka konvèti CP ou yo la a." 
    },
    { 
      target: "market-btn", 
      title: "BOUTIK ELITE", 
      desc: "Wout kout pou achte pakèt CP oswa chanje dyaman ou yo rapid." 
    },
    { 
      target: "challenges-section", 
      title: "ZÒN MISYON", 
      desc: "Se la aksyon an ye. Chwazi yon defi, bat skò a epi ranpòte miz la." 
    },
    { 
      target: "nav-profile", 
      title: "FINANS & KONT", 
      desc: "Se la bagay yo pase! Pou fè yon DEPOT oswa yon RETRÈ, ale nan Profil ou (Kont) kounye a." 
    }
  ]
};

export default function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [showLangSelect, setShowLangSelect] = useState(false);
  const [lang, setLang] = useState<'fr' | 'ht'>('fr');
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  
  // 1. Démarrage automatique (v4 pour reset chez tout le monde)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('has_seen_home_tour_v4'); 
    if (!hasSeenTour) {
      // Petit délai pour laisser le site charger
      const timer = setTimeout(() => {
        setShowLangSelect(true); // On commence par le choix de langue
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. Gestion du choix de langue
  const selectLanguage = (selectedLang: 'fr' | 'ht') => {
    setLang(selectedLang);
    setShowLangSelect(false);
    setIsActive(true); // Lance le tour
    setStepIndex(0);
  };

  // 3. Calcul de la position de l'élément cible
  useEffect(() => {
    if (!isActive) {
        setRect(null);
        return;
    }

    const updatePosition = () => {
      const steps = STEPS_CONTENT[lang];
      if (stepIndex >= steps.length) return;

      const targetId = steps[stepIndex].target;
      const element = document.getElementById(targetId);

      if (element) {
        // Scroll intelligent : 'center' pour le haut, 'end' pour le bas (menu)
        // Si c'est l'étape 3 ou 4 (Défis ou Profil), on scroll vers le bas
        const blockPosition = stepIndex >= 2 ? 'center' : 'center';
        
        element.scrollIntoView({ behavior: 'smooth', block: blockPosition });

        const r = element.getBoundingClientRect();
        setRect({
          top: r.top - 8, 
          left: r.left - 8,
          width: r.width + 16,
          height: r.height + 16
        });
      } else {
        // Si l'élément n'est pas trouvé (ex: id manquant), on passe
        console.warn(`Element #${targetId} non trouvé.`);
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
  }, [stepIndex, isActive, lang]);

  const handleNext = () => {
    if (stepIndex < STEPS_CONTENT[lang].length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setIsActive(false);
    setRect(null);
    localStorage.setItem('has_seen_home_tour_v4', 'true');
  };

  // --- RENDU : SÉLECTEUR DE LANGUE ---
  if (showLangSelect) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-[#0f172a] border border-emerald-500/30 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center"
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <Globe className="text-emerald-500" size={32} />
            </div>
            <h2 className="text-2xl font-black italic uppercase text-white mb-2">BIENVENUE</h2>
            <p className="text-slate-400 text-xs mb-8">Choisissez votre langue / Chwazi lang ou</p>
            
            <div className="space-y-3">
              <button onClick={() => selectLanguage('fr')} className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95">
                FRANÇAIS 🇫🇷
              </button>
              <button onClick={() => selectLanguage('ht')} className="w-full py-4 bg-slate-800 text-white border border-white/10 rounded-xl font-black uppercase tracking-widest hover:border-emerald-500 transition-all active:scale-95">
                KREYÒL 🇭🇹
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // --- RENDU : LE TOUR ---
  if (!isActive || !rect) return null;

  const steps = STEPS_CONTENT[lang];
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  // LOGIQUE RESPONSIVE AMÉLIORÉE POUR LA POSITION DE LA BULLE
  // Si l'élément est dans la moitié basse de l'écran (> 50% hauteur), on met la bulle AU-DESSUS.
  // Cela corrige le problème pour les étapes 3 (Défis) et 4 (Profil).
  const isTooltipAbove = rect.top > window.innerHeight * 0.5;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
        
        {/* 1. FOCUS RING (Le carré lumineux autour de l'élément) */}
        <motion.div
          className="absolute rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.85)]" // Fond sombre
          initial={false}
          animate={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
            {/* Bordure animée */}
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
            // Centrage horizontal (sauf si sur desktop on veut le coller à l'élément)
            left: window.innerWidth > 768 ? Math.min(Math.max(16, rect.left + (rect.width/2) - 160), window.innerWidth - 336) : 16,
            
            // Positionnement Vertical
            // Si above : on le place au-dessus du rect (top = auto, bottom = distance du bas)
            top: isTooltipAbove ? 'auto' : rect.top + rect.height + 20,
            bottom: isTooltipAbove ? (window.innerHeight - rect.top) + 20 : 'auto',
          }}
        >
          <div className="bg-[#0f172a] border border-emerald-500/40 p-5 rounded-[1.5rem] shadow-2xl relative">
            
            {/* Flèche indicative (Triangle) */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0f172a] border-l border-t border-emerald-500/40 transform rotate-45 ${
                isTooltipAbove 
                ? '-bottom-2.5 border-l-0 border-t-0 border-r border-b' // Flèche pointe vers le bas
                : '-top-2.5' // Flèche pointe vers le haut
            }`}></div>

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
                    {steps.map((_, i) => (
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

