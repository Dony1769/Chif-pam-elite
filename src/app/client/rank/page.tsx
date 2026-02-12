"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Timer, RefreshCcw, ChevronLeft, Loader2, Zap, ArrowRight, LayoutGrid, Star, TrendingUp, Crown, Gamepad2, Home } from 'lucide-react';
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

  /* ============================= */
  /* 🔥 VIGNETTE — 1 FOIS / SESSION */
  /* ============================= */
  useEffect(() => {
    if (!challengeId) {
      const alreadyShown = sessionStorage.getItem("rankVignetteShown");
      if (!alreadyShown) {
        const script = document.createElement("script");
        script.dataset.zone = "10586275";
        script.src = "https://gizokraijaw.net/vignette.min.js";
        script.async = true;
        document.body.appendChild(script);
        sessionStorage.setItem("rankVignetteShown", "true");
      }
    }
  }, [challengeId]);
  /* ============================= */

  const initData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: attempts } = await supabase
      .from('challenge_attempts')
      .select('challenge_id, challenges(*)')
      .eq('user_id', user.id);

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

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={40} />
    </div>
  );

  /* ============================= */
  /* 🔹 PARTIE 1 : LISTE DES DÉFIS */
  /* ============================= */
  if (!challengeId) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase">

        <div className="flex justify-between items-center mb-8 mt-2">
          <button
            onClick={() => router.push('/client/home')}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all text-slate-400 hover:text-white"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
            <Trophy size={20} className="text-emerald-500" />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-10">
          <h1 className="text-3xl tracking-tighter">MES_STATS_ARENA</h1>
        </div>

        <div className="space-y-4">
          {myChallenges.length === 0 ? (
            <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-white/5">
              <Gamepad2 size={40} className="mx-auto mb-4 text-slate-700" />
              <p className="text-[10px] tracking-widest text-slate-500">AUCUNE PARTICIPATION</p>
              <button
                onClick={() => router.push('/client/challenges')}
                className="mt-6 text-emerald-500 underline text-xs"
              >
                REJOINDRE UNE MISSION
              </button>
            </div>
          ) : (
            myChallenges.map((ch) => (
              <motion.button
                whileTap={{ scale: 0.98 }}
                key={ch.id}
                onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
                className="w-full p-8 bg-slate-900/40 border border-white/5 rounded-[2.5rem] flex items-center justify-between group"
              >
                <div className="text-left">
                  <h3 className="text-xl tracking-tight">{ch.title}</h3>
                  <p className={`text-[9px] tracking-[0.3em] mt-1 ${ch.is_active ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {ch.is_active ? 'STATUT: ACTIF' : 'STATUT: ARCHIVÉ'}
                  </p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-emerald-500 group-hover:text-black transition-all">
                  <ArrowRight size={20} />
                </div>
              </motion.button>
            ))
          )}
        </div>
      </div>
    );
  }

  /* ============================= */
  /* 🔹 PARTIE 2 : CLASSEMENT */
  /* ============================= */

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-black uppercase italic pb-40">
      {/* ... PARTIE 2 INCHANGÉE ... */}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    }>
      <RankContent />
    </Suspense>
  );
  }
