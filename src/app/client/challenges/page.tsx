"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Users, Timer, ChevronRight, 
  Zap, Brain, Lock, Loader2, ChevronLeft,
  Crown, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    if (!user) return router.push('/auth/login');

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: challs } = await supabase.from('challenges')
      .select('*, challenge_entries(count)')
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true });

    setProfile(prof);
    setChallenges(challs || []);
    setLoading(false);
  };

  const getGameIcon = (type: string) => {
    const iconClass = "w-6 h-6";
    if (type === 'quiz') return <Brain className={`${iconClass} text-blue-400`} />;
    if (type === 'biometric') return <Zap className={`${iconClass} text-emerald-400`} />;
    return <Lock className={`${iconClass} text-amber-400`} />;
  };

  // --- CORRECTION DU LIEN PHYSIQUE ---
  const getGameRoute = (type: string) => {
    if (type === 'quiz') return 'quiz'; // Redirige vers /client/quiz/page.tsx
    if (type === 'biometric') return 'biometric-hack'; // /client/biometric-hack/page.tsx
    return 'laser-vault'; // /client/laser-vault/page.tsx
  };

  const calculateEntryFee = (baseFee: number) => {
    if (profile?.vip_status === 'monthly') return baseFee * 0.75;
    if (profile?.vip_status === 'weekly') return baseFee * 0.90;
    return baseFee;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
      <p className="text-[10px] text-emerald-500/50 tracking-[0.3em] font-black italic uppercase">Synchronisation des serveurs...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-32 font-black italic uppercase">
      {/* HEADER PREMIUM - CORRECTION REDIRECTION RETOUR */}
      <div className="flex items-center justify-between mb-10">
        <button 
          onClick={() => router.push('/client/home')} // Redirige vers /client/home
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl tracking-tighter leading-none">DÉFIS <span className="text-emerald-500 underline decoration-1 underline-offset-4">ELITE</span></h1>
          <p className="text-[8px] text-slate-500 tracking-[0.2em] mt-1">ARENA COMMUNITAIRE</p>
        </div>
      </div>

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-3xl">
          <p className="text-[7px] text-emerald-500/60 mb-1">DÉFIS EN COURS</p>
          <p className="text-xl">{challenges.length}</p>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-3xl text-right">
          <p className="text-[7px] text-blue-500/60 mb-1">TON STATUS</p>
          <p className="text-xl flex items-center justify-end gap-2 text-blue-400">
            {profile?.vip_status !== 'free' && <Crown size={14} />} {profile?.vip_status || 'FREE'}
          </p>
        </div>
      </div>

      {/* LISTE DES DÉFIS */}
      <div className="space-y-8">
        <AnimatePresence>
          {challenges.length > 0 ? (
            challenges.map((challenge, index) => {
              const fee = calculateEntryFee(challenge.entry_fee);
              return (
                <motion.div 
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 relative overflow-hidden backdrop-blur-sm"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />

                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                        {getGameIcon(challenge.game_type)}
                      </div>
                      <div>
                        <h3 className="text-sm tracking-tight mb-1">{challenge.title}</h3>
                        <div className="flex items-center gap-2 text-[8px] text-slate-500 font-bold bg-white/5 px-2 py-1 rounded-md w-fit">
                           <Users size={10} className="text-emerald-500" /> {challenge.challenge_entries?.[0]?.count || 0} JOUEURS
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end text-emerald-500 mb-1">
                        <TrendingUp size={10} />
                        <p className="text-[8px] text-slate-500">POOL</p>
                      </div>
                      <p className="text-emerald-500 text-2xl font-black">{challenge.prize_pool.toLocaleString()} <span className="text-[10px]">HTG</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-black/40 p-4 rounded-[1.5rem] border border-white/5">
                      <p className="text-[7px] text-slate-500 mb-2">FRAIS D'ENTRÉE</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-sm text-white">{fee.toFixed(0)} HTG</p>
                        {profile?.vip_status !== 'free' && (
                          <span className="text-[7px] text-emerald-400 bg-emerald-500/10 px-1 rounded">PROMO VIP</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-black/40 p-4 rounded-[1.5rem] border border-white/5">
                      <p className="text-[7px] text-slate-500 mb-2">TIME LIMIT</p>
                      <p className="text-xs text-rose-500 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        FIN BIENTÔT
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => router.push(`/client/${getGameRoute(challenge.game_type)}?challengeId=${challenge.id}`)}
                    className="w-full py-5 bg-white text-slate-950 rounded-[1.8rem] text-[11px] font-black flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors shadow-2xl active:scale-95"
                  >
                    REJOINDRE LE DÉFI <ChevronRight size={16} />
                  </button>
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
              <Lock size={40} className="mb-4" />
              <p className="text-xs">AUCUN DÉFI ACTIF POUR LE MOMENT</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
