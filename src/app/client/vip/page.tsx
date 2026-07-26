"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Crown, CheckCircle2, Zap, ShieldCheck, 
  ChevronLeft, AlertTriangle, Loader2, Sparkles,
  Clock, HelpCircle, ChevronDown, Check, Star, PartyPopper
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES & INTERFACES ---
interface VipPlan {
  id: 'weekly' | 'monthly';
  name: string;
  price: number;
  durationDays: number;
  durationLabel: string;
  color: string;
  border: string;
  badge?: string;
  icon: React.ReactNode;
  benefits: string[];
}

interface UserProfile {
  id: string;
  balance: number;
  vip_status: string;
  vip_expiry: string | null;
}

interface FAQItem {
  question: string;
  answer: string;
}

// Helper haptique pour mobile
const triggerHaptic = () => {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate([15, 30, 15]);
    } catch {
      // Ignorer si non supporté
    }
  }
};

// --- DONNÉES STATIQUES ---
const VIP_PLANS: VipPlan[] = [
  {
    id: 'weekly',
    name: 'Elite Hebdo',
    price: 250,
    durationDays: 7,
    durationLabel: '7 JOURS',
    color: 'from-emerald-500/15 via-emerald-950/20 to-slate-950',
    border: 'border-emerald-500/40 hover:border-emerald-400',
    icon: <Zap className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" size={26} />,
    benefits: [
      '-10% sur tous les frais d\'entrée',
      'Badge VIP exclusif sur le profil',
      'Support client prioritaire 24/7'
    ]
  },
  {
    id: 'monthly',
    name: 'Elite Mensuel',
    price: 850,
    durationDays: 30,
    durationLabel: '30 JOURS',
    badge: 'LE PLUS POPULAIRE',
    color: 'from-amber-500/20 via-amber-950/30 to-slate-950',
    border: 'border-amber-500/60 hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.15)]',
    icon: <Crown className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]" size={30} />,
    benefits: [
      '-25% sur tous les frais d\'entrée',
      'Accès exclusif aux tournois VIP',
      'Traitement ultra-rapide des retraits',
      'Cadeau & Bonus mensuel garanti',
      'Badge Membre Élite Doré'
    ]
  }
];

const FAQ_DATA: FAQItem[] = [
  {
    question: "Comment fonctionne l'activation du statut VIP ?",
    answer: "L'activation est instantanée dès la validation de la transaction. Les privilèges s'appliquent immédiatement à votre compte."
  },
  {
    question: "Puis-je changer de plan en cours d'abonnement ?",
    answer: "Vous pourrez souscrire à un nouveau plan dès l'expiration de votre abonnement actuel."
  },
  {
    question: "Que se passe-t-il à la fin de la période ?",
    answer: "L'abonnement ne se renouvelle pas automatiquement. Votre compte repasse en statut standard sans aucun frais additionnel."
  }
];

// COMPOSANT CONFETTI SANS DÉPENDANCE (Framer Motion)
function VipConfetti() {
  const particles = Array.from({ length: 25 });
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: `${Math.random() * 100}vw`,
            y: -20,
            rotate: 0,
            scale: Math.random() * 0.6 + 0.6,
            opacity: 1
          }}
          animate={{
            y: '105vh',
            rotate: Math.random() * 720 - 360,
            opacity: [1, 1, 0]
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            ease: 'easeOut',
            delay: Math.random() * 0.3
          }}
          className={`absolute w-3 h-3 rounded-sm ${
            i % 3 === 0 ? 'bg-amber-400' : i % 3 === 1 ? 'bg-emerald-400' : 'bg-yellow-200'
          }`}
        />
      ))}
    </div>
  );
}

export default function VipPage() {
  // --- ÉTATS ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<VipPlan | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [celebratedPlanName, setCelebratedPlanName] = useState<string>('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');
      
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, balance, vip_status, vip_expiry')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;
      setProfile(data as UserProfile);
    } catch (err) {
      setError("Impossible de charger votre profil.");
    } finally {
      setLoading(false);
    }
  };

  const executeSubscription = async () => {
    if (!profile || !selectedPlan) return;

    if (profile.balance < selectedPlan.price) {
      setError("Solde insuffisant pour souscrire à ce plan.");
      setSelectedPlan(null);
      return;
    }

    setActionLoading(true);
    setError(null);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + selectedPlan.durationDays);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          balance: profile.balance - selectedPlan.price,
          vip_status: selectedPlan.id,
          vip_expiry: expiryDate.toISOString()
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: -selectedPlan.price,
        type: 'subscription',
        description: `Activation plan VIP ${selectedPlan.name}`
      });

      const planName = selectedPlan.name;
      setSelectedPlan(null);
      await fetchProfile();
      
      // Déclencher la célébration
      setCelebratedPlanName(planName);
      setShowCelebration(true);
      triggerHaptic();

    } catch (err) {
      setError("Erreur lors du traitement de la transaction. Veuillez reessayer.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!profile) return;
    const confirm = window.confirm("Attention : Aucun remboursement ne sera effectué. Souhaitez-vous vraiment désactiver votre abonnement ?");
    if (!confirm) return;

    setActionLoading(true);
    try {
      await supabase.from('profiles').update({ vip_status: 'free', vip_expiry: null }).eq('id', profile.id);
      await fetchProfile();
    } catch (err) {
      setError("Erreur lors de la désactivation.");
    } finally {
      setActionLoading(false);
    }
  };

  const getActivePlanName = () => {
    if (!profile || profile.vip_status === 'free') return 'Membre Standard';
    const active = VIP_PLANS.find(p => p.id === profile.vip_status);
    return active ? active.name : `Elite ${profile.vip_status}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24 overflow-x-hidden font-sans select-none">
      
      {/* EFFET CELEBRATION VIP */}
      {showCelebration && <VipConfetti />}

      {/* HEADER RESPONSIVE */}
      <header className="p-4 sm:p-6 flex items-center justify-between border-b border-white/10 backdrop-blur-md sticky top-0 z-30 bg-[#020617]/80">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="p-2.5 bg-white/5 hover:bg-white/10 transition-transform active:scale-95 rounded-2xl border border-white/10 text-slate-300"
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black italic tracking-tight uppercase flex items-center gap-1.5">
              Elite <span className="text-amber-400">Membership</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400">Privilèges & Avantages Exclusifs</p>
          </div>
        </div>

        {profile && (
          <div className="text-right bg-amber-500/10 px-3.5 py-1.5 rounded-2xl border border-amber-500/20">
            <p className="text-[9px] text-amber-300/80 uppercase font-bold">Solde</p>
            <p className="text-xs sm:text-sm font-black text-amber-400">{profile.balance.toLocaleString()} HTG</p>
          </div>
        )}
      </header>

      <main className="p-4 sm:p-6 space-y-6 max-w-xl mx-auto">
        
        {/* CARTE PASS VIP DYNAMIQUE */}
        <section className={`relative p-6 sm:p-8 rounded-[2.5rem] overflow-hidden transition-all duration-500 border shadow-2xl ${
          profile?.vip_status !== 'free' 
            ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-amber-900/30 border-amber-500/50 shadow-amber-500/10' 
            : 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-white/10'
        }`}>
          
          {/* Reflet Holographique */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border ${
                profile?.vip_status !== 'free'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}>
                {profile?.vip_status !== 'free' ? 'PASS VIP ACTIF' : 'MEMBRE STANDARD'}
              </span>

              {profile?.vip_status !== 'free' && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <Check size={12} /> BÉNÉFICES ACTIFS
                </span>
              )}
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight flex items-center gap-2">
                {getActivePlanName()}
                {profile?.vip_status !== 'free' && (
                  <Sparkles className="text-amber-400 animate-pulse" size={24} />
                )}
              </h2>
            </div>

            {profile?.vip_status !== 'free' && profile?.vip_expiry ? (
              <div className="flex items-center gap-2 text-xs text-amber-200/90 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 backdrop-blur-md">
                <Clock size={16} className="text-amber-400 shrink-0" />
                <span>Valide jusqu'au : <strong className="text-white">{new Date(profile.vip_expiry).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Passez Membre VIP dès maintenant pour débloquer toutes les fonctionnalités exclusives.
              </p>
            )}
          </div>

          <Crown size={150} className={`absolute -right-8 -bottom-8 transition-opacity duration-500 pointer-events-none rotate-12 ${
            profile?.vip_status !== 'free' ? 'opacity-15 text-amber-400' : 'opacity-5 text-white'
          }`} />
        </section>

        {/* ALERTE ERREUR */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-semibold"
            >
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LISTE DES FORMULES OU ACTIONS */}
        {profile?.vip_status === 'free' ? (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Choisis ta formule</h3>
              <span className="text-[10px] text-amber-400/80 font-bold flex items-center gap-1">
                <Star size={12} /> Instantané
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {VIP_PLANS.map((plan) => (
                <motion.div 
                  key={plan.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => triggerHaptic()}
                  className={`relative p-6 sm:p-7 rounded-[2.5rem] bg-gradient-to-b ${plan.color} border ${plan.border} transition-all shadow-xl overflow-hidden`}
                >
                  {plan.badge && (
                    <div className="absolute -top-0.5 right-8 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-[9px] tracking-widest uppercase px-3 py-1 rounded-b-xl shadow-lg flex items-center gap-1">
                      <Sparkles size={10} /> {plan.badge}
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h4 className="text-lg font-black uppercase tracking-tight text-white">{plan.name}</h4>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl sm:text-3xl font-black text-amber-400">{plan.price} HTG</span>
                        <span className="text-xs text-slate-400 font-medium">/ {plan.durationLabel}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                      {plan.icon}
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {plan.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-xs text-slate-200">
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <button 
                    disabled={actionLoading}
                    onClick={() => setSelectedPlan(plan)}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-transform active:scale-95 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    Devenir VIP
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        ) : (
          <section className="p-6 border border-white/10 rounded-[2.5rem] bg-slate-900/40 text-center space-y-4">
            <div className="p-3.5 bg-emerald-500/10 w-fit mx-auto rounded-full text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={36} />
            </div>
            <div>
              <h3 className="text-base font-bold">Abonnement Actif</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Vous profitez actuellement de tous vos privilèges VIP sur la plateforme.
              </p>
            </div>
            
            <button 
              onClick={handleCancel}
              disabled={actionLoading}
              className="text-rose-400 hover:text-rose-300 text-[11px] font-bold tracking-wider uppercase border-b border-rose-500/30 hover:border-rose-500 pb-0.5 transition-all"
            >
              {actionLoading ? "Traitement..." : "Résilier l'abonnement"}
            </button>
          </section>
        )}

        {/* FAQ ACCORDEON */}
        <section className="pt-2 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle size={15} /> Foire aux questions
          </h3>
          <div className="space-y-2.5">
            {FAQ_DATA.map((faq, index) => (
              <div 
                key={index}
                className="border border-white/5 rounded-2xl bg-slate-900/30 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-4 text-left text-xs font-semibold flex justify-between items-center text-slate-200"
                >
                  <span>{faq.question}</span>
                  <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 text-slate-400 ${openFaq === index ? 'rotate-180' : ''}`} 
                  />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 text-xs text-slate-400 border-t border-white/5 pt-2.5"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* MODAL CONFIRMATION ACHAT */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-amber-500/30 p-6 rounded-3xl max-w-xs w-full space-y-5 text-center shadow-2xl shadow-amber-500/10"
            >
              <div className="p-3 bg-amber-500/10 w-fit mx-auto rounded-2xl text-amber-400 border border-amber-500/30">
                <Crown size={32} />
              </div>

              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Activer le VIP</h3>
                <p className="text-xs text-slate-300 mt-2">
                  Confirmez-vous l'activation du plan <strong className="text-amber-400">{selectedPlan.name}</strong> pour <strong className="text-emerald-400">{selectedPlan.price} HTG</strong> ?
                </p>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setSelectedPlan(null)}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={executeSubscription}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'Valider'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CÉLÉBRATION DE BIENVENUE VIP */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-b from-amber-950/80 via-slate-900 to-black border-2 border-amber-400/80 p-6 sm:p-8 rounded-[2.5rem] max-w-xs w-full text-center space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.3)] relative overflow-hidden"
            >
              <div className="absolute -top-10 -left-10 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

              <div className="p-4 bg-gradient-to-tr from-amber-500 to-yellow-300 text-black w-fit mx-auto rounded-full shadow-lg shadow-amber-500/30 animate-bounce">
                <PartyPopper size={36} />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">FÉLICITATIONS</span>
                <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white">BIENVENUE CHEZ L'ÉLITE !</h3>
                <p className="text-xs text-slate-300 pt-1">
                  Votre formule <strong className="text-amber-400">{celebratedPlanName}</strong> est désormais active. Profitez immédiatement de vos avantages VIP.
                </p>
              </div>

              <button
                onClick={() => setShowCelebration(false)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-transform"
              >
                PROFITER DE MES AVANTAGES
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
