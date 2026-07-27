"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { 
  Loader2, ChevronRight, CheckCircle2, ArrowLeft, Save, Shield, BookOpen, 
  Ticket, Share2, Copy, Gift, Plus, ArrowDownCircle, Sparkles, Crown,
  TrendingUp, Settings, BarChart3, Bell, Check, logOut 
} from 'lucide-react';
import { 
  AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis, ReferenceLine 
} from 'recharts';
import Link from 'next/link';
import { DSCard, DSButton, DSInput, DSLoader } from '@/components/ui/primitives';
import { computeGamePassSummary, createGamePassHistoryEntry, GAME_PASS_AVATARS } from '@/lib/game-pass';

// Logo ChifPam
const LogoChifPamSmall = () => (
  <svg viewBox="0 0 100 100" className="w-7 h-7 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Types
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
  const router = useRouter();
  const { isInstallable, install } = usePWAInstall();

  // États principaux
  const [profile, setProfile] = useState<Profile | null>(null);
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Traitement précis de l'historique du solde pour alimenter la courbe
  const processPerformanceData = useCallback((trans: TransactionItem[], mises: MiseItem[], initialBalance: number) => {
    type ActivityEvent = {
      created_at: string;
      impact: number;
    };

    const events: ActivityEvent[] = [];

    trans.forEach(t => {
      const val = t.type === 'deposit' ? t.amount : -t.amount;
      events.push({ created_at: t.created_at, impact: val });
    });

    mises.forEach(m => {
      let impactMise = -m.montant;
      if (m.status === 'gagné' || m.status === 'gagne') {
        impactMise += (m.montant * 50);
      }
      events.push({ created_at: m.created_at, impact: impactMise });
    });

    // Tri chronologique des événements
    events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let runningBalance = initialBalance;
    const totalImpact = events.reduce((acc, ev) => acc + ev.impact, 0);
    let startBalance = runningBalance - totalImpact;

    let accum = startBalance < 0 ? 0 : startBalance;
    const points: ChartPoint[] = [];

    events.forEach(ev => {
      accum += ev.impact;
      const dateLabel = new Date(ev.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short'
      });
      points.push({
        date: dateLabel,
        balance: Math.max(0, accum)
      });
    });

    if (points.length === 0) {
      points.push({ date: 'Aujourd\'hui', balance: initialBalance });
    }

    setChartData(points);
    setCurrentBalance(initialBalance);
  }, []);

  const fetchCompleteData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: transactions } = await supabase.from('transactions').select('amount, type, created_at, status').eq('user_id', user.id).eq('status', 'approved');
      const { data: mises } = await supabase.from('mises').select('montant, status, created_at').eq('user_id', user.id);

      const storedGamePass = typeof window !== 'undefined' ? (() => {
        try { return JSON.parse(localStorage.getItem('game-pass') || 'null'); } catch { return null; }
      })() : null;

      if (prof) {
        const resolvedProfile = prof as Profile;
        const computed = computeGamePassSummary(resolvedProfile.xp || storedGamePass?.xp || 0, resolvedProfile.title || storedGamePass?.title || 'Voyageur');
        
        const mergedProfile: Profile = {
          ...resolvedProfile,
          ...storedGamePass,
          xp: computed.xp,
          level: computed.level,
          badge: resolvedProfile.badge || storedGamePass?.badge || computed.badge,
          title: resolvedProfile.title || storedGamePass?.title || computed.title,
          rank: resolvedProfile.rank || storedGamePass?.rank || computed.rank,
          avatar: resolvedProfile.avatar || storedGamePass?.avatar || GAME_PASS_AVATARS[0],
          history: resolvedProfile.history || storedGamePass?.history || [createGamePassHistoryEntry('Bienvenue', 'Compte créé')],
          public_profile: resolvedProfile.public_profile ?? storedGamePass?.public_profile ?? true,
        };

        setProfile(mergedProfile);
        setNewUsername(resolvedProfile.username || '');
        setGamePassTitle(mergedProfile.title || 'Voyageur');
        setGamePassPublic(mergedProfile.public_profile ?? true);
        setGamePassAvatar((mergedProfile.avatar as (typeof GAME_PASS_AVATARS)[number]) || GAME_PASS_AVATARS[0]);

        if (typeof window !== 'undefined') {
          localStorage.setItem('game-pass', JSON.stringify(mergedProfile));
        }

        processPerformanceData(transactions || [], mises || [], resolvedProfile.balance || 0);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des données :", err);
    } finally {
      setLoading(false);
    }
  }, [processPerformanceData]);

  useEffect(() => {
    fetchCompleteData();
  }, [fetchCompleteData]);

  const handleRedeemCoupon = async () => {
    if (!couponCode) return;
    setRedeeming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (couponError || !coupon) throw new Error("Code invalide ou expiré.");

      const { error: redemptionError } = await supabase
        .from('coupon_redemptions')
        .insert({ user_id: user.id, coupon_id: coupon.id });

      if (redemptionError) throw new Error("Vous avez déjà utilisé ce coupon.");

      const { error: rpcError } = await supabase.rpc('increment_balance', { user_id: user.id, amount: coupon.amount });
      if (rpcError) throw rpcError;

      showToast(`Succès ! +${coupon.amount} HTG ajoutés 🎉`);
      setCouponCode('');
      fetchCompleteData();
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
    const referralLink = `${window.location.origin}/inscription?ref=${profile?.referral_code ?? ''}`;
    const text = `Rejoins-moi sur Chif Pam ! Utilise mon lien pour gagner 10 HTG dès ton inscription 🎁 :`;
    
    if (navigator.share) {
      navigator.share({ title: 'Chif Pam', text: text, url: referralLink });
    } else {
      navigator.clipboard.writeText(`${text} ${referralLink}`);
      showToast("Lien de parrainage copié dans le presse-papier !");
    }
  };

  const handleUpdateProfile = async () => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nextProfile: Profile = {
        ...(profile || {} as Profile),
        username: newUsername,
        title: gamePassTitle,
        public_profile: gamePassPublic,
        avatar: gamePassAvatar,
        xp: profile?.xp || 0,
        level: profile?.level || 1,
        badge: profile?.badge || 'Novice',
        rank: profile?.rank || 'Bronze',
        history: profile?.history || [createGamePassHistoryEntry('Profil mis à jour', 'Mise à jour du Game Pass')],
      };

      setProfile(nextProfile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('game-pass', JSON.stringify(nextProfile));
      }

      try {
        const { error: profError } = await supabase.from('profiles').update({
          username: newUsername,
          title: gamePassTitle,
          public_profile: gamePassPublic,
          avatar: gamePassAvatar,
          xp: nextProfile.xp || 0,
          level: nextProfile.level || 1,
          badge: nextProfile.badge || 'Novice',
          rank: nextProfile.rank || 'Bronze',
        }).eq('id', user.id);

        if (profError) throw profError;
      } catch (dbError) {
        console.warn('Game Pass update fell back to local storage', dbError);
      }

      if (newPassword.length >= 6) {
        const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
        if (authError) throw authError;
      }

      showToast("Profil mis à jour avec succès ! ✨");
      fetchCompleteData();
      setNewPassword('');
    } catch (error: unknown) { 
      showToast("Erreur: " + (error as Error).message); 
    } finally { 
      setUpdating(false); 
    }
  };

  const handleNotificationRequest = async () => {
    if (!('Notification' in window)) {
      return showToast('Notifications non supportées par ce navigateur');
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      navigator.serviceWorker.ready.then(swReg => { 
        swReg.showNotification('ChifPam', { body: 'Notifications activées ! ✅', icon: '/icons/icon-192.png' }); 
      });
      showToast('Notifications activées avec succès ✅');
    }
  };

  const handleLogout = async () => {
    try { 
      await supabase.auth.signOut(); 
      window.location.replace('/connexion'); 
    } catch { 
      window.location.href = '/connexion'; 
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),linear-gradient(135deg,#020617_0%,#050816_60%,#020617_100%)] pb-32 text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 z-50 -translate-x-1/2 transform rounded-full border border-emerald-500/30 bg-slate-900/95 px-6 py-3 text-xs font-bold text-emerald-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all">
          {toastMessage}
        </div>
      )}

      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_20px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <button 
            onClick={() => router.push('/client/home')} 
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-all hover:bg-white/10 active:scale-90"
          >
            <ArrowLeft size={18} className="text-slate-300" />
          </button>

          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
            <LogoChifPamSmall />
            <span className="text-xs font-black uppercase italic tracking-[0.18em] text-emerald-200">Mon Profil</span>
          </div>

          <button 
            onClick={handleNotificationRequest}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 active:scale-90"
            title="Activer les notifications"
          >
            <Bell size={18} />
          </button>
        </div>

        {/* Hero Card Profil */}
        <section className="relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-slate-950/70 p-6 shadow-[0_24px_70px_rgba(2,8,23,0.42)]">
          {isInstallable && (
            <button 
              onClick={install} 
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <Sparkles size={14} /> Installer l&apos;application
            </button>
          )}

          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 via-slate-950 to-cyan-500/20 shadow-[0_0_35px_rgba(16,185,129,0.25)]">
              <span className="text-4xl">{profile?.avatar || GAME_PASS_AVATARS[0]}</span>
              <div className="absolute -bottom-1 -right-1 rounded-full border border-emerald-400/30 bg-slate-950 p-1.5 shadow-md">
                <Crown size={14} className="text-amber-300" />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-2xl font-black uppercase italic tracking-tight text-white">@{profile?.username}</h1>
                <CheckCircle2 size={18} className="text-emerald-400" />
              </div>
              <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                {profile?.title || 'Voyageur'} • {profile?.rank || 'Bronze'}
              </span>

              {/* Barre de Progression XP */}
              <div className="mt-3 w-full max-w-md">
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  <span>Niveau {profile?.level || 1} ({profile?.badge || 'Novice'})</span>
                  <span className="font-bold text-emerald-300">{profile?.xp || 0} XP</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/5">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500" 
                    style={{ width: `${Math.min(100, ((profile?.xp || 0) % 300) / 3)}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Raccourcis Dépôt / Retrait */}
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

        {/* Barre d'Onglets Navigation */}
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

        {/* CONTENU ONGLET 1 : APERÇU */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Carte Parrainage */}
            <DSCard className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 to-emerald-900 p-6 text-white shadow-[0_20px_60px_rgba(16,185,129,0.18)]">
              <div className="absolute right-0 top-0 p-4 opacity-15 pointer-events-none">
                <Gift size={100} />
              </div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] opacity-80">Votre Code Parrain</p>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-3xl font-black tracking-tight">{profile?.referral_code || '---'}</h2>
                <button 
                  onClick={handleCopyCode} 
                  className="rounded-xl bg-white/20 p-2.5 transition-colors hover:bg-white/30 active:scale-95"
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

            {/* Lien d'aide */}
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

        {/* CONTENU ONGLET 2 : FINANCES */}
        {activeTab === 'stats' && (
          <div className="space-y-5">
            {/* Graphique de Solde Réel */}
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Évolution du Solde Principal</p>
                <h2 className="text-3xl font-black text-emerald-400">
                  {currentBalance.toLocaleString()} HTG
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
                          {Number(payload[0].value).toLocaleString()} HTG
                        </p>
                      </div>
                    ) : null} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                    <Area type="monotone" dataKey="balance" stroke="#10b981" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Code Promo */}
            <DSCard className="rounded-[2rem] p-5">
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
                />
                <DSButton 
                  onClick={handleRedeemCoupon} 
                  disabled={redeeming || !couponCode} 
                  variant="success" 
                  size="sm"
                >
                  {redeeming ? <DSLoader label="..." /> : 'Valider'}
                </DSButton>
              </div>
            </DSCard>
          </div>
        )}

        {/* CONTENU ONGLET 3 : RÉGLAGES */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            <DSCard className="rounded-[2rem] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Shield size={18} className="text-emerald-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">
                  Sécurité & Personnalisation
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Identifiant</label>
                  <DSInput type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Modifier le mot de passe</label>
                  <DSInput type="password" placeholder="Nouveau mot de passe (min 6 caractères)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Titre du profil</label>
                  <DSInput type="text" value={gamePassTitle} onChange={(e) => setGamePassTitle(e.target.value)} />
                </div>

                {/* Sélecteur d'Avatar */}
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

                {/* Bouton de Sauvegarde */}
                <DSButton 
                  onClick={handleUpdateProfile} 
                  disabled={updating} 
                  variant="success" 
                  size="md" 
                  className="flex w-full items-center justify-center gap-2 py-3.5"
                >
                  {updating ? <DSLoader label="..." /> : <><Save size={16} /> Enregistrer les modifications</>}
                </DSButton>
              </div>
            </DSCard>
          </div>
        )}

        {/* Bouton Déconnexion */}
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
