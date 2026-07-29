"use client";

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, Lock, Trophy, Activity, ChevronRight, Brain, Fingerprint,
  Menu, X, Crown, ShieldCheck, Gift, Sparkles, Coins, ArrowRightLeft,
  Flame, User, LogOut, CheckCircle2, Wallet, PlusCircle, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { DSButton, DSCard, DSHeader, DSPage, DSPanel } from '@/components/ui/primitives';

// Chargement dynamique du composant d'onboarding (SSR désactivé)
const OnboardingTour = dynamic(() => import('@/components/OnboardingTour'), { ssr: false });

// Taux de conversion CP -> HTG officiel : 100 CP = ~5.88 HTG
const CP_TO_HTG_RATE = 0.05882352941176470588; 

export interface Profile {
  id: string;
  username: string | null;
  jetons_cp: number;
  balance: number;
  vip_status: string | null;
  login_streak: number | null;
  rank?: string;
}

export interface GameItem {
  id: string;
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  players: string;
  tag?: string;
}

// Logo ChifPam réutilisable avec effet lumineux/Glow personnalisable
const ChifPamLogo: React.FC<{ glowing?: boolean }> = React.memo(({ glowing = false }) => (
  <div className="relative flex items-center justify-center">
    {glowing && (
      <div className="absolute inset-0 bg-emerald-500/40 rounded-full blur-xl animate-pulse pointer-events-none" />
    )}
    <svg 
      viewBox="0 0 100 100" 
      className={`w-10 h-10 sm:w-12 sm:h-12 relative z-10 transition-all duration-500 ${
        glowing 
          ? 'drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-105' 
          : 'drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]'
      }`} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
      <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
));
ChifPamLogo.displayName = 'ChifPamLogo';

export default function ClientHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [unreadChat, setUnreadChat] = useState<number>(0); 
  const [activeChallengesCount, setActiveChallengesCount] = useState<number>(0);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // État local pour le montant personnalisable de conversion CP
  const [cpToConvert, setCpToConvert] = useState<number>(100);

  const router = useRouter();
  const pathname = usePathname();

  const globalNotificationCount = unreadNotifs;

  useEffect(() => {
    if (profile?.jetons_cp !== undefined) {
      setCpToConvert(Math.min(profile.jetons_cp, 100));
    }
  }, [profile?.jetons_cp]);

  const calculatedHTG = useMemo(() => {
    const cp = Math.max(0, Number(cpToConvert) || 0);
    return (cp * CP_TO_HTG_RATE).toFixed(2);
  }, [cpToConvert]);

  const totalEstimatedHTG = useMemo(() => {
    if (!profile?.jetons_cp) return "0.00";
    return (profile.jetons_cp * CP_TO_HTG_RATE).toFixed(2);
  }, [profile?.jetons_cp]);

  const playPing = useCallback(() => {
    try {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch {
      // Audio non supporté
    }
  }, []);

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
    const { count, error } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    if (!error) setActiveChallengesCount(count || 0);
  }, []);

  const refreshChatCount = useCallback(async () => {
    if (!currentUserId || pathname === '/client/chat') { 
      setUnreadChat(0); 
      return; 
    }
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUserId)
      .eq('is_admin_message', true)
      .eq('is_read_by_client', false);
    if (!error) setUnreadChat(count || 0);
  }, [currentUserId, pathname]);

  const fetchNotificationCount = useCallback(async () => {
    if (!currentUserId) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUserId)
      .eq('is_read', false);
    if (!error) setUnreadNotifs(count || 0);
  }, [currentUserId]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/connexion');
        return;
      }
      setCurrentUserId(user.id);

      const { data: prof, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, jetons_cp, balance, vip_status, login_streak')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Erreur chargement profil:', profileError);
      } else {
        setProfile(prof as Profile);
      }

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
          ? Promise.resolve({ count: 0, error: null })
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

    } catch (error) {
      console.error('Erreur globale fetchData:', error);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!currentUserId || !isTabVisible) return;

    const channel = supabase.channel(`client_home_sync_${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${currentUserId}` }, (payload) => {
        setProfile(payload.new as Profile);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${currentUserId}` }, () => refreshChatCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` }, () => fetchNotificationCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchChallengesCount())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchChallengesCount, fetchNotificationCount, isTabVisible, refreshChatCount]);

  const handleQuickConvert = async () => {
    if (!profile) return;
    
    const montantCP = Math.floor(cpToConvert);

    if (isNaN(montantCP) || montantCP < 100) {
      setFeedbackMessage({ type: 'error', text: 'Un minimum de 100 CP est requis pour effectuer une conversion.' });
      return;
    }

    if (montantCP > profile.jetons_cp) {
      setFeedbackMessage({ type: 'error', text: 'Solde de CP insuffisant pour cette conversion.' });
      return;
    }
    
    setIsConverting(true);
    setFeedbackMessage(null);

    try {
      const { error } = await supabase.rpc('convertir_cp_en_htg', {
        p_user_id: profile.id,
        p_montant_cp: montantCP
      });

      if (error) {
        setFeedbackMessage({ type: 'error', text: error.message || 'Erreur lors de la conversion.' });
      } else {
        playPing();
        const montantObtenu = (montantCP * CP_TO_HTG_RATE).toFixed(2);
        setFeedbackMessage({ 
          type: 'success', 
          text: `Conversion réussie ! ${montantCP} CP convertis en ~${montantObtenu} HTG.` 
        });
      }
    } catch (err) {
      console.error('Erreur inattendue conversion:', err);
      setFeedbackMessage({ type: 'error', text: 'Une erreur inattendue est survenue.' });
    } finally {
      setIsConverting(false);
    }
  };

  const gamesList: GameItem[] = useMemo(() => [
    { id: 'quiz', href: '/client/quiz', icon: <Brain className="text-blue-400" />, title: 'Quiz Insights', desc: 'Défi cognitif & rapidité', players: '3.0k actifs', tag: 'Populaire' },
    { id: 'laser', href: '/client/laser-vault', icon: <Lock className="text-indigo-400" />, title: 'Laser Vault', desc: 'Réactivité & précision ultime', players: '2.1k actifs' },
    { id: 'biometric', href: '/client/biometric-hack', icon: <Fingerprint className="text-emerald-400" />, title: 'Biometric Lab', desc: 'Mémoire adaptative & logique', players: '650 actifs' }
  ], []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <Activity className="animate-spin text-emerald-500 w-10 h-10" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Chargement de votre espace...</p>
      </div>
    );
  }

  const isVipUser = profile?.vip_status && profile.vip_status !== 'free';

  return (
    <DSPage className="text-white font-black italic uppercase pb-12 sm:pb-20 overflow-x-hidden relative ds-fade-up">
      <OnboardingTour />

      {/* Navigation latérale Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-[85%] max-w-[320px] bg-slate-950 z-50 border-r border-white/10 p-5 sm:p-6 flex flex-col justify-between shadow-2xl overflow-y-auto"
            >
              <div>
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <ChifPamLogo glowing={!isVipUser} />
                    <div>
                      <p className="text-xs font-black text-white lowercase truncate max-w-[140px]">@{profile?.username || 'utilisateur'}</p>
                      <p className={`text-[9px] tracking-wider font-extrabold ${isVipUser ? 'text-amber-400' : 'text-slate-400'}`}>
                        {isVipUser ? 'Membre VIP' : 'Compte Standard'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition" aria-label="Fermer le menu">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-1">
                  <MenuLink href="/client/rewards" icon={<Gift className="text-pink-400" />} label="Centre de Mission" badge={(profile?.login_streak ?? 0) > 0 ? `${profile?.login_streak}j` : ''} />
                  <MenuLink href="/client/vip" icon={<Crown className="text-amber-400" />} label="Abonnement VIP" />
                  <MenuLink href="/client/challenges" icon={<ShieldCheck className="text-emerald-400" />} label="Parcours actifs" badge={activeChallengesCount > 0 ? activeChallengesCount : undefined} />
                  <MenuLink href="/client/market" icon={<Sparkles className="text-purple-400" />} label="Marketplace" />
                  <MenuLink href="/client/rank" icon={<Trophy className="text-blue-400" />} label="Classement" />
                  <MenuLink href="/client/profile" icon={<User className="text-slate-400" />} label="Mon Profil" />
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 mt-auto">
                <button
                  onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                  className="flex items-center gap-3 w-full p-3 rounded-xl bg-red-500/10 text-red-400 text-xs tracking-widest font-black transition hover:bg-red-500/20 active:scale-95"
                >
                  <LogOut size={16} />
                  <span>Déconnexion</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="space-y-5 sm:space-y-6 p-3 sm:p-6 max-w-7xl mx-auto">
        
        {/* Messages de retour utilisateur (Succès / Erreur) */}
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 text-xs tracking-wider ${
              feedbackMessage.type === 'success' 
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200' 
                : 'bg-red-500/20 border border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{feedbackMessage.text}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="opacity-60 hover:opacity-100 p-1" aria-label="Fermer">
              <X size={14} />
            </button>
          </motion.div>
        )}

        <div className="grid gap-5 sm:gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-5 sm:space-y-6">
            
            {/* Entête principal avec Logo ChifPam Illuminé pour Non-VIP */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex items-start gap-3.5">
                
                {/* Logo ChifPam Interactif */}
                <div className="pt-1">
                  <ChifPamLogo glowing={!isVipUser} />
                </div>

                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                    {isVipUser ? (
                      <span className="border-amber-400/30 bg-amber-400/10 text-amber-300 flex items-center gap-1">
                        <Crown size={12} /> VIP Actif
                      </span>
                    ) : (
                      <span className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-1 animate-pulse">
                        <Sparkles size={12} /> ChifPam Standard
                      </span>
                    )}
                  </div>
                  
                  <DSHeader
                    eyebrow="Tableau de bord"
                    title={`Bienvenue, @${profile?.username || 'Aventurier'}`}
                    description="Convertissez vos points, validez vos parcours et débloquez vos récompenses."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2.5">
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300 transition hover:bg-white/10 active:scale-95"
                >
                  <Menu size={16} />
                  Menu
                </button>
                <Link 
                  href="/client/notifications" 
                  className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10 active:scale-95"
                >
                  <Bell size={16} />
                  <span className="hidden sm:inline">{globalNotificationCount > 0 ? `${globalNotificationCount} Alertes` : 'Notifications'}</span>
                  {globalNotificationCount > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* BANNIÈRE PROMOTIONNELLE POUR LES UTILISATEURS NON-VIP */}
            {!isVipUser && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-950/30 border border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="space-y-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                    <Crown size={12} /> Passez au niveau supérieur
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white italic tracking-tight uppercase">
                    Débloquez l'expérience <span className="text-amber-400">ChifPam VIP</span>
                  </h3>
                  <p className="text-xs text-slate-300 font-normal lowercase italic max-w-md">
                    Profitez de -25% sur les frais, de bonus exclusifs et d'un badge doré illuminé sur votre profil.
                  </p>
                </div>
                <Link 
                  href="/client/vip"
                  className="w-full sm:w-auto shrink-0 py-3 px-5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black font-black text-xs tracking-wider uppercase rounded-2xl shadow-lg hover:brightness-110 active:scale-95 text-center flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} /> Découvrir le VIP
                </Link>
              </motion.div>
            )}

            {/* Cartes de Soldes & Conversion */}
            <DSPanel className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
              
              {/* Carte Points CP & Conversion Interactive */}
              <DSCard className={`relative overflow-hidden p-5 sm:p-6 ${isVipUser ? 'border-amber-400/30 bg-gradient-to-br from-amber-400/10 via-slate-950/80 to-emerald-400/10' : ''}`}>
                <div className="absolute inset-y-0 right-0 flex items-center opacity-10 pointer-events-none">
                  <Coins size={120} className="text-emerald-500" />
                </div>

                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] sm:tracking-[0.35em] text-emerald-400">POINTS DE PARTICIPATION (CP)</p>
                    {(profile?.login_streak ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded-full text-[10px] text-orange-400 font-black">
                        <Flame size={12} />
                        <span>{profile?.login_streak}j</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-3xl sm:text-5xl font-black tracking-tighter text-white">
                      {(profile?.jetons_cp || 0).toLocaleString()} <span className="text-base sm:text-lg text-emerald-400">CP</span>
                    </p>
                    <p className="text-xs text-slate-400 font-normal lowercase italic">
                      Valeur estimée : <strong className="text-white font-black">{totalEstimatedHTG} HTG</strong>
                    </p>
                  </div>

                  {/* Simulateur / Convertisseur interactif */}
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 lowercase font-normal italic">Montant à convertir :</span>
                      <span className="text-emerald-300 font-black">{calculatedHTG} HTG</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input 
                        type="number" 
                        min="100"
                        max={profile?.jetons_cp || 100}
                        step="100"
                        value={cpToConvert}
                        onChange={(e) => setCpToConvert(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Ex: 500"
                      />
                      <DSButton
                        onClick={handleQuickConvert}
                        disabled={isConverting || (profile?.jetons_cp || 0) < 100 || cpToConvert < 100}
                        variant="success"
                        size="sm"
                        className="shrink-0 flex items-center justify-center gap-2 py-2.5"
                      >
                        <ArrowRightLeft size={14} />
                        {isConverting ? '...' : 'Convertir'}
                      </DSButton>
                    </div>
                    <p className="text-[9px] text-slate-500 font-normal lowercase italic">Taux : 100 CP = {(100 * CP_TO_HTG_RATE).toFixed(2)} HTG (Min. 100 CP)</p>
                  </div>
                </div>
              </DSCard>

              {/* Carte Solde Principal HTG avec Actions Rapides */}
              <DSCard className="p-5 sm:p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.35em] text-slate-400">Solde principal</p>
                    <Wallet size={16} className="text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <p className="text-2xl sm:text-3xl font-black text-white">{(profile?.balance || 0).toLocaleString()}</p>
                    <span className="text-xs text-emerald-400 font-black">HTG</span>
                  </div>
                </div>

                {/* Boutons d'action rapide market */}
                <div className="grid grid-cols-2 gap-2">
                  <Link 
                    href="/client/finance" 
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-black hover:bg-emerald-500/20 transition active:scale-95"
                  >
                    <PlusCircle size={12} />
                    <span>Recharger</span>
                  </Link>
                  <Link 
                    href="/client/market" 
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black hover:bg-white/10 transition active:scale-95"
                  >
                    <ArrowUpRight size={12} />
                    <span>Retirer</span>
                  </Link>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 lowercase italic">Retraits instantanés</span>
                  <Link href="/client/market" className="text-[10px] text-emerald-400 hover:underline">
                    Boutique →
                  </Link>
                </div>
              </DSCard>
            </DSPanel>

            {/* Section Jeux / Expériences */}
            <DSPanel>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.35em] text-slate-400">Missions & Activités</p>
                  <p className="mt-0.5 text-xs text-slate-300 font-normal lowercase italic">Participez pour accumuler des jetons CP supplémentaires.</p>
                </div>
                <Link href="/client/list" className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 hover:text-emerald-300 transition">
                  Tout voir →
                </Link>
              </div>

              <div className="space-y-3">
                {gamesList.map((game) => (
                  <GameRow 
                    key={game.id}
                    href={game.href} 
                    icon={game.icon} 
                    title={game.title} 
                    desc={game.desc} 
                    players={game.players} 
                    tag={game.tag}
                  />
                ))}
              </div>
            </DSPanel>
          </div>

          {/* Colonne secondaire (Progrès & Actions) */}
          <div className="space-y-5 sm:space-y-6">
            
            {/* Statut & Synthèse */}
            <DSCard className="space-y-4 sm:space-y-5 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.35em] text-slate-400">Synthèse</p>
                  <p className="mt-0.5 text-base font-black text-white">Activité du compte</p>
                </div>
                <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-emerald-300">
                  {activeChallengesCount} Parcours en cours
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-3.5 sm:p-4">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">Chat Support</p>
                  <p className="mt-1 sm:mt-2 text-2xl font-black text-white">{unreadChat}</p>
                  <p className="text-[8px] text-slate-500 mt-0.5 lowercase italic">{unreadChat > 0 ? 'Nouveaux messages' : 'À jour'}</p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 p-3.5 sm:p-4">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">Alertes</p>
                  <p className="mt-1 sm:mt-2 text-2xl font-black text-white">{unreadNotifs}</p>
                  <p className="text-[8px] text-slate-500 mt-0.5 lowercase italic">{unreadNotifs > 0 ? 'Non lues' : 'Aucune'}</p>
                </div>
              </div>
            </DSCard>

            {/* Raccourcis rapides */}
            <DSCard className="space-y-3 sm:space-y-4 p-5 sm:p-6">
              <p className="text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.35em] text-slate-400">Accès Rapides</p>
              <div className="space-y-2">
                <Link
                  href="/client/market"
                  className="flex items-center justify-between w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:bg-white/10 hover:border-emerald-500/40 active:scale-98"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    Marketplace
                  </span>
                  <ChevronRight size={14} className="text-slate-500" />
                </Link>

                <Link
                  href="/client/challenges"
                  className="flex items-center justify-between w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:bg-white/10 hover:border-emerald-500/40 active:scale-98"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    Mes Défis
                  </span>
                  <ChevronRight size={14} className="text-slate-500" />
                </Link>

                <Link
                  href="/client/profile"
                  className="flex items-center justify-between w-full rounded-xl border border-transparent bg-transparent px-4 py-2.5 text-xs font-black uppercase tracking-[0.15em] text-slate-400 transition hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <User size={16} />
                    Paramètres du profil
                  </span>
                </Link>
              </div>
            </DSCard>
          </div>
        </div>
      </div>
    </DSPage>
  );
}

// Helper Lien du Menu
const MenuLink = React.memo(({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
}) => (
  <Link 
    href={href} 
    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all active:bg-white/10 group"
  >
    <div className="shrink-0">{icon}</div>
    <span className="text-[11px] font-black tracking-wider uppercase italic text-slate-300 group-hover:text-white transition">
      {label}
    </span>
    {badge !== undefined && (
      <span className="ml-auto bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] px-2 py-0.5 rounded-full font-black">
        {badge}
      </span>
    )}
    {!badge && <ChevronRight size={14} className="ml-auto text-slate-600 group-hover:text-slate-400 transition" />}
  </Link>
));
MenuLink.displayName = 'MenuLink';

// Helper Ligne de Jeu
const GameRow = React.memo(({
  href,
  icon,
  title,
  desc,
  players,
  tag,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  players: string;
  tag?: string;
}) => (
  <Link 
    href={href} 
    className="bg-slate-900/80 border border-white/5 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between hover:border-emerald-500/30 hover:bg-slate-900 transition-all active:scale-[0.98] group"
  >
    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-black italic tracking-wider uppercase text-white truncate">{title}</h4>
          {tag && (
            <span className="bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[8px] px-1.5 py-0.5 rounded font-black uppercase shrink-0">
              {tag}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 font-normal lowercase italic truncate mt-0.5">{desc}</p>
      </div>
    </div>

    <div className="flex items-center gap-2 shrink-0 ml-2">
      <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg text-[8px] sm:text-[9px] text-emerald-400 font-black">
        {players}
      </span>
      <ChevronRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition" />
    </div>
  </Link>
));
GameRow.displayName = 'GameRow';
