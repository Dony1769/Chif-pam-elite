"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Timer, ChevronLeft, Loader2, Target, Zap, Medal, RefreshCcw, ArrowRight, Gamepad2, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function RankContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');

  const [loading, setLoading] = useState(true);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  const [currentUserRank, setCurrentUserRank] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    initData();
    
    // REALTIME SUBSCRIPTION : Mise à jour instantanée si un score change
    const channel = supabase
      .channel('realtime_ranks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenge_attempts' }, () => {
        fetchLeaderboardOnly(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [challengeId]);

  const initData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Liste des défis de l'utilisateur
    const { data: attempts } = await supabase
      .from('challenge_attempts')
      .select('challenge_id, challenges(*)')
      .eq('user_id', user.id);

    const uniqueChallenges = Array.from(new Map(attempts?.map(item => [item.challenge_id, item.challenges])).values())
      .filter(c => c !== null); // Sécurité si un défi est supprimé
    setMyChallenges(uniqueChallenges);

    if (challengeId) {
      await fetchLeaderboardOnly();
    }
    setLoading(false);
  };

  const fetchLeaderboardOnly = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: chall } = await supabase.from('challenges').select('*').eq('id', challengeId).single();
    setActiveChallenge(chall);

    const { data: ranks } = await supabase
      .from('challenge_leaderboards')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('rank', { ascending: true });
    
    setLeaderboard(ranks || []);
    if (user) setCurrentUserRank(ranks?.find(r => r.user_id === user.id));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeChallenge?.ends_at) {
        const end = new Date(activeChallenge.ends_at).getTime();
        const now = new Date().getTime();
        const diff = end - now;
        if (diff <= 0) setTimeLeft("TERMINÉ");
        else {
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${h}:${m}:${s}`);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeChallenge]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  // VUE 1 : LISTE DES DÉFIS AUXQUELS J'AI PARTICIPÉ
  if (!challengeId || myChallenges.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-6 uppercase italic font-black">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => router.push('/client/challenges')} className="p-3 bg-white/5 rounded-2xl border border-white/10"><ArrowLeft size={20}/></button>
           <h1 className="text-3xl tracking-tighter text-emerald-500 underline decoration-1 underline-offset-8">MES_COMBATS</h1>
        </div>

        {myChallenges.length === 0 ? (
          <div className="mt-20 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
               <Target className="text-emerald-500" size={32} />
            </div>
            <p className="text-slate-500 text-xs tracking-widest">AUCUNE DONNÉE DE COMBAT DÉTECTÉE</p>
            <button onClick={() => router.push('/client/challenges')} className="w-full py-5 bg-emerald-500 text-black rounded-2xl shadow-2xl">ENTRER DANS L'ARÈNE</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {myChallenges.map((ch) => (
              <button 
                key={ch.id} 
                onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
                className="p-6 bg-slate-900/50 border border-white/5 rounded-[2rem] flex justify-between items-center hover:border-emerald-500/50 transition-all group"
              >
                <div className="text-left">
                  <p className="text-lg tracking-tighter">{ch.title}</p>
                  <p className="text-[8px] text-emerald-500/50 tracking-widest">{ch.game_type} • LIVE_MODE</p>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl group-hover:bg-emerald-500 group-hover:text-black transition-all">
                  <ArrowRight size={18} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // VUE 2 : CLASSEMENT DU DÉFI SÉLECTIONNÉ
  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase italic select-none">
      <div className="max-w-md mx-auto flex justify-between items-center mb-6">
        <button onClick={() => router.push('/client/rank')} className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-xl"><ChevronLeft /></button>
        <div className="text-center">
          <h1 className="text-xl tracking-tighter text-emerald-500 underline underline-offset-4">LIVE_LEADERBOARD</h1>
          <p className="text-[7px] text-slate-500 tracking-[0.4em] mt-1 truncate max-w-[120px]">{activeChallenge?.title}</p>
        </div>
        <div className="w-12" />
      </div>

      <div className="max-w-md mx-auto space-y-6 pb-32">
        {/* TIMER CARD */}
        <div className="bg-emerald-500 p-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_50px_rgba(16,185,129,0.3)] border-b-4 border-emerald-700">
          <div>
            <p className="text-black text-[9px] tracking-widest font-bold">STATUS: {timeLeft === "TERMINÉ" ? 'ARCHIVÉ' : 'ACTIVE_MISSION'}</p>
            <p className="text-4xl text-black font-black tracking-tighter flex items-center gap-2 italic leading-none">{timeLeft}</p>
          </div>
          <div className="bg-black text-emerald-500 p-3 rounded-2xl animate-pulse"><Zap size={24} /></div>
        </div>

        {/* CARTE PERSONNELLE */}
        {currentUserRank && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`p-6 rounded-[2.5rem] border-b-8 shadow-2xl relative overflow-hidden ${currentUserRank.rank <= 3 ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-black border-amber-900' : 'bg-white text-black border-emerald-500'}`}>
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[9px] font-bold tracking-widest opacity-60">TA POSITION</p>
                  <p className="text-5xl font-black italic tracking-tighter">#{currentUserRank.rank}</p>
               </div>
               {currentUserRank.rank <= 3 ? <Trophy size={48} className="text-amber-900 drop-shadow-lg" /> : <Medal size={48} className="text-emerald-500 opacity-20" />}
            </div>
            <div className="mt-4 flex justify-between items-end">
                <p className="text-xl font-black underline underline-offset-4 decoration-2">{currentUserRank.username}</p>
                <div className="text-right">
                    <p className="text-[9px] font-bold opacity-60 uppercase">Total Score</p>
                    <p className="text-3xl font-black italic leading-none">{currentUserRank.total_score} pts</p>
                </div>
            </div>
          </motion.div>
        )}

        {/* LISTE DES JOUEURS */}
        <div className="space-y-2">
          <div className="flex justify-between px-4 mb-4 items-center">
             <p className="text-[9px] text-slate-500 tracking-[0.5em] font-bold uppercase">Réseau des Gladiateurs</p>
             <div className="flex gap-1">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                <p className="text-[7px] text-emerald-500">REALTIME_ACTIVE</p>
             </div>
          </div>
          
          <AnimatePresence>
            {leaderboard.map((entry, index) => {
              const isMe = entry.user_id === currentUserRank?.user_id;
              const isTop3 = entry.rank <= 3;
              return (
                <motion.div key={entry.user_id} initial={{ x: -10 }} animate={{ x: 0 }} className={`p-5 rounded-[2rem] border flex items-center justify-between transition-all ${isTop3 ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg' : 'bg-white/5 border-white/5'} ${isMe ? 'ring-2 ring-emerald-500' : ''}`}>
                  <div className="flex items-center gap-4">
                    <span className={`text-xl font-black ${isTop3 ? 'text-emerald-400' : 'text-slate-600'}`}>{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}</span>
                    <div>
                      <p className="text-sm tracking-tighter group-active:text-emerald-500">{entry.username}</p>
                      <p className="text-[7px] text-slate-500 tracking-widest">{entry.attempts_count} SESSIONS</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black italic ${isTop3 ? 'text-emerald-400' : 'text-white'}`}>{entry.total_score}</p>
                    <p className="text-[7px] text-slate-600">POINTS_GAINED</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* BOUTON DÉFIER À NOUVEAU */}
      <div className="fixed bottom-6 left-0 w-full px-4 flex justify-center z-[100]">
        <button 
          onClick={() => {
            const routes:any = {'quiz':'/client/games/quiz','biometric':'/client/games/biometric','vault':'/client/games/vault'};
            router.push(`${routes[activeChallenge.game_type] || '/client/games/quiz'}?challengeId=${activeChallenge.id}`);
          }}
          disabled={timeLeft === "TERMINÉ"}
          className="w-full max-w-md py-6 bg-white text-black rounded-[2.5rem] font-black text-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] active:scale-90 transition-all flex items-center justify-center gap-4 disabled:grayscale disabled:opacity-40"
        >
          <RefreshCcw size={28} className={timeLeft !== "TERMINÉ" ? "animate-spin-slow" : ""} /> {timeLeft === "TERMINÉ" ? "MISSION_EXPIRED" : "RE-TENTER"}
        </button>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>}>
      <RankContent />
    </Suspense>
  );
}
