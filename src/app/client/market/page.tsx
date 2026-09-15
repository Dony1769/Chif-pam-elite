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
  Zap,
  TrendingUp,
  AlertTriangle,
  Bug,
  CheckCircle2,
  XCircle,
  Info,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES TYPESCRIPT STRICTS ---
export type Profile = {
  id: string;
  username: string | null;
  jetons_cp: number;
  diamonds: number;
  role?: string | null;
};

export type BoutiquePack = {
  id: string;
  nom: string;
  jetons_quantite: number;
  prix_htg: number;
  currency_type?: 'HTG' | 'DIAMONDS' | string;
  bonus_star_pourcent?: number | null;
  image_url?: string | null;
  active: boolean;
};

export type BuyWithDiamondsResponse = {
  success: boolean;
  message?: string;
  new_balance_cp?: number;
  new_balance_diamonds?: number;
};

export type BuyWithHtgResponse = {
  success: boolean;
  message?: string;
  redirect_url?: string;
  new_balance_cp?: number;
};

type DebugInfo = {
  sessionExists: boolean;
  userId: string | null;
  profileError: string | null;
  packsError: string | null;
  packsCount: number;
  userRole?: string | null;
};

// Type pour la gestion des notifications Toast
type ToastNotification = {
  message: string;
  type: 'success' | 'error' | 'info';
} | null;

export default function MarketPage() {
  // --- ÉTATS DE GESTION ---
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [packs, setPacks] = useState<BoutiquePack[]>([]);
  
  const [loadingPacks, setLoadingPacks] = useState<boolean>(true);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [buying, setBuying] = useState<string | null>(null);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'diamonds'>('diamonds');

  // Les retours d’action utilisent le système de feedback centralisé.
  const [toast, setToast] = useState<ToastNotification>(null);
  
  // État Debug
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MARKET === 'true';

  const router = useRouter();

  // Fonction utilitaire pour afficher une notification propre
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  // Auto-fermeture du Toast après 4 secondes
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return "Une erreur inattendue est survenue.";
  };

  // --- REQUÊTE ET RECUPÉRATION DES DONNÉES ---
  const fetchProfileAndPacks = useCallback(async () => {
    setLoadingPacks(true);
    setLoadingProfile(true);
    setErrorMessage(null);

    let currentUserId: string | null = null;
    let hasSession = false;
    let profileErrStr: string | null = null;
    let packsErrStr: string | null = null;
    let fetchedRole: string | null = null;

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn("[DEBUG MARKET] Erreur récupération session:", sessionError.message);
      }

      if (session?.user) {
        hasSession = true;
        currentUserId = session.user.id;
        setUserId(currentUserId);
      } else {
        console.warn("[DEBUG MARKET] Aucune session active détectée.");
        setUserId(null);
        setProfile(null);
        setLoadingProfile(false);
      }

      const packsPromise = supabase
        .from('boutique_packs')
        .select('id, nom, jetons_quantite, prix_htg, bonus_star_pourcent, image_url, currency_type, active')
        .eq('currency_type', 'DIAMONDS')
        .eq('active', true)
        .order('prix_htg', { ascending: true });

      const profilePromise = currentUserId
        ? supabase
            .from('profiles')
            .select('id, username, jetons_cp, diamonds, role')
            .eq('id', currentUserId)
            .single()
        : Promise.resolve(null);

      const [packsRes, profileRes] = await Promise.all([packsPromise, profilePromise]);

      if (packsRes.error) {
        packsErrStr = packsRes.error.message;
        console.error("[DEBUG MARKET] Erreur packsRes:", packsRes.error);
        setErrorMessage(`Impossible de charger les packs : ${packsRes.error.message}`);
        setPacks([]);
      } else {
        setPacks(packsRes.data || []);
      }
      setLoadingPacks(false);

      if (currentUserId && profileRes) {
        if (profileRes.error) {
          profileErrStr = profileRes.error.message;
          console.error("[DEBUG MARKET] Erreur profileRes:", profileRes.error);
          setProfile(null);
        } else if (profileRes.data) {
          fetchedRole = profileRes.data.role ?? null;
          setProfile({
            id: profileRes.data.id,
            username: profileRes.data.username ?? null,
            jetons_cp: profileRes.data.jetons_cp ?? 0,
            diamonds: profileRes.data.diamonds ?? 0,
            role: fetchedRole,
          });
        }
        setLoadingProfile(false);
      }

      setDebugInfo({
        sessionExists: hasSession,
        userId: currentUserId,
        profileError: profileErrStr,
        packsError: packsErrStr,
        packsCount: packsRes.data?.length ?? 0,
        userRole: fetchedRole,
      });

    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      console.error("[DEBUG MARKET] Erreur critique lors du fetch:", msg);
      setErrorMessage(msg);
      setLoadingPacks(false);
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileAndPacks();
  }, [fetchProfileAndPacks]);

  // --- TRAITEMENT DES ACHATS AVEC TOASTS ---
  const handlePurchase = async (pack: BoutiquePack, method: 'htg' | 'diamonds') => {
    if (!userId || buying) {
      if (!userId) showToast("Vous devez être connecté pour effectuer un achat.", "info");
      return;
    }

    const packCost = pack.prix_htg;

    // Validations préalables du solde côté client avec Toast
    if (method === 'diamonds') {
      if (profile && profile.diamonds < packCost) {
        showToast("Solde de diamants insuffisant pour effectuer cet achat.", "error");
        return;
      }
    } else {
      if (packCost <= 0) {
        showToast("Le montant de ce pack est invalide.", "error");
        return;
      }
    }

    setBuying(pack.id);

    try {
      if (method === 'diamonds') {
        const { data, error } = await supabase.rpc('buy_with_diamonds', {
          p_user_id: userId,
          p_pack_id: pack.id,
        });

        if (error) {
          console.error("[DEBUG MARKET] Erreur RPC buy_with_diamonds :", error);
          showToast(`Échec de la transaction (${error.code ?? 'RPC_ERR'}) : ${error.message}`, "error");
        } else {
          const res = data as BuyWithDiamondsResponse | null;
          if (!res?.success) {
            showToast(res?.message || "L'achat a échoué.", "error");
          } else {
            if (res.new_balance_diamonds !== undefined && res.new_balance_cp !== undefined) {
              setProfile((prev) => prev ? {
                ...prev,
                diamonds: res.new_balance_diamonds!,
                jetons_cp: res.new_balance_cp!
              } : null);
            } else {
              await fetchProfileAndPacks();
            }
            showToast("Achat effectué avec succès !", "success");
          }
        }
      } else {
        const { data, error } = await supabase.rpc('acheter_pack_jetons', {
          p_user_id: userId,
          p_pack_id: pack.id,
        });

        if (error) {
          console.error("[DEBUG MARKET] Erreur RPC acheter_pack_jetons :", error);
          showToast(`Erreur (${error.code ?? 'RPC_ERR'}) : ${error.message}`, "error");
        } else {
          const res = data as BuyWithHtgResponse | null;
          if (res?.success) {
            await fetchProfileAndPacks();
            showToast("Achat validé avec succès !", "success");
          } else {
            showToast(res?.message || "Impossible de traiter le paiement HTG.", "error");
          }
        }
      }
    } catch (error: unknown) {
      console.error("[DEBUG MARKET] Erreur inattendue transaction :", getErrorMessage(error));
      showToast("Une erreur inattendue est survenue lors de la transaction.", "error");
    } finally {
      setBuying(null);
    }
  };

  // --- FILTRAGE DES PACKS PAR MONNAIE ---
  const filteredPacks = useMemo(() => {
    return packs.filter((p) => {
      let normalizedType = 'HTG';

      if (p.currency_type) {
        const upper = p.currency_type.toUpperCase();
        if (upper === 'HTG' || upper === 'DIAMONDS') {
          normalizedType = upper;
        }
      }

      return normalizedType === 'DIAMONDS';
    });
  }, [packs]);

  const formatAmount = (value: number | string | null | undefined): string => {
    const numericValue = Number(value ?? 0);
    return Number.isFinite(numericValue) ? numericValue.toLocaleString() : '0';
  };

  if (loadingPacks) {
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
      
      {/* NOTIFICATION TOAST FLOTTANTE */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 z-50 -translate-x-1/2 w-full max-w-md px-4"
          >
            <div
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'border-emerald-500/40 bg-slate-900/95 text-emerald-300 shadow-emerald-950/50'
                  : toast.type === 'error'
                  ? 'border-red-500/40 bg-slate-900/95 text-red-300 shadow-red-950/50'
                  : 'border-blue-500/40 bg-slate-900/95 text-blue-300 shadow-blue-950/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />}
                {toast.type === 'error' && <XCircle size={20} className="text-red-400 shrink-0" />}
                {toast.type === 'info' && <Info size={20} className="text-blue-400 shrink-0" />}
                <p className="text-xs font-semibold sm:text-sm">{toast.message}</p>
              </div>
              <button
                onClick={() => setToast(null)}
                className="rounded-lg p-1 transition hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PANNEAU DEBUG VISIBLE SI NEXT_PUBLIC_DEBUG_MARKET=true */}
      {isDebugMode && debugInfo && (
        <div className="bg-amber-950/90 border-b border-amber-500/30 px-4 py-3 text-xs text-amber-200">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono">
              <Bug size={16} className="text-amber-400" />
              <span><strong>Session:</strong> {debugInfo.sessionExists ? "Oui" : "Non"}</span>
              <span>|</span>
              <span><strong>User ID:</strong> {debugInfo.userId ?? "null"}</span>
              <span>|</span>
              <span><strong>Rôle:</strong> {debugInfo.userRole ?? "null"}</span>
              <span>|</span>
              <span><strong>Packs:</strong> {debugInfo.packsCount}</span>
            </div>
            {(debugInfo.profileError || debugInfo.packsError) && (
              <div className="text-red-400 font-mono">
                {debugInfo.profileError && <div>ProfileErr: {debugInfo.profileError}</div>}
                {debugInfo.packsError && <div>PacksErr: {debugInfo.packsError}</div>}
              </div>
            )}
          </div>
        </div>
      )}

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
            {loadingProfile ? (
              <Loader2 className="animate-spin text-slate-500 self-center" size={16} />
            ) : (
              <>
                <CurrencyBadge value={profile?.jetons_cp} icon={<Coins size={12} />} color="text-emerald-500" />
                <CurrencyBadge value={profile?.diamonds} icon={<Gem size={12} />} color="text-blue-400" />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4">

        {/* INVITATION À SE CONNECTER */}
        {!userId && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <p className="text-xs sm:text-sm">
                Vous visitez la boutique en mode invité. Connectez-vous pour voir vos soldes et acheter des packs.
              </p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              Connexion
            </button>
          </div>
        )}

        {/* BLOC D'ERREUR */}
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-red-200">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle size={16} className="text-red-400" />
              Erreur chargement marketplace
            </div>
            <p className="mt-1 text-xs text-red-300">{errorMessage}</p>
          </div>
        )}

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
          <button type="button" onClick={() => router.push('/client/p2p')} className="flex flex-1 items-center justify-center gap-2 rounded-[16px] bg-emerald-500/15 px-3 py-3.5 text-[11px] font-black uppercase tracking-[0.25em] text-emerald-200 transition hover:bg-emerald-500/25">
            <Coins size={16} /> Acheter du CP en HTG
          </button>
          <TabButton active onClick={() => setActiveTab('diamonds')} label="Échange Diamants" icon={<Gem size={16} />} />
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
                const cost = pack.prix_htg;
                const isBuyingThis = buying === pack.id;

                return (
                  <motion.div
                    key={pack.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className={`group relative overflow-hidden rounded-[24px] border p-5 shadow-[0_18px_45px_rgba(2,6,23,0.35)] transition-all duration-300 hover:-translate-y-1 ${
                      'border-blue-500/20 bg-gradient-to-br from-blue-950/30 via-slate-900/80 to-slate-900/80 hover:border-blue-500/45'
                    }`}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1 ${
                        'bg-gradient-to-r from-blue-400 to-cyan-400'
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
                            'border-blue-400/20 bg-blue-500/10 text-blue-300'
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
                          <TrendingUp size={14} className="text-blue-400" />
                          Progression rapide et fluide
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-left text-[11px] text-slate-400">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <p className="font-semibold text-white">
                            {formatAmount(cost)} 💎
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
                        disabled={!!buying || !userId}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                          'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-900/25 hover:brightness-110'
                        }`}
                      >
                        {isBuyingThis ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <>
                            {formatAmount(cost)} 💎
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

      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS DE STRUCTURATION ---
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
