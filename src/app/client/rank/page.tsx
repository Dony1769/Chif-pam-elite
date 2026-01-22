"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, Medal, Target, Timer, 
  ChevronLeft, Loader2, Star, 
  ChevronRight, Hash, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function RankPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEntries, setUserEntries] = useState<any[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    initRanks();
    
    // TEMPS RÉEL : Écoute les nouveaux scores pour mettre à jour le classement sans rafraîchir
    const channel = supabase
      .channel('realtime_ranks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_entries' }, () => {
        initRanks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const initRanks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/auth/login');

    // 1. Récupérer le profil
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);

    // 2. Récupérer tous les défis où l'utilisateur a un score
    const { data: entries } = await supabase
      .from('challenge_entries')
      .select(`
        *,
        challenges (
          id, title, prize_pool, game_type
        )
      `)
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    setUserEntries(entries || []);
    
    if (entries && entries.length > 0 && !selectedChallenge) {
      fetchLeaderboard(entries[0].challenges.id);
      setSelectedChallenge(entries[0].challenges);
    }
    setLoading(false);
  };

  const fetchLeaderboard = async (challengeId: string) => {
    // Calcul du rang global pour ce défi spécifique
    const { data: board } = await supabase
      .from('challenge_entries')
      .select(`
        score,
        completed_at,
        user_id,
        profiles ( username, avatar_url, vip_status )
      `)
      .eq('challenge_id', challengeId)
      .order('score', { ascending: false })
      .order('completed_at', { ascending: true })
      .limit(50);

    setLeaderboard(board || []);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-amber-500" size={40} />
      <p className="text-[10px] text-amber-500/50 tracking-[0.3em] mt-4 font-black italic uppercase">Calcul des hiérarchies...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 pb-32 font-black italic uppercase overflow-x-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => router.push('/client/home')} className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <ChevronLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-2xl tracking-tighter text-amber-500">CLASSEMENT <span className="text-white text-xs block opacity-50">HALL OF FAME</span></h1>
        </div>
      </div>

      {/* MES PARTICIPATIONS (Horizontales) */}
      <div className="mb-10">
        <p className="text-[8px] text-slate-500 mb-4 tracking-widest">TES DÉFIS ACTIFS</p>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {userEntries.length > 0 ? userEntries.map((entry) => (
            <motion.div 
              key={entry.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedChallenge(entry.challenges);
                fetchLeaderboard(entry.challenges.id);
              }}
              className={`flex-shrink-0 w-48 p-5 rounded-[2rem] border transition-all ${selectedChallenge?.id === entry.challenges.id ? 'bg-amber-500 border-amber-400 text-black shadow-[0_10px_20px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 text-white'}`}
            >
              <p className="text-[7px] opacity-60 mb-1">{entry.challenges.game_type}</p>
              <h3 className="text-xs truncate mb-3">{entry.challenges.title}</h3>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[7px] opacity-60">TON SCORE</p>
                  <p className="text-lg">{entry.score}</p>
                </div>
                <Star size={16} className={selectedChallenge?.id === entry.challenges.id ? 'text-black' : 'text-amber-500'} />
              </div>
            </motion.div>
          )) : (
            <div className="w-full py-10 bg-white/5 rounded-[2rem] border border-dashed border-white/10 text-center">
                <p className="text-[10px] text-slate-500">AUCUNE PARTICIPATION</p>
            </div>
          )}
        </div>
      </div>

      {/* LEADERBOARD GLOBAL POUR LE DÉFI SÉLECTIONNÉ */}
      <AnimatePresence mode="wait">
        {selectedChallenge && (
          <motion.div 
            key={selectedChallenge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center px-2">
                <h2 className="text-sm tracking-widest flex items-center gap-2">
                    <Trophy size={14} className="text-amber-500"/> TOP 50 - {selectedChallenge.title}
                </h2>
                <div className="bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    <p className="text-[8px] text-amber-500">{selectedChallenge.prize_pool} HTG EN JEU</p>
                </div>
            </div>

            <div className="bg-white/5 rounded-[2.5rem] border border-white/5 overflow-hidden">
              {leaderboard.map((item, index) => {
                const isMe = item.user_id === profile?.id;
                const rank = index + 1;
                
                return (
                  <motion.div 
                    key={index}
                    className={`flex items-center justify-between p-5 border-b border-white/5 ${isMe ? 'bg-amber-500/10' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center font-black italic">
                        {rank === 1 ? <Medal className="text-amber-400 mx-auto" /> : 
                         rank === 2 ? <Medal className="text-slate-400 mx-auto" /> : 
                         rank === 3 ? <Medal className="text-amber-700 mx-auto" /> : 
                         <span className="text-xs text-slate-500">#{rank}</span>}
                      </div>
                      
                      <div className="flex flex-col">
                        <span className={`text-[11px] ${isMe ? 'text-amber-500' : 'text-white'}`}>
                            {item.profiles?.username || 'Anonyme'} {isMe && "(TOI)"}
                        </span>
                        <span className="text-[7px] text-slate-500 flex items-center gap-1">
                            {item.profiles?.vip_status === 'monthly' && <Crown size={8} className="text-amber-500"/>}
                            {new Date(item.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                        <p className="text-xs font-black">{item.score}</p>
                        <p className="text-[6px] text-slate-500">POINTS</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Crown = ({ size, className }: { size: number, className: string }) => (
    <Award size={size} className={className} />
);
