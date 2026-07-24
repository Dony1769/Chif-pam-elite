"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell,
  Home, Gamepad2,
  Lock, Trophy,
  Activity, ChevronRight, Brain, Fingerprint,
  Menu, X, Crown, ShieldCheck, Gift, Sparkles,
  Coins, Star, ArrowDownCircle
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { DSButton, DSCard, DSHeader, DSPage, DSPanel } from '@/components/ui/primitives';

// Vos composants personnalisés
const OnboardingTour = dynamic(() => import('@/components/OnboardingTour'), { ssr: false });

const LogoSmall = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ClientHome() {
  type Profile = {
    id: string;
    username: string | null;
    jetons_cp: number;
    balance: number;
    vip_status: string | null;
    login_streak: number | null;
    rank?: string;
  };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0); 
  const [activeChallengesCount, setActiveChallengesCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

  const globalNotificationCount = unreadNotifs + activeChallengesCount;

  const playPing = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchChallengesCount = useCallback(async () => {
    const { count } = await supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', true);
    setActiveChallengesCount(count || 0);
  }, []);

  const refreshChatCount = useCallback(async () => {
    if (!currentUserId || pathname === '/client/chat') { setUnreadChat(0); return; }
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId).eq('is_admin_message', true).eq('is_read_by_client', false);
    setUnreadChat(count || 0);
  }, [currentUserId, pathname]);

  const fetchNotificationCount = useCallback(async () => {
    if (!currentUserId) return;
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId).eq('is_read', false);
    setUnreadNotifs(count || 0);
  }, [currentUserId]);

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');
      setCurrentUserId(user.id);

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, jetons_cp, balance, vip_status, login_streak')
        .eq('id', user.id)
        .single();
      setProfile(prof);

      const [notifCountRes, challengesCountRes, chatCountRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
        supabase
          .from('challenges')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        pathname === '/client/chat'
          ? Promise.resolve({ count: 0 })
          : supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_admin_message', true)
              .eq('is_read_by_client', false),
      ]);

      setUnreadNotifs(notifCountRes.count || 0);
      setActiveChallengesCount(challengesCountRes.count || 0);
      setUnreadChat(chatCountRes.count || 0);

    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [pathname, router]);

  useEffect(() => {
    if (!currentUserId || !isTabVisible) return;

    const channel = supabase.channel('client_home_ultra_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${currentUserId}` }, (payload) => {
          setProfile(payload.new as Profile);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${currentUserId}` }, () => refreshChatCount())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` }, () => fetchNotificationCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchChallengesCount())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, fetchChallengesCount, fetchNotificationCount, isTabVisible, refreshChatCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleQuickConvert = async () => {
    if (!profile || profile.jetons_cp < 100) return alert("Minimum 100 CP pour convertir");
    
    setIsConverting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('convert_cp: attempt', { authUserId: user?.id, profileId: profile.id, p_montant_cp: Math.floor(profile.jetons_cp) });

      const { error, data } = await supabase.rpc('convertir_cp_en_htg', {
        p_user_id: profile.id,
        p_montant_cp: Math.floor(profile.jetons_cp)
      });

      if (error) {
        console.error('convert_cp: rpc error', { error, data, authUserId: user?.id, payload: { p_user_id: profile.id, p_montant_cp: Math.floor(profile.jetons_cp) } });
        alert(error.message);
      } else {
        console.log('convert_cp: success', { data });
        playPing();
      }
    } catch (err) {
      console.error('convert_cp: unexpected error', err);
      alert('Erreur inattendue lors de la conversion.');
    } finally {
      setIsConverting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Activity className="animate-spin text-emerald-500" /></div>;

  return (
    <DSPage className="text-white font-black italic uppercase pb-32 overflow-x-hidden relative ds-fade-up">
      <OnboardingTour />

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed top-0 left-0 h-full w-[80%] bg-slate-950 z-70 border-r border-white/5 p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <LogoSmall />
                <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2">
                <MenuLink href="/client/rewards" icon={<Gift className="text-pink-500" />} label="Centre de Mission" badge={(profile?.login_streak ?? 0) > 0 ? '!' : ''} />
                <MenuLink href="/client/vip" icon={<Crown className="text-amber-500" />} label="Abonnement VIP" />
                <MenuLink href="/client/challenges" icon={<ShieldCheck className="text-emerald-500" />} label="Parcours actifs" badge={activeChallengesCount} />
                <MenuLink href="/client/market" icon={<Sparkles className="text-purple-500" />} label="Marketplace" />
                <MenuLink href="/client/rank" icon={<Trophy className="text-blue-500" />} label="Classement communauté" />
                <div className="pt-10 border-t border-white/5 mt-10">
                  <button
                    onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                    className="text-slate-500 text-[10px] tracking-widest uppercase font-black"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="space-y-6 p-6">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-amber-200">
                  <Crown size={14} />
                  {profile?.vip_status && profile.vip_status !== 'free' ? 'VIP actif' : 'Accès standard'}
                </div>
                <DSHeader
                  eyebrow="Espace client"
                  title={`Bienvenue, @${profile?.username}`}
                  description="Explorez vos gains, défis et récompenses depuis un tableau de bord premium."
                />
              </div>
              <div className="flex flex-wrap gap-3 items-center justify-start lg:justify-end">
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-emerald-300 transition hover:bg-white/10"
                >
                  <Menu size={16} />
                  Menu
                </button>
                <Link href="/client/notifications" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-slate-200 transition hover:bg-white/10">
                  <Bell size={16} />
                  {globalNotificationCount > 0 ? `${globalNotificationCount} alertes` : 'Notifications'}
                </Link>
              </div>
            </div>

            <DSPanel className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
              <DSCard className={`relative overflow-hidden p-6 ${profile?.vip_status && profile.vip_status !== 'free' ? 'border-amber-400/30 bg-gradient-to-br from-amber-400/10 via-slate-950/80 to-emerald-400/10' : ''}`}>
                <div className="absolute inset-y-0 right-0 flex items-center opacity-10">
                  <Coins size={96} className="text-emerald-500" />
                </div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-300 mb-3">POINTS DE PARTICIPATION (CP)</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-5xl font-black tracking-tighter text-white">{(profile?.jetons_cp || 0).toLocaleString()}</p>
                      <p className="mt-2 text-sm text-(--fg-3)">Vos crédits de participation sont prêts à être convertis.</p>
                    </div>
                    <DSButton
                      onClick={handleQuickConvert}
                      disabled={isConverting || (profile?.jetons_cp || 0) < 100}
                      variant="success"
                      size="sm"
                      className="mt-2 sm:mt-0"
                    >
                      {isConverting ? 'Conversion...' : 'Transférer'}
                    </DSButton>
                  </div>
                </div>
              </DSCard>

              <DSCard className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Solde principal (HTG)</p>
                    <p className="mt-2 text-3xl font-black text-white">{(profile?.balance || 0).toLocaleString()}</p>
                  </div>
                  {profile?.vip_status !== 'free' && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-amber-500/15 text-amber-300">
                      <Crown size={24} />
                    </div>
                  )}
                </div>
              </DSCard>
            </DSPanel>

            <DSPanel>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Expériences recommandées</p>
                  <p className="mt-2 text-sm text-(--fg-3)">Sélectionnez une mission immersive pour progresser rapidement.</p>
                </div>
                <Link href="/client/list" className="text-[10px] uppercase tracking-[0.35em] text-emerald-300 transition hover:text-emerald-200">
                  Voir tout
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                <GameRow href="/client/quiz" icon={<Brain className="text-blue-500" />} title="Quiz Insights" desc="Progression cognitive" players="3 012 joueurs" />
                <GameRow href="/client/laser-vault" icon={<Lock className="text-indigo-500" />} title="Laser Vault" desc="Réactivité & précision" players="2 094 joueurs" />
                <GameRow href="/client/biometric-hack" icon={<Fingerprint className="text-emerald-500" />} title="Biometric Lab" desc="Mémoire adaptative" players="652 joueurs" />
              </div>
            </DSPanel>
          </div>

          <div className="space-y-6">
            <DSCard className="space-y-5 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Progrès</p>
                  <p className="mt-1 text-lg font-black text-white">Statut du compte</p>
                </div>
                <div className="rounded-3xl bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.35em] text-emerald-300">
                  {activeChallengesCount} défis actifs
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[9px] uppercase tracking-[0.35em] text-slate-500">Messages non lus</p>
                  <p className="mt-2 text-2xl font-black text-white">{unreadChat}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[9px] uppercase tracking-[0.35em] text-slate-500">Alertes</p>
                  <p className="mt-2 text-2xl font-black text-white">{globalNotificationCount}</p>
                </div>
              </div>
            </DSCard>

            <DSCard className="space-y-5 p-6">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Actions rapides</p>
              <div className="grid gap-3">
                <Link
                  href="/client/market"
                  className="inline-flex w-full items-center justify-center rounded-[var(--radius-md)] border border-(--border-subtle) bg-(--surface-2) px-5 py-3 text-sm font-semibold uppercase tracking-[0.09em] text-(--fg-1) transition hover:border-(--border-strong)"
                >
                  Accès au marché
                </Link>
                <Link
                  href="/client/profile"
                  className="inline-flex w-full items-center justify-center rounded-[var(--radius-md)] border border-transparent bg-transparent px-5 py-3 text-sm font-semibold uppercase tracking-[0.09em] text-(--fg-2) transition hover:bg-(--surface-2)"
                >
                  Mon profil
                </Link>
              </div>
            </DSCard>
          </div>
        </div>
      </div>
    </DSPage>
  );
}

function MenuLink({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
}) {
    return (
        <Link href={href} className="flex items-center gap-4 p-5 rounded-2xl hover:bg-white/5 transition-all active:bg-white/5">
            {icon}
            <span className="text-[10px] font-black tracking-widest uppercase italic">{label}</span>
            {badge && <span className="ml-2 bg-emerald-500 text-black text-[8px] px-2 py-0.5 rounded-md font-black">{badge}</span>}
            <ChevronRight size={14} className="ml-auto text-slate-700" />
        </Link>
    )
}

function GameRow({
  href,
  icon,
  title,
  desc,
  players,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  players: string;
}) {
    return (
      <Link href={href} className="bg-slate-900 border border-white/5 p-5 rounded-[1.8rem] flex items-center justify-between active:scale-[0.97] transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center">{icon}</div>
          <div>
            <h4 className="text-[12px] font-black italic tracking-tighter uppercase">{title}</h4>
            <p className="text-[9px] text-slate-500 lowercase italic">{desc}</p>
          </div>
        </div>
        <div className="bg-emerald-500/10 px-2 py-1 rounded-lg text-[9px] text-emerald-500 font-black">{players}</div>
      </Link>
    );
}


