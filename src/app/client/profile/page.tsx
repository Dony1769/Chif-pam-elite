"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppFeedback } from '@/components/ui/AppFeedbackProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { 
  Loader2, ChevronRight, CheckCircle2, ArrowLeft, Save, Shield, BookOpen, 
  Ticket, Share2, Copy, Gift, Plus, ArrowDownCircle, Sparkles, Crown,
  TrendingUp, Settings, BarChart3, Bell, Check, LogOut, Zap, Award, Star
} from 'lucide-react';
import { 
  AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis, ReferenceLine 
} from 'recharts';
import Link from 'next/link';
import { DSCard, DSButton, DSInput } from '@/components/ui/primitives';
import { computeGamePassSummary, createGamePassHistoryEntry, GAME_PASS_AVATARS } from '@/lib/game-pass';
import { getLevelForXp, getXpRequiredForLevel } from '@/lib/game-economy';

// Logo ChifPam
const LogoChifPamSmall = () => (
  <svg viewBox="0 0 100 100" className="w-7 h-7 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Interface des Avantages Passifs (Level Perks)
interface PerkItem {
  icon?: string;
  label: string;
  description: string;
}

interface LevelPerksData {
  level: number;
  title: string;
  xp_multiplier: number;
  border_color: string;
  badge_icon: string | null;
  perks_description: PerkItem[];
}

// Interfaces de Profil
interface ProfileHistoryEntry {
  id: string;
  label: string;
  detail: string;
  created_at: string;
}

interface Profile {
  id: string;
  username?: string | null;
  referral_code?: string | null;
  jetons_cp?: number;
  balance?: number;
  xp?: number;
  level?: number;
  badge?: string;
  title?: string;
  rank?: string;
  avatar?: string;
  history?: ProfileHistoryEntry[];
  public_profile?: boolean;
  role?: string | null;
}

interface ChartPoint {
  date: string;
  balance: number;
}

interface TransactionItem {
  created_at: string;
  type: string;
  amount: number;
}

interface MiseItem {
  created_at: string;
  montant: number;
  status?: string;
}

export default function ProfilePage() {
  const { confirm } = useAppFeedback();
  const { enabled: pushEnabled, loading: pushLoading, subscribe: subscribePush } = usePushNotifications();
  const router = useRouter();
  const { isInstallable, install } = usePWAInstall();
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // États principaux
  const [profile, setProfile] = useState<Profile | null>(null);
  const [levelPerks, setLevelPerks] = useState<LevelPerksData | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'settings'>('overview');

  // États Statistiques & Coupons
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);

  // États Formulaire d'édition
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [gamePassTitle, setGamePassTitle] = useState('Voyageur');
  const [gamePassPublic, setGamePassPublic] = useState(true);
  const [gamePassAvatar, setGamePassAvatar] = useState<(typeof GAME_PASS_AVATARS)[number]>(GAME_PASS_AVATARS[0]);

  // Toast / Notification locale
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [agentRequestPending, setAgentRequestPending] = useState(false);
  const [agentRequestLoading, setAgentRequestLoading] = useState(false);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (profile?.role !== 'client') return;
    void supabase.from('agent_requests').select('id').eq('status', 'pending').maybeSingle().then(({ data }) => {
      setAgentRequestPending(Boolean(data));
    });
  }, [profile?.role]);

  const requestAgentStatus = async () => {
    if (!(await confirm('Le passage agent remettra votre solde HTG et CP à zéro. Confirmez-vous cette demande ?'))) return;
    setAgentRequestLoading(true);
    const { error } = await supabase.rpc('submit_agent_request');
    setAgentRequestPending(!error);
    showToast(error?.message ?? 'Demande agent envoyée à l’administration.');
    setAgentRequestLoading(false);
  };

  // Traitement sécurisé des données du graphique de solde
  const processPerformanceData = useCallback((trans: TransactionItem[], mises: MiseItem[], initialBalance: number) => {
    type ActivityEvent = {
      timestamp: number;
      dateStr: string;
      impact: number;
    };

    const events: ActivityEvent[] = [];

    trans.forEach(t => {
      const amount = Number(t.amount) || 0;
      const val = t.type === 'deposit' ? amount : -amount;
      const dateObj = new Date(t.created_at);
      events.push({
        timestamp: dateObj.getTime(),
        dateStr: dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        impact: val
      });
    });

    mises.forEach(m => {
      const montant = Number(m.montant) || 0;
      let impactMise = -montant;
      if (m.status === 'gagné' || m.status === 'gagne') {
        impactMise += (montant * 50);
      }
      const dateObj = new Date(m.created_at);
      events.push({
        timestamp: dateObj.getTime(),
        dateStr: dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        impact: impactMise
      });
    });

    events.sort((a, b) => a.timestamp - b.timestamp);

    const totalImpact = events.reduce((acc, ev) => acc + ev.impact, 0);
    let accum = Math.max(0, initialBalance - totalImpact);

    const points: ChartPoint[] = [];

    events.forEach(ev => {
      accum = Math.max(0, accum + ev.impact);
      points.push({
        date: ev.dateStr,
        balance: accum
      });
    });

    if (points.length === 0) {
      points.push({ date: 'Aujourd\'hui', balance: Math.max(0, initialBalance) });
    }

    setChartData(points);
    setCurrentBalance(Math.max(0, initialBalance));
  }, []);

  // Chargement global intégrant le RPC get_user_level_perks
  const fetchCompleteData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/connexion');
        return;
      }

      const [profRes, transRes, misesRes, perksRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('transactions').select('amount, type, created_at, status').eq('user_id', user.id).eq('status', 'approved').order('created_at', { ascending: false }).limit(100),
        supabase.from('mises').select('montant, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.rpc('get_user_level_perks', { user_id: user.id })
      ]);

      if (profRes.error && profRes.status !== 406) {
        throw new Error("Impossible de charger les informations du profil.");
      }

      const prof = profRes.data as Profile | null;

      // Ingestion des avantages du niveau
      if (!perksRes.error && perksRes.data) {
        const perkData = perksRes.data;
        setLevelPerks({
          level: perkData.level ?? 1,
          title: perkData.title ?? 'Agent Novice',
          xp_multiplier: Number(perkData.xp_multiplier ?? 1.0),
          border_color: perkData.border_color ?? 'emerald',
          badge_icon: perkData.badge_icon ?? '🛡️',
          perks_description: Array.isArray(perkData.perks_description) ? perkData.perks_description : []
        });
      }

      const storedGamePass = typeof window !== 'undefined' ? (() => {
        try { 
          return JSON.parse(localStorage.getItem('game-pass') || 'null'); 
        } catch { 
          return null; 
        }
      })() : null;

      if (prof) {
        const serverXp = Number(prof.xp ?? 0);
        const computed = computeGamePassSummary(
          serverXp,
          prof.title || storedGamePass?.title || 'Voyageur'
        );
        
        const mergedProfile: Profile = {
          ...prof,
          ...storedGamePass,
          xp: serverXp,
          level: getLevelForXp(serverXp),
          badge: computed.badge,
          title: prof.title || storedGamePass?.title || computed.title,
          rank: computed.rank,
          avatar: prof.avatar || storedGamePass?.avatar || GAME_PASS_AVATARS[0],
          history: prof.history || storedGamePass?.history || [createGamePassHistoryEntry('Bienvenue', 'Compte créé')],
          public_profile: prof.public_profile ?? storedGamePass?.public_profile ?? true,
        };

        setProfile(mergedProfile);
        setNewUsername(prof.username || '');
        setGamePassTitle(mergedProfile.title || 'Voyageur');
        setGamePassPublic(mergedProfile.public_profile ?? true);
        setGamePassAvatar(
          GAME_PASS_AVATARS.includes(mergedProfile.avatar as (typeof GAME_PASS_AVATARS)[number])
            ? (mergedProfile.avatar as (typeof GAME_PASS_AVATARS)[number])
            : GAME_PASS_AVATARS[0]
        );

        if (typeof window !== 'undefined') {
          localStorage.setItem('game-pass', JSON.stringify(mergedProfile));
        }

        processPerformanceData(
          (transRes.data as TransactionItem[]) || [], 
          (misesRes.data as MiseItem[]) || [], 
          prof.balance || 0
        );
      }
    } catch (err: unknown) {
      console.error("Erreur d'initialisation :", err);
      showToast((err as Error).message || "Erreur de chargement des données.");
    } finally {
      setLoading(false);
    }
  }, [processPerformanceData, router, showToast]);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchCompleteData();
    }
    return () => {
      isMounted = false;
    };
  }, [fetchCompleteData]);

  // Échange du coupon sécurisé
  const handleRedeemCoupon = async () => {
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (!/^[A-Z0-9_-]{3,20}$/.test(cleanCode)) {
      showToast("Format de code coupon invalide.");
      return;
    }

    setRedeeming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast("Session expirée. Veuillez vous reconnecter.");
        return;
      }

      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('id, amount, is_active')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) throw new Error("Code invalide ou expiré.");

      const { error: redemptionError } = await supabase
        .from('coupon_redemptions')
        .insert({ user_id: user.id, coupon_id: coupon.id });

      if (redemptionError) throw new Error("Vous avez déjà utilisé ce coupon.");

      const { error: rpcError } = await supabase.rpc('increment_balance', { 
        user_id: user.id, 
        amount: coupon.amount 
      });
      
      if (rpcError) throw new Error("Erreur lors de la créditation du solde.");

      showToast(`Succès ! +${coupon.amount} HTG ajoutés 🎉`);
      setCouponCode('');
      await fetchCompleteData();
    } catch (err: unknown) {
      showToast((err as Error).message);
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopyCode = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    showToast("Code de parrainage copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    if (!profile?.referral_code) return;
    const referralLink = `${window.location.origin}/inscription?ref=${encodeURIComponent(profile.referral_code)}`;
    const text = `Rejoins-moi sur Chif Pam ! Utilise mon lien pour gagner des avantages dès ton inscription 🎁 :`;
    
    if (navigator.share) {
      navigator.share({ title: 'Chif Pam', text: text, url: referralLink }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text} ${referralLink}`);
      showToast("Lien de parrainage copié dans le presse-papier !");
    }
  };

  // Mise à jour sécurisée du profil
  const handleUpdateProfile = async () => {
    const sanitizedUsername = newUsername.trim();
    const sanitizedTitle = gamePassTitle.trim();

    if (sanitizedUsername.length < 3 || sanitizedUsername.length > 20) {
      showToast("L'identifiant doit contenir entre 3 et 20 caractères.");
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(sanitizedUsername)) {
      showToast("L'identifiant ne peut contenir que des lettres, chiffres, et (_ . -).");
      return;
    }

    if (sanitizedTitle.length < 2 || sanitizedTitle.length > 25) {
      showToast("Le titre doit contenir entre 2 et 25 caractères.");
      return;
    }

    if (newPassword.length > 0 && newPassword.length < 8) {
      showToast("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié.");

      const nextProfile: Profile = {
        ...(profile || {} as Profile),
        username: sanitizedUsername,
        title: sanitizedTitle,
        public_profile: gamePassPublic,
        avatar: gamePassAvatar,
        xp: profile?.xp || 0,
        level: profile?.level || 1,
        badge: profile?.badge || 'Novice',
        rank: profile?.rank || 'Bronze',
        history: profile?.history || [createGamePassHistoryEntry('Profil mis à jour', 'Mise à jour du Game Pass')],
      };

      const { error: profError } = await supabase.from('profiles').update({
        username: sanitizedUsername,
        title: sanitizedTitle,
        public_profile: gamePassPublic,
        avatar: gamePassAvatar,
      }).eq('id', user.id);

      if (profError) throw profError;

      setProfile(nextProfile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('game-pass', JSON.stringify(nextProfile));
      }

      if (newPassword.length >= 8) {
        const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
        if (authError) throw new Error("Erreur de mise à jour du mot de passe : " + authError.message);
      }

      showToast("Profil mis à jour avec succès ! ✨");
      await fetchCompleteData();
      setNewPassword('');
    } catch (error: unknown) { 
      showToast((error as Error).message || "Erreur de mise à jour."); 
    } finally { 
      setUpdating(false); 
    }
  };

  const handleNotificationRequest = async () => {
    try {
      await subscribePush();
      showToast('Notifications push activées ✅');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erreur lors de l\'activation des notifications.');
    }
  };

  const handleLogout = async () => {
    try { 
      if (typeof window !== 'undefined') {
        localStorage.removeItem('game-pass');
      }
      await supabase.auth.signOut(); 
    } catch (err) {
      console.error("Erreur de déconnexion:", err);
    } finally {
      router.push('/connexion');
    }
  };

  // Helper pour les bordures dynamiques basées sur la configuration SQL
  const getBorderColorStyle = (colorName?: string) => {
    switch (colorName) {
      case 'amber': return 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)]';
      case 'purple': return 'border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.3)]';
      case 'cyan': return 'border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.3)]';
      case 'rose': return 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)]';
      default: return 'border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  // Calcul du progrès du niveau basé sur la formule quadratique
  const currentXP = profile?.xp || 0;
  const currentLevel = profile?.level || 1;
  const currentLevelThreshold = getXpRequiredForLevel(currentLevel);
  const nextLevelThreshold = getXpRequiredForLevel(currentLevel + 1);
  const xpInCurrentLevel = Math.max(0, currentXP - currentLevelThreshold);
  const xpRequiredForNext = Math.max(1, nextLevelThreshold - currentLevelThreshold);
  const progressPercent = Math.min(100, Math.max(0, (xpInCurrentLevel / xpRequiredForNext) * 100));
  const xpRemaining = Math.max(0, nextLevelThreshold - currentXP);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),linear-gradient(135deg,#020617_0%,#050816_60%,#020617_100%)] pb-32 text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 z-50 -translate-x-1/2 transform rounded-full border border-emerald-500/30 bg-slate-900/95 px-6 py-3 text-xs font-bold text-emerald-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all">
          {toastMessage}
        </div>
      )}

      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6">
        
        {/* En-tête Navigation */}
        <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_20px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <button 
            onClick={() => router.push('/client/home')} 
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-all hover:bg-white/10 active:scale-90"
            aria-label="Retour au menu principal"
          >
            <ArrowLeft size={18} className="text-slate-300" />
          </button>

          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
            <LogoChifPamSmall />
            <span className="text-xs font-black uppercase italic tracking-[0.18em] text-emerald-200">Mon Profil</span>
          </div>

          <button 
            onClick={handleNotificationRequest}
            disabled={pushLoading}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 active:scale-90"
            title={pushEnabled ? "Notifications push activées" : "Activer les notifications push"}
            aria-label="Notifications"
          >
            <Bell size={18} className={pushEnabled ? "text-emerald-300" : ""} />
          </button>
        </div>

        {/* Section Carte Profil Personnalisée */}
        <section className="relative overflow-hidden rounded-4xl border border-emerald-500/20 bg-linear-to-br from-slate-950/90 via-slate-900/80 to-slate-950/70 p-6 shadow-[0_24px_70px_rgba(2,8,23,0.42)]">
          {isInstallable && (
            <button 
              onClick={install} 
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <Sparkles size={14} /> Installer l&apos;application
            </button>
          )}

          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <div className={`relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 bg-linear-to-br from-slate-900 to-slate-950 ${getBorderColorStyle(levelPerks?.border_color)}`}>
              <span className="text-4xl">{profile?.avatar || GAME_PASS_AVATARS[0]}</span>
              <div className="absolute -bottom-1 -right-1 rounded-full border border-emerald-400/30 bg-slate-950 p-1.5 shadow-md">
                <Crown size={14} className="text-amber-300" />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-2xl font-black uppercase italic tracking-tight text-white">@{profile?.username || 'Utilisateur'}</h1>
                <CheckCircle2 size={18} className="text-emerald-400" />
              </div>
              <div className="mt-0.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                  {levelPerks?.title || profile?.title || 'Agent Novice'}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-extrabold uppercase text-amber-300">
                  {levelPerks?.badge_icon || '🛡️'} Nivo {profile?.level || 1}
                </span>
              </div>

              {/* Barre de Progression XP Dynamique */}
              <div className="mt-3 w-full max-w-md">
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  <span>Niveau {profile?.level || 1}</span>
                  <span className="font-bold text-emerald-300">{currentXP.toLocaleString()} XP</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-white/5">
                  <div 
                    className="h-full rounded-full bg-linear-to-r from-cyan-400 via-emerald-400 to-amber-300 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
                <p className="mt-1 text-right text-[8px] font-bold tracking-wider text-slate-500 uppercase">
                  {xpRemaining.toLocaleString('fr-FR')} XP avant le niveau {currentLevel + 1}
                </p>
              </div>
            </div>
          </div>

          {/* Raccourcis Financement */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link href="/client/finance" className="w-full">
              <DSButton variant="primary" className="flex w-full items-center justify-center gap-2 py-3.5">
                <Plus size={18} />
                <span className="text-[10px] font-black uppercase italic tracking-[0.2em]">Dépôt</span>
              </DSButton>
            </Link>
            <Link href="/client/finance" className="w-full">
              <DSButton variant="secondary" className="flex w-full items-center justify-center gap-2 py-3.5">
                <ArrowDownCircle size={18} className="text-rose-500" />
                <span className="text-[10px] font-black uppercase italic tracking-[0.2em]">Retrait</span>
              </DSButton>
            </Link>
          </div>
        </section>

        {/* Barre des Onglets */}
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp size={14} /> Aperçu
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              activeTab === 'stats'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 size={14} /> Finances
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              activeTab === 'settings'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings size={14} /> Réglages
          </button>
        </div>

        {/* ONGLET 1 : APERÇU */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            
            {/* CARTE DES AVANTAGES DE NIVEAU (LEVEL PERKS) */}
            <DSCard className="rounded-4xl border border-amber-500/20 bg-slate-900/90 p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-amber-400 animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">
                    Avantages Actifs • Niveau {levelPerks?.level || profile?.level || 1}
                  </h3>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-black text-amber-300">
                    XP x{levelPerks?.xp_multiplier || 1.0}
                  </span>
                </div>
              </div>

              {levelPerks?.perks_description && levelPerks.perks_description.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {levelPerks.perks_description.map((perk, index) => (
                    <div key={index} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-slate-950/60 p-3">
                      <span className="text-xl">{perk.icon || '✨'}</span>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-tight text-white">{perk.label}</p>
                        <p className="text-[9px] font-medium text-slate-400">{perk.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 text-xs text-slate-400">
                  <span>Aucun avantage passif spécifique pour ce niveau.</span>
                  <Award size={16} className="text-slate-500" />
                </div>
              )}
            </DSCard>

            {/* Carte Parrainage */}
            <DSCard className="relative overflow-hidden rounded-4xl bg-linear-to-br from-emerald-600 to-emerald-900 p-6 text-white shadow-[0_20px_60px_rgba(16,185,129,0.18)]">
              <div className="absolute right-0 top-0 p-4 opacity-15 pointer-events-none">
                <Gift size={100} />
              </div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] opacity-80">Votre Code Parrain</p>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-3xl font-black tracking-tight">{profile?.referral_code || '---'}</h2>
                <button 
                  onClick={handleCopyCode} 
                  className="rounded-xl bg-white/20 p-2.5 transition-colors hover:bg-white/30 active:scale-95"
                  title="Copier le code"
                  aria-label="Copier le code de parrainage"
                >
                  {copied ? <Check size={18} className="text-emerald-300" /> : <Copy size={18} />}
                </button>
              </div>
              <p className="mb-4 text-[11px] font-semibold opacity-90">
                Invitez vos amis et gagnez <span className="font-extrabold text-amber-300">2%</span> sur chacun de leurs dépôts à vie !
              </p>
              <button 
                onClick={shareReferral} 
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-white transition-transform active:scale-95"
              >
                <Share2 size={14} /> Partager mon lien
              </button>
            </DSCard>

            {/* Assistance & Documentation */}
            <Link href="/client/help" className="block">
              <div className="flex w-full items-center justify-between rounded-[1.8rem] border border-emerald-500/10 bg-slate-900/80 p-5 transition-all hover:border-emerald-500/30 active:scale-[0.98]">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-emerald-500/10 p-3">
                    <BookOpen size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase italic tracking-tight">Guide & Assistance</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400">Comment déposer, miser et retirer</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-emerald-500/40" />
              </div>
            </Link>
          </div>
        )}

        {/* ONGLET 2 : FINANCES */}
        {activeTab === 'stats' && (
          <div className="space-y-5">
            {/* Graphique de Solde */}
            <div className="overflow-hidden rounded-4xl border border-white/10 bg-slate-900/80 p-6 shadow-xl">
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Évolution du Solde Principal</p>
                <h2 className="text-3xl font-black text-emerald-400">
                  {currentBalance.toLocaleString('fr-FR')} HTG
                </h2>
              </div>
              <div className="h-44 w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={({ active, payload }) => active && payload && payload.length ? (
                      <div className="rounded-xl border border-white/10 bg-slate-950 p-2.5 shadow-xl">
                        <p className="text-[9px] font-bold uppercase text-slate-400">{payload[0].payload.date}</p>
                        <p className="font-bold text-emerald-400">
                          {Number(payload[0].value).toLocaleString('fr-FR')} HTG
                        </p>
                      </div>
                    ) : null} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                    <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activation Coupon */}
            <DSCard className="rounded-4xl p-5">
              <div className="mb-3 flex items-center gap-2 text-emerald-400">
                <Ticket size={18} />
                <p className="text-[10px] font-black uppercase tracking-[0.28em]">Code Promo / Coupon</p>
              </div>
              <div className="flex gap-2">
                <DSInput 
                  value={couponCode} 
                  onChange={(e) => setCouponCode(e.target.value)} 
                  placeholder="ENTREZ VOTRE CODE" 
                  className="flex-1 uppercase" 
                  maxLength={20}
                />
                <DSButton 
                  onClick={handleRedeemCoupon} 
                  disabled={redeeming || !couponCode.trim()} 
                  variant="success" 
                  size="sm"
                >
                  {redeeming ? <Loader2 className="animate-spin" size={16} /> : 'Valider'}
                </DSButton>
              </div>
            </DSCard>
            {profile?.role === 'client' && (
              <DSCard className="rounded-4xl border border-amber-400/25 bg-amber-400/5 p-6">
                <p className="text-sm font-black text-amber-100">Devenir agent</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">L’acceptation par l’administration remettra vos soldes HTG et CP à zéro.</p>
                <button type="button" onClick={requestAgentStatus} disabled={agentRequestPending || agentRequestLoading} className="mt-3 rounded-xl border border-amber-300/30 px-4 py-2 text-xs font-black text-amber-200 disabled:opacity-50">
                  {agentRequestLoading ? 'Envoi...' : agentRequestPending ? 'Demande en attente' : 'Demander le statut agent'}
                </button>
              </DSCard>
            )}
          </div>
        )}

        {/* ONGLET 3 : RÉGLAGES */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            <DSCard className="rounded-4xl p-6">
              <div className="mb-4 flex items-center gap-2">
                <Shield size={18} className="text-emerald-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">
                  Sécurité & Personnalisation
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Identifiant</label>
                  <DSInput 
                    type="text" 
                    value={newUsername} 
                    onChange={(e) => setNewUsername(e.target.value)} 
                    maxLength={20}
                  />
                </div>

                <div className="space-y-1">
                  <label className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Modifier le mot de passe</label>
                  <DSInput 
                    type="password" 
                    placeholder="Nouveau mot de passe (min 8 caractères)" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Titre du profil</label>
                  <DSInput 
                    type="text" 
                    value={gamePassTitle} 
                    onChange={(e) => setGamePassTitle(e.target.value)} 
                    maxLength={25}
                  />
                </div>

                {/* Avatar Game Pass */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Avatar Game Pass</p>
                  <div className="flex flex-wrap gap-2">
                    {GAME_PASS_AVATARS.map((avatar) => (
                      <button 
                        key={avatar} 
                        type="button" 
                        onClick={() => setGamePassAvatar(avatar)} 
                        className={`rounded-2xl border px-3 py-2 text-xl transition-all active:scale-95 ${
                          gamePassAvatar === avatar 
                            ? 'border-emerald-500 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Profil Public */}
                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 cursor-pointer">
                  <div>
                    <p className="text-sm font-black text-white">Profil public</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Rendre visible dans les classements Game Pass</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={gamePassPublic} 
                    onChange={(e) => setGamePassPublic(e.target.checked)} 
                    className="h-5 w-5 accent-emerald-500 rounded cursor-pointer" 
                  />
                </label>

                {/* Enregistrement */}
                <DSButton 
                  onClick={handleUpdateProfile} 
                  disabled={updating} 
                  variant="success" 
                  size="md" 
                  className="flex w-full items-center justify-center gap-2 py-3.5"
                >
                  {updating ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Enregistrer les modifications</>}
                </DSButton>
              </div>
            </DSCard>
          </div>
        )}

        {/* Action Déconnexion */}
        <button 
          onClick={handleLogout} 
          className="flex w-full items-center justify-between rounded-[1.8rem] border border-rose-500/20 bg-rose-500/5 p-4 transition-all hover:bg-rose-500/10 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-500/10 p-2">
              <LogOut size={18} className="text-rose-500" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.24em] text-rose-500">Se déconnecter</span>
          </div>
          <ChevronRight size={18} className="text-rose-500/40" />
        </button>

      </div>
    </main>
  );
}
