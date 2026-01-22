"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Medal, Target, ChevronLeft, 
  Loader2, Award, Zap, Brain, Lock,
  TrendingUp, Users, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RankPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myRankings, setMyRankings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
    
    // REALTIME: Écouter les mises à jour des scores pour rafraîchir le classement
    const channel = supabase
      .channel('realtime_rankings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_entries' }, () => {
        fetchInitialData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/auth/login');

      // 1. Profil du joueur
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      // 2. Récupérer tous les défis auxquels l'utilisateur a participé
      // On récupère le score de l'user ET le leaderboard global pour chaque défi
      const { data: entries, error } = await supabase
        .from('challenge_entries')
        .select(`
          score,
          challenge_id,
          challenges (
            id,
            title,
            game_type,
            prize_pool
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // 3. Pour chaque défi, calculer la position (Rang)
      const rankingsWithPosition = await Promise.all((entries || []).map(async (entry: any) => {
        const { count } = await supabase
          .from('challenge_entries')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_id', entry.challenge_id)
          .gt('score', entry.score);

        const rank = (count || 0) + 1;

        const { count: totalParticipants } = await supabase
          .from('challenge_entries')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_id', entry.challenge_id);

        return {
          ...entry,
          rank,
          total: totalParticipants
        };
      }));

      setMyRankings(rankingsWithPosition);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getGameIcon = (type: string) => {
    if (type === 'quiz') return <Brain className="text-blue-400" size={18} />;
    if (type === 'biometric') return <Zap className="text-emerald-400" size={18} />;
    return <Lock className="text-amber-400" size={18} />;
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
      <p className="text-[10px] text-white/30 tracking-[0.4em] uppercase font-black italic">Calcul des positions...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 pb-32 font-black italic uppercase overflow-x-hidden">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-10">
        <button 
          onClick={() => router.push('/client/home')} 
          className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl tracking-tighter leading-none">HALL OF <span className="text-emerald-500">FAME</span></h1>
          <p className="text-[8px] text-white/40 tracking-[0.2em] mt-1">TES PERFORMANCES LIVE</p>
        </div>
      </div>

      {/* USER STATS CARD */}
      <div className="bg-emerald-600 rounded-[2.5rem] p-6 mb-10 shadow-[0_20px_40px_rgba(16,185,129,0.2)] flex items-center justify-between relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] text-black/60 mb-1 tracking-widest">AGENT ACTIF</p>
          <h2 className="text-2xl text-black truncate w-40 leading-none">{profile?.username || 'GHOST_USER'}</h2>
        </div>
        <div className="h-16 w-16 bg-black/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 relative z-10">
          <Trophy size={30} className="text-black" />
        </div>
        {/* Background Decorative Pattern */}
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <RefreshCw size={120} className="rotate-12 translate-x-10 -translate-y-10" />
        </div>
      </div>

      {/* CLASSEMENTS LIST */}
      <div className="space-y-6">
        <h3 className="text-[10px] text-white/40 ml-2 tracking-[0.3em]">MES DÉFIS ACTIFS</h3>
        
        <AnimatePresence>
          {myRankings.length > 0 ? (
            myRankings.map((rank, idx) => (
              <motion.div 
                key={rank.challenge_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-zinc-900/50 border border-white/5 rounded-[2rem] p-5 flex items-center justify-between relative"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                    {getGameIcon(rank.challenges.game_type)}
                  </div>
                  <div>
                    <h4 className="text-xs tracking-tight mb-1">{rank.challenges.title}</h4>
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded">SCORE: {rank.score}</span>
                        <span className="text-[8px] text-white/30 flex items-center gap-1"><Users size={8}/> {rank.total}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className={`text-2xl flex items-center gap-2 ${rank.rank === 1 ? 'text-amber-400' : 'text-white'}`}>
                    <span className="text-[10px] text-white/30 uppercase">Rang</span>
                    #{rank.rank}
                  </div>
                  <p className="text-[7px] text-emerald-500/60 mt-1">POUR {rank.challenges.prize_pool} HTG</p>
                </div>

                {/* Badge Médaille pour le Top 3 */}
                {rank.rank <= 3 && (
                  <div className="absolute -top-2 -right-2">
                    <Medal size={24} className={rank.rank === 1 ? 'text-amber-400' : rank.rank === 2 ? 'text-slate-400' : 'text-amber-700'} />
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="py-20 flex flex-col items-center justify-center bg-white/5 rounded-[2.5rem] border border-white/5 border-dashed">
              <Award size={40} className="text-white/10 mb-4" />
              <p className="text-[10px] text-white/20 text-center px-10">AUCUNE PARTICIPATION ENREGISTRÉE DANS LES DÉFIS.</p>
              <button 
                onClick={() => router.push('/client/challenges')}
                className="mt-6 text-[10px] text-emerald-500 border-b border-emerald-500 pb-1"
              >
                REJOINDRE LA COMPÉTITION
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM INFO */}
      <div className="mt-12 p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
        <div className="flex items-start gap-4">
            <TrendingUp className="text-blue-500 shrink-0" size={20} />
            <div>
                <p className="text-[9px] text-blue-500 mb-1">SYSTÈME ANTI-TRICHE</p>
                <p className="text-[8px] text-white/40 normal-case italic font-medium leading-relaxed">
                    Les rangs sont calculés en temps réel sur nos serveurs sécurisés. Toute tentative de manipulation des scores entraînera un bannissement définitif.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
