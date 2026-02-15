"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, Plus, ArrowDownCircle, 
  MessagesSquare, Home, Gamepad2, History, 
  User as UserIcon, Lock, Trophy,
  Activity, ChevronRight, Brain, Fingerprint,
  Menu, X, Crown, ShieldCheck, Gift, Sparkles,
  RefreshCw, Coins, ShoppingCart
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Vos composants personnalisés
import OnboardingTour from '@/components/OnboardingTour';

const LogoSmall = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ClientHome() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0); 
  const [activeChallengesCount, setActiveChallengesCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  const globalNotificationCount = unreadNotifs + activeChallengesCount;

  const playPing = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    fetchData();
    
    const channel = supabase.channel('client_home_ultra_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          setProfile(payload.new);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => refreshChatCount())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => fetchNotificationCount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchChallengesCount())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pathname]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      await Promise.all([
        fetchNotificationCount(),
        fetchChallengesCount(),
        refreshChatCount()
      ]);

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleQuickConvert = async () => {
    if (!profile || profile.jetons_cp < 100) return alert("Minimum 100 CP pour convertir");
    
    setIsConverting(true);
    const { error } = await supabase.rpc('convertir_cp_en_htg', {
        p_user_id: profile.id,
        p_montant_cp: Math.floor(profile.jetons_cp)
    });

    if (error) alert(error.message);
    else playPing();
    setIsConverting(false);
  };

  const fetchChallengesCount = async () => {
    const { count } = await supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', true);
    setActiveChallengesCount(count || 0);
  };

  const refreshChatCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || pathname === '/client/chat') { setUnreadChat(0); return; }
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_admin_message', true).eq('is_read_by_client', false);
    setUnreadChat(count || 0);
  };

  const fetchNotificationCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
    setUnreadNotifs(count || 0);
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Activity className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-32 overflow-x-hidden relative">
      
      {/* INTEGRATION DU POP-UP ONBOARDING */}
      <OnboardingTour />
      
      
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"/>
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 20 }} className="fixed top-0 left-0 h-full w-[80%] bg-slate-950 z-[70] border-r border-white/5 p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-10"><LogoSmall /><button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button></div>
              <div className="space-y-2">
                <MenuLink href="/client/rewards" icon={<Gift className="text-pink-500"/>} label="Récompenses & Missions" badge={profile?.login_streak > 0 ? "!" : ""} />
                <MenuLink href="/client/vip" icon={<Crown className="text-amber-500"/>} label="Abonnement VIP" />
                <MenuLink href="/client/challenges" icon={<ShieldCheck className="text-emerald-500"/>} label="Mes Défis" badge={activeChallengesCount} />
                <MenuLink href="/client/market" icon={<Sparkles className="text-purple-500"/>} label="Boutique CP" />
                <MenuLink href="/client/rank" icon={<Trophy className="text-blue-500"/>} label="Classement Global" />
                <div className="pt-10 border-t border-white/5 mt-10">
                    <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-slate-500 text-[10px] tracking-widest uppercase font-black">Déconnexion</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="p-6 space-y-6">
        {/* Header avec Panier et Cloche */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="relative p-2 bg-white/5 rounded-xl border border-white/5 active:scale-95 transition-all">
                <Menu size={24} className="text-emerald-500" />
            </button>
            <h1 className="text-lg tracking-tighter italic uppercase font-black">Salut, <span className="text-emerald-500">@{profile?.username}</span></h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href="/client/market" id="market-btn" className="relative p-2 bg-white/5 rounded-full border border-white/5 active:scale-90 transition-all">
                <ShoppingCart size={20} className="text-emerald-500" />
            </Link>
            
            <Link href="/client/notifications" className="relative p-2 bg-white/5 rounded-full border border-white/5 active:scale-90 transition-all">
                <Bell size={20} className={globalNotificationCount > 0 ? "text-emerald-500" : "text-slate-500"} />
                {globalNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 items-center justify-center text-[8px] font-black">{globalNotificationCount}</span>
                    </span>
                )}
            </Link>
          </div>
        </div>

        {/* --- DOUBLE BALANCE CARD --- */}
        <div className="space-y-4" id="balance-card">
          {/* Main Wallet: CP (Game Fuel) */}
          <div className="bg-[#0f172a] border border-emerald-500/20 rounded-[2rem] p-6 relative overflow-hidden group shadow-lg shadow-emerald-500/5">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Coins size={80} className="text-emerald-500" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[9px] text-emerald-500 font-black tracking-[0.3em] mb-1">JETONS DE JEU (CP)</p>
                  <h2 className="text-4xl font-black italic tracking-tighter text-white">
                    {(profile?.jetons_cp || 0).toLocaleString()}
                  </h2>
                </div>
                <button 
                  onClick={handleQuickConvert}
                  disabled={isConverting || (profile?.jetons_cp || 0) < 100}
                  className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 active:scale-90 disabled:opacity-30 transition-all"
                >
                  <RefreshCw size={14} className={isConverting ? "animate-spin" : ""} /> CONVERTIR
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Wallet: HTG (Cash Balance) */}
          <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-5 flex justify-between items-center px-8">
            <div>
              <p className="text-[8px] text-slate-500 font-black tracking-widest mb-1 uppercase">Balance Gourdes</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black italic">{(profile?.balance || 0).toLocaleString()}</span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">HTG</span>
              </div>
            </div>
            {profile?.vip_status !== 'free' && (
              <div className="text-amber-500">
                <Crown size={20} />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons (Dépôt / Retrait pour HTG) */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/client/finance" className="bg-emerald-500 p-5 rounded-[1.8rem] text-slate-950 flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xl shadow-emerald-500/10">
            <Plus size={20} /><span className="text-[9px] font-black italic uppercase tracking-widest">Dépôt</span>
          </Link>
          <Link href="/client/finance" className="bg-slate-900/50 p-5 rounded-[1.8rem] border border-white/10 flex flex-col items-center gap-1 active:scale-95 transition-all">
            <ArrowDownCircle size={20} className="text-rose-500" /><span className="text-[9px] font-black italic uppercase tracking-widest">Retrait</span>
          </Link>
        </div>

        {/* Jeux / Défis à la une */}
        <div className="space-y-4" id="challenges-section">
          <h3 className="text-[10px] text-slate-500 tracking-[0.3em] px-2 font-black italic uppercase">Défis à la une</h3>
          <div className="space-y-3 pb-10">
            <GameRow href="/client/quiz" icon={<Brain className="text-blue-500"/>} title="CHIF QUIZ" desc="Gagne avec ton cerveau" players="3,012" />
            <GameRow href="/client/laser-vault" icon={<Lock className="text-indigo-500"/>} title="LASER VAULT" desc="Précision & Vitesse" players="2,094" />
            <GameRow href="/client/biometric-hack" icon={<Fingerprint className="text-emerald-500"/>} title="BIOMETRIC HACK" desc="Mémoire Élite" players="652" />
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-3xl border-t border-white/5 px-8 py-6 flex justify-between items-center z-50 rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
        <NavLink href="/client/home" icon={<Home size={22}/>} label="Accueil" active={pathname === '/client/home'} />
        <NavLink href="/client/list" icon={<Gamepad2 size={22}/>} label="Jeux" active={pathname === '/client/list'} />
        <NavLink href="/client/history" icon={<History size={22}/>} label="Billets" active={pathname === '/client/history'} />
        
        <Link href="/client/chat" className={`relative flex flex-col items-center gap-1.5 transition-all ${pathname === '/client/chat' ? 'text-emerald-400' : 'text-slate-600'}`}>
          <div className="relative">
            <MessagesSquare size={22} className={unreadChat > 0 ? "animate-bounce text-emerald-500" : ""} />
            {unreadChat > 0 && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-black">{unreadChat}</span>
            )}
          </div>
          <span className="text-[8px] font-black uppercase italic tracking-tighter">Support</span>
        </Link>

        <NavLink href="/client/profile" icon={<UserIcon size={22}/>} label="Compte" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

function MenuLink({ href, icon, label, badge }: any) {
    return (
        <Link href={href} className="flex items-center gap-4 p-5 rounded-2xl hover:bg-white/5 transition-all active:bg-white/5">
            {icon}
            <span className="text-[10px] font-black tracking-widest uppercase italic">{label}</span>
            {badge && <span className="ml-2 bg-emerald-500 text-black text-[8px] px-2 py-0.5 rounded-md font-black">{badge}</span>}
            <ChevronRight size={14} className="ml-auto text-slate-700" />
        </Link>
    )
}

function GameRow({ href, icon, title, desc, players }: any) {
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

function NavLink({ href, icon, label, active }: any) {
    return (
      <Link href={href} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-emerald-400 scale-110' : 'text-slate-600'}`}>
        {icon}
        <span className="text-[8px] font-black uppercase italic tracking-tighter">{label}</span>
      </Link>
    );
}
