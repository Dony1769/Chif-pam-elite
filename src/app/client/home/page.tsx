"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, TrendingUp, Plus, ArrowDownCircle, Sparkles, 
  MessagesSquare, Home, Zap, Target, BarChart3,
  Gamepad2, History, User as UserIcon, Lock, Trophy,
  Users, Activity, ChevronRight, Brain, Fingerprint
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchData();
    fetchTopWinners();
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

  const fetchTopWinners = async () => {
    // Simule ou récupère les plus gros gains récents dans 'transactions' ou 'mises'
    const { data } = await supabase.from('profiles')
      .select('username, balance')
      .order('balance', { ascending: false })
      .limit(3);
    if (data) setTopWinners(data);
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Activity className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-32">
      <div className="p-6 space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LogoSmall />
            <h1 className="text-lg tracking-tighter">Salut, <span className="text-emerald-500">@{profile?.username}</span></h1>
          </div>
          <Link href="/client/notifications" className="relative p-2 bg-white/5 rounded-full border border-white/5">
            <Bell size={20} className={unreadCount > 0 ? "text-emerald-500 animate-pulse" : "text-slate-500"} />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_#f43f5e]"></span>}
          </Link>
        </div>

        {/* SOLDE CARD */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl">
          <p className="text-[10px] text-slate-500 tracking-[0.4em] mb-2 uppercase">Solde Disponible</p>
          <h2 className="text-5xl tracking-tighter">
            {(profile?.balance || 0).toLocaleString()} <span className="text-xs text-emerald-500/70 font-black tracking-normal italic">HTG</span>
          </h2>
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

        {/* LOTERIE FERMÉE */}
        <div className="opacity-60 grayscale pointer-events-none relative">
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="bg-black/80 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
               <Lock size={14} className="text-amber-500"/>
               <span className="text-[10px] text-white tracking-widest">PROCHAINEMENT</span>
            </div>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 flex justify-between items-center">
            <div>
              <h3 className="text-xl">Loterie Live</h3>
              <p className="text-[8px] text-slate-500">Mises & Gains instantanés</p>
            </div>
            <span className="text-[8px] text-rose-500 border border-rose-500/30 px-2 py-1 rounded-lg font-black">FERMÉ</span>
          </div>
        </div>

        {/* TOP GAGNANTS DE LA SEMAINE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Trophy size={16} className="text-amber-500"/>
            <h3 className="text-[10px] text-slate-500 tracking-widest">Top Gagnants Semaine</h3>
          </div>
          <div className="bg-slate-900/30 border border-white/5 rounded-[2rem] divide-y divide-white/5 overflow-hidden">
            {topWinners.map((winner, idx) => (
              <div key={idx} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black ${idx === 0 ? 'text-amber-500' : 'text-slate-500'}`}>#0{idx + 1}</span>
                  <p className="text-[11px] font-black tracking-tighter">@{winner.username}</p>
                </div>
                <p className="text-xs text-emerald-500">+{winner.balance.toLocaleString()} HTG</p>
              </div>
            ))}
          </div>
        </div>

        {/* TOP JEUX (LISTE DYNAMIQUE) */}
        <div className="space-y-4">
          <h3 className="text-[10px] text-slate-500 tracking-widest px-2 font-black">Jeux Populaires</h3>
          <div className="grid grid-cols-1 gap-3">
            
            <GameRow href="/client/crash" icon={<Zap className="text-amber-500"/>} title="CROISSANCE" desc="Anticipez la courbe" players="1,248" />
            <GameRow href="/client/mines" icon={<Target className="text-rose-500"/>} title="MINES" desc="Gestion du risque" players="856" />
            <GameRow href="/client/biometric-hack" icon={<Fingerprint className="text-emerald-500"/>} title="BIOMETRIC HACK" desc="Agilité Visuelle" players="652" />
            <GameRow href="/client/quiz" icon={<Brain className="text-blue-500"/>} title="CHIF QUIZ" desc="Connaissances" players="3012" />
            <GameRow href="/client/laser-vault" icon={<Lock className="text-indigo-500"/>} title="LASER VAULT" desc="Précision" players="2094" />

          </div>
        </div>

      </div>

      {/* NAV BASSE CORRIGÉE */}
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

// COMPOSANT LIGNE DE JEU
function GameRow({ href, icon, title, desc, players }: any) {
  return (
    <Link href={href} className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">{icon}</div>
        <div>
          <h4 className="text-[11px] font-black italic">{title}</h4>
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
