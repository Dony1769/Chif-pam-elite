"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Users, Timer, ChevronRight, 
  Zap, Brain, Lock, Loader2, ChevronLeft,
  Crown, TrendingUp, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();

    // REALTIME: Notification quand l'admin crée un défi
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'challenges' }, 
        (payload) => {
          setChallenges(prev => [payload.new, ...prev]);
          setNotification(true);
          setTimeout(() => setNotification(false), 5000);
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/connexion');

      const [profRes, challsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('challenges')
          .select('*, challenge_entries(count)')
          .eq('is_active', true)
          .gt('ends_at', new Date().toISOString())
          .order('created_at', { ascending: false })
      ]);

      setProfile(profRes.data);
      setChallenges(challsRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const getGameIcon = (type: string) => {
    const iconClass = "w-6 h-6";
    if (type === 'quiz') return <Brain className={`${iconClass} text-blue-400`} />;
    if (type === 'biometric') return <Zap className={`${iconClass} text-emerald-400`} />;
    return <Lock className={`${iconClass} text-amber-400`} />;
  };

  const getGameRoute = (type: string) => {
    if (type === 'quiz') return 'quiz';
    if (type === 'biometric') return 'biometric-hack';
    return 'laser-vault';
  };

  const calculateEntryFee = (baseFee: number) => {
    if (profile?.vip_status === 'monthly') return baseFee * 0.75;
    if (profile?.vip_status === 'weekly') return baseFee * 0.90;
    return baseFee;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
      <p className="text-[10px] text-emerald-500/50 tracking-[0.3em] font-black italic uppercase">Synchronisation des protocoles...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase overflow-hidden">
      {/* NOTIFICATION OVERLAY */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-6 right-6 z-[100] bg-emerald-600 text-black p-4 rounded-2xl flex items-center justify-between shadow-[0_0_30px_rgba(16,185,129,0.4)]"
          >
            <div className="flex items-center gap-3">
              <Bell className="animate-bounce" size={20} />
              <span className="text-[10px] tracking-tighter leading-none">NOUVEAU DÉFI DISPONIBLE DANS L'ARENA !</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl tracking-tighter leading-none italic">DÉFIS <span className="text-emerald-500 underline decoration-1 underline-offset-4">ELITE</span></h1>
          <p className="text-[8px] text-slate-500 tracking-[0.2em] mt-1">ARENA SYSTÈME V1.0</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity"><TrendingUp size={15}/></div>
          <p className="text-[7px] text-emerald-500/60 mb-1">MISSIONS ACTIVES</p>
          <p className="text-2xl">{challenges.length}</p>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-[2rem] text-right">
          <p className="text-[7px] text-blue-500/60 mb-1">STATUT JOUEUR</p>
          <p className="text-xl flex items-center justify-end gap-2 text-blue-400">
            {profile?.vip_status !== 'free' && <Crown size={14} className="fill-current" />} {profile?.vip_status || 'FREE'}
          </p>
        </div>
      </div>

      {/* LISTE */}
      <div className="space-y-8">
        {challenges.length > 0 ? (
          challenges.map((challenge, index) => {
            const fee = calculateEntryFee(challenge.entry_fee);
            return (
              <motion.div 
                key={challenge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden backdrop-blur-md group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-2xl group-hover:border-emerald-500/50 transition-colors">
                      {getGameIcon(challenge.game_type)}
                    </div>
                    <div>
                      <h3 className="text-sm tracking-tight mb-1">{challenge.title}</h3>
                      <div className="flex items-center gap-2 text-[8px] text-slate-500 bg-white/5 px-3 py-1 rounded-full w-fit italic">
                         <Users size={10} className="text-emerald-500" /> {challenge.challenge_entries?.[0]?.count || 0} PARTICIPANTS
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] text-slate-500 tracking-widest">PRIZE POOL</p>
                    <p className="text-emerald-500 text-2xl font-black italic">{challenge.prize_pool.toLocaleString()} <span className="text-[10px]">HTG</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[7px] text-slate-500 mb-2 italic tracking-tighter font-bold uppercase">Ticket d'entrée</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm text-white">{fee.toFixed(0)} HTG</p>
                      {profile?.vip_status !== 'free' && (
                        <span className="text-[6px] text-emerald-400 border border-emerald-400/30 px-1 rounded uppercase">VIP OFF</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[7px] text-slate-500 mb-2 italic tracking-tighter font-bold uppercase">Status Temps</p>
                    <p className="text-[10px] text-rose-500 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                      EXPIRATION PROCHE
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => router.push(`/client/${getGameRoute(challenge.game_type)}?challengeId=${challenge.id}`)}
                  className="w-full py-5 bg-white text-black rounded-[1.8rem] text-[11px] font-black flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all active:scale-95 shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
                >
                  INITIALISER LA SÉQUENCE <ChevronRight size={16} />
                </button>
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 italic">
            <Lock size={40} className="mb-4" />
            <p className="text-xs tracking-widest">AUCUN DÉFI DISPONIBLE DANS LE SECTEUR</p>
          </div>
        )}
      </div>
    </div>
  );
}
