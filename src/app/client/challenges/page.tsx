"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Users, Brain, Lock, Loader2, ChevronLeft,
  Crown, TrendingUp, Bell, ChevronRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChallenge } from '@/hooks/useChallenge';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const router = useRouter();
  const { calculateFinalFee } = useChallenge();

  useEffect(() => {
    fetchData();
    
    // --- REALTIME NOTIFICATION SYSTEM ---
    const channel = supabase
      .channel('public:challenges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenges' }, payload => {
        setNotification(`NOUVEAU DÉFI : ${payload.new.title}`);
        fetchData(); // Refresh list
        setTimeout(() => setNotification(null), 5000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/auth/login');

    const [profRes, challsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('challenges')
        .select(`
          *,
          challenge_entries (count)
        `)
        .eq('is_active', true)
        .gt('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: true })
    ]);

    setProfile(profRes.data);
    setChallenges(challsRes.data || []);
    setLoading(false);
  };

  const getGameIcon = (type: string) => {
    if (type === 'quiz') return <Brain className="w-6 h-6 text-blue-400" />;
    if (type === 'biometric') return <Zap className="w-6 h-6 text-emerald-400" />;
    return <Lock className="w-6 h-6 text-amber-400" />;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
      <p className="text-[10px] text-emerald-500/50 tracking-[0.3em] font-black italic uppercase">Scan de l'arène...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 pb-32 font-black italic uppercase">
      
      {/* NOTIFICATION TOAST PREMIUM */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-6 right-6 z-[200] bg-emerald-500 text-black p-4 rounded-2xl flex items-center gap-3 shadow-[0_20px_40px_rgba(16,185,129,0.3)] border border-white/20"
          >
            <Bell size={20} className="animate-bounce" />
            <span className="text-[10px] tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl tracking-tighter">ARENA <span className="text-emerald-500">CHALLENGE</span></h1>
          <p className="text-[8px] text-slate-500 tracking-[0.2em] mt-1">ÉLITE UNIQUEMENT</p>
        </div>
      </div>

      {/* VIP STATUS CARD */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-6 rounded-[2.5rem] mb-10 flex justify-between items-center">
        <div>
          <p className="text-[8px] text-emerald-500 mb-1 tracking-widest">TON GRADE ACTUEL</p>
          <p className="text-2xl flex items-center gap-2">
            {profile?.vip_status !== 'free' ? <Crown className="text-amber-500" /> : <Users className="text-slate-400" />}
            {profile?.vip_status || 'FREE'}
          </p>
        </div>
        <div className="text-right">
            <p className="text-[20px] text-white">{challenges.length}</p>
            <p className="text-[7px] text-slate-500 uppercase">Événements</p>
        </div>
      </div>

      {/* CHALLENGES LIST */}
      <div className="space-y-6">
        {challenges.map((ch, i) => {
          const finalFee = calculateFinalFee(ch.entry_fee, profile?.vip_status);
          return (
            <motion.div 
              initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
              key={ch.id} className="bg-white/5 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-white/10">
                    {getGameIcon(ch.game_type)}
                  </div>
                  <div>
                    <h3 className="text-sm tracking-tighter">{ch.title}</h3>
                    <p className="text-[8px] text-emerald-500 mt-1 flex items-center gap-1">
                      <Users size={10}/> {ch.challenge_entries?.[0]?.count || 0} PARTICIPANTS
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-emerald-500 leading-none">{ch.prize_pool.toLocaleString()}</p>
                  <p className="text-[7px] text-slate-500">PRIX HTG</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                  <p className="text-[7px] text-slate-500 uppercase mb-1">Entrée</p>
                  <p className="text-xs">{finalFee} HTG</p>
                </div>
                <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                  <p className="text-[7px] text-slate-500 uppercase mb-1">Expire le</p>
                  <p className="text-[9px] text-rose-500">{new Date(ch.ends_at).toLocaleDateString()}</p>
                </div>
              </div>

              <button 
                onClick={() => router.push(`/client/${ch.game_type === 'quiz' ? 'quiz' : ch.game_type === 'biometric' ? 'biometric-hack' : 'laser-vault'}?challengeId=${ch.id}`)}
                className="w-full py-5 bg-white text-black rounded-2xl font-black text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all group-hover:bg-emerald-500"
              >
                ACCÉDER À L'ARÈNE <ChevronRight size={14}/>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

