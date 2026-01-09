"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, Wallet, Gamepad2, History, User as UserIcon,
  TrendingUp, Loader2, Plus, ArrowDownCircle, Sparkles, 
  ArrowRightCircle, CheckCircle2, XCircle, MessagesSquare, Home
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
    const cleanup = setupSubscriptions();
    return () => { cleanup && cleanup(); };
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      const { data: notifs } = await supabase.from('notifications')
        .select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(5);
      
      if (notifs) {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const setupSubscriptions = () => {
    // Écoute des NOTIFICATIONS (Nouveau système)
    const channelNotif = supabase.channel('notifs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, 
      (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
        if (window.navigator.vibrate) window.navigator.vibrate(100);
      }).subscribe();

    // Écoute du SOLDE (Ancien système préservé)
    const channelProfile = supabase.channel('profile-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, 
      (payload) => {
        if (payload.new.id === profile?.id) setProfile(payload.new);
      }).subscribe();

    return () => {
      supabase.removeChannel(channelNotif);
      supabase.removeChannel(channelProfile);
    };
  };

  // --- SKELETON LOADER PRÉSERVÉ ---
  if (loading) return (
    <div className="min-h-screen bg-[#020617] p-6 space-y-8 animate-pulse">
      <div className="flex justify-between items-center"><div className="w-10 h-10 bg-slate-800 rounded-full"></div><div className="h-10 w-10 bg-slate-800 rounded-full"></div></div>
      <div className="h-48 w-full bg-slate-900 rounded-[2.5rem]"></div>
      <div className="grid grid-cols-2 gap-4"><div className="h-32 bg-slate-900 rounded-4xl"></div><div className="h-32 bg-slate-900 rounded-4xl"></div></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-32">
      
      {/* HEADER AVEC LOGO ET CLOCHE SMART */}
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LogoSmall />
            <h1 className="text-lg tracking-tighter">Salut, <span className="text-emerald-500">@{profile?.username}</span></h1>
          </div>
          <Link href="/client/notifications" className="relative p-2 bg-white/5 rounded-full border border-white/5">
            <Bell size={20} className={unreadCount > 0 ? "text-emerald-500 animate-bounce" : "text-slate-500"} />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_#f43f5e]"></span>}
          </Link>
        </div>

        {/* SOLDE CARD "ALIVE" PRÉSERVÉ */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <p className="text-[10px] text-slate-500 tracking-[0.4em] mb-2 uppercase">Solde Disponible</p>
            <h2 className="text-5xl tracking-tighter bg-gradient-to-r from-white to-emerald-500 bg-clip-text text-transparent">
              {(profile?.balance || 0).toLocaleString()} <span className="text-xs text-emerald-500/70 font-black">HTG</span>
            </h2>
          </div>
          <TrendingUp size={80} className="absolute -right-4 -bottom-4 opacity-10 text-emerald-500" />
        </div>

        {/* ACTIONS & JEUX PRÉSERVÉS */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/client/finance" className="bg-emerald-500 p-6 rounded-4xl text-slate-950 flex flex-col items-center gap-2 shadow-lg"><Plus size={24} /><span>Dépôt</span></Link>
          <Link href="/client/finance" className="bg-slate-900 p-6 rounded-4xl border border-white/5 flex flex-col items-center gap-2"><ArrowDownCircle size={24} className="text-rose-500" /><span>Retrait</span></Link>
        </div>

        {/* APERÇU DES NOTIFICATIONS (Nouveau & Pratique) */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
            <h3 className="text-[10px] text-slate-500 tracking-widest px-2">Alertes Récentes</h3>
            {notifications.slice(0, 1).map(n => (
              <div key={n.id} className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span className="text-[10px] tracking-widest lowercase not-italic">{n.title}</span>
              </div>
            ))}
          </div>
        )}

        <Link href="/client/play" className="block bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-[2.5rem] border border-white/5 relative group">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-xl font-black flex items-center gap-2">Loterie Live <Sparkles size={16} className="text-amber-500" /></h3>
              <p className="text-[9px] text-slate-500 tracking-widest">Mises rapides & Gains instantanés</p>
            </div>
            <ArrowRightCircle className="text-emerald-500" size={28} />
          </div>
        </Link>
      </div>

      {/* NAV BASSE PRÉSERVÉE */}
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

