"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Crown,
  CheckCircle2,
  Zap,
  ChevronLeft,
  AlertTriangle,
  Loader2,
  Sparkles,
  Clock,
  HelpCircle,
  ChevronDown,
  Check,
  X,
  Award,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- TYPES & INTERFACES ---
interface VipPlan {
  id: "weekly" | "monthly";
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
    id: "weekly",
    name: "Elite Hebdo",
    price: 250,
    durationDays: 7,
    durationLabel: "7 JOURS",
    color: "from-emerald-500/10 via-emerald-500/5 to-slate-900",
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    icon: <Zap className="text-emerald-400" size={24} />,
    benefits: [
      "-10% sur tous les frais d'entrée",
      "Badge VIP exclusif sur le profil",
      "Support client prioritaire 24/7",
    ],
  },
  {
    id: "monthly",
    name: "Elite Mensuel",
    price: 850,
    durationDays: 30,
    durationLabel: "30 JOURS",
    badge: "PLUS POPULAIRE",
    color: "from-amber-500/20 via-amber-500/5 to-slate-900",
    border:
      "border-amber-500/50 hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.15)]",
    icon: <Crown className="text-amber-400" size={28} />,
    benefits: [
      "-25% sur tous les frais d'entrée",
      "Accès exclusif aux tournois VIP",
      "Traitement ultra-rapide des retraits",
      "Cadeau & Bonus mensuel garanti",
      "Badge Membre Élite Doré",
    ],
  },
];

const FAQ_DATA: FAQItem[] = [
  {
    question: "Comment fonctionne l'activation du statut VIP ?",
    answer:
      "L'activation est instantanée dès que la transaction est validée. Vous bénéficiez immédiatement de tous les avantages liés à votre plan.",
  },
  {
    question: "Puis-je cumuler ou renouveler mon abonnement ?",
    answer:
      "Oui ! Si vous souscrivez à un nouveau plan alors que votre statut est encore actif, la durée de votre nouvel abonnement s'ajoutera à votre période actuelle.",
  },
  {
    question: "Que se passe-t-il à la fin de la période ?",
    answer:
      "L'abonnement ne se renouvelle pas automatiquement. À l'expiration, votre compte repassera en 'Membre Standard' sans aucun frais additionnel.",
  },
];

export default function VipPage() {
  // --- ÉTATS ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modales & Interactivité
  const [selectedPlan, setSelectedPlan] = useState<VipPlan | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [activatedPlanName, setActivatedPlanName] = useState<string>("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const router = useRouter();

  // --- NETTOYAGE AUTOMATIQUE DES ERREURS ---
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  // --- CHARGEMENT SÉCURISÉ DU PROFIL ---
  const fetchProfile = useCallback(async () => {
    let isMounted = true;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, balance, vip_status, vip_expiry")
        .eq("id", user.id)
        .single();

      if (fetchError) throw fetchError;

      if (isMounted && data) {
        setProfile(data as UserProfile);
      }
    } catch {
      if (isMounted) {
        setError("Impossible de charger les informations de votre profil.");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  // --- ACTION : EXÉCUTER L'ABONNEMENT VIA RPC SÉCURISÉE ---
  const executeSubscription = async () => {
    if (!profile || !selectedPlan || actionLoading) return;

    if (profile.balance < selectedPlan.price) {
      setError("Solde insuffisant pour souscrire à ce plan.");
      setSelectedPlan(null);
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      // Exécution de la transaction de manière atomique en base de données
      const { data, error: rpcError } = await supabase.rpc(
        "subscribe_vip_plan",
        {
          p_plan_id: selectedPlan.id,
          p_price: selectedPlan.price,
          p_duration_days: selectedPlan.durationDays,
          p_plan_name: selectedPlan.name,
        }
      );

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        setError(data.message || "Erreur lors de l'activation.");
        setSelectedPlan(null);
        return;
      }

      setActivatedPlanName(selectedPlan.name);
      await fetchProfile();
      setSelectedPlan(null);
      setShowSuccessModal(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors du traitement.";
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  // --- ACTION : CONFIRMER L'ANNULATION VIA RPC SÉCURISÉE ---
  const confirmCancelSubscription = async () => {
    if (!profile || actionLoading) return;

    setActionLoading(true);
    setError(null);

    try {
      const { data, error: cancelErr } = await supabase.rpc(
        "cancel_vip_subscription"
      );

      if (cancelErr) throw cancelErr;

      if (data && !data.success) {
        setError(data.message || "Erreur lors de la désactivation.");
        return;
      }

      await fetchProfile();
      setShowCancelModal(false);
    } catch {
      setError("Erreur lors de la désactivation de votre abonnement.");
    } finally {
      setActionLoading(false);
    }
  };

  // Nom du plan actif
  const getActivePlanName = () => {
    if (!profile || profile.vip_status === "free") return "Membre Standard";
    const active = VIP_PLANS.find((p) => p.id === profile.vip_status);
    return active ? active.name : `Elite ${profile.vip_status}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-amber-400" size={36} />
        <p className="text-xs text-amber-300/80 font-bold tracking-widest uppercase animate-pulse">
          Chargement du Club VIP...
        </p>
      </div>
    );
  }

  // Vérification de la validité réelle de la date VIP
  const isVip =
    profile?.vip_status !== "free" &&
    profile?.vip_expiry !== null &&
    new Date(profile?.vip_expiry ?? 0) > new Date();

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24 overflow-x-hidden font-sans relative">
      {/* HEADER */}
      <header className="p-5 sm:p-6 flex items-center justify-between border-b border-white/10 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 active:scale-95 transition-all rounded-2xl border border-white/10 text-slate-300"
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black italic tracking-tight uppercase flex items-center gap-2">
              Elite{" "}
              <span className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                Membership
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400">
              Espace Privilégié & VIP
            </p>
          </div>
        </div>

        {/* SOLDE */}
        {profile && (
          <div className="text-right bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <p className="text-[9px] sm:text-[10px] text-emerald-400/80 uppercase tracking-wider font-semibold">
              Solde
            </p>
            <p className="text-xs sm:text-sm font-black text-emerald-400">
              {profile.balance.toLocaleString()} HTG
            </p>
          </div>
        )}
      </header>

      <main className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-xl mx-auto">
        {/* CARTE STATUT VIP PREMIUM */}
        <section
          className={`relative p-6 sm:p-8 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 ${
            isVip
              ? "bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
              : "bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-white/10"
          }`}
        >
          {isVip && (
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          )}

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span
                className={`text-[10px] sm:text-[11px] font-black tracking-widest uppercase px-3 py-1 rounded-full border ${
                  isVip
                    ? "text-amber-300 bg-amber-500/20 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                    : "text-slate-400 bg-white/5 border-white/10"
                }`}
              >
                Statut Actuel
              </span>

              {isVip ? (
                <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-300 font-bold bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse">
                  <Check size={13} /> VIP MEMBRE
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium bg-white/5 px-2.5 py-1 rounded-full">
                  Standard
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight flex items-center gap-2.5">
              {getActivePlanName()}
              {isVip && (
                <Sparkles
                  className="text-amber-400 animate-spin"
                  style={{ animationDuration: "6s" }}
                  size={24}
                />
              )}
            </h2>

            {isVip && profile?.vip_expiry ? (
              <div className="mt-4 flex items-center gap-2.5 text-xs text-amber-200/90 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 w-fit backdrop-blur-md">
                <Clock size={16} className="text-amber-400 shrink-0" />
                <span>
                  Membre Privilégié jusqu&apos;au :{" "}
                  <strong className="text-white font-bold">
                    {new Date(profile.vip_expiry).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Rejoignez l&apos;élite pour débloquer des réductions
                immédiates, des accès réservés et un support prioritaire.
              </p>
            )}
          </div>

          <Crown
            size={150}
            className={`absolute -right-8 -bottom-8 pointer-events-none transition-opacity duration-500 ${
              isVip
                ? "opacity-15 text-amber-400 rotate-12"
                : "opacity-5 text-slate-400"
            }`}
          />
        </section>

        {/* NOTIFICATION D'ERREUR */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-rose-300 text-xs font-semibold shadow-lg backdrop-blur-xl"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION SÉLECTION DES PLANS */}
        {!isVip ? (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Choisissez votre formule
              </h3>
              <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} /> Avantages instantanés
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {VIP_PLANS.map((plan) => (
                <motion.div
                  key={plan.id}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.99 }}
                  className={`relative p-6 sm:p-7 rounded-[2.2rem] bg-gradient-to-b ${plan.color} border ${plan.border} transition-all shadow-xl overflow-hidden`}
                >
                  {plan.badge && (
                    <div className="absolute -top-0.5 right-6 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-black text-[9px] tracking-widest uppercase px-3.5 py-1 rounded-b-xl shadow-lg flex items-center gap-1">
                      <Crown size={11} /> {plan.badge}
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h4 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                        {plan.name}
                      </h4>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
                          {plan.price} HTG
                        </span>
                        <span className="text-xs text-slate-400 font-bold uppercase">
                          / {plan.durationLabel}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                      {plan.icon}
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {plan.benefits.map((benefit, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-xs text-slate-200"
                      >
                        <CheckCircle2
                          size={16}
                          className="text-emerald-400 shrink-0 mt-0.5"
                        />
                        <span className="font-medium">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={actionLoading}
                    onClick={() => setSelectedPlan(plan)}
                    className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-95 disabled:opacity-50"
                  >
                    <Crown size={16} /> Activer le statut VIP
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        ) : (
          /* SECTION ABONNEMENT ACTIF DE LUXE */
          <section className="p-6 sm:p-8 border border-amber-500/30 rounded-[2.5rem] bg-gradient-to-b from-slate-900/80 to-slate-950/80 text-center space-y-5 shadow-[0_0_30px_rgba(245,158,11,0.1)] backdrop-blur-xl">
            <div className="relative p-4 bg-gradient-to-br from-amber-500/20 to-amber-500/5 w-fit mx-auto rounded-3xl text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Award size={44} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                Privilèges VIP Actifs
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Vous profitez actuellement de tous les avantages exclusifs
                réservés aux membres Élite de la communauté.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
                className="text-slate-400 hover:text-rose-400 text-xs font-bold tracking-wider uppercase border-b border-dashed border-slate-600 hover:border-rose-500/50 pb-0.5 transition-all"
              >
                Gérer / Rétrograder l&apos;abonnement
              </button>
            </div>
          </section>
        )}

        {/* SECTION FAQ */}
        <section className="pt-2 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <HelpCircle size={15} className="text-amber-400" /> Foire aux
            questions
          </h3>
          <div className="space-y-2.5">
            {FAQ_DATA.map((faq, index) => (
              <div
                key={index}
                className="border border-white/10 rounded-2xl bg-slate-900/40 overflow-hidden transition-all hover:border-white/20"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-4 text-left text-xs font-bold flex justify-between items-center text-slate-200 hover:text-white"
                >
                  <span className="pr-2">{faq.question}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform duration-300 text-amber-400 ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 text-xs text-slate-400 border-t border-white/5 pt-3 leading-relaxed"
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

      {/* MODAL 1: CONFIRMATION D'ACHAT VIP */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-amber-500/40 p-6 sm:p-7 rounded-[2.2rem] max-w-sm w-full space-y-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.2)] relative overflow-hidden"
            >
              <div className="p-4 bg-amber-500/15 w-fit mx-auto rounded-3xl text-amber-400 border border-amber-500/30 shadow-inner">
                <Crown size={36} />
              </div>

              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  Rejoindre le Club VIP
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Vous allez activer le plan{" "}
                  <strong className="text-amber-400 font-bold">
                    {selectedPlan.name}
                  </strong>{" "}
                  pour{" "}
                  <strong className="text-emerald-400 font-bold">
                    {selectedPlan.price} HTG
                  </strong>{" "}
                  ({selectedPlan.durationLabel}).
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedPlan(null)}
                  disabled={actionLoading}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-slate-300 transition-colors border border-white/10"
                >
                  Annuler
                </button>
                <button
                  onClick={executeSubscription}
                  disabled={actionLoading}
                  className="flex-1 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    "Confirmer"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CÉLÉBRATION DE SUCCÈS VIP */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400 p-7 sm:p-8 rounded-[2.5rem] max-w-sm w-full space-y-6 text-center shadow-[0_0_60px_rgba(245,158,11,0.35)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-amber-400/10 blur-2xl pointer-events-none" />

              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="p-5 bg-gradient-to-br from-amber-400 to-amber-600 w-fit mx-auto rounded-3xl text-black shadow-[0_0_30px_rgba(245,158,11,0.5)]"
              >
                <Sparkles size={48} />
              </motion.div>

              <div>
                <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  Félicitations !
                </span>
                <h3 className="text-2xl font-black italic uppercase tracking-tight text-white mt-2">
                  BIENVENUE VIP !
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Votre abonnement{" "}
                  <strong className="text-amber-400">
                    {activatedPlanName}
                  </strong>{" "}
                  est désormais activé. Vos privilèges sont prêts !
                </p>
              </div>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95"
              >
                Profiter de mes avantages
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: CONFIRMATION DE DÉSACTIVATION */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-rose-500/30 p-6 sm:p-7 rounded-[2.2rem] max-w-sm w-full space-y-6 text-center shadow-2xl relative"
            >
              <div className="p-4 bg-rose-500/10 w-fit mx-auto rounded-3xl text-rose-400 border border-rose-500/20">
                <ShieldAlert size={36} />
              </div>

              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white">
                  Désactiver l&apos;abonnement ?
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Attention : Aucun remboursement proratisé ne sera effectué.
                  Vous perdrez vos avantages VIP immédiatement.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={actionLoading}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-slate-300 transition-colors border border-white/10"
                >
                  Garder mon VIP
                </button>
                <button
                  onClick={confirmCancelSubscription}
                  disabled={actionLoading}
                  className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    "Confirmer"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
