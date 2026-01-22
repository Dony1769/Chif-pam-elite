"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Timer, ChevronLeft, Loader2, Target, Zap, Medal, RefreshCcw, ArrowRight, Gamepad2 } from 'lucide-react';
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
  }, [challengeId]);

  const initData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Récupérer tous les défis auxquels l'utilisateur a participé
    const { data: attempts } = await supabase
      .from('challenge_attempts')
      .select('challenge_id, challenges(*)')
      .eq('user_id', user.id);

    // Filtrer les doublons de challenges
    const uniqueChallenges = Array.from(new Map(attempts?.map(item => [item.challenge_id, item.challenges])).values());
    setMyChallenges(uniqueChallenges);

    // 2. Si un challengeId est présent, charger le leaderboard spécifique
    if (challengeId) {
      const { data: chall } = await supabase.from('challenges').select('*').eq('id', challengeId).single();
      setActiveChallenge(chall);

      const { data: ranks } = await supabase
        .from('challenge_leaderboards')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('rank', { ascending: true });
      
      setLeaderboard(ranks || []);
      setCurrentUserRank(ranks?.find(r => r.user_id === user.id));
    }
    setLoading(false);
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
          setTimeLeft(`${h}H ${m}M ${s}S`);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeChallenge]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="animate-spin text-emerald-500 mx-auto" size={40} />
        <p className="text-[10px] tracking-[0.5em] text-emerald-500/50">SYNCHRONISATION ARENA...</p>
      </div>
    </div>
  );

  // ÉTAT VIDE : Pas de participation
  if (myChallenges.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
          <Gamepad2 size={40} className="text-emerald-500 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black italic mb-2 tracking-tighter uppercase">Aucun Combat Détecté</h2>
        <p className="text-slate-400 text-sm mb-8 font-medium italic uppercase tracking-widest">
          Tu n'as participé à aucun défi. L'arène attend ton premier move.
        </p>
        <button 
          onClick={() => router.push('/client/challenges')}
          className="w-full max-w-xs py-5 bg-emerald-500 text-black font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)]"
        >
          VOIR LES DÉFIS DISPONIBLES <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  // ÉTAT LISTE : Choisir un défi pour voir son classement
  if (!challengeId) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-6 uppercase italic">
        <h1 className="text-3xl font-black tracking-tighter mb-2 text-emerald-500">MES_ARENAS</h1>
        <p className="text-[10px] text-slate-500 tracking-[0.3em] mb-8">SÉLECTIONNE UN DÉFI POUR VOIR TON RANG</p>
        
        <div className="space-y-4">
          {myChallenges.map((ch) => (
            <button 
              key={ch.id}
              onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
              className="w-full p-6 bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-between group active:bg-emerald-500 active:text-black transition-all"
            >
              <div className="text-left">
                <p className="font-black text-lg group-active:text-black">{ch.title}</p>
                <p className="text-[10px] text-slate-500 group-active:text-black/50">{ch.game_type}</p>
              </div>
              <ArrowRight className="text-emerald-500 group-active:text-black" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ÉTAT LEADERBOARD : Détails d'un défi
  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase italic select-none">
      <div className="max-w-md mx-auto flex justify-between items-center mb-8">
        <button onClick={() => router.push('/client/rank')} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ChevronLeft />
        </button>
        <div className="text-center">
          <h1 className="text-xl tracking-tighter text-emerald-500">RANK_SYSTEM</h1>
          <p className="text-[8px] text-slate-500 tracking-[0.3em] truncate max-w-[150px]">{activeChallenge?.title}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="max-w-md mx-auto space-y-6 pb-32">
        {/* TIMER & INFO */}
        <div className="bg-emerald-500 p-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_20px_50px_rgba(16,185,129,0.2)]">
          <div>
            <p className="text-black text-[10px] tracking-widest font-bold">TEMPS RESTANT</p>
            <p className="text-3xl text-black font-black tracking-tighter flex items-center gap-2 italic">
              <Timer size={24} /> {timeLeft}
            </p>
          </div>
          <Zap size={24} className="text-black animate-pulse" />
        </div>

        {/* CARTE PERSONNELLE (PRIME SI TOP 3) */}
        {currentUserRank && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className={`p-6 rounded-[2.5rem] border-b-8 shadow-2xl ${
              currentUserRank.rank <= 3 
              ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-black border-amber-800' 
              : 'bg-white text-black border-emerald-500'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
               <div>
                  <p className="text-[10px] opacity-70 tracking-widest">TON CLASSEMENT</p>
                  <p className="text-4xl font-black tracking-tighter italic">#{currentUserRank.rank}</p>
               </div>
               {currentUserRank.rank <= 3 && <Trophy size={40} className="animate-bounce" />}
            </div>
            <div className="flex justify-between items-end">
                <p className="text-xl">{currentUserRank.username}</p>
                <div className="text-right">
                    <p className="text-[10px] opacity-70">SCORE TOTAL</p>
                    <p className="text-3xl font-black">{currentUserRank.total_score} PTS</p>
                </div>
            </div>
            {currentUserRank.rank <= 3 && (
                <div className="mt-4 pt-4 border-t border-black/10 text-center animate-pulse">
                    <p className="text-xs font-bold tracking-[0.2em]">PRIME ÉLITE ACTIVÉE</p>
                </div>
            )}
          </motion.div>
        )}

        {/* LISTE GLOBALE */}
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 tracking-[0.4em] px-4 mb-4 font-bold">TABLEAU DES LÉGENDES</p>
          {leaderboard.map((entry, index) => {
            const isMe = entry.user_id === currentUserRank?.user_id;
            const isTop3 = entry.rank <= 3;
            return (
              <motion.div 
                key={entry.user_id}
                className={`p-5 rounded-[2rem] border flex items-center justify-between ${
                  isTop3 ? 'bg-white/10 border-emerald-500/50' : 'bg-white/5 border-white/5'
                } ${isMe ? 'ring-2 ring-emerald-500' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-xl italic font-black ${isTop3 ? 'text-emerald-500' : 'text-slate-600'}`}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </span>
                  <p className="text-sm tracking-tighter">{entry.username}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black ${isTop3 ? 'text-emerald-500' : 'text-white'}`}>{entry.total_score}</p>
                  <p className="text-[8px] text-slate-500 italic uppercase">{entry.attempts_count} ROUNDS</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* BOUTON DÉFIER À NOUVEAU */}
      <div className="fixed bottom-6 left-0 w-full px-4 flex justify-center z-50">
        <button 
          onClick={() => {
            const routes:any = {'quiz':'/client/games/quiz','biometric':'/client/games/biometric','vault':'/client/games/vault'};
            router.push(`${routes[activeChallenge.game_type] || '/client/games/quiz'}?challengeId=${activeChallenge.id}`);
          }}
          disabled={timeLeft === "TERMINÉ"}
          className="w-full max-w-md py-6 bg-white text-black rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:grayscale disabled:opacity-50"
        >
          <RefreshCcw size={24} /> {timeLeft === "TERMINÉ" ? "ARENA CLOSE" : "DÉFIER À NOUVEAU"}
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

