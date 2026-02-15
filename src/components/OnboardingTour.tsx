"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check, Languages } from 'lucide-react';

// --- DONNÉES DU TOUR (TRADUITES) ---
const STEPS = [
  { 
    target: "balance-card", 
    content: {
      fr: {
        title: "VOS RESSOURCES",
        desc: "Voici votre moteur de jeu ! Vos Jetons CP pour jouer et votre solde Gourdes (HTG). Vous pouvez convertir vos CP ici."
      },
      ht: {
        title: "RESOUS OU YO",
        desc: "Men motè jwèt ou a! Jeton CP pou jwe ak balans Goud (HTG) ou. Ou ka konvèti CP ou yo la a."
      }
    }
  },
  { 
    target: "market-btn", 
    content: {
      fr: {
        title: "BOUTIQUE ELITE",
        desc: "Le raccourci rapide pour acheter des packs de CP ou échanger vos diamants."
      },
      ht: {
        title: "BOUTIK ELITE",
        desc: "Wout kout pou achte pakèt CP rapid oswa chanje Dyamantes ou yo."
      }
    }
  },
  { 
    target: "challenges-section", 
    content: {
      fr: {
        title: "ZONE DE MISSION",
        desc: "C'est le cœur de l'action. Choisissez un défi, battez le score et remportez la mise."
      },
      ht: {
        title: "ZÒN MISYON",
        desc: "Se la aksyon an ye! Chwazi yon defi, fè gwo skò epi ranpòte lamiz la."
      }
    }
  },
  { 
    target: "nav-profile", // ID ajouté dans la page Home
    content: {
      fr: {
        title: "FINANCES & COMPTE",
        desc: "C'est ici que ça se passe ! Pour effectuer un DÉPÔT ou un RETRAIT, accédez maintenant à votre Profil."
      },
      ht: {
        title: "FINANS & KONT",
        desc: "Se la tout bagay regle! Pou fè DEPÒT oswa RETRÈ, klike la a pou ale sou Pwofil ou."
      }
    }
  }
];

export default function OnboardingTour() {
  // États
  const [isActive, setIsActive] = useState(false); // Le tour est-il actif ?
  const [language, setLanguage] = useState<'fr' | 'ht' | null>(null); // Langue choisie
  const [stepIndex, setStepIndex] = useState<number>(-1); // Étape actuelle (-1 = pas commencé)
  const [rect, setRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  
  // CLÉ DE VERSION (Changer ceci reset le tour pour tout le monde)
  const STORAGE_KEY = 'has_seen_home_tour_v4';

  // 1. VÉRIFICATION AU CHARGEMENT
  useEffect(() => {
    const hasSeenTour = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenTour) {
      // Petit délai pour l'UX
      const timer = setTimeout(() => setIsActive(true), 1200); 
      return () => clearTimeout(timer);
    }
  }, []);

  // 2. CALCUL DE LA POSITION (Se lance quand stepIndex change)
  useEffect(() => {
    if (stepIndex === -1 || stepIndex >= STEPS.length || !isActive) {
        setRect(null);
        return;
    }

    const updatePosition = () => {
      const targetId = STEPS[stepIndex].target;
      const element = document.getElementById(targetId);

      if (element) {
        // Scroll intelligent
        const blockPosition = stepIndex === 3 ? 'end' : 'center'; // Pour le menu du bas, on scroll en bas
        element.scrollIntoView({ behavior: 'smooth', block: blockPosition });

        const r = element.getBoundingClientRect();
        setRect({
          top: r.top - 8,
          left: r.left - 8,
          width: r.width + 16,
          height: r.height + 16
        });
      } else {
        // Sécurité si l'élément n'existe pas
        console.warn(`Element #${targetId} introuvable.`);
        handleNext(); 
      }
    };

    const scrollTimer = setTimeout(updatePosition, 300); // Délai pour laisser le scroll se finir
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
        clearTimeout(scrollTimer);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
    };
  }, [stepIndex, isActive]);

  // ACTIONS
  const startTour = (lang: 'fr' | 'ht') => {
    setLanguage(lang);
    setStepIndex(0);
  };

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setIsActive(false);
    setStepIndex(-1);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  // Si le tour n'est pas actif, on ne rend rien
  if (!isActive) return null;

  // --- ÉCRAN 1 : SÉLECTION DE LA LANGUE ---
  if (!language) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="bg-[#0f172a] border border-white/10 p-8 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
          >
            {/* Décoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500" />
            
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                <Languages size={32} className="text-emerald-500" />
            </div>

            <h2 className="text-2xl font-black italic uppercase text-white mb-2 tracking-tighter">Bienvenue / Byenveni</h2>
            <p className="text-slate-400 text-xs mb-8 font-medium">Chwazi lang ou pou n kòmanse vizit la.<br/>Choisissez votre langue pour commencer.</p>

            <div className="space-y-3">
                <button onClick={() => startTour('ht')} className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                    🇭🇹 Kreyòl
                </button>
                <button onClick={() => startTour('fr')} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-95">
                    🇫🇷 Français
                </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // --- ÉCRAN 2 : LE TOUR ---
  if (stepIndex === -1 || !rect) return null;

  const currentStep = STEPS[stepIndex];
  const content = currentStep.content[language];
  const isLastStep = stepIndex === STEPS.length - 1;
  const isTooltipAbove = rect.top > window.innerHeight * 0.6; // Si l'élément est bas, bulle en haut

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-none">
        
        {/* FOCUS RING */}
        <motion.div
          className="absolute rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.90)]" 
          initial={false}
          animate={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        >
            <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.6)]"></div>
        </motion.div>

        {/* TOOLTIP */}
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: isTooltipAbove ? 10 : -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="absolute pointer-events-auto left-4 right-4 md:left-auto md:right-auto md:w-80 mx-auto"
          style={{
            left: window.innerWidth > 768 ? rect.left + (rect.width/2) - 160 : 16, 
            top: !isTooltipAbove ? rect.top + rect.height + 20 : 'auto',
            bottom: isTooltipAbove ? window.innerHeight - rect.top + 20 : 'auto',
          }}
        >
          <div className="bg-[#0f172a] border border-emerald-500/30 p-5 rounded-[1.5rem] shadow-2xl relative">
            {/* Flèche */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[#0f172a] border-l border-t border-emerald-500/30 transform rotate-45 ${isTooltipAbove ? '-bottom-2.5 border-l-0 border-t-0 border-r border-b' : '-top-2.5'}`}></div>

            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-black text-xs font-black shadow-lg shadow-emerald-500/20">
                        {stepIndex + 1}
                    </div>
                    <h3 className="text-sm font-black italic uppercase tracking-wider text-white">{content.title}</h3>
                </div>
                <button onClick={finishTour} className="p-1 bg-white/5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <X size={14} />
                </button>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-6 font-medium border-l-2 border-white/10 pl-3">
                {content.desc}
            </p>

            <div className="flex justify-between items-center">
                <div className="flex gap-1.5">
                    {STEPS.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-emerald-500' : 'w-1.5 bg-white/10'}`} />
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-lg active:scale-95"
                >
                    {isLastStep ? (language === 'ht' ? "AN ALE !" : "C'EST PARTI !") : (language === 'ht' ? "SUIVAN" : "SUIVANT")} 
                    {isLastStep ? <Check size={14}/> : <ChevronRight size={14}/>}
                </button>
            </div>
          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
}

