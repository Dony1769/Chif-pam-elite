"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Timer, ChevronLeft, Loader2, Target, Zap, Medal, RefreshCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function RankContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!challengeId) return;
    fetchRankings();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [challengeId]);

  const fetchRankings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Fetch Challenge Info
    const { data: chall } = await supabase.from('challenges').select('*').eq('id', challengeId).single();
    setChallenge(chall);

    // 2. Fetch Leaderboard from View
    const { data: ranks } = await supabase.from('challenge_leaderboards').select('*').eq('challenge_id', challengeId).order('rank', { ascending: true });
    
    setLeaderboard(ranks || []);
    if (user) {
        setCurrentUserRank(ranks?.find(r => r.user_id === user.id));
    }
    setLoading(false);
  };

  const updateCountdown = () => {
    if (!challenge?.ends_at) return;
    const end = new Date(challenge.ends_at).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff <= 0) {
      setTimeLeft("TERMINÉ");
      return;
    }

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    setTimeLeft(`${h}H ${m}M ${s}S`);
  };

  const handleRetry = () => {
    if (!challenge) return;
    
    // Redirection dynamique selon le type de jeu configuré dans le défi
    const gameRoutes: Record<string, string> = {
      'quiz': '/client/games/quiz',
      'biometric': '/client/games/biometric',
      'vault': '/client/games/vault'
    };

    const route = gameRoutes[challenge.game_type] || '/client/games/quiz';
    router.push(`${route}?challengeId=${challenge.id}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase italic select-none">
      {/* HEADER SÉCURISÉ */}
      <div className="max-w-md mx-auto flex justify-between items-center mb-8">
        <button onClick={() => router.push('/client/challenges')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all shadow-xl">
          <ChevronLeft />
        </button>
        <div className="text-center">
          <h1 className="text-xl tracking-tighter text-emerald-500">ARENA_LEADERBOARD</h1>
          <p className="text-[8px] text-slate-500 tracking-[0.3em]">{challenge?.title}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="max-w-md mx-auto space-y-6 pb-24">
        {/* TIMER CARD PREMIUM */}
        <div className="bg-emerald-500 p-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_50px_rgba(16,185,129,0.2)]">
          <div>
            <p className="text-black text-[10px] tracking-widest font-bold">TEMPS RESTANT</p>
            <p className="text-3xl text-black font-black tracking-tighter flex items-center gap-2">
              <Timer size={24} /> {timeLeft}
            </p>
          </div>
          <div className="bg-black/10 p-3 rounded-2xl border border-black/10">
            <Zap size={24} className="text-black animate-pulse" />
          </div>
        </div>

        {/* TON RANG (STICKY TOP) */}
        {currentUserRank && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="bg-white p-6 rounded-[2.5rem] flex items-center justify-between border-b-4 border-emerald-500 shadow-xl"
          >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-emerald-500 text-xl font-black">
                    #{currentUserRank.rank}
                </div>
                <div>
                    <p className="text-slate-500 text-[8px] tracking-widest uppercase">TA POSITION ACTUELLE</p>
                    <p className="text-black text-lg">{currentUserRank.username}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-emerald-600 text-2xl font-black italic">{currentUserRank.total_score} PTS</p>
            </div>
          </motion.div>
        )}

        {/* LISTE DES GLADIATEURS */}
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 tracking-[0.4em] px-4 mb-4 font-bold">CLASSEMENT GLOBAL</p>
          
          <AnimatePresence>
            {leaderboard.map((entry, index) => {
              const isTop3 = entry.rank <= 3;
              const isMe = entry.user_id === currentUserRank?.user_id;

              return (
                <motion.div 
                  key={entry.user_id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-5 rounded-[2rem] border flex items-center justify-between transition-all ${
                    isTop3 ? 'bg-slate-900 border-emerald-500/30' : 'bg-white/5 border-white/5'
                  } ${isMe ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#020617]' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-xl italic ${isTop3 ? 'text-emerald-500' : 'text-slate-600'}`}>
                        {entry.rank === 1 ? <Trophy size={20} /> : entry.rank === 2 ? <Medal size={20} /> : entry.rank === 3 ? <Medal size={20} className="text-amber-700" /> : `#${entry.rank}`}
                    </span>
                    <div>
                        <p className={`text-sm tracking-tighter ${isTop3 ? 'text-white' : 'text-slate-400'}`}>
                            {entry.username} {isMe && <span className="text-[8px] bg-emerald-500 text-black px-2 rounded-full ml-1 font-bold">MOI</span>}
                        </p>
                        <p className="text-[8px] text-slate-600 italic tracking-widest">{entry.attempts_count} TENTATIVES</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <p className={`text-lg font-black italic ${isTop3 ? 'text-emerald-500' : 'text-white'}`}>{entry.total_score}</p>
                    <Target size={12} className="text-slate-700" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {leaderboard.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                <Loader2 size={30} className="mx-auto text-slate-800 mb-4 animate-spin" />
                <p className="text-[10px] text-slate-600 tracking-widest uppercase">AUCUNE DONNÉE DÉPLOYÉE</p>
            </div>
          )}
        </div>
      </div>

      {/* BOUTON DÉFIER À NOUVEAU - FIXED BOTTOM */}
      <div className="fixed bottom-6 left-0 w-full px-4 flex justify-center">
        <button 
          onClick={handleRetry}
          disabled={timeLeft === "TERMINÉ"}
          className="w-full max-w-md py-6 bg-white text-black rounded-[2.5rem] font-black text-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
        >
          <RefreshCcw size={24} /> {timeLeft === "TERMINÉ" ? "MISSION TERMINÉE" : "DÉFIER À NOUVEAU"}
        </button>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>}>
      <RankContent />
    </Suspense>
  );
}
