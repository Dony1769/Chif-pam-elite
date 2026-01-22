"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, TrendingUp, Plus, ArrowDownCircle, 
  MessagesSquare, Home, Gamepad2, History, User as UserIcon, 
  Trophy, Users, Activity, ChevronRight, Brain, Fingerprint,
  X, Crown, ShieldCheck, Gift, Sparkles, Menu
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const LogoSmall = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ClientHome() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChat, setUnreadChat] = useState(0); 
  const [activeChallengesCount, setActiveChallengesCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchData();
    
    // REALTIME SUBSCRIPTIONS 600% PERFECTION
    const channel = supabase.channel('home_realtime_mega')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
          fetchNotificationCount();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          // Si un nouveau message arrive pour moi, on incrémente
          handleNewMessage(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      fetchNotificationCount();
      fetchChatCount();

      const { count: ccount } = await supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', true);
      setActiveChallengesCount(ccount || 0);

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchNotificationCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user?.id).eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const fetchChatCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // On ne compte que les messages non lus destinés à l'utilisateur
    const { count } = await supabase.from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false);
    setUnreadChat(count || 0);
  };

  const handleNewMessage = (msg: any) => {
    // Si je suis le destinataire, j'augmente le compteur
    supabase.auth.getUser().then(({data}) => {
        if (msg.receiver_id === data.user?.id) {
            setUnreadChat(prev => prev + 1);
        }
    });
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Activity className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-32 overflow-x-hidden">
      
      {/* MENU LATÉRAL */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 20 }} className="fixed top-0 left-0 h-full w-[80%] bg-slate-950 z-[70] border-r border-white/5 p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <LogoSmall />
                <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
              </div>
              <div className="space-y-2">
                <MenuLink href="/client/vip" icon={<Crown className="text-amber-500"/>} label="Abonnement VIP" />
                <MenuLink href="/client/challenges" icon={<ShieldCheck className="text-emerald-500"/>} label="Mes Défis" badge={activeChallengesCount} />
                <MenuLink href="/client/referral" icon={<Gift className="text-rose-500"/>} label="Parrainage" />
                <MenuLink href="/client/rank" icon={<Trophy className="text-blue-500"/>} label="Classement Global" />
                <div className="pt-10 border-t border-white/5 mt-10">
                    <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-slate-500 text-[10px] tracking-widest">Se Déconnecter</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="p-6 space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="relative p-2 bg-white/5 rounded-xl border border-white/5 active:scale-90 transition-all">
                <Menu size={24} className="text-emerald-500" />
                {activeChallengesCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#020617] animate-bounce"></span>}
            </button>
            <h1 className="text-lg tracking-tighter">Salut, <span className="text-emerald-500">@{profile?.username}</span></h1>
          </div>
          <Link href="/client/notifications" className="relative p-2 bg-white/5 rounded-full border border-white/5">
            <Bell size={20} className={unreadCount > 0 ? "text-emerald-500 animate-pulse" : "text-slate-500"} />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 text-white">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 items-center justify-center text-[8px]">{unreadCount}</span>
                </span>
            )}
          </Link>
        </div>

        {/* SOLDE CARD */}
        <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden shadow-2xl transition-all duration-500 ${
          profile?.vip_status !== 'free' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-amber-500/30 shadow-amber-500/10' : 'bg-slate-900 border-white/10'
        }`}>
          {profile?.vip_status !== 'free' && (
            <motion.div initial={{ x: '-100%' }} animate={{ x: '200%' }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" />
          )}
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 tracking-[0.4em] mb-2 uppercase font-black italic">Solde Disponible</p>
              <h2 className="text-5xl tracking-tighter font-black italic">
                {(profile?.balance || 0).toLocaleString()} <span className="text-xs text-emerald-500/70">HTG</span>
              </h2>
              {profile?.vip_status !== 'free' && (
                <div className="flex items-center gap-1 mt-2">
                  <Sparkles size={10} className="text-amber-500" />
                  <span className="text-[8px] text-amber-500 tracking-[0.2em] font-black italic">MEMBRE ELITE {profile?.vip_status}</span>
                </div>
              )}
            </div>
            {profile?.vip_status !== 'free' && (
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
                <Crown size={24} />
              </motion.div>
            )}
          </div>
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/client/finance" className="bg-emerald-500 p-6 rounded-4xl text-slate-950 flex flex-col items-center gap-2 active:scale-95 transition-transform">
            <Plus size={24} /><span className="text-xs font-black italic uppercase">Dépôt</span>
          </Link>
          <Link href="/client/finance" className="bg-slate-900 p-6 rounded-4xl border border-white/5 flex flex-col items-center gap-2 active:scale-95 transition-transform">
            <ArrowDownCircle size={24} className="text-rose-500" /><span className="text-xs font-black italic uppercase">Retrait</span>
          </Link>
        </div>

        {/* JEUX */}
        <div className="space-y-4">
          <h3 className="text-[10px] text-slate-500 tracking-widest px-2">Défis à la une</h3>
          <div className="grid grid-cols-1 gap-3">
            <GameRow href="/client/quiz" icon={<Brain className="text-blue-500"/>} title="CHIF QUIZ" desc="Gagne avec ton cerveau" players="3,012" />
            <GameRow href="/client/laser-vault" icon={<Lock className="text-indigo-500"/>} title="LASER VAULT" desc="Précision & Vitesse" players="2,094" />
            <GameRow href="/client/biometric-hack" icon={<Fingerprint className="text-emerald-500"/>} title="BIOMETRIC HACK" desc="Mémoire Élite" players="652" />
          </div>
        </div>

      </div>

      {/* NAV BASSE - PERFECTION 600% SUR LE SUPPORT */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 px-8 py-5 flex justify-between items-center z-50 rounded-t-[2.5rem]">
        <NavLink href="/client/home" icon={<Home size={22}/>} label="Accueil" active={pathname === '/client/home'} />
        <NavLink href="/client/list" icon={<Gamepad2 size={22}/>} label="Jeux" active={pathname === '/client/list'} />
        <NavLink href="/client/history" icon={<History size={22}/>} label="Billets" active={pathname === '/client/history'} />
        
        {/* SUPPORT NAV - LOGIQUE RESET & ANIMATION */}
        <Link 
            href="/client/chat" 
            onClick={() => setUnreadChat(0)} // Reset immédiat du compteur visuel au clic
            className={`relative flex flex-col items-center gap-1.5 transition-all ${pathname === '/client/chat' ? 'text-emerald-400' : 'text-slate-600'}`}
        >
          <motion.div
            animate={unreadChat > 0 && pathname !== '/client/chat' ? { 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
            } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <MessagesSquare size={22} className={unreadChat > 0 && pathname !== '/client/chat' ? "text-emerald-500" : ""} />
          </motion.div>
          <span className="text-[8px] font-black tracking-tighter uppercase italic">Support</span>
          
          {unreadChat > 0 && pathname !== '/client/chat' && (
            <motion.span 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-slate-950"
            >
                {unreadChat}
            </motion.span>
          )}
        </Link>

        <NavLink href="/client/profile" icon={<UserIcon size={22}/>} label="Compte" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

// COMPOSANTS INTERNES RÉUTILISABLES
function MenuLink({ href, icon, label, badge }: any) {
    return (
        <Link href={href} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
            {icon}
            <span className="text-xs font-black tracking-widest uppercase italic">{label}</span>
            {badge > 0 && <span className="ml-2 bg-emerald-500 text-black text-[8px] px-2 py-0.5 rounded-full font-black animate-pulse">{badge}</span>}
            <ChevronRight size={14} className="ml-auto text-slate-700" />
        </Link>
    )
}

function GameRow({ href, icon, title, desc, players }: any) {
  return (
    <Link href={href} className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">{icon}</div>
        <div>
          <h4 className="text-[11px] font-black italic tracking-tighter uppercase">{title}</h4>
          <p className="text-[8px] text-slate-500 lowercase">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full">
         <span className="text-[8px] text-emerald-500 font-black">{players}</span>
         <Users size={8} className="text-emerald-500"/>
      </div>
    </Link>
  );
}

function NavLink({ href, icon, label, active }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1.5 transition-colors ${active ? 'text-emerald-400' : 'text-slate-600'}`}>
      {icon}
      <span className="text-[8px] font-black tracking-tighter uppercase italic">{label}</span>
    </Link>
  );
}
