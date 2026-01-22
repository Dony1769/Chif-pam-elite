"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Bell, TrendingUp, Plus, ArrowDownCircle, 
  MessagesSquare, Home, Gamepad2, History, User as UserIcon, Trophy,
  Users, Activity, ChevronRight, Brain, Fingerprint,
  X, Crown, Gift, Sparkles, Menu
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ... (Garder LogoSmall)

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

    // 600% PERFECTION : REALTIME TOTAL
    const channel = supabase.channel('global_sync')
      // Écoute les nouvelles notifications
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => fetchNotificationCount())
      // Écoute les nouveaux messages ET les changements de lecture (UPDATE)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        // Si un message est inséré OU si un message est mis à jour (ex: is_read: true)
        fetchChatCount();
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
    const { count } = await supabase.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id).eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const fetchChatCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // On compte uniquement les messages destinés à l'utilisateur qui ne sont PAS lus
    const { count } = await supabase.from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false);
    
    setUnreadChat(count || 0);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}>
        <Activity className="text-emerald-500" />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-32 overflow-x-hidden">
      
      {/* DRAWER MENU (Garder ton code AnimatePresence du drawer) */}
      
      <div className="p-6 space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="relative p-2 bg-white/5 rounded-xl border border-white/5 active:scale-90 transition-all">
                <Menu size={24} className="text-emerald-500" />
                {activeChallengesCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#020617]"></span>}
            </button>
            <h1 className="text-lg tracking-tighter italic">ARENA_<span className="text-emerald-500">HUB</span></h1>
          </div>
          <Link href="/client/notifications" className="relative p-2 bg-white/5 rounded-full border border-white/5">
            <Bell size={20} className={unreadCount > 0 ? "text-emerald-500 animate-pulse" : "text-slate-500"} />
            <AnimatePresence>
              {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 flex h-4 w-4 bg-rose-500 rounded-full items-center justify-center text-[8px] font-bold border-2 border-[#020617]"
                  >
                    {unreadCount}
                  </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* SOLDE CARD (Garder ton code Solde Card) */}

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/client/finance" className="bg-emerald-500 p-6 rounded-4xl text-slate-950 flex flex-col items-center gap-2 shadow-lg active:scale-95 transition-transform group">
            <Plus size={24} className="group-hover:rotate-90 transition-transform" />
            <span className="text-xs font-black italic uppercase">Dépôt</span>
          </Link>
          <Link href="/client/finance" className="bg-slate-900 p-6 rounded-4xl border border-white/5 flex flex-col items-center gap-2 active:scale-95 transition-transform">
            <ArrowDownCircle size={24} className="text-rose-500" />
            <span className="text-xs font-black italic uppercase">Retrait</span>
          </Link>
        </div>

        {/* JEUX (Garder ton code GameRow) */}

      </div>

      {/* NAV BASSE 600% OPTIMIZED */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 px-8 py-5 flex justify-between items-center z-50 rounded-t-[2.5rem]">
        <NavLink href="/client/home" icon={<Home size={22}/>} label="Accueil" active={pathname === '/client/home'} />
        <NavLink href="/client/challenges" icon={<Gamepad2 size={22}/>} label="Jouer" active={pathname === '/client/challenges'} />
        <NavLink href="/client/history" icon={<History size={22}/>} label="Billets" active={pathname === '/client/history'} />
        
        {/* SUPPORT NAV AVEC GESTION DE COMPTEUR PRÉCISE */}
        <Link href="/client/chat" className={`relative flex flex-col items-center gap-1.5 transition-colors ${pathname === '/client/chat' ? 'text-emerald-400' : 'text-slate-600'}`}>
          <div className="relative">
            <MessagesSquare size={22} className={unreadChat > 0 ? "text-emerald-500" : ""} />
            <AnimatePresence>
                {unreadChat > 0 && (
                    <motion.span 
                        initial={{ scale: 0, y: 5 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, y: 5 }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-slate-950 shadow-lg shadow-rose-500/40"
                    >
                        {unreadChat}
                    </motion.span>
                )}
            </AnimatePresence>
          </div>
          <span className="text-[8px] font-black tracking-tighter uppercase italic">Support</span>
          
          {/* Aura lumineuse si message en attente */}
          {unreadChat > 0 && (
             <motion.div 
               animate={{ opacity: [0.2, 0.5, 0.2] }} 
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="absolute -inset-2 bg-emerald-500/10 blur-xl rounded-full -z-10" 
             />
          )}
        </Link>

        <NavLink href="/client/profile" icon={<UserIcon size={22}/>} label="Compte" active={pathname === '/client/profile'} />
      </nav>
    </div>
  );
}

// ... (Garder NavLink, GameRow et MenuLink)
