"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Target, Zap, Brain, Lock, ChevronLeft, 
  Users, Trophy, ArrowRight, Loader2, Crown 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ChallengesPage() {
  const [profile, setProfile] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/connexion');

    const [profRes, chalRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('challenges').select('*').eq('is_active', true)
    ]);

    setProfile(profRes.data);
    setChallenges(chalRes.data || []);
    setLoading(false);
  };

  // Calcul du prix VIP (Réduction de 10% ou 25%)
  const getDiscountedFee = (baseFee: number) => {
    if (profile?.vip_status === 'weekly') return baseFee * 0.9;
    if (profile?.vip_status === 'monthly') return baseFee * 0.75;
    return baseFee;
  };

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-black italic uppercase pb-20">
      <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl border border-white/10">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl tracking-tighter">Défis <span className="text-emerald-500">Elite</span></h1>
      </div>

      <div className="p-6 space-y-6">
        {challenges.map((challenge) => {
          const finalFee = getDiscountedFee(challenge.entry_fee_base);
          // Calcul mathématique du gain (On garde 20% de marge brute minimum)
          const prizePool = (challenge.entry_fee_base * challenge.max_players) * 0.8;
          
          return (
            <motion.div 
              key={challenge.id}
              whileTap={{ scale: 0.97 }}
              className="relative p-1 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/20 to-transparent border border-white/10 overflow-hidden"
            >
              <div className="bg-slate-900/90 rounded-[2.4rem] p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                      {challenge.game_type === 'quiz' && <Brain className="text-blue-400" />}
                      {challenge.game_type === 'biometric' && <Zap className="text-amber-400" />}
                      {challenge.game_type === 'vault' && <Lock className="text-rose-400" />}
                    </div>
                    <div>
                      <h3 className="text-lg tracking-tight">{challenge.game_type} challenge</h3>
                      <div className="flex items-center gap-2 text-[8px] text-emerald-500">
                        <Users size={10}/> {challenge.max_players} PLACES MAX
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Frais d'entrée</p>
                    <p className="text-lg text-white">{finalFee} HTG</p>
                    {profile.vip_status !== 'free' && <span className="text-[8px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold">PRIX VIP</span>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5">
                  <PrizeBadge rank={1} amount={prizePool * 0.5} color="text-amber-500" />
                  <PrizeBadge rank={2} amount={prizePool * 0.3} color="text-slate-400" />
                  <PrizeBadge rank={3} amount={prizePool * 0.2} color="text-orange-600" />
                </div>

                <button 
                  onClick={() => router.push(`/client/${challenge.game_type}-hack?challengeId=${challenge.id}`)}
                  className="w-full py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  REJOINDRE LE DÉFI <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PrizeBadge({ rank, amount, color }: any) {
  return (
    <div className="text-center">
      <p className={`text-[9px] font-bold ${color}`}>#{rank}</p>
      <p className="text-xs">{Math.floor(amount)} HTG</p>
    </div>
  );
}
