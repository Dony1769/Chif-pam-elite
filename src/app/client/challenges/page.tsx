"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Trophy, Zap, Brain, Lock, Loader2, ChevronRight, Crown, Wallet, Users, Timer, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArenaPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('arena_live').on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    const [pRes, cRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('challenges')
        .select('*, challenge_attempts(user_id, score_gained)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    ]);

    setProfile(pRes.data);
    setChallenges(cRes.data || []);
    setLoading(false);
  };

  const calculateEntryFee = (base: number) => {
    if (profile?.vip_status === 'monthly') return base * 0.70; // -30%
    if (profile?.vip_status === 'weekly') return base * 0.85;  // -15%
    return base;
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40}/></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase pb-24">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.push('/client/home')} 
          className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all shadow-xl"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-4xl tracking-tighter italic">ACTIVE <span className="text-emerald-500">MISSIONS</span></h1>
      </div>

      {/* Premium Header Status */}
      <div className="flex justify-between items-center mb-10 bg-white/5 p-5 rounded-[2rem] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500">
            <Wallet size={20}/>
          </div>
          <div>
            <p className="text-[8px] text-slate-500 tracking-[0.3em]">TOTAL CREDITS</p>
            <p className="text-xl leading-none">{profile?.balance?.toLocaleString()} <span className="text-[10px]">HTG</span></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-slate-500 tracking-[0.3em]">RANK STATUS</p>
          <p className={`flex items-center gap-2 justify-end ${profile?.vip_status !== 'free' ? 'text-blue-400' : 'text-slate-400'}`}>
             {profile?.vip_status !== 'free' && <Crown size={14} className="fill-current"/>}
             {profile?.vip_status}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {challenges.map((ch) => {
          const entryPrice = calculateEntryFee(ch.entry_fee_base);
          const myTotalScore = ch.challenge_attempts
            ?.filter((a: any) => a.user_id === profile.id)
            ?.reduce((acc: number, curr: any) => acc + curr.score_gained, 0) || 0;
          
          const uniquePlayers = new Set(ch.challenge_attempts?.map((a: any) => a.user_id)).size;

          return (
            <motion.div key={ch.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-emerald-500">
                    {ch.game_type === 'quiz' ? <Brain size={24}/> : ch.game_type === 'biometric' ? <Zap size={24}/> : <Lock size={24}/>}
                  </div>
                  <div>
                    <h3 className="text-lg tracking-tight leading-none">{ch.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="flex items-center gap-1 text-[8px] text-slate-500"><Users size={10}/> {uniquePlayers}/{ch.max_participants}</span>
                       <span className="text-[8px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">SCORE: {myTotalScore}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-emerald-500">{ch.prize_pool} <span className="text-[10px]">HTG</span></p>
                  <p className="text-[7px] text-slate-500 tracking-widest">GRAND PRIZE</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  const routes: any = { quiz: 'quiz', biometric: 'biometric-hack', vault: 'laser-vault' };
                  router.push(`/client/${routes[ch.game_type]}?challengeId=${ch.id}&fee=${entryPrice}`);
                }}
                className="w-full py-5 bg-white text-black rounded-[1.8rem] font-black flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all active:scale-95 shadow-xl"
              >
                PAYER {entryPrice} HTG & GRIND <Zap size={16} fill="black"/>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
