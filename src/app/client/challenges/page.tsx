"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Brain, Fingerprint, Lock, Users, Trophy, Zap, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [chals, prof] = await Promise.all([
      supabase.from('challenges').select('*').order('entry_fee', { ascending: true }),
      supabase.from('profiles').select('*').eq('id', user?.id).single()
    ]);
    setChallenges(chals.data || []);
    setProfile(prof.data);
    setLoading(false);
  };

  // Calcul du prix réduit pour les VIP
  const getDiscountedFee = (fee: number) => {
    if (!profile?.vip_status || profile.vip_status === 'free') return fee;
    const discount = profile.vip_status === 'weekly' ? 0.10 : 0.25;
    return fee * (1 - discount);
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center animate-pulse text-emerald-500 font-black italic">CHARGEMENT DES DÉFIS...</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-20">
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl"><ChevronLeft /></button>
        <h1 className="text-sm tracking-[0.3em]">ARENA <span className="text-emerald-500">CHALLENGES</span></h1>
        <div className="text-[10px] bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">
          {profile?.balance} HTG
        </div>
      </div>

      <div className="p-6 space-y-6">
        {challenges.map((challenge) => (
          <motion.div 
            key={challenge.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/client/${challenge.game_type}?challengeId=${challenge.id}`)}
            className="group relative bg-slate-900 rounded-[2rem] p-1 border border-white/5 overflow-hidden shadow-2xl"
          >
            <div className={`absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity ${challenge.difficulty_level === 'hard' ? 'from-rose-600' : 'from-emerald-600'}`} />
            
            <div className="relative p-6 flex justify-between items-center">
              <div className="flex gap-5 items-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  {challenge.game_type === 'quiz' && <Brain className="text-blue-400" />}
                  {challenge.game_type === 'biometric' && <Fingerprint className="text-emerald-400" />}
                  {challenge.game_type === 'vault' && <Lock className="text-rose-400" />}
                </div>
                <div>
                  <h3 className="text-sm tracking-tighter">{challenge.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] text-slate-500 tracking-widest">OBJECTIF: {challenge.min_score_required} PALIERS</span>
                    <span className={`text-[7px] px-2 py-0.5 rounded-full border ${challenge.difficulty_level === 'hard' ? 'text-rose-500 border-rose-500/30' : 'text-emerald-500 border-emerald-500/30'}`}>
                      {challenge.difficulty_level}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[8px] text-slate-500 mb-1">FRAIS D'ENTRÉE</p>
                <p className="text-lg text-white font-black">
                   {getDiscountedFee(challenge.entry_fee)} <span className="text-[10px] text-emerald-500">HTG</span>
                </p>
                {profile?.vip_status !== 'free' && (
                  <p className="text-[7px] text-amber-500 line-through">{challenge.entry_fee} HTG</p>
                )}
              </div>
            </div>

            <div className="bg-white/5 p-4 flex justify-between items-center rounded-b-[1.8rem]">
               <div className="flex items-center gap-1">
                 <Trophy size={12} className="text-amber-500" />
                 <span className="text-[10px] text-amber-500">PRIX: {challenge.prize_amount} HTG</span>
               </div>
               <Zap size={14} className="text-emerald-500 animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
