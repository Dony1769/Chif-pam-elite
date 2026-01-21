"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Users, Timer, ChevronRight, 
  Target, Zap, Brain, Lock, Loader2 
} from 'lucide-react';
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
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    const { data: challs } = await supabase.from('challenges')
      .select('*, challenge_entries(count)')
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString());

    setProfile(prof);
    setChallenges(challs || []);
    setLoading(false);
  };

  const getGameIcon = (type: string) => {
    if (type === 'quiz') return <Brain className="text-blue-400" />;
    if (type === 'biometric') return <Zap className="text-emerald-400" />;
    return <Lock className="text-amber-400" />;
  };

  const calculateEntryFee = (baseFee: number) => {
    if (profile?.vip_status === 'monthly') return baseFee * 0.75;
    if (profile?.vip_status === 'weekly') return baseFee * 0.90;
    return baseFee;
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase">
      <div className="flex flex-col gap-1 mb-10">
        <h1 className="text-3xl tracking-tighter">Défis <span className="text-emerald-500">Elite</span></h1>
        <p className="text-[10px] text-slate-500 tracking-[0.3em]">Affronte la communauté</p>
      </div>

      <div className="space-y-6">
        {challenges.map((challenge) => {
          const fee = calculateEntryFee(challenge.entry_fee);
          return (
            <motion.div 
              key={challenge.id}
              whileTap={{ scale: 0.98 }}
              className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    {getGameIcon(challenge.game_type)}
                  </div>
                  <div>
                    <h3 className="text-sm tracking-tight">{challenge.title}</h3>
                    <div className="flex items-center gap-2 text-[8px] text-slate-500">
                       <Users size={10} /> {challenge.challenge_entries?.[0]?.count || 0} PARTICIPANTS
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-slate-500 mb-1">PRIX TOTAL</p>
                  <p className="text-emerald-500 text-lg">{challenge.prize_pool} HTG</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <p className="text-[7px] text-slate-500 mb-1">FRAIS D'ENTRÉE</p>
                  <p className="text-xs text-white">{fee} HTG {profile?.vip_status !== 'free' && <span className="text-[8px] text-emerald-500">VIP</span>}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                  <p className="text-[7px] text-slate-500 mb-1">TEMPS RESTANT</p>
                  <p className="text-xs text-rose-500 flex items-center gap-1"><Timer size={10}/> FIN BIENTÔT</p>
                </div>
              </div>

              <button 
                onClick={() => router.push(`/client/${challenge.game_type}-hack?challengeId=${challenge.id}`)}
                className="w-full py-4 bg-emerald-500 text-slate-950 rounded-2xl text-[10px] flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(16,185,129,0.2)]"
              >
                REJOINDRE LE DÉFI <ChevronRight size={14} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
