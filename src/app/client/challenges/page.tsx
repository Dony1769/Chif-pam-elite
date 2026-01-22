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
  const [newChallengeAlert, setNewChallengeAlert] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();

    // ECOUTE EN TEMPS RÉEL (REALTIME)
    const channel = supabase
      .channel('arena-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges' }, (payload) => {
        setChallenges(prev => [payload.new, ...prev]);
        setNewChallengeAlert(true);
        setTimeout(() => setNewChallengeAlert(false), 6000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    // Récupération du profil et des défis actifs
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
    setLoading(false);
  };

  const getGameRoute = (type: string) => {
    if (type === 'quiz') return 'quiz'; // /client/quiz
    if (type === 'biometric') return 'biometric-hack'; // /client/biometric-hack
    return 'laser-vault'; // /client/laser-vault
  };

  const calculateEntryFee = (baseFee: number) => {
    if (profile?.vip_status === 'monthly') return baseFee * 0.75;
    if (profile?.vip_status === 'weekly') return baseFee * 0.90;
    return baseFee;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
      <p className="text-[10px] text-emerald-500 font-black tracking-[0.3em] uppercase italic">Chargement de l'arène...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase">
      
      {/* NOTIFICATION FLOTTANTE PREMIUM */}
      <AnimatePresence>
        {newChallengeAlert && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-6 right-6 z-[100] bg-emerald-600 text-black p-4 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-white/20"
          >
            <Bell className="animate-bounce" />
            <p className="text-[10px] tracking-tighter">ALERTE SYSTÈME : UN NOUVEAU DÉFI VIENT D'ÊTRE DÉPLOYÉ !</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-10">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl tracking-tighter italic">ARENA <span className="text-emerald-500 underline decoration-1 underline-offset-4">CHALLENGE</span></h1>
          <p className="text-[8px] text-slate-500 tracking-[0.2em] mt-1">PROTOCOLE DE RÉPUTATION</p>
        </div>
      </div>

      {/* LISTE DES DÉFIS */}
      <div className="space-y-6">
        {challenges.map((challenge, index) => (
          <motion.div 
            key={challenge.id}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
            className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-emerald-500 shadow-2xl group-hover:border-emerald-500/50 transition-all">
                  {challenge.game_type === 'quiz' ? <Brain /> : challenge.game_type === 'biometric' ? <Zap /> : <Lock />}
                </div>
                <div>
                  <h3 className="text-sm tracking-tight mb-1">{challenge.title}</h3>
                  <div className="flex items-center gap-2 text-[8px] text-slate-500 bg-white/5 px-2 py-1 rounded-md w-fit">
                     <Users size={10} className="text-emerald-500" /> {challenge.challenge_entries?.[0]?.count || 0} JOUEURS
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-500 text-2xl font-black italic">{challenge.prize_pool.toLocaleString()} <span className="text-[10px]">HTG</span></p>
                <p className="text-[7px] text-slate-500 tracking-widest uppercase">Cagnotte</p>
              </div>
            </div>

            <button 
              onClick={() => router.push(`/client/${getGameRoute(challenge.game_type)}?challengeId=${challenge.id}`)}
              className="w-full py-5 bg-white text-black rounded-[1.8rem] text-[11px] font-black flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all active:scale-95 shadow-xl"
            >
              ACCÉDER AU TERMINAL <ChevronRight size={16} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
