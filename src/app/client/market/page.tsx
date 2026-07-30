"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Coins,
  Gem,
  Sparkles,
  ShoppingBag,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- IMPORT DE LA PUBLICITÉ ---
import AdsterraNativeBanner from "@/components/ads/AdsterraNativeBanner";

// --- TYPES TYPESCRIPT STRICTS ---
type Profile = {
  id: string;
  username: string | null;
  jetons_cp: number;
  diamonds: number;
};

type BoutiquePack = {
  id: string;
  nom: string;
  jetons_quantite: number;
  prix_htg: number;
  prix_diamants?: number | null;
  currency_type?: 'HTG' | 'DIAMONDS' | string;
  active: boolean;
};

// Réponses RPC distinctes et explicites
type BuyWithDiamondsResponse = {
  success: boolean;
  message?: string;
  new_balance_cp?: number;
  new_balance_diamonds?: number;
};

type BuyWithHtgResponse = {
  success: boolean;
  message?: string;
  redirect_url?: string;
  new_balance_cp?: number;
};

export default function MarketPage() {
  // --- ÉTATS ---
  const [profile, setProfile] = useState<Profile | null>(null);
  const [packs, setPacks] = useState<BoutiquePack[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'htg' | 'diamonds'>('htg');

  const router = useRouter();

  // --- EXTRACTION SÉCURISÉE DES MESSAGES D'ERREUR ---
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return "Une erreur inattendue est survenue.";
  };

  // --- CHARGEMENT DES DONNÉES SÉCURISÉ ---
  const fetchData = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.warn("Utilisateur non authentifié.");
        setProfile(null);
        setLoading(false);
        return;
      }

      // Requêtes parallèles pour optimiser le temps de chargement
      const [profileRes, packsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, jetons_cp, diamonds')
          .eq('id', user.id)
          .single(),
        supabase
          .from('boutique_packs')
          .select('id, nom, jetons_quantite, prix_htg, prix_diamants, currency_type, active')
          .eq('active', true)
          .order('prix_htg', { ascending: true })
      ]);

      if (profileRes.error) {
        console.error("Erreur chargement profil :", profileRes.error.message);
        setProfile(null);
      } else if (profileRes.data) {
        setProfile({
          id: profileRes.data.id,
          username: profileRes.data.username ?? null,
          jetons_cp: profileRes.data.jetons_cp ?? 0,
          diamonds: profileRes.data.diamonds ?? 0,
        });
      }

      if (packsRes.error) {
        console.error("Erreur chargement boutique :", packsRes.error.message);
        setPacks([]);
      } else {
        setPacks(packsRes.data || []);
      }
    } catch (err: unknown) {
      console.error("Erreur inattendue lors de la récupération :", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- TRAITEMENT SÉCURISÉ DES ACHATS ---
  const handlePurchase = async (pack: BoutiquePack, method: 'htg' | 'diamonds') => {
    if (!profile || buying) return;

    const packCost = method === 'diamonds' ? (pack.prix_diamants ?? pack.prix_htg) : pack.prix_htg;

    // Validation préalable côté client
    if (method === 'diamonds') {
      if (profile.diamonds < packCost) {
        alert("Solde de diamants insuffisant pour effectuer cet achat.");
        return;
      }
    } else {
      if (pack.prix_htg <= 0) {
        alert("Le montant de ce pack est invalide.");
        return;
      }
    }

    setBuying(pack.id);

    try {
      if (method === 'diamonds') {
        const { data, error } = await supabase.rpc('buy_with_diamonds', {
          p_user_id: profile.id,
          p_pack_id: pack.id,
        });

        if (error) {
          console.error("Erreur RPC buy_with_diamonds :", error);
          alert(`Échec de la transaction : ${error.message}`);
        } else {
          const res = data as BuyWithDiamondsResponse | null;
          if (!res?.success) {
            alert(res?.message || "L'achat a échoué.");
          } else {
            // Mise à jour basée uniquement sur la réponse serveur ou synchronisation globale
            if (res.new_balance_diamonds !== undefined && res.new_balance_cp !== undefined) {
              setProfile((prev) => prev ? {
                ...prev,
                diamonds: res.new_balance_diamonds!,
                jetons_cp: res.new_balance_cp!
              } : null);
            } else {
              await fetchData();
            }

            alert("Achat effectué avec succès !");
          }
        }
      } else {
        const { data, error } = await supabase.rpc('acheter_pack_jetons', {
          p_user_id: profile.id,
          p_pack_id: pack.id,
        });

        if (error) {
          console.error("Erreur lors de l'initiation de l'achat :", error);
          alert(`Erreur : ${error.message}`);
        } else {
          const res = data as BuyWithHtgResponse | null;
          if (res?.success) {
            await fetchData();
            alert("Achat validé !");
          } else {
            alert(res?.message || "Impossible de traiter le paiement HTG.");
          }
        }
      }
    } catch (error: unknown) {
      console.error("Erreur réseau ou serveur :", getErrorMessage(error));
      alert("Une erreur inattendue est survenue.");
    } finally {
      setBuying(null);
    }
  };

  // Filtrage mémoire mémoïsé et normalisé
  const filteredPacks = useMemo(() => {
    return packs.filter((p) => {
      const normalizedType = p.currency_type ? p.currency_type.toUpperCase() : 'HTG';
      return activeTab === 'htg'
        ? normalizedType === 'HTG'
        : normalizedType === 'DIAMONDS';
    });
  }, [packs, activeTab]);

  const formatAmount = (value: number | string | null | undefined): string => {
    const numericValue = Number(value ?? 0);
    return Number.isFinite(numericValue) ? numericValue.toLocaleString() : '0';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_40%),_#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-slate-900/60 px-8 py-6 shadow-[0_0_60px_rgba(16,185,129,0.12)]">
          <Loader2 className="animate-spin text-emerald-500" size={24} />
          <p className="text-sm text-slate-300">Chargement de la boutique…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_40%),_#020617] text-white font-sans pb-24 selection:bg-emerald-500/30">
      {/* BARRE DE NAVIGATION */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#020617]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-2xl border border-white/10 bg-white/5 p-2.5 transition active:scale-90 hover:bg-white/10"
              aria-label="Retour"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Boutique</p>
              <h1 className="text-lg font-black italic uppercase tracking-tighter">
                Elite <span className="text-emerald-500">Marketplace</span>
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <CurrencyBadge value={profile?.jetons_cp} icon={<Coins size={12} />} color="text-emerald-500" />
            <CurrencyBadge value={profile?.diamonds} icon={<Gem size={12} />} color="text-blue-400" />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4">
        {/* BANNIÈRE VIP */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-emerald-950/40 p-5 shadow-[0_0_70px_rgba(16,185,129,0.08)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.24),_transparent_32%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
                <Sparkles size={12} />
                Offre premium
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white sm:text-3xl">
                Débloquez votre prochaine puissance
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Choisissez un pack adapté à votre rythme de jeu et profitez d’un accès plus fluide à la progression.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[240px]">
              <MiniStat label="Solde CP" value={profile?.jetons_cp} icon={<Coins size={14} />} accent="text-emerald-400" />
              <MiniStat label="Diamants" value={profile?.diamonds} icon={<Gem size={14} />} accent="text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* ONGLETS MONNAIES */}
        <div className="flex flex-wrap gap-2 rounded-[22px] border border-white/10 bg-white/5 p-1.5">
          <TabButton active={activeTab === 'htg'} onClick={() => setActiveTab('htg')} label="Jetons CP" icon={<Coins size={16} />} />
          <TabButton active={activeTab === 'diamonds'} onClick={() => setActiveTab('diamonds')} label="Échange Diamants" icon={<Gem size={16} />} />
        </div>

        {/* LISTE DES PACKS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredPacks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full flex flex-col items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-slate-900/40 px-6 py-20 text-center"
              >
                <div className="mb-3 rounded-full border border-white/10 bg-white/5 p-3">
                  <ShoppingBag size={28} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-200">Aucun pack disponible</h3>
                <p className="mt-2 max-w-md text-sm text-slate-400">
                  Cette catégorie est temporairement vide. Revenez bientôt pour découvrir de nouvelles offres.
                </p>
              </motion.div>
            ) : (
              filteredPacks.map((pack) => {
                const cost = activeTab === 'diamonds' ? (pack.prix_diamants ?? pack.prix_htg) : pack.prix_htg;
                const isBuyingThis = buying === pack.id;

                return (
                  <motion.div
                    key={pack.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className={`group relative overflow-hidden rounded-[24px] border p-5 shadow-[0_18px_45px_rgba(2,6,23,0.35)] transition-all duration-300 hover:-translate-y-1 ${
                      activeTab === 'diamonds'
                        ? 'border-blue-500/20 bg-gradient-to-br from-blue-950/30 via-slate-900/80 to-slate-900/80 hover:border-blue-500/45'
                        : 'border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-emerald-950/25 hover:border-emerald-500/25'
                    }`}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1 ${
                        activeTab === 'diamonds'
                          ? 'bg-gradient-to-r from-blue-400 to-cyan-400'
                          : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                      }`}
                    />
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Pack premium</p>
                          <h3 className="mt-1 text-lg font-black italic uppercase tracking-wider text-white">{pack.nom}</h3>
                        </div>
                        <div
                          className={`rounded-full border p-2 ${
                            activeTab === 'diamonds'
                              ? 'border-blue-400/20 bg-blue-500/10 text-blue-300'
                              : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                          }`}
                        >
                          <Zap size={14} />
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
                        <p className="text-3xl font-black italic tracking-tighter text-white">
                          {formatAmount(pack.jetons_quantite)}{' '}
                          <span className="text-[10px] font-bold not-italic text-slate-500">CP</span>
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                          <TrendingUp size={14} className={activeTab === 'diamonds' ? 'text-blue-400' : 'text-emerald-400'} />
                          Progression rapide et fluide
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-left text-[11px] text-slate-400">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <p className="font-semibold text-white">
                            {formatAmount(cost)} {activeTab === 'diamonds' ? '💎' : 'HTG'}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">Prix</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <p className="font-semibold text-white">Instantané</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">Livraison</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePurchase(pack, activeTab)}
                        disabled={!!buying}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                          activeTab === 'diamonds'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-900/25 hover:brightness-110'
                            : 'bg-gradient-to-r from-white to-emerald-300 text-slate-950 shadow-lg shadow-white/10 hover:brightness-105'
                        }`}
                      >
                        {isBuyingThis ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <>
                            {formatAmount(cost)} {activeTab === 'diamonds' ? '💎' : 'HTG'}
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* BANNIÈRE ADS */}
        <div className="rounded-[28px] border border-white/10 bg-slate-900/50 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Sponsorisé</p>
              <p className="mt-1 text-sm text-slate-300">Profitez d’un contenu premium tout en continuant votre expérience.</p>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 p-2.5 text-emerald-300">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="flex min-h-[120px] items-center justify-center overflow-hidden rounded-[22px] border border-white/10 bg-black/20">
            <AdsterraNativeBanner />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---
const CurrencyBadge = ({ value, icon, color }: { value?: number; icon: React.ReactNode; color: string }) => (
  <div className={`flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-1.5 ${color}`}>
    <span className="text-[11px] font-black italic">{(value ?? 0).toLocaleString()}</span>
    {icon}
  </div>
);

const TabButton = ({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex flex-1 items-center justify-center gap-2 rounded-[16px] px-3 py-3.5 text-[11px] font-black uppercase tracking-[0.25em] transition-all ${
      active ? 'bg-slate-800 text-white shadow-md border border-white/10' : 'text-slate-500 hover:bg-white/5 hover:text-white'
    }`}
  >
    {icon} {label}
  </button>
);

const MiniStat = ({ label, value, icon, accent }: { label: string; value?: number; icon: React.ReactNode; accent: string }) => (
  <div className="rounded-[18px] border border-white/10 bg-slate-950/60 p-3">
    <div className={`mb-2 inline-flex rounded-full border border-white/10 bg-white/5 p-1.5 ${accent}`}>
      {icon}
    </div>
    <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-black text-white">{(value ?? 0).toLocaleString()}</p>
  </div>
);
