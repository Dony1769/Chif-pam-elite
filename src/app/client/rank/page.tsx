"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Timer, RefreshCcw, ChevronLeft, Loader2, Zap, ArrowRight, LayoutGrid, Star, TrendingUp, Crown, Gamepad2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

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
    const channel = supabase.channel('rank_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_attempts' }, () => fetchRankingsOnly())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [challengeId]);

  const initData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: attempts } = await supabase
      .from('challenge_attempts')
      .select('challenge_id, challenges(*)')
      .eq('user_id', user.id);

    // Fusion et nettoyage des données
    const challengesList = attempts?.map((a: any) => a.challenges).filter(Boolean) || [];
    setMyChallenges(challengesList);

    if (challengeId) await fetchRankingsOnly();
    setLoading(false);
  };

  const fetchRankingsOnly = async () => {
    if (!challengeId) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    const [chRes, lbRes] = await Promise.all([
      supabase.from('challenges').select('*').eq('id', challengeId).single(),
      supabase.from('challenge_leaderboards').select('*').eq('challenge_id', challengeId).order('rank', { ascending: true })
    ]);

    setActiveChallenge(chRes.data);
    setLeaderboard(lbRes.data || []);
    if (user && lbRes.data) {
      setCurrentUserRank(lbRes.data.find(r => r.user_id === user.id));
    }
  };

  // Logique du Timer présente uniquement dans le code 1
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeChallenge?.ends_at) {
        const end = new Date(activeChallenge.ends_at).getTime();
        const now = new Date().getTime();
        const diff = end - now;
        if (diff <= 0) setTimeLeft("MISSION TERMINÉE");
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

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  if (!challengeId) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase">
        <div className="flex items-center gap-3 mb-10 mt-4">
            <div className="p-3 bg-emerald-500 rounded-2xl text-black"><LayoutGrid size={24} /></div>
            <h1 className="text-3xl tracking-tighter">MES_STATS_ARENA</h1>
        </div>
        <div className="space-y-4">
          {myChallenges.length === 0 ? (
             <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-white/5">
                <Gamepad2 size={40} className="mx-auto mb-4 text-slate-700" />
                <p className="text-[10px] tracking-widest text-slate-500">AUCUNE PARTICIPATION</p>
                <button onClick={() => router.push('/client/challenges')} className="mt-6 text-emerald-500 underline text-xs">REJOINDRE UNE MISSION</button>
             </div>
          ) : (
            myChallenges.map((ch) => (
                <motion.button whileTap={{ scale: 0.98 }} key={ch.id} onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
                  className="w-full p-8 bg-slate-900/40 border border-white/5 rounded-[2.5rem] flex items-center justify-between group">
                  <div className="text-left">
                    <h3 className="text-xl tracking-tight">{ch.title}</h3>
                    <p className={`text-[9px] tracking-[0.3em] mt-1 ${ch.is_active ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {ch.is_active ? 'STATUT: ACTIF' : 'STATUT: ARCHIVÉ'}
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-emerald-500 group-hover:text-black transition-all"><ArrowRight size={20} /></div>
                </motion.button>
              ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase italic pb-40">
      <div className="max-w-md mx-auto flex justify-between items-center mb-8 mt-2">
        <button onClick={() => router.push('/client/rank')} className="p-4 bg-white/5 rounded-3xl border border-white/10 active:scale-90 transition-all"><ChevronLeft size={20} /></button>
        <div className="text-center">
            <p className="text-[9px] text-emerald-500 tracking-[0.3em] mb-1">DATA_STREAM_SYNC</p>
            <h2 className="text-sm border-b border-emerald-500/30 pb-1">{activeChallenge?.title}</h2>
        </div>
        <div className="w-12 h-12 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Star size={20} className="animate-pulse" /></div>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-600 p-6 rounded-[2.2rem] shadow-[0_20px_40px_rgba(16,185,129,0.2)] text-black">
                <p className="text-[8px] font-bold opacity-70 mb-2">TEMPS RESTANT</p>
                <p className="text-lg flex items-center gap-2 font-black"><Timer size={18}/> {timeLeft}</p>
            </div>
            <div className="bg-slate-900 border border-white/10 p-6 rounded-[2.2rem]">
                <p className="text-[8px] text-slate-500 mb-2">MON SCORE CUMULÉ</p>
                <p className="text-lg text-emerald-500 flex items-center gap-2 font-black"><TrendingUp size={18}/> {currentUserRank?.total_score || 0}</p>
            </div>
        </div>

        {currentUserRank && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className={`p-8 rounded-[2.8rem] flex items-center justify-between border-2 ${
                    currentUserRank.rank <= 3 ? 'bg-white text-black border-emerald-500' : 'bg-slate-900 border-white/10'
                }`}>
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black rotate-3 ${
                            currentUserRank.rank <= 3 ? 'bg-black text-emerald-500' : 'bg-emerald-500 text-black'
                        }`}>#{currentUserRank.rank}</div>
                        {currentUserRank.rank === 1 && <Crown size={16} className="absolute -top-2 -right-2 text-amber-500 fill-current -rotate-12" />}
                    </div>
                    <div>
                        <p className="text-[9px] opacity-50 tracking-widest leading-none mb-1">VOTRE POSITION</p>
                        <p className="text-xl tracking-tighter">{currentUserRank.username}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-black">{currentUserRank.total_score}</p>
                    <p className="text-[8px] opacity-50">PTS ({currentUserRank.attempts_count} essais)</p>
                </div>
            </motion.div>
        )}

        <div className="space-y-3 mt-6">
            {leaderboard.map((entry) => {
              const isMe = entry.user_id === currentUserRank?.user_id;
              return (
                <div key={entry.user_id} className={`p-5 rounded-[2rem] border flex items-center justify-between ${
                    isMe ? 'bg-emerald-500/20 border-emerald-500 shadow-lg' : 'bg-white/2 border-white/5'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${
                        entry.rank === 1 ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-500'
                    }`}>{entry.rank}</div>
                    <p className={`text-sm tracking-tight ${isMe ? 'text-emerald-400' : 'text-white'}`}>{entry.username} {isMe && "(VOUS)"}</p>
                  </div>
                  <p className={`text-lg font-black ${entry.rank <= 3 ? 'text-emerald-500' : 'text-white'}`}>{entry.total_score}</p>
                </div>
              );
            })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#020617] to-transparent z-50">
        <div className="max-w-md mx-auto">
            <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => {
                const routes:any = { quiz: 'quiz', biometric: 'biometric-hack', vault: 'laser-vault' };
                router.push(`/client/${routes[activeChallenge.game_type]}?challengeId=${activeChallenge.id}`);
            }}
            disabled={timeLeft.includes("TERMINÉE")}
            className="w-full py-6 bg-white text-black rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-20"
            >
            <Zap size={24} fill="black" /> {timeLeft.includes("TERMINÉE") ? "MISSION_EXPIRÉE" : "GRIMPER AU SCORE"}
            </motion.button>
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
