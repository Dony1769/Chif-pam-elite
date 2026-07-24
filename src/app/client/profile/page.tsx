"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { 
  User, LogOut, Loader2, ChevronRight, 
  CheckCircle2, ArrowLeft, Save, Shield, BookOpen, 
  Ticket, Share2, Copy, Gift, Plus, ArrowDownCircle, Sparkles, Crown
} from 'lucide-react';
import { 
  AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis, ReferenceLine 
} from 'recharts';
import Link from 'next/link';
import { DSCard, DSButton, DSInput, DSLoader } from '@/components/ui/primitives';
import { computeGamePassSummary, createGamePassHistoryEntry, GAME_PASS_AVATARS } from '@/lib/game-pass';

// IMPORT DU POPUNDER MONETA

const LogoChifPamSmall = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ProfilePage() {
  const router = useRouter();
  const { isInstallable, install } = usePWAInstall();
  type Profile = { id: string; username?: string | null; referral_code?: string | null; jetons_cp?: number; xp?: number; level?: number; badge?: string; title?: string; rank?: string; avatar?: string; history?: Array<{ id: string; label: string; detail: string; created_at: string }>; play_time_minutes?: number; max_combo?: number; favorite_game?: string; public_profile?: boolean; };
  type ChartPoint = { name: string; gain: number };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [stats, setStats] = useState({ deposits: 0, withdrawals: 0, netBalance: 0 });
  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [gamePassTitle, setGamePassTitle] = useState('Voyageur');
  const [gamePassFavorite, setGamePassFavorite] = useState('Mines');
  const [gamePassPublic, setGamePassPublic] = useState(true);
  const [gamePassAvatar, setGamePassAvatar] = useState<(typeof GAME_PASS_AVATARS)[number]>(GAME_PASS_AVATARS[0]);

  

  const fetchCompleteData = useCallback(async () => {
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
        play_time_minutes: resolvedProfile.play_time_minutes || storedGamePass?.play_time_minutes || 0,
        max_combo: resolvedProfile.max_combo || storedGamePass?.max_combo || 0,
        favorite_game: resolvedProfile.favorite_game || storedGamePass?.favorite_game || 'Mines',
        public_profile: resolvedProfile.public_profile ?? storedGamePass?.public_profile ?? true,
      };
      setProfile(mergedProfile);
      setNewUsername(resolvedProfile.username || '');
      setGamePassTitle(mergedProfile.title || 'Voyageur');
      setGamePassFavorite(mergedProfile.favorite_game || 'Mines');
      setGamePassPublic(mergedProfile.public_profile ?? true);
      setGamePassAvatar((mergedProfile.avatar as (typeof GAME_PASS_AVATARS)[number]) || GAME_PASS_AVATARS[0]);
      if (typeof window !== 'undefined') localStorage.setItem('game-pass', JSON.stringify(mergedProfile));
      processPerformanceData(transactions || [], mises || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompleteData();
  }, [fetchCompleteData]);

  const processPerformanceData = (trans: { created_at: string; type: string; amount: number }[], mises: { created_at: string; montant: number; status?: string }[]) => {
    const dailyData: { [key: string]: number } = {};
    let totalDep = 0; let totalWith = 0; let netRunningBalance = 0;
    trans.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
      const val = t.type === 'deposit' ? t.amount : -t.amount;
      if (t.type === 'deposit') totalDep += t.amount;
      if (t.type === 'withdrawal') totalWith += t.amount;
      dailyData[date] = (dailyData[date] || 0) + val;
      netRunningBalance += val;
    });
    mises.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
      let impactMise = -m.montant; 
      if (m.status === 'gagné' || m.status === 'gagne') impactMise += (m.montant * 50); 
      dailyData[date] = (dailyData[date] || 0) + impactMise;
      netRunningBalance += impactMise;
    });
    const formattedData = Object.keys(dailyData).map(key => ({ name: key, gain: dailyData[key] }));
    setChartData(formattedData);
    setStats({ deposits: totalDep, withdrawals: totalWith, netBalance: netRunningBalance });
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode) return;
    setRedeeming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: coupon, error: couponError } = await supabase.from('coupons').select('*').eq('code', couponCode.toUpperCase()).eq('is_active', true).single();
      if (couponError || !coupon) throw new Error("Code invalide ou expiré.");
      const { error: redemptionError } = await supabase.from('coupon_redemptions').insert({ user_id: user.id, coupon_id: coupon.id });
      if (redemptionError) throw new Error("Vous avez déjà utilisé ce coupon.");
      const { error: rpcError } = await supabase.rpc('increment_balance', { user_id: user.id, amount: coupon.amount });
      if (rpcError) throw rpcError;
      alert(`Succès ! +${coupon.amount} HTG ajoutés à votre compte. 🎉`);
      setCouponCode('');
      fetchCompleteData();
    } catch (err: unknown) { alert((err as Error).message); } finally { setRedeeming(false); }
  };

  const shareReferral = () => {
    const referralLink = `${window.location.origin}/inscription?ref=${profile?.referral_code ?? ''}`;
    const text = `Rejoins-moi sur Chif Pam ! Utilise mon lien pour gagner 10 HTG dès ton inscription 🎁 :`;
    
    if (navigator.share) {
      navigator.share({ title: 'Chif Pam', text: text, url: referralLink });
    } else {
      navigator.clipboard.writeText(`${text} ${referralLink}`);
      alert("Lien de parrainage copié ! Partagez-le avec vos amis.");
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
        favorite_game: gamePassFavorite,
        public_profile: gamePassPublic,
        avatar: gamePassAvatar,
        xp: profile?.xp || 0,
        level: profile?.level || 1,
        badge: profile?.badge || 'Novice',
        rank: profile?.rank || 'Bronze',
        history: profile?.history || [createGamePassHistoryEntry('Profil mis à jour', 'Mise à jour du Game Pass')],
      };
      setProfile(nextProfile);
      if (typeof window !== 'undefined') localStorage.setItem('game-pass', JSON.stringify(nextProfile));
      try {
        const { error: profError } = await supabase.from('profiles').update({
          username: newUsername,
          title: gamePassTitle,
          favorite_game: gamePassFavorite,
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
      alert("Profil mis à jour avec succès !");
      fetchCompleteData();
      setNewPassword('');
    } catch (error: unknown) { alert("Erreur: " + (error as Error).message); } finally { setUpdating(false); }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); window.location.replace('/connexion'); } 
    catch { window.location.href = '/connexion'; }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_32%),linear-gradient(135deg,#020617_0%,#050816_60%,#020617_100%)] pb-32 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-slate-950/70 px-3 py-3 shadow-[0_20px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <button onClick={() => router.push('/client/home')} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-all active:scale-90">
            <ArrowLeft size={18} className="text-slate-300" />
          </button>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
            <LogoChifPamSmall />
            <span className="text-sm font-black uppercase italic tracking-[0.18em] text-emerald-200">Profil</span>
          </div>
          <div className="w-11" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-emerald-500/15 bg-linear-to-br from-slate-950/90 via-slate-900/80 to-slate-950/70 p-5 shadow-[0_24px_70px_rgba(2,8,23,0.42)]">
            {isInstallable && (
              <button onClick={install} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200 transition hover:bg-emerald-500/15">
                <Sparkles size={14} /> Installer l&apos;application
              </button>
            )}

            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-emerald-400/20 bg-gradient-to-br from-emerald-500/20 via-slate-950 to-cyan-500/15 shadow-[0_0_35px_rgba(16,185,129,0.18)]">
                <span className="text-4xl">{profile?.avatar || GAME_PASS_AVATARS[0]}</span>
                <div className="absolute bottom-1 right-1 rounded-full border border-emerald-400/20 bg-emerald-500/20 p-1.5">
                  <Crown size={14} className="text-amber-300" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-2xl font-black uppercase italic tracking-tight">@{profile?.username}</h1>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">{profile?.title || 'Voyageur'} • {profile?.rank || 'Bronze'}</span>
              </div>
            </div>

            <div className="mt-4 rounded-[1.7rem] border border-cyan-500/10 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Game Pass</p>
                  <p className="text-lg font-black italic text-white">{profile?.badge || 'Novice'}</p>
                </div>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
                  Lv {profile?.level || 1}
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-slate-400">
                <span>XP</span>
                <span>{profile?.xp || 0} pts</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.min(100, ((profile?.xp || 0) % 300) / 3)}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-[0.24em] text-slate-500">Temps de jeu</p><p className="mt-1 font-black text-white">{profile?.play_time_minutes || 0} min</p></div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-[0.24em] text-slate-500">Combo max</p><p className="mt-1 font-black text-white">{profile?.max_combo || 0}</p></div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link href="/client/finance">
                <DSButton variant="primary" className="flex w-full flex-col items-center gap-1 py-6">
                  <Plus size={20} />
                  <span className="text-[9px] font-black uppercase italic tracking-[0.2em]">Dépôt</span>
                </DSButton>
              </Link>
              <Link href="/client/finance">
                <DSButton variant="secondary" className="flex w-full flex-col items-center gap-1 py-6">
                  <ArrowDownCircle size={20} className="text-rose-500" />
                  <span className="text-[9px] font-black uppercase italic tracking-[0.2em]">Retrait</span>
                </DSButton>
              </Link>
            </div>
          </section>

          <section className="space-y-4">
            <DSCard className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white shadow-[0_20px_60px_rgba(16,185,129,0.18)]">
              <div className="absolute right-0 top-0 p-4 opacity-20"><Gift size={80} /></div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] opacity-80">Votre Code Parrain</p>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-3xl font-black tracking-tighter">{profile?.referral_code || 'LOADING...'}</h2>
                <button onClick={() => { navigator.clipboard.writeText(profile?.referral_code ?? ''); alert('Code copié !'); }} className="rounded-lg bg-white/20 p-2 transition-colors hover:bg-white/30">
                  <Copy size={16} />
                </button>
              </div>
              <p className="mb-4 pr-10 text-[10px] font-bold opacity-90">Invitez vos amis et gagnez 2% sur chacun de leurs dépôts à vie !</p>
              <button onClick={shareReferral} className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-3 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-white transition-transform active:scale-95">
                <Share2 size={14} /> Partager mon lien
              </button>
            </DSCard>

            <DSCard className="rounded-[2rem] p-5">
              <div className="mb-3 flex items-center gap-2 text-emerald-500">
                <Ticket size={18} />
                <p className="text-[10px] font-black uppercase tracking-[0.28em]">Code Promo</p>
              </div>
              <div className="flex gap-2">
                <DSInput value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="ENTREZ LE CODE" className="flex-1 uppercase" />
                <DSButton onClick={handleRedeemCoupon} disabled={redeeming || !couponCode} variant="success" size="sm">
                  {redeeming ? <DSLoader label="..." /> : 'Valider'}
                </DSButton>
              </div>
            </DSCard>
          </section>
        </div>

        <button onClick={async () => { if (!('Notification' in window)) return alert('Notifications non supportées'); const permission = await Notification.requestPermission(); if (permission === 'granted') { navigator.serviceWorker.ready.then(swReg => { swReg.showNotification('ChifPam', { body: 'Notifications activées ! ✅', icon: '/icons/icon-192.png' }); }); alert('Notifications activées ✅'); } }} className="w-full rounded-[1.6rem] border border-white/10 bg-slate-900/50 p-4 text-xs font-bold uppercase tracking-[0.28em] text-slate-300 transition-colors hover:bg-slate-800">
          Activer les notifications
        </button>

        <div className="space-y-3">
          <h3 className="ml-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Assistance</h3>
          <Link href="/client/help">
            <div className="flex w-full items-center justify-between rounded-[1.8rem] border border-emerald-500/10 bg-slate-900/80 p-5 transition-all hover:border-emerald-500/30 active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-emerald-500/10 p-3"><BookOpen size={20} className="text-emerald-500" /></div>
                <div><p className="text-sm font-black uppercase italic tracking-tight">Guide & Aide</p><p className="text-[9px] font-bold uppercase text-slate-500">Comment miser et retirer</p></div>
              </div>
              <ChevronRight size={18} className="text-emerald-500/40 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        <div className="overflow-hidden rounded-[2.3rem] border border-white/10 bg-slate-900/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <div className="relative z-10 mb-6">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Bilan d&apos;activité</p>
            <h2 className={`text-4xl font-black ${stats.netBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{stats.netBalance.toLocaleString()} HTG</h2>
          </div>
          <div className="relative z-10 h-40 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={stats.netBalance >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={stats.netBalance >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip content={({ active, payload }) => active && payload && payload.length ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950 p-3 shadow-xl">
                    <p className="text-[10px] font-bold uppercase text-slate-500">{payload[0].payload.name}</p>
                    <p className={`font-bold ${Number(payload[0].value) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{Number(payload[0].value).toLocaleString()} HTG</p>
                  </div>
                ) : null} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.05)" />
                <Area type="monotone" dataKey="gain" stroke={stats.netBalance >= 0 ? '#10b981' : '#f43f5e'} fillOpacity={1} fill="url(#colorGain)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <DSCard className="rounded-[2.3rem] p-6">
          <div className="mb-2 flex items-center gap-2"><Shield size={16} className="text-emerald-500" /><h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Sécurité & Game Pass</h3></div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="ml-4 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Identifiant</label>
              <DSInput type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="ml-4 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Modifier mot de passe</label>
              <DSInput type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="ml-4 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Titre du profil</label>
              <DSInput type="text" value={gamePassTitle} onChange={(e) => setGamePassTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="ml-4 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Jeu préféré</label>
              <DSInput type="text" value={gamePassFavorite} onChange={(e) => setGamePassFavorite(e.target.value)} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
              <p className="mb-2 ml-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Avatar</p>
              <div className="flex flex-wrap gap-2">
                {GAME_PASS_AVATARS.map((avatar) => (
                  <button key={avatar} type="button" onClick={() => setGamePassAvatar(avatar)} className={`rounded-2xl border px-3 py-2 text-lg transition ${gamePassAvatar === avatar ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                    {avatar}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
              <div>
                <p className="text-sm font-black text-white">Profil public</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Visible dans le Game Pass</p>
              </div>
              <input type="checkbox" checked={gamePassPublic} onChange={(e) => setGamePassPublic(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
            </label>
            <DSButton onClick={handleUpdateProfile} disabled={updating} variant="success" size="md" className="flex w-full items-center justify-center gap-2">
              {updating ? <DSLoader label="..." /> : <><Save size={16} /> ENREGISTRER</>}
            </DSButton>
          </div>
        </DSCard>

        <button onClick={handleLogout} className="flex w-full items-center justify-between rounded-[1.8rem] border border-rose-500/10 bg-rose-500/5 p-5 transition-all hover:bg-rose-500/10 active:scale-[0.98]">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-rose-500/10 p-2"><LogOut size={18} className="text-rose-500" /></div>
            <span className="text-xs font-black uppercase tracking-[0.24em] text-rose-500">Déconnexion</span>
          </div>
          <ChevronRight size={18} className="text-rose-500/30 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </main>
  );
}
