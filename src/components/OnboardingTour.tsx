"use client";

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Crown, Globe, ShieldCheck, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'client_home_onboarding_v2';

const STEPS = [
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
      { label: "Ciné́matique légère", description: "Effets d’ambiance, onboarding maîtrisé." },
      { label: "Expérience mémorable", description: "Un accompagnement haut de gamme dès l’ouverture." },
    ],
  },
];

const indicators = ['Mission', 'Progression', 'Aperçu', 'Action'];

export default function OnboardingTour() {
  const [activeStep, setActiveStep] = useState<number>(-1);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== 'dismissed') {
      const timer = window.setTimeout(() => setActiveStep(0), 600);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, []);

  const current = useMemo(() => STEPS[activeStep] ?? STEPS[0], [activeStep]);
  const isLastStep = activeStep === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
      setActiveStep(-1);
      return;
    }

    setActiveStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    setActiveStep(-1);
  };

  if (activeStep === -1) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1000] flex items-center justify-center px-4 py-6 md:px-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        <motion.div
          className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
          animate={{ x: [0, 20, 0], y: [0, -12, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl"
          animate={{ x: [0, -18, 0], y: [0, 14, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          key={activeStep}
          className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/95 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          initial={{ y: 24, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500" />

          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-400/80">Onboarding</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">{current.title}</h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">{current.subtitle}</p>
              </div>

              <button
                type="button"
                onClick={handleSkip}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.35em] text-slate-200 transition hover:border-emerald-400/50 hover:bg-white/10"
              >
                Ignorer
              </button>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {current.features.map((feature) => (
                <motion.div
                  key={feature.label}
                  className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-[inset_0_0_1px_rgba(255,255,255,0.04)]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                    {feature.label === 'Missions guidées' && <Sparkles size={20} />}
                    {feature.label === 'Aperçu vivant' && <Crown size={20} />}
                    {feature.label === 'Progression interactive' && <ArrowRight size={20} />}
                    {feature.label === 'Objectifs quotidiens' && <ShieldCheck size={20} />}
                    {feature.label === 'Bonus VIP' && <Crown size={20} />}
                    {feature.label === 'Expériences actives' && <Sparkles size={20} />}
                    {feature.label === 'Marketplace réactive' && <ArrowRight size={20} />}
                    {feature.label === 'Chat dynamique' && <Globe size={20} />}
                    {feature.label === 'Suivi en temps réel' && <Check size={20} />}
                    {feature.label === 'Ciné́matique légère' && <Sparkles size={20} />}
                    {feature.label === 'Expérience mémorable' && <Crown size={20} />}
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.25em] text-white">{feature.label}</h3>
                  <p className="mt-3 text-[12px] leading-6 text-slate-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {indicators.map((label, index) => (
                  <div
                    key={label}
                    className={`rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.35em] ${index === activeStep ? 'bg-emerald-400 text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.25)]' : 'bg-white/5 text-slate-400'}`}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-[11px] font-black uppercase tracking-[0.35em] text-slate-950 shadow-[0_15px_30px_rgba(16,185,129,0.32)] transition hover:scale-[1.01] active:scale-[0.98]"
              >
                {isLastStep ? 'Je commence' : 'Suivant'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

