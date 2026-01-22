"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Timer, ChevronLeft, Loader2, Target, Zap, Medal, RefreshCcw, ArrowRight, Gamepad2, LayoutGrid } from 'lucide-react';
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

  // 1. INITIALISATION & REALTIME SUBSCRIPTION
  useEffect(() => {
    initData();

    // ECOUTE EN TEMPS RÉEL : Si quelqu'un marque des points, on refresh
    const channel = supabase
      .channel('realtime_ranks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'challenge_attempts' }, () => {
        fetchRankingsOnly(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [challengeId]);

  const initData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Récupérer les défis du client (Cumulés par ID)
    const { data: attempts } = await supabase
      .from('challenge_attempts')
      .select('challenge_id, challenges(*)')
      .eq('user_id', user.id);

    const uniqueChallenges = Array.from(new Map(attempts?.filter(a => a.challenges).map(item => [item.challenge_id, item.challenges])).values());
    setMyChallenges(uniqueChallenges);

    if (challengeId) {
      await fetchRankingsOnly();
    }
    setLoading(false);
  };

  const fetchRankingsOnly = async () => {
    if (!challengeId) return;
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

  // 2. COMPTE À REBOURS PRÉCIS
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
          setTimeLeft(`${h}H ${m}M ${s}S`);
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

  // VUE : AUCUN DÉFI
  if (myChallenges.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-8 text-center uppercase italic">
        <Gamepad2 size={60} className="text-emerald-500/20 mb-6" />
        <h2 className="text-2xl font-black mb-2">ZONE_VIDE</h2>
        <p className="text-slate-500 text-xs mb-8 tracking-widest">Tu n'as encore relevé aucun défi de l'arène.</p>
        <button onClick={() => router.push('/client/challenges')} className="bg-emerald-500 text-black px-8 py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all">
          ENTRER DANS L'ARÈNE
        </button>
      </div>
    );
  }

  // VUE : LISTE DES DÉFIS DU CLIENT (SÉLECTEUR)
  if (!challengeId) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-6 uppercase italic font-black">
        <div className="flex items-center gap-3 mb-8">
            <LayoutGrid className="text-emerald-500" />
            <h1 className="text-2xl tracking-tighter">HISTORIQUE_ARENA</h1>
        </div>
        <div className="grid gap-4">
          {myChallenges.map((ch) => (
            <button 
              key={ch.id}
              onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
              className="p-6 bg-slate-900/50 border border-white/5 rounded-[2rem] flex items-center justify-between group active:border-emerald-500 transition-all"
            >
              <div className="text-left">
                <p className="text-lg">{ch.title}</p>
                <p className="text-[9px] text-emerald-500/50 tracking-[0.3em]">{ch.is_active ? 'EN COURS' : 'ARCHIVÉ'}</p>
              </div>
              <ArrowRight size={20} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // VUE : LEADERBOARD DÉTAILLÉ (REALTIME)
  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase italic select-none">
      <div className="max-w-md mx-auto flex justify-between items-center mb-6">
        <button onClick={() => router.push('/client/rank')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:bg-white/20 transition-all">
          <ChevronLeft />
        </button>
        <div className="text-center">
            <p className="text-[10px] text-emerald-500 animate-pulse">● LIVE_DATA</p>
            <h2 className="text-sm truncate w-40">{activeChallenge?.title}</h2>
        </div>
        <div className="w-10" />
      </div>

      <div className="max-w-md mx-auto space-y-4 pb-32">
        {/* TIMER & REVENUE POOL */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500 p-5 rounded-[2rem] shadow-xl">
                <p className="text-[8px] text-black/60 mb-1">CHRONO</p>
                <p className="text-xl text-black flex items-center gap-2"><Timer size={16}/> {timeLeft}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem]">
                <p className="text-[8px] text-slate-500 mb-1">CUMUL PERSONNEL</p>
                <p className="text-xl text-emerald-500">{currentUserRank?.total_score || 0} PTS</p>
            </div>
        </div>

        {/* FOCUS PLAYER RANK */}
        {currentUserRank && (
            <motion.div 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className={`p-6 rounded-[2.5rem] flex items-center justify-between shadow-2xl ${
                    currentUserRank.rank <= 3 ? 'bg-emerald-500 text-black' : 'bg-white text-black'
                }`}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-4 ${currentUserRank.rank <= 3 ? 'bg-black text-emerald-500 border-black/10' : 'bg-emerald-500 text-black border-black/5'}`}>
                        #{currentUserRank.rank}
                    </div>
                    <div>
                        <p className="text-[9px] font-bold opacity-60">TA POSITION</p>
                        <p className="text-lg leading-none">{currentUserRank.username}</p>
                    </div>
                </div>
                {currentUserRank.rank <= 3 && <Trophy className="animate-bounce" />}
            </motion.div>
        )}

        {/* FULL RANKINGS */}
        <div className="space-y-2 mt-8">
          <p className="text-[9px] text-slate-600 tracking-[0.5em] px-4 mb-4 font-bold">LÉGENDES DE L'ARÈNE</p>
          {leaderboard.map((entry) => {
            const isMe = entry.user_id === currentUserRank?.user_id;
            const isTop3 = entry.rank <= 3;
            return (
              <div key={entry.user_id} className={`p-5 rounded-[1.8rem] border flex items-center justify-between transition-all ${isMe ? 'bg-emerald-500/10 border-emerald-500' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-4">
                  <span className={`w-8 text-center italic font-black ${isTop3 ? 'text-emerald-500' : 'text-slate-600'}`}>
                    {entry.rank === 1 ? '1ST' : entry.rank === 2 ? '2ND' : entry.rank === 3 ? '3RD' : `${entry.rank}`}
                  </span>
                  <p className="text-sm">{entry.username}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className={`text-sm font-black ${isTop3 ? 'text-emerald-500' : 'text-white'}`}>{entry.total_score}</p>
                        <p className="text-[7px] text-slate-500">{entry.attempts_count} SESSIONS</p>
                    </div>
                    {isTop3 && <Medal size={14} className="text-emerald-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTION BAR : RETOUR ET REJOUER */}
      <div className="fixed bottom-6 left-0 w-full px-4 flex flex-col gap-3 items-center z-50">
        <button 
          onClick={() => {
            const routes:any = {'quiz':'/client/games/quiz','biometric':'/client/games/biometric','vault':'/client/games/vault'};
            router.push(`${routes[activeChallenge.game_type] || '/client/games/quiz'}?challengeId=${activeChallenge.id}`);
          }}
          disabled={timeLeft === "TERMINÉ"}
          className="w-full max-w-md py-5 bg-white text-black rounded-2xl font-black text-lg shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <RefreshCcw size={20} /> AUGMENTER MON SCORE
        </button>
        <button onClick={() => router.push('/client/challenges')} className="text-[10px] text-slate-500 hover:text-white transition-colors tracking-widest">
            RETOUR AUX DÉFIS
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

