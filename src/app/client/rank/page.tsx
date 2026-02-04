"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Timer, RefreshCcw, ChevronLeft, Loader2, Zap, ArrowRight, LayoutGrid, Star, TrendingUp, Gamepad2 } from 'lucide-react';
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Récupérer les défis où l'utilisateur a une ligne dans attempts
    const { data: attempts } = await supabase
      .from('challenge_attempts')
      .select('challenges(*)')
      .eq('user_id', user.id);

    setMyChallenges(attempts?.map(a => a.challenges).filter(Boolean) || []);
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

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40}/></div>;

  if (!challengeId) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase">
        <h1 className="text-3xl mb-10 mt-4">MES MISSIONS</h1>
        <div className="space-y-4">
          {myChallenges.length === 0 ? (
            <div className="py-20 text-center bg-white/5 rounded-[3rem]">
              <p className="text-slate-500 text-[10px]">AUCUNE MISSION REJOINTE</p>
              <button onClick={() => router.push('/client/challenges')} className="mt-4 text-emerald-500 underline">ALLER À L'ARENA</button>
            </div>
          ) : (
            myChallenges.map((ch) => (
              <button key={ch.id} onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)} className="w-full p-8 bg-slate-900/40 border border-white/5 rounded-[2.5rem] flex justify-between items-center">
                <div className="text-left">
                  <h3>{ch.title}</h3>
                  <p className="text-[8px] text-emerald-500 mt-1">VOIR MON CLASSEMENT</p>
                </div>
                <ArrowRight size={20} />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase italic pb-40">
        <div className="max-w-md mx-auto flex justify-between items-center mb-8">
            <button onClick={() => router.push('/client/rank')} className="p-4 bg-white/5 rounded-3xl"><ChevronLeft size={20}/></button>
            <h2 className="text-sm">{activeChallenge?.title}</h2>
            <div className="w-10"></div>
        </div>

        <div className="max-w-md mx-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-600 p-6 rounded-[2rem] text-black">
                    <p className="text-[7px]">SCORE CUMULÉ</p>
                    <p className="text-xl">{currentUserRank?.total_score || 0}</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2rem] border border-white/10">
                    <p className="text-[7px] text-slate-500">RANG</p>
                    <p className="text-xl">#{currentUserRank?.rank || '?'}</p>
                </div>
            </div>

            <div className="space-y-3 mt-8">
                {leaderboard.map((entry) => (
                    <div key={entry.user_id} className={`p-5 rounded-[2rem] border flex justify-between ${entry.user_id === currentUserRank?.user_id ? 'bg-emerald-500/20 border-emerald-500' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex gap-4 items-center">
                            <span className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs">{entry.rank}</span>
                            <span className="text-sm">{entry.username}</span>
                        </div>
                        <span className="text-lg text-emerald-500">{entry.total_score}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return <Suspense fallback={<Loader2 className="animate-spin"/>}><RankContent /></Suspense>;
}
