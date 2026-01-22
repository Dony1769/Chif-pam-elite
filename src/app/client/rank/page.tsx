"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Timer, ChevronLeft, Loader2, Target, Zap, Medal, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function RankContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("CALCUL...");

  useEffect(() => {
    if (!challengeId) {
        setError("ID du challenge manquant");
        setLoading(false);
        return;
    }
    fetchRankings();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [challengeId]);

  const fetchRankings = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // 1. Fetch Challenge Info
        const { data: chall, error: challErr } = await supabase
            .from('challenges')
            .select('*')
            .eq('id', challengeId)
            .single();
        
        if (challErr) throw challErr;
        setChallenge(chall);

        // 2. Fetch Leaderboard (Directement depuis la vue SQL)
        const { data: ranks, error: rankErr } = await supabase
            .from('challenge_leaderboards')
            .select('*')
            .eq('challenge_id', challengeId)
            .order('rank', { ascending: true });
        
        if (rankErr) throw rankErr;

        setLeaderboard(ranks || []);
        
        if (user) {
            const myPos = ranks?.find(r => r.user_id === user.id);
            setCurrentUserRank(myPos || null);
        }
    } catch (err: any) {
        console.error("Erreur Rank:", err);
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const updateCountdown = () => {
    if (!challenge?.ends_at) return;
    const end = new Date(challenge.ends_at).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff <= 0) {
      setTimeLeft("MISSION TERMINÉE");
      return;
    }

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    setTimeLeft(`${h}H ${m}M ${s}S`);
  };

  const handleRetry = () => {
    if (!challenge) return;
    const gameRoutes: Record<string, string> = {
      'quiz': '/client/games/quiz',
      'biometric': '/client/games/biometric',
      'vault': '/client/games/vault'
    };
    const route = gameRoutes[challenge.game_type] || '/client/games/quiz';
    router.push(`${route}?challengeId=${challenge.id}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-emerald-500" size={48} />
      <p className="text-emerald-500/50 text-[10px] tracking-[0.3em]">INITIALISATION_ARENA</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="text-red-500 mb-4" size={48} />
      <h2 className="text-xl font-black text-white mb-2">ERREUR DE CONNEXION</h2>
      <p className="text-slate-400 text-sm mb-6 uppercase tracking-tighter">{error}</p>
      <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black font-black rounded-full">REESSAYER</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase italic select-none pb-32">
      {/* HEADER */}
      <div className="max-w-md mx-auto flex justify-between items-center mb-8 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ChevronLeft />
        </button>
        <div className="text-center">
          <h1 className="text-xl tracking-tighter text-emerald-500">ARENA_RANK</h1>
          <p className="text-[8px] text-slate-500 tracking-[0.3em] font-bold">MODE: {challenge?.game_type}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* TIMER CARD */}
        <div className="bg-emerald-500 p-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_60px_rgba(16,185,129,0.3)] relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-black text-[10px] tracking-widest font-bold opacity-70">DATE LIMITE D'OPÉRATION</p>
            <p className="text-3xl text-black font-black tracking-tighter flex items-center gap-2">
              <Timer size={24} /> {timeLeft}
            </p>
          </div>
          <Zap size={60} className="absolute -right-4 -bottom-2 text-black/10 rotate-12" />
        </div>

        {/* CURRENT USER STATUS */}
        {currentUserRank ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_15px_40px_rgba(255,255,255,0.1)]"
          >
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-emerald-500 text-2xl font-black border-4 border-emerald-500/20">
                    #{currentUserRank.rank}
                </div>
                <div>
                    <p className="text-slate-400 text-[9px] tracking-widest">RANKING_ACTUEL</p>
                    <p className="text-black text-xl leading-none">{currentUserRank.username}</p>
                </div>
            </div>
            <div className="text-right border-l pl-4 border-slate-100">
                <p className="text-emerald-600 text-3xl font-black italic leading-none">{currentUserRank.total_score}</p>
                <p className="text-[8px] text-slate-400">TOTAL_PTS</p>
            </div>
          </motion.div>
        ) : (
            <div className="bg-white/5 border border-dashed border-white/10 p-6 rounded-[2.5rem] text-center">
                <p className="text-slate-500 text-[10px]">JOUE UNE PARTIE POUR APPARAÎTRE ICI</p>
            </div>
        )}

        {/* LEADERBOARD LIST */}
        <div className="space-y-3">
          <div className="flex justify-between px-4 text-[10px] text-slate-500 tracking-[0.3em]">
            <span>TOP_GLADIATEURS</span>
            <span>SCORE_TOTAL</span>
          </div>
          
          <div className="space-y-2">
            {leaderboard.map((entry, index) => (
              <motion.div 
                key={entry.user_id}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-[1.8rem] border flex items-center justify-between ${
                  entry.rank <= 3 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5'
                } ${entry.user_id === currentUserRank?.user_id ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-lg w-8 italic font-black ${entry.rank === 1 ? 'text-yellow-500' : entry.rank === 2 ? 'text-slate-300' : entry.rank === 3 ? 'text-amber-600' : 'text-slate-600'}`}>
                    {entry.rank === 1 ? '01' : entry.rank === 2 ? '02' : entry.rank === 3 ? '03' : entry.rank}
                  </span>
                  <div>
                    <p className="text-sm font-bold tracking-tight flex items-center gap-2 text-white">
                        {entry.username}
                        {entry.user_id === currentUserRank?.user_id && <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />}
                    </p>
                    <p className="text-[8px] text-slate-500 tracking-tighter italic">{entry.attempts_count} SESSIONS COMPLÉTÉES</p>
                  </div>
                </div>
                <p className={`text-xl font-black italic ${entry.rank <= 3 ? 'text-emerald-500' : 'text-white'}`}>
                    {entry.total_score}
                </p>
              </motion.div>
            ))}
          </div>

          {leaderboard.length === 0 && !loading && (
            <div className="py-20 text-center opacity-20 italic">
                <Target className="mx-auto mb-2" />
                <p className="text-xs uppercase tracking-[0.5em]">ARENA_VIDE</p>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER CTA */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent">
        <div className="max-w-md mx-auto">
            <button 
                onClick={handleRetry}
                disabled={timeLeft === "MISSION TERMINÉE"}
                className="w-full py-5 bg-white text-black rounded-3xl font-black text-lg shadow-[0_20px_40px_rgba(0,0,0,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
            >
                <RefreshCcw size={20} className={timeLeft !== "MISSION TERMINÉE" ? "animate-spin-slow" : ""} />
                {timeLeft === "MISSION TERMINÉE" ? "SESSION EXPIRÉE" : "RENFORCER MON SCORE"}
            </button>
        </div>
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

