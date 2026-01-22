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
  const [newBadge, setNewBadge] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
    
    // REALTIME: Notification si l'admin ajoute un défi
    const channel = supabase
      .channel('public:challenges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges' }, (payload) => {
        setChallenges(prev => [payload.new, ...prev]);
        setNewBadge(true);
        setTimeout(() => setNewBadge(false), 5000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/auth/login');

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: challs } = await supabase.from('challenges')
      .select(`
        *,
        challenge_entries(count)
      `)
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    setProfile(prof);
    setChallenges(challs || []);
    setLoading(false);
  };

  const calculateEntryFee = (baseFee: number) => {
    if (profile?.vip_status === 'monthly') return baseFee * 0.75;
    if (profile?.vip_status === 'weekly') return baseFee * 0.90;
    return baseFee;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
      <p className="text-[10px] text-emerald-500/50 tracking-[0.3em] font-black italic uppercase">Scan de l'arène...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 pb-32 font-black italic uppercase">
      
      {/* NOTIFICATION TOAST */}
      <AnimatePresence>
        {newBadge && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-6 right-6 z-[200] bg-emerald-500 text-black p-4 rounded-2xl flex items-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
          >
            <Bell className="animate-bounce" />
            <p className="text-[10px] leading-tight">NOUVELLE MISSION DISPONIBLE DANS L'ARÈNE !</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-10">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl tracking-tighter leading-none italic">ARENA <span className="text-emerald-500 underline decoration-1 underline-offset-4">CHALLENGES</span></h1>
          <p className="text-[8px] text-slate-500 tracking-[0.2em] mt-1 italic">VOTRE RÉPUTATION COMMENCE ICI</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-[2rem] shadow-inner">
          <p className="text-[7px] text-emerald-500/60 mb-1 tracking-widest">ACTIFS</p>
          <p className="text-2xl font-black">{challenges.length}</p>
        </div>
        <div className="bg-white/5 border border-white/5 p-5 rounded-[2rem] text-right">
          <p className="text-[7px] text-slate-500 mb-1 tracking-widest">VOTRE RANG</p>
          <p className="text-xl flex items-center justify-end gap-2 text-emerald-500">
            {profile?.vip_status !== 'free' && <Crown size={14} className="fill-emerald-500"/>} 
            {profile?.vip_status?.toUpperCase() || 'PLAYER'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {challenges.map((challenge, index) => {
          const fee = calculateEntryFee(challenge.entry_fee);
          const isNew = new Date(challenge.created_at).getTime() > Date.now() - 3600000;

          return (
            <motion.div 
              key={challenge.id}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
              className="bg-[#0a0a0f] border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden group active:scale-[0.98] transition-all shadow-xl"
            >
              {isNew && <div className="absolute top-4 left-4 bg-emerald-500 text-black text-[7px] px-2 py-1 rounded-full animate-pulse">NOUVEAU</div>}
              
              <div className="flex justify-between items-start mb-6 pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-black border border-white/10 flex items-center justify-center group-hover:border-emerald-500/50 transition-colors shadow-2xl">
                    {challenge.game_type === 'quiz' ? <Brain className="text-blue-400" /> : challenge.game_type === 'biometric' ? <Zap className="text-emerald-400" /> : <Lock className="text-amber-400" />}
                  </div>
                  <div>
                    <h3 className="text-sm tracking-tight mb-1">{challenge.title}</h3>
                    <div className="flex items-center gap-2 text-[8px] text-slate-500 bg-white/5 px-3 py-1.5 rounded-full w-fit">
                        <Users size={10} className="text-emerald-500" /> {challenge.challenge_entries?.[0]?.count || 0} PARTICIPANTS
                    </div>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[7px] text-slate-500 tracking-widest">PRIZE POOL</p>
                   <p className="text-emerald-500 text-2xl font-black">{challenge.prize_pool.toLocaleString()} <span className="text-[10px]">HTG</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-black/60 p-4 rounded-2xl border border-white/5">
                  <p className="text-[7px] text-slate-500 mb-1">FRAIS / TENTATIVE</p>
                  <p className="text-sm">{fee.toFixed(0)} HTG</p>
                  {profile?.vip_status !== 'free' && <p className="text-[6px] text-emerald-500">-25% APPLIQUÉ</p>}
                </div>
                <div className="bg-black/60 p-4 rounded-2xl border border-white/5">
                  <p className="text-[7px] text-slate-500 mb-1">CUMULABLE</p>
                  <p className="text-xs text-amber-500">SCORE ILLIMITÉ</p>
                </div>
              </div>

              <button 
                onClick={() => router.push(`/client/${challenge.game_type === 'vault' ? 'laser-vault' : challenge.game_type === 'biometric' ? 'biometric-hack' : 'quiz'}?challengeId=${challenge.id}`)}
                className="w-full py-5 bg-white text-black rounded-[1.8rem] text-[11px] font-black flex items-center justify-center gap-2 group-hover:bg-emerald-500 transition-all shadow-xl"
              >
                ENTRER DANS L'ARÈNE <ChevronRight size={16} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
