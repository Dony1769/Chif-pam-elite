"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, TrendingUp, Plus, ArrowDownCircle, 
  MessagesSquare, Home, Zap, Target, 
  Gamepad2, History, User as UserIcon, Lock, Trophy,
  Users, Activity, ChevronRight, Brain, Fingerprint,
  Layers, Disc, Menu, X, Crown, ShieldCheck, Gift
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
  const [topWinners, setTopWinners] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // État pour le menu latéral
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchData();
    fetchWeeklyTopWinners();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!prof) throw new Error();
      setProfile(prof);

      const { count } = await supabase.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('is_read', false);
      setUnreadCount(count || 0);

    } catch (error) { router.push('/connexion'); } finally { setLoading(false); }
  };

  const fetchWeeklyTopWinners = async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { data: realWins } = await supabase
      .from('transactions')
      .select('profiles(username), amount')
      .eq('type', 'gain') 
      .gte('created_at', oneWeekAgo.toISOString())
      .order('amount', { ascending: false })
      .limit(3);

    const formattedRealWins = (realWins || []).map((w: any) => ({
      username: w.profiles?.username || 'Anonyme',
      amount: w.amount
    }));

    const weekNumber = Math.ceil(new Date().getDate() / 7);
    const fictionalWinners = [
      { username: `Elite_Player${weekNumber}`, amount: 15250 + (weekNumber * 100) },
      { username: `Boss_Haiti`, amount: 12400 - (weekNumber * 50) }
    ];

    const combined = [...formattedRealWins, ...fictionalWinners].sort((a, b) => b.amount - a.amount).slice(0, 5);
    setTopWinners(combined);
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Activity className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-32 overflow-x-hidden">
      
      {/* MENU LATÉRAL (DRAWER) */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed top-0 left-0 h-full w-[80%] bg-slate-950 z-[70] border-r border-white/5 p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <LogoSmall />
                <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
              </div>

              <div className="space-y-2">
                <MenuLink href="/client/vip" icon={<Crown className="text-amber-500"/>} label="Abonnement VIP" />
                <MenuLink href="/client/challenges" icon={<ShieldCheck className="text-emerald-500"/>} label="Mes Défis" />
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
            <button onClick={() => setIsMenuOpen(true)} className="p-2 bg-white/5 rounded-xl border border-white/5 active:scale-90 transition-all">
                <Menu size={24} className="text-emerald-500" />
            </button>
            <h1 className="text-lg tracking-tighter">Salut, <span className="text-emerald-500">@{profile?.username}</span></h1>
          </div>
          <Link href="/client/notifications" className="relative p-2 bg-white/5 rounded-full border border-white/5">
            <Bell size={20} className={unreadCount > 0 ? "text-emerald-500 animate-pulse" : "text-slate-500"} />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_#f43f5e]"></span>}
          </Link>
        </div>

        {/* SOLDE CARD */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 tracking-[0.4em] mb-2 uppercase">Solde Disponible</p>
              <h2 className="text-5xl tracking-tighter">
                {(profile?.balance || 0).toLocaleString()} <span className="text-xs text-emerald-500/70 font-black tracking-normal italic">HTG</span>
              </h2>
            </div>
            {profile?.is_vip && <Crown className="text-amber-500 animate-bounce" size={24} />}
          </div>
          <TrendingUp size={80} className="absolute -right-4 -bottom-4 opacity-10 text-emerald-500" />
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/client/finance" className="bg-emerald-500 p-6 rounded-4xl text-slate-950 flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-transform">
            <Plus size={24} /><span className="text-xs">Dépôt</span>
          </Link>
          <Link href="/client/finance" className="bg-slate-900 p-6 rounded-4xl border border-white/5 flex flex-col items-center gap-2 active:scale-95 transition-transform">
            <ArrowDownCircle size={24} className="text-rose-500" /><span className="text-xs">Retrait</span>
          </Link>
        </div>

        {/* LE RESTE RESTE IDENTIQUE MAIS AVEC LE NOM "DÉFIS" */}
        <div className="space-y-4">
          <h3 className="text-[10px] text-slate-500 tracking-widest px-2 font-black uppercase">Défis à la une</h3>
          <div className="grid grid-cols-1 gap-3">
            <GameRow href="/client/quiz" icon={<Brain className="text-blue-500"/>} title="CHIF QUIZ" desc="Gagne avec ton cerveau" players="3,012" />
            <GameRow href="/client/laser-vault" icon={<Lock className="text-indigo-500"/>} title="LASER VAULT" desc="Précision & Vitesse" players="2,094" />
            <GameRow href="/client/biometric-hack" icon={<Fingerprint className="text-emerald-500"/>} title="BIOMETRIC HACK" desc="Mémoire Élite" players="652" />
          </div>
        </div>

      </div>

      {/* NAV BASSE */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 px-8 py-5 flex justify-between items-center z-50 rounded-t-[2.5rem]">
        <NavLink href="/client/home" icon={<Home size={22}/>} label="Accueil" active={pathname === '/client/home'} />
        <NavLink href="/client/list" icon={<Gamepad2 size={22}/>} label="Jouer" active={pathname === '/client/list'} />
        <NavLink href="/client/history" icon={<History size={22}/>} label="Billets" active={pathname === '/client/history'} />
        <NavLink href="/client/chat" icon={<MessagesSquare size={22}/>} label="Support" active={pathname === '/client/chat'} />
        <NavLink href="/client/profile" icon={<UserIcon size={22}/>} label="Compte" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

// Sous-composant pour les liens du menu latéral
function MenuLink({ href, icon, label }: any) {
    return (
        <Link href={href} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
            {icon}
            <span className="text-xs font-black tracking-widest uppercase">{label}</span>
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
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full">
           <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
           <span className="text-[8px] text-emerald-500 font-black">{players}</span>
           <Users size={8} className="text-emerald-500"/>
        </div>
        <ChevronRight size={14} className="text-slate-700" />
      </div>
    </Link>
  );
}

function NavLink({ href, icon, label, active }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1.5 ${active ? 'text-emerald-400' : 'text-slate-600'}`}>
      {icon}
      <span className="text-[8px] font-black tracking-tighter uppercase">{label}</span>
    </Link>
  );
}
