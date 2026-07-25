"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Crown, CheckCircle2, Zap, ShieldCheck, 
  ChevronLeft, AlertTriangle, Loader2, Sparkles,
  Clock, HelpCircle, ChevronDown, Check
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

// --- DONNÉES STATIQUES ---
const VIP_PLANS: VipPlan[] = [
  {
    id: 'weekly',
    name: 'Elite Hebdo',
    price: 250,
    durationDays: 7,
    durationLabel: '7 JOURS',
    color: 'from-emerald-500/10 via-emerald-500/5 to-slate-900',
    border: 'border-emerald-500/30 hover:border-emerald-500/60',
    icon: <Zap className="text-emerald-400" size={24} />,
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
    badge: 'PLUS POPULAIRE',
    color: 'from-amber-500/15 via-amber-500/5 to-slate-900',
    border: 'border-amber-500/40 hover:border-amber-500/70',
    icon: <Crown className="text-amber-400" size={28} />,
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
    answer: "L'activation est instantanée dès que votre solde est débité. Vous bénéficiez immédiatement de tous les avantages liés à votre plan."
  },
  {
    question: "Puis-je changer de plan en cours d'abonnement ?",
    answer: "Pour le moment, vous devez attendre l'expiration de votre plan actuel avant de pouvoir en activer un nouveau."
  },
  {
    question: "Que se passe-t-il à la fin de la période ?",
    answer: "L'abonnement ne se renouvelle pas automatiquement. Votre compte repassera en 'Membre Standard' sans frais supplémentaires."
  }
];

export default function VipPage() {
  // --- ÉTATS ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<VipPlan | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const router = useRouter();

  // --- EFFETS ---
  useEffect(() => {
    fetchProfile();
  }, []);

  // --- FONCTIONS LOGIQUES ---
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
      setError("Solde insuffisant pour ce plan.");
      setSelectedPlan(null);
      return;
    }

    setActionLoading(true);
    setError(null);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + selectedPlan.durationDays);

    try {
      // Update Profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          balance: profile.balance - selectedPlan.price,
          vip_status: selectedPlan.id,
          vip_expiry: expiryDate.toISOString()
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // Historique de transaction
      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: -selectedPlan.price,
        type: 'subscription',
        description: `Activation plan VIP ${selectedPlan.name}`
      });

      await fetchProfile();
      setSelectedPlan(null);
    } catch (err) {
      setError("Erreur lors du traitement de la transaction. Veuillez réessayer.");
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

  // Helper pour trouver le nom du plan actif
  const getActivePlanName = () => {
    if (!profile || profile.vip_status === 'free') return 'Membre Standard';
    const active = VIP_PLANS.find(p => p.id === profile.vip_status);
    return active ? active.name : `Elite ${profile.vip_status}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24 overflow-x-hidden font-sans">
      
      {/* HEADER */}
      <header className="p-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-3 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/10 text-slate-300"
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black italic tracking-tight uppercase">
              Elite <span className="text-amber-500">Membership</span>
            </h1>
            <p className="text-xs text-slate-400">Passez au niveau supérieur</p>
          </div>
        </div>

        {/* Display Solde Utilisateur */}
        {profile && (
          <div className="text-right bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Solde disponible</p>
            <p className="text-sm font-bold text-emerald-400">{profile.balance.toLocaleString()} HTG</p>
          </div>
        )}
      </header>

      <main className="p-6 space-y-8 max-w-2xl mx-auto">
        
        {/* CARTE STATUT ACTUEL */}
        <section className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-white/10 overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-amber-400/80 tracking-widest uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Statut Actuel
              </span>
              {profile?.vip_status !== 'free' && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <Check size={12} /> Actif
                </span>
              )}
            </div>

            <h2 className="text-3xl font-black italic tracking-tight flex items-center gap-3">
              {getActivePlanName()}
              {profile?.vip_status !== 'free' && <Sparkles className="text-amber-400 animate-pulse" size={24} />}
            </h2>

            {profile?.vip_status !== 'free' && profile?.vip_expiry ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5 w-fit">
                <Clock size={15} className="text-amber-400" />
                <span>Expire le : <strong className="text-white">{new Date(profile.vip_expiry).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">
                Passez VIP pour débloquer des réductions et un support prioritaire.
              </p>
            )}
          </div>
          <Crown size={140} className="absolute -right-10 -bottom-10 opacity-5 text-amber-400 rotate-12 pointer-events-none" />
        </section>

        {/* ALERTES ERREUR */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0 }}
              className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-medium"
            >
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION PLANS OU DETAILS ABONNEMENT */}
        {profile?.vip_status === 'free' ? (
          <section className="space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Choisissez votre formule</h3>
            
            <div className="grid grid-cols-1 gap-6">
              {VIP_PLANS.map((plan) => (
                <motion.div 
                  key={plan.id}
                  whileHover={{ y: -4 }}
                  className={`relative p-7 rounded-[2.5rem] bg-gradient-to-b ${plan.color} border ${plan.border} transition-all shadow-xl`}
                >
                  {/* Badge Populaire */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-8 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-[10px] tracking-wider uppercase px-4 py-1 rounded-full shadow-lg">
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-xl font-bold uppercase tracking-tight">{plan.name}</h4>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-3xl font-black text-white">{plan.price} HTG</span>
                        <span className="text-xs text-slate-400 font-medium">/ {plan.durationLabel}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                      {plan.icon}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-slate-200">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <button 
                    disabled={actionLoading}
                    onClick={() => setSelectedPlan(plan)}
                    className="w-full py-4 bg-white hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg"
                  >
                    Activer ce plan
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        ) : (
          /* VUE ABONNEMENT ACTIF */
          <section className="p-8 border border-white/10 rounded-[2.5rem] bg-slate-900/40 text-center space-y-6">
            <div className="p-4 bg-emerald-500/10 w-fit mx-auto rounded-full text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={40} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Votre abonnement est actif</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
                Vous profitez actuellement de tous les privilèges réservés aux membres Elite.
              </p>
            </div>
            
            <button 
              onClick={handleCancel}
              disabled={actionLoading}
              className="text-rose-400 hover:text-rose-300 text-xs font-semibold tracking-wider uppercase border-b border-rose-500/30 hover:border-rose-500 pb-1 transition-all"
            >
              {actionLoading ? "Traitement..." : "Désactiver l'abonnement"}
            </button>
          </section>
        )}

        {/* SECTION FAQ */}
        <section className="pt-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <HelpCircle size={16} /> Questions fréquentes
          </h3>
          <div className="space-y-3">
            {FAQ_DATA.map((faq, index) => (
              <div 
                key={index}
                className="border border-white/5 rounded-2xl bg-slate-900/30 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-4 text-left text-xs font-semibold flex justify-between items-center text-slate-200 hover:text-white"
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
                      className="px-4 pb-4 text-xs text-slate-400 border-t border-white/5 pt-3"
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

      {/* MODAL DE CONFIRMATION ACHAT */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 p-6 rounded-3xl max-w-sm w-full space-y-6 text-center"
            >
              <div className="p-3 bg-amber-500/10 w-fit mx-auto rounded-2xl text-amber-400 border border-amber-500/20">
                <Crown size={32} />
              </div>

              <div>
                <h3 className="text-lg font-bold">Confirmer l'activation</h3>
                <p className="text-xs text-slate-400 mt-2">
                  Vous allez souscrire au plan <strong className="text-white">{selectedPlan.name}</strong> pour un montant de <strong className="text-emerald-400">{selectedPlan.price} HTG</strong>.
                </p>
              </div>

              <div className="flex gap-3">
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
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
