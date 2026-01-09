"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, ArrowDownCircle, Loader2, 
  Home, PlayCircle, History, MessagesSquare, 
  User, Bell, ArrowRightCircle, CheckCircle2, XCircle, TrendingUp,
  Gamepad2, Sparkles
} from 'lucide-react';

// --- COMPOSANT LOGO CHIF-PAM (IDENTITÉ VISUELLE POINT 4) ---
const LogoSmall = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M75 35.5C71.5 28.5 64.2 24 56 24C41.6 24 30 35.6 30 50C30 64.4 41.6 76 56 76C66.5 76 75.5 69.8 79.5 61" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
    <path d="M55 45L76 24M76 24H58M76 24V42" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ClientHome() {
  const [profile, setProfile] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [notification, setNotification] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { 
    fetchUser(); 

    const channel = supabase.channel('profile-update')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles' 
      }, (payload) => {
        if (profile && payload.new.id === profile.id) {
          if (payload.new.balance > profile.balance) {
            setNotification({type: 'success', msg: 'Dépôt approuvé !'});
          }
          setProfile(payload.new);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'transactions'
      }, (payload: any) => {
        if (payload.new.user_id === profile?.id && payload.new.status === 'rejected') {
          setNotification({type: 'error', msg: 'Transaction refusée.'});
        }
        setTimeout(() => setNotification(null), 5000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, profile?.balance]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(data);
    setFetching(false);
  };

  // --- SKELETON LOADER (POINT 1 DU RAPPORT) ---
  if (fetching) return (
    <div className="min-h-screen bg-[#020617] p-6 space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-full"></div>
          <div className="h-4 w-32 bg-slate-800 rounded"></div>
        </div>
        <div className="w-10 h-10 bg-slate-800 rounded-full"></div>
      </div>
      <div className="h-48 w-full bg-slate-900 rounded-[2.5rem] border border-white/5"></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-slate-900 rounded-4xl"></div>
        <div className="h-32 bg-slate-900 rounded-4xl"></div>
      </div>
    </div>
  );

  const availableBalance = (profile?.balance || 0) - (profile?.locked_balance || 0);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-32">
      
      {/* HEADER & SOLDE */}
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LogoSmall />
            <h1 className="text-lg tracking-tighter">
              Salut, <span className="text-emerald-500">@{profile?.username || 'Joueur'}</span>
            </h1>
          </div>
          <div className="relative p-2 bg-white/5 rounded-full border border-white/5 transition-transform active:scale-90">
            <Bell size={20} className={notification ? "text-emerald-500 animate-bounce" : "text-slate-500"} />
            {notification && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_#f43f5e]"></span>}
          </div>
        </div>

        {/* NOTIFICATION DYNAMIQUE */}
        {notification && (
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'} animate-in fade-in slide-in-from-top-4 duration-500`}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span className="text-[10px] tracking-widest font-bold">{notification.msg}</span>
          </div>
        )}

        {/* SOLDE CARD - VERSION "ALIVE" (POINT 3 DU RAPPORT) */}
        <div className="group bg-linear-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl transition-all duration-500 hover:border-emerald-500/30 hover:shadow-emerald-500/10 active:scale-[0.98]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <TrendingUp size={80} className="text-emerald-500" />
          </div>
          
          <div className="relative z-10">
            <p className="text-[10px] text-slate-500 tracking-[0.4em] mb-2 font-bold uppercase">Solde Disponible</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl tracking-tighter bg-linear-to-r from-white via-emerald-400 to-emerald-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                {availableBalance.toLocaleString()}
              </h2>
              <span className="text-xs text-emerald-500/70 font-black">HTG</span>
            </div>
            
            {profile?.locked_balance > 0 && (
              <div className="mt-4 flex items-center gap-2 text-[9px] text-amber-500 bg-amber-500/10 py-2 px-3 rounded-xl border border-amber-500/20 w-fit animate-pulse">
                <span>⚠️ {profile.locked_balance} HTG bloqués</span>
              </div>
            )}
          </div>
          
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors" />
        </div>

        {/* ACTIONS PRINCIPALES */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/client/finance" className="bg-emerald-500 p-6 rounded-4xl text-slate-950 flex flex-col items-center gap-3 shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-90 transition-all active:brightness-110">
            <Plus size={28} strokeWidth={3} />
            <span className="text-[10px] tracking-[0.2em] font-black uppercase">Dépôt</span>
          </Link>
          <Link href="/client/finance" className="bg-slate-900 p-6 rounded-4xl border border-white/5 flex flex-col items-center gap-3 active:scale-90 transition-all hover:bg-rose-500/10 hover:border-rose-500/20 group">
            <ArrowDownCircle size={28} className="text-rose-500 transition-transform group-active:translate-y-1" />
            <span className="text-[10px] tracking-[0.2em] font-black text-slate-400 group-hover:text-rose-500 uppercase">Retrait</span>
          </Link>
        </div>

        {/* --- NOUVELLE SECTION : MINI-JEUX (STRATÉGIQUE POINT 7) --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Gamepad2 size={18} className="text-emerald-500" />
              <h3 className="text-[12px] tracking-[0.2em] text-slate-400">Divertissement</h3>
            </div>
            <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full animate-pulse border border-emerald-500/20">Nouveau</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Loterie Live (Case Principale) */}
            <Link href="/client/play" className="block bg-linear-to-r from-slate-900 to-slate-800 p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group active:scale-[0.98] transition-all shadow-xl">
              <div className="flex justify-between items-center relative z-10">
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                    Loterie Live <Sparkles size={16} className="text-amber-500" />
                  </h3>
                  <p className="text-[9px] text-slate-500 tracking-[0.2em] font-bold">Mises rapides & Gains instantanés</p>
                </div>
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 transition-all duration-300">
                  <ArrowRightCircle className="text-emerald-500 group-hover:text-slate-950 transition-all" size={28} />
                </div>
              </div>
              {/* Effet de brillance au survol */}
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </Link>

            {/* Placeholder pour prochains jeux (Coming Soon) */}
            <div className="grid grid-cols-2 gap-3 opacity-60">
              <div className="bg-slate-900/30 border border-dashed border-white/10 p-4 rounded-3xl flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center">
                  <span className="text-[10px]">🎰</span>
                </div>
                <span className="text-[8px] tracking-widest text-slate-600 font-bold">Slots</span>
              </div>
              <div className="bg-slate-900/30 border border-dashed border-white/10 p-4 rounded-3xl flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center">
                  <span className="text-[10px]">🎲</span>
                </div>
                <span className="text-[8px] tracking-widest text-slate-600 font-bold">Dice</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NAV BAS DE PAGE */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 px-8 py-5 flex justify-between items-center z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <NavLink href="/client/home" icon={<Home size={22}/>} label="Accueil" active={pathname === '/client/home'} />
        <NavLink href="/client/play" icon={<PlayCircle size={22}/>} label="Jouer" active={pathname === '/client/play'} />
        <NavLink href="/client/history" icon={<History size={22}/>} label="Billets" active={pathname === '/client/history'} />
        <NavLink href="/client/chat" icon={<MessagesSquare size={22}/>} label="Support" active={pathname === '/client/chat'} />
        <NavLink href="/client/profile" icon={<User size={22}/>} label="Compte" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

function NavLink({ href, icon, label, active }: any) {
  return (
    <Link 
      href={href} 
      className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'}`}
    >
      <div className={`${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''} transition-transform`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black tracking-tighter ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
      {active && <div className="w-1 h-1 bg-emerald-500 rounded-full mt-0.5 animate-pulse" />}
    </Link>
  );
}
