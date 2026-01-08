"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, ArrowDownCircle, Wallet, Loader2, 
  Home, PlayCircle, History, MessageSquare, 
  User, Bell, ArrowRightCircle
} from 'lucide-react';

export default function ClientHome() {
  const [profile, setProfile] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { 
    fetchUser(); 

    // Sync Realtime pour le solde (balance et locked_balance)
    const channel = supabase.channel('profile-update')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles' 
      }, (payload) => {
        if (profile && payload.new.id === profile.id) {
          setProfile(payload.new);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(data);
    setFetching(false);
  };

  if (fetching) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  // Calcul du solde disponible selon ton rapport
  const availableBalance = (profile?.balance || 0) - (profile?.locked_balance || 0);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-32">
      
      {/* HEADER & SOLDE */}
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 font-black italic">CP</div>
            <h1 className="text-xl tracking-tighter">CHIF PAM</h1>
          </div>
          <Bell className="text-slate-500" />
        </div>

        <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet size={80} />
          </div>
          <p className="text-[10px] text-slate-500 tracking-[0.4em] mb-2">Solde Disponible</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-5xl tracking-tighter text-emerald-500">{availableBalance.toLocaleString()}</h2>
            <span className="text-xs text-emerald-500">HTG</span>
          </div>
          
          {profile?.locked_balance > 0 && (
            <p className="mt-4 text-[9px] text-amber-500 bg-amber-500/10 py-2 px-3 rounded-lg inline-block not-italic">
              ⚠️ {profile.locked_balance} HTG en attente de retrait
            </p>
          )}
        </div>

        {/* ACTIONS PRINCIPALES (REDIRECTION FINANCE) */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/client/finance" className="bg-emerald-500 p-6 rounded-[2rem] text-slate-950 flex flex-col items-center gap-3 shadow-[0_10px_30px_rgba(16,185,129,0.2)] active:scale-95 transition-all">
            <Plus size={28} />
            <span className="text-xs tracking-widest">Dépôt</span>
          </Link>
          <Link href="/client/finance" className="bg-slate-900 p-6 rounded-[2rem] border border-white/5 flex flex-col items-center gap-3 active:scale-95 transition-all">
            <ArrowDownCircle size={28} className="text-emerald-500" />
            <span className="text-xs tracking-widest">Retrait</span>
          </Link>
        </div>

        {/* ACCÈS JEU RAPIDE */}
        <Link href="/client/play" className="block bg-slate-900 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="text-lg">Jouer une mise</h3>
              <p className="text-[9px] text-slate-500 tracking-widest">Sessions en cours</p>
            </div>
            <ArrowRightCircle className="text-emerald-500 group-hover:translate-x-2 transition-transform" size={32} />
          </div>
        </Link>
      </div>

      {/* NAV BAS DE PAGE */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 px-8 py-5 flex justify-between items-center z-50 rounded-t-[2rem]">
        <NavLink href="/client/home" icon={<Home size={22}/>} label="Accueil" active={pathname === '/client/home'} />
        <NavLink href="/client/play" icon={<PlayCircle size={22}/>} label="Jouer" active={pathname === '/client/play'} />
        <NavLink href="/client/history" icon={<History size={22}/>} label="Billets" active={pathname === '/client/history'} />
        <NavLink href="/client/finance" icon={<Wallet size={22}/>} label="Finance" active={pathname === '/client/finance'} />
        <NavLink href="/client/profile" icon={<User size={22}/>} label="Compte" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

function NavLink({ href, icon, label, active }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1.5 ${active ? 'text-emerald-500' : 'text-slate-500'}`}>
      {icon}
      <span className="text-[8px] font-bold">{label}</span>
    </Link>
  );
}

