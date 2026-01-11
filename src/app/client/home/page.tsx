"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, Wallet, Gamepad2, History, User as UserIcon,
  TrendingUp, Loader2, Plus, ArrowDownCircle, Sparkles, 
  ArrowRightCircle, CheckCircle2, MessagesSquare, Home,
  Zap, Trophy, Target, BarChart3
} from 'lucide-react';
import Link from 'next/link';

// --- VOTRE LOGO PRÉSERVÉ ---
const LogoSmall = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ClientHome() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      const cleanup = setupSubscriptions(profile.id);
      return () => { cleanup && cleanup(); };
    }
  }, [profile?.id]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data: prof, error: profError } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();

      if (profError || !prof) throw new Error("Profil introuvable");
      if (prof.is_banned) {
        await supabase.auth.signOut();
        window.location.replace('/connexion');
        return;
      }

      setProfile(prof);

      const { data: notifs } = await supabase.from('notifications')
        .select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(5);
      
      if (notifs) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      }
    } catch (error) { 
      console.error(error);
      router.push('/connexion');
    } finally { setLoading(false); }
  };

  const setupSubscriptions = (userId: string) => {
    // 1. Écoute des NOTIFICATIONS (Cloche opérationnelle)
    const channelNotif = supabase.channel(`notifs-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, 
      (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
        if (window.navigator.vibrate) window.navigator.vibrate(100);
      }).subscribe();

    // 2. Écoute du PROFIL (Sécurité Realtime)
    const channelProfile = supabase.channel(`profile-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, 
      async (payload) => {
        if (payload.new.is_banned === true) {
          await supabase.auth.signOut();
          window.location.replace('/connexion');
        } else {
          setProfile(payload.new);
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(channelNotif);
      supabase.removeChannel(channelProfile);
    };
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] p-6 space-y-8 animate-pulse">
      <div className="flex justify-between items-center"><div className="w-10 h-10 bg-slate-800 rounded-full"></div><div className="h-10 w-10 bg-slate-800 rounded-full"></div></div>
      <div className="h-48 w-full bg-slate-900 rounded-[2.5rem]"></div>
      <div className="grid grid-cols-2 gap-4"><div className="h-32 bg-slate-900 rounded-4xl"></div><div className="h-32 bg-slate-900 rounded-4xl"></div></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-32">
      <div className="p-6 space-y-6">
        
        {/* HEADER */}
        {/* HEADER - CLOCHE OPÉRATIONNELLE */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LogoSmall />
            <h1 className="text-lg tracking-tighter">Salut, <span className="text-emerald-500">@{profile?.username}</span></h1>
          </div>
          <Link href="/client/notifications" className="relative p-2 bg-white/5 rounded-full border border-white/5 transition-all active:scale-90">
            <Bell size={20} className={unreadCount > 0 ? "text-emerald-500 animate-bounce" : "text-slate-500"} />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_#f43f5e]"></span>}
          </Link>
        </div>

        {/* SOLDE CARD */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <p className="text-[10px] text-slate-500 tracking-[0.4em] mb-2 uppercase">Solde Disponible</p>
            <h2 className="text-5xl tracking-tighter bg-gradient-to-r from-white to-emerald-500 bg-clip-text text-transparent">
              {(profile?.balance || 0).toLocaleString()} <span className="text-xs text-emerald-500/70 font-black">HTG</span>
            </h2>
          </div>
          <TrendingUp size={80} className="absolute -right-4 -bottom-4 opacity-10 text-emerald-500" />
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/client/finance" className="bg-emerald-500 p-6 rounded-4xl text-slate-950 flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-transform"><Plus size={24} /><span>Dépôt</span></Link>
          <Link href="/client/finance" className="bg-slate-900 p-6 rounded-4xl border border-white/5 flex flex-col items-center gap-2 active:scale-95 transition-transform"><ArrowDownCircle size={24} className="text-rose-500" /><span>Retrait</span></Link>
        </div>

        {/* RAPPORTS CLIENTS */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl"><BarChart3 size={20} className="text-blue-500"/></div>
              <div>
                <p className="text-[10px] text-slate-400">Rapports d'activité</p>
                <p className="text-xs">Statistiques de jeu</p>
              </div>
           </div>
           <Link href="/client/reports" className="text-blue-500 text-[10px] border-b border-blue-500/30">Détails</Link>
        </div>

        {/* JEU PRINCIPAL */}
        <div className="space-y-3">
          <h3 className="text-[10px] text-slate-500 tracking-widest px-2">Jeux Disponibles</h3>
          <Link href="/client/play" className="block bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-[2.5rem] border border-white/5 relative group overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
              <div className="space-y-1">
                <h3 className="text-xl font-black flex items-center gap-2">Loterie Live <Sparkles size={16} className="text-amber-500" /></h3>
                <p className="text-[9px] text-slate-500 tracking-widest">Mises rapides & Gains instantanés</p>
              </div>
              <ArrowRightCircle className="text-emerald-500 group-hover:translate-x-1 transition-transform" size={28} />
            </div>
            <div className="absolute top-0 right-0 p-2 bg-emerald-500/20 rounded-bl-2xl">
                <span className="text-[8px] text-emerald-500">Ouvert</span>
            </div>
          </Link>
        </div>

        {/* JEUX D'AGILITÉ & STRATÉGIE (Mise à jour effectuée ici) */}
        <div className="space-y-3">
          <h3 className="text-[10px] text-slate-500 tracking-widest px-2 font-black">Agilité & Stratégie</h3>
          <div className="grid grid-cols-2 gap-4">
            
            {/* CRASH / CROISSANCE */}
            <Link href="/client/crash" className="bg-slate-900 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition-all group">
               <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                 <Zap size={24}/>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-black italic">Croissance</p>
                 <p className="text-[7px] text-slate-500 lowercase italic">Anticipez la courbe</p>
               </div>
            </Link>
            
            {/* MINES */}
            <Link href="/client/mines" className="bg-slate-900 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition-all group">
               <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-slate-950 transition-colors">
                 <Target size={24}/>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-black italic">Mines</p>
                 <p className="text-[7px] text-slate-500 lowercase italic">Gestion du risque</p>
               </div>
            </Link>
            
        </div>

        {/* RAPPORTS CLIENTS (Nouvelle Section) */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl"><BarChart3 size={20} className="text-blue-500"/></div>
              <div>
                <p className="text-[10px] text-slate-400">Rapports d'activité</p>
                <p className="text-xs">Statistiques de jeu</p>
              </div>
           </div>
           <Link href="/client/reports" className="text-blue-500 text-[10px] border-b border-blue-500/30">Détails</Link>
        </div>

        {/* JEU PRINCIPAL */}
        <div className="space-y-3">
          <h3 className="text-[10px] text-slate-500 tracking-widest px-2">Jeux Disponibles</h3>
          <Link href="/client/play" className="block bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-[2.5rem] border border-white/5 relative group overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
              <div className="space-y-1">
                <h3 className="text-xl font-black flex items-center gap-2">Loterie Live <Sparkles size={16} className="text-amber-500" /></h3>
                <p className="text-[9px] text-slate-500 tracking-widest">Mises rapides & Gains instantanés</p>
              </div>
              <ArrowRightCircle className="text-emerald-500 group-hover:translate-x-1 transition-transform" size={28} />
            </div>
            <div className="absolute top-0 right-0 p-2 bg-emerald-500/20 rounded-bl-2xl">
                <span className="text-[8px] text-emerald-500">Ouvert</span>
            </div>
          </Link>
        </div>

        {/* MINI JEUX À VENIR (Nouvelles Cases) */}
        <div className="space-y-3">
          <h3 className="text-[10px] text-slate-500 tracking-widest px-2">Bientôt Disponible</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center gap-3 opacity-60 grayscale group">
               <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Zap size={24}/></div>
               <span className="text-[10px] text-center">Crash Game</span>
               <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-800 rounded-full text-[6px]">Coming</div>
            </div>
            
            <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center gap-3 opacity-60 grayscale">
               <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500"><Target size={24}/></div>
               <span className="text-[10px] text-center">Mines</span>
               <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-800 rounded-full text-[6px]">Coming</div>
            </div>
          </div>
        </div>

      </div>

      {/* NAV BASSE */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 px-8 py-5 flex justify-between items-center z-50 rounded-t-[2.5rem]">
        <NavLink href="/client/home" icon={<Home size={22}/>} label="Accueil" active={pathname === '/client/home'} />
        <NavLink href="/client/play" icon={<Gamepad2 size={22}/>} label="Jouer" active={pathname === '/client/play'} />
        <NavLink href="/client/history" icon={<History size={22}/>} label="Billets" active={pathname === '/client/history'} />
        <NavLink href="/client/chat" icon={<MessagesSquare size={22}/>} label="Support" active={pathname === '/client/chat'} />
        <NavLink href="/client/profile" icon={<UserIcon size={22}/>} label="Compte" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

function NavLink({ href, icon, label, active }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1.5 ${active ? 'text-emerald-400' : 'text-slate-600'}`}>
      {icon}
      <span className="text-[8px] font-black tracking-tighter">{label}</span>
    </Link>
  );
}
