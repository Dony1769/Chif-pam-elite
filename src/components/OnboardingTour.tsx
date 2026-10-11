"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Crown,
  Globe,
  ShieldCheck,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const STORAGE_KEY = "client_home_onboarding_v2";

interface Feature {
  label: string;
  description: string;
}

interface Step {
  title: string;
  subtitle: string;
  features: Feature[];
}

const STEPS: Step[] = [
  {
    title: "Bienvenue dans CHIF PAM",
    subtitle: "Une expérience immersive de progression, missions et récompenses.",
    features: [
      { label: "Missions guidées", description: "Des objectifs clairs pour lancer votre aventure." },
      { label: "Aperçu vivant", description: "Le hub en direct, vos progrès et vos gains." },
      { label: "Transitions fluides", description: "Animations premiums sans surcharge." },
    ],
  },
  {
    title: "Débloquez des missions premium",
    subtitle: "Engagez-vous, gagnez des points et débloquez chaque palier.",
    features: [
      { label: "Progression interactive", description: "Suivez vos étapes comme dans un jeu." },
      { label: "Objectifs quotidiens", description: "Chaînes d’actions claires pour avancer." },
      { label: "Bonus VIP", description: "Avantages exclusifs pour les meilleurs joueurs." },
    ],
  },
  {
    title: "Aperçu de la plateforme",
    subtitle: "Un cockpit riche en défis, places de marché et communauté.",
    features: [
      { label: "Expériences actives", description: "Des mini-jeux et challenges à explorer." },
      { label: "Marketplace réactive", description: "Accédez rapidement aux offres en un clic." },
      { label: "Chat dynamique", description: "Connexion instantanée à votre communauté." },
    ],
  },
  {
    title: "Prêt pour le premier défi ?",
    subtitle: "L’expérience vous attend. Commencez maintenant et gardez le cap.",
    features: [
      { label: "Suivi en temps réel", description: "Vos statistiques deviennent visibles dès maintenant." },
      { label: "Cinémathique légère", description: "Effets d’ambiance, onboarding maîtrisé." },
      { label: "Expérience mémorable", description: "Un accompagnement haut de gamme dès l’ouverture." },
    ],
  },
];

const INDICATORS = ["Mission", "Progression", "Aperçu", "Action"];

// Mappage dynamique des icônes
const getFeatureIcon = (label: string) => {
  switch (label) {
    case "Missions guidées":
    case "Expériences actives":
    case "Cinémathique légère":
      return <Sparkles size={18} />;
    case "Aperçu vivant":
    case "Bonus VIP":
    case "Expérience mémorable":
      return <Crown size={18} />;
    case "Progression interactive":
    case "Marketplace réactive":
      return <ArrowRight size={18} />;
    case "Objectifs quotidiens":
      return <ShieldCheck size={18} />;
    case "Chat dynamique":
      return <Globe size={18} />;
    case "Suivi en temps réel":
      return <Check size={18} />;
    default:
      return <Sparkles size={18} />;
  }
};

export default function OnboardingTour() {
  const [activeStep, setActiveStep] = useState<number>(-1);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== "dismissed") {
      const timer = window.setTimeout(() => setActiveStep(0), 600);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setActiveStep(-1);
  }, []);

  const handleNext = useCallback(() => {
    if (activeStep === STEPS.length - 1) {
      handleSkip();
      return;
    }
    setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, [activeStep, handleSkip]);

  const handlePrev = useCallback(() => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Écoute de la touche Échap pour fermer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeStep !== -1) {
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStep, handleSkip]);

  // Désactiver le scroll de fond quand le modal est ouvert
  useEffect(() => {
    if (activeStep !== -1) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeStep]);

  const current = useMemo(() => STEPS[activeStep] ?? STEPS[0], [activeStep]);
  const isLastStep = activeStep === STEPS.length - 1;
  const isFirstStep = activeStep === 0;

  if (activeStep === -1) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto">
        {/* Arrière-plan sombre avec effet flouté */}
        <motion.div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSkip}
        />

        {/* Halo lumineux d'ambiance 1 */}
        <motion.div
          className="pointer-events-none fixed left-1/2 top-1/4 -translate-x-1/2 h-64 w-64 md:h-96 md:w-96 rounded-full bg-emerald-500/15 blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Halo lumineux d'ambiance 2 */}
        <motion.div
          className="pointer-events-none fixed right-10 bottom-10 h-48 w-48 md:h-80 md:w-80 rounded-full bg-cyan-500/15 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Carte principale de l'Onboarding */}
        <motion.div
          key={activeStep}
          className="relative z-10 my-auto w-full max-w-3xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-3xl sm:rounded-[2.5rem] border border-white/10 bg-slate-950/95 p-5 sm:p-8 md:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all"
          initial={{ y: 20, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -15, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Ligne dégradée au sommet */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500" />

          {/* En-tête : Titre & Bouton fermer/ignorer */}
          <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4 sm:pb-6">
            <div className="space-y-1">
              <span className="inline-block text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
                Onboarding • Étape {activeStep + 1}/{STEPS.length}
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
                {current.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {current.subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="group shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-emerald-400/40 hover:bg-white/10 hover:text-white"
              aria-label="Ignorer le guidage"
            >
              <X size={18} className="transition-transform group-hover:rotate-90" />
            </button>
          </div>

          {/* Grille des fonctionnalités */}
          <div className="my-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            {current.features.map((feature) => (
              <motion.div
                key={feature.label}
                className="flex sm:flex-col items-start gap-3.5 sm:gap-2.5 rounded-2xl border border-white/8 bg-slate-900/60 p-3.5 sm:p-4 backdrop-blur-sm transition hover:border-white/15"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {getFeatureIcon(feature.label)}
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    {feature.label}
                  </h3>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pied de page : Indicateurs & Navigation */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/5">
            {/* Indicateurs de progression */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
              {INDICATORS.map((label, index) => (
                <div
                  key={label}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeStep
                      ? "w-7 bg-emerald-400"
                      : "w-2 bg-white/20"
                  }`}
                  title={label}
                />
              ))}
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                >
                  <ChevronLeft size={16} />
                  <span>Précédent</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition hover:bg-emerald-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{isLastStep ? "C'est parti !" : "Suivant"}</span>
                {isLastStep ? <Check size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
