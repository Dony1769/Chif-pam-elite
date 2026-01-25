"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Loader2, CheckCheck, Bell, Trophy, Zap, Shield, Cpu, Filter, Flame } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

type FilterType = 'TOUT' | 'VICTOIRES' | 'DÉFIS' | 'SYSTÈME';

export default function ClientNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [liveChallenges, setLiveChallenges] = useState<any[]>([]); // Nouvel état pour les défis
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('TOUT');
  const router = useRouter();

  useEffect(() => { 
    fetchAllData();

    // ECOUTEUR GLOBAL 600% PERF
    const channel = supabase.channel('notif_radar_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges' }, (payload) => {
        // Un nouveau défi apparaît !
        setLiveChallenges(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      // Récupérer notifications ET défis en parallèle
      const [notifsRes, challengesRes] = await Promise.all([
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('challenges').select('*').eq('is_active', true).order('created_at', { ascending: false })
      ]);

      setNotifications(notifsRes.data || []);
      setLiveChallenges(challengesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // FUSION DES FLUX (Notifications + Défis convertis)
  const allAlerts = useMemo(() => {
    // On transforme les défis pour qu'ils ressemblent à des notifications
    const mappedChallenges = liveChallenges.map(c => ({
      id: `challenge-${c.id}`,
      title: `NOUVEAU DÉFI : ${c.title}`,
      content: `Récompense : ${c.prize_pool} HTG. Frais d'entrée : ${c.entry_fee_base} HTG. Bonne chance !`,
      created_at: c.created_at,
      is_read: false, // Toujours "nouveau" tant qu'il est actif
      is_challenge: true,
      link: '/client/challenges' // Redirection vers les défis
    }));

    return [...mappedChallenges, ...notifications].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications, liveChallenges]);

  // FILTRAGE INTELLIGENT ÉTENDU
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(n => {
      if (activeFilter === 'TOUT') return true;
      if (activeFilter === 'VICTOIRES') return n.title.includes('VIC') || n.title.includes('GAGNÉ');
      if (activeFilter === 'DÉFIS') return n.is_challenge || n.title.includes('DÉFI') || n.title.includes('MISSION');
      if (activeFilter === 'SYSTÈME') return !n.is_challenge && !n.title.includes('VIC') && !n.title.includes('DÉFI');
      return true;
    });
  }, [allAlerts, activeFilter]);

  const counts = useMemo(() => ({
    TOUT: allAlerts.filter(n => !n.is_read).length,
    VICTOIRES: allAlerts.filter(n => !n.is_read && (n.title.includes('VIC') || n.title.includes('GAGNÉ'))).length,
    DÉFIS: allAlerts.filter(n => !n.is_read && (n.is_challenge || n.title.includes('DÉFI'))).length,
    SYSTÈME: allAlerts.filter(n => !n.is_read && (!n.is_challenge && !n.title.includes('VIC') && !n.title.includes('DÉFI'))).length,
  }), [allAlerts]);

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-emerald-500">
        <Loader2 className="animate-spin" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-20">
      
      {/* HEADER */}
      <div className="p-6 sticky top-0 bg-[#020617]/95 backdrop-blur-2xl z-20 border-b border-emerald-500/10 space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-xl tracking-tighter">CENTRE_D_ALERTES</h1>
            <p className="text-[7px] text-emerald-500/50 tracking-[0.4em]">RADAR_ACTIF_SYNCHRONISÉ</p>
          </div>
          <button onClick={markAllAsRead} className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500">
            <CheckCheck size={20} />
          </button>
        </div>

        {/* FILTRES */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(['TOUT', 'VICTOIRES', 'DÉFIS', 'SYSTÈME'] as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`relative px-6 py-3 rounded-2xl text-[9px] tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border ${
                activeFilter === filter 
                ? 'bg-emerald-500 text-black border-emerald-500' 
                : 'bg-white/5 text-slate-500 border-white/5'
              }`}
            >
              {filter}
              {counts[filter] > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${activeFilter === filter ? 'bg-black text-emerald-500' : 'bg-emerald-500 text-black'}`}>
                  {counts[filter]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* LISTE DES ALERTES */}
      <div className="p-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredAlerts.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center py-40 text-slate-700">
              <Inbox size={60} strokeWidth={1} className="opacity-20 mb-4" />
              <p className="text-[10px] tracking-[0.5em]">AUCUNE ALERTE {activeFilter}</p>
            </motion.div>
          ) : (
            filteredAlerts.map((n) => (
              <motion.div 
                key={n.id}
                layout
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                onClick={() => n.link && router.push(n.link)}
                className={`relative p-6 rounded-[2rem] border overflow-hidden cursor-pointer ${
                  n.is_challenge 
                  ? 'bg-gradient-to-br from-blue-900/20 to-black border-blue-500/50 shadow-[0_10px_30px_rgba(59,130,246,0.2)]' 
                  : n.is_read 
                    ? 'bg-white/2 border-white/5 opacity-40' 
                    : 'bg-gradient-to-br from-slate-900 to-black border-emerald-500/30'
                }`}
              >
                {!n.is_read && (
                    <div className="absolute top-4 right-4">
                        <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                    </div>
                )}
                
                <div className="flex gap-4 items-start">
                  <div className={`p-3 rounded-xl ${
                    n.is_challenge ? 'bg-blue-500 text-white animate-pulse' :
                    n.title.includes('VIC') ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {n.is_challenge ? <Flame size={20}/> : 
                     n.title.includes('VIC') ? <Trophy size={20}/> : <Shield size={20}/>}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm tracking-tighter leading-none mb-1 pr-6 ${n.is_challenge ? 'text-blue-400 font-black' : ''}`}>
                        {n.title}
                    </h3>
                    <p className="text-[11px] lowercase not-italic text-slate-400 leading-relaxed">{n.content}</p>
                    <div className="flex justify-between items-center mt-3">
                        <p className="text-[7px] text-slate-600 tracking-widest">
                            {new Date(n.created_at).toLocaleTimeString()}
                        </p>
                        <p className="text-[7px] text-emerald-500/40 tracking-widest">
                            {n.is_challenge ? 'VOIR_DÉFI_MANTENANT' : 'SÉCURISÉ'}
                        </p>
                    </div>
                  </div>
                </div>

                {n.is_challenge && (
                    <motion.div 
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-blue-500/5 pointer-events-none"
                    />
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER ACTION */}
      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-center pointer-events-none">
          <button className="pointer-events-auto bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest shadow-[0_15px_40px_rgba(16,185,129,0.4)] flex items-center gap-3 active:scale-95 transition-all">
              <Bell size={16} /> REGLAGES_PUSH
          </button>
      </div>
    </div>
  );
}
