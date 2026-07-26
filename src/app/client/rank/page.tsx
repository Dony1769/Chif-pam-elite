"use client";

import React, { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import {
  Trophy,
  Timer,
  ChevronLeft,
  Loader2,
  Zap,
  ArrowRight,
  Star,
  TrendingUp,
  Crown,
  Gamepad2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Script from "next/script";

type ChallengeInfo = {
  id: string;
  title: string;
  game_type: "quiz" | "biometric" | "vault";
  is_active: boolean;
  ends_at?: string;
};

type LeaderboardEntry = {
  user_id: string;
  username: string;
  total_score: number;
  attempts_count: number;
  rank: number;
};

function RankContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challengeId");

  const [loading, setLoading] = useState<boolean>(true);
  const [myChallenges, setMyChallenges] = useState<ChallengeInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeInfo | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: attempts } = await supabase
        .from("challenge_attempts")
        .select("challenge_id, challenges(*)")
        .eq("user_id", user.id);

      if (attempts) {
        const list = attempts
          .map((a: { challenges: unknown }) => a.challenges as ChallengeInfo)
          .filter(Boolean);
        setMyChallenges(list);
      }

      if (challengeId) {
        await fetchRankings(challengeId, user.id);
      }
      setLoading(false);
    };

    void initData();

    const channel = supabase
      .channel("rank_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_attempts" },
        () => {
          if (challengeId) {
            void supabase.auth.getUser().then(({ data }) => {
              if (data.user) void fetchRankings(challengeId, data.user.id);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId]);

  const fetchRankings = async (cId: string, currentUserId: string) => {
    const [chRes, lbRes] = await Promise.all([
      supabase.from("challenges").select("*").eq("id", cId).single(),
      supabase
        .from("challenge_leaderboards")
        .select("*")
        .eq("challenge_id", cId)
        .order("rank", { ascending: true }),
    ]);

    if (chRes.data) setActiveChallenge(chRes.data as ChallengeInfo);
    if (lbRes.data) {
      const entries = lbRes.data as LeaderboardEntry[];
      setLeaderboard(entries);
      setCurrentUserRank(entries.find((e) => e.user_id === currentUserId) || null);
    }
  };

  useEffect(() => {
    if (!activeChallenge?.ends_at) return;

    const interval = setInterval(() => {
      const end = new Date(activeChallenge.ends_at!).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("MISSION TERMINÉE");
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}H ${m}M ${s}S`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeChallenge]);

  const isExpired = Boolean(
    !activeChallenge?.is_active ||
      (activeChallenge?.ends_at && new Date(activeChallenge.ends_at).getTime() <= Date.now()) ||
      timeLeft.includes("TERMINÉE")
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  if (!challengeId) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 text-white sm:p-6 font-black italic uppercase">
        <div className="mx-auto max-w-md">
          <div className="mb-8 mt-2 flex items-center justify-between">
            <button
              onClick={() => router.push("/client/home")}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-400 transition active:scale-90 hover:text-white"
            >
              <ChevronLeft size={22} />
            </button>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
              <Trophy size={18} className="text-emerald-500" />
            </div>
          </div>

          <h1 className="mb-6 text-2xl tracking-tight text-white">Mes Stats Arena</h1>

          <div className="space-y-3">
            {myChallenges.length === 0 ? (
              <div className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 p-10 text-center">
                <Gamepad2 size={36} className="mx-auto mb-3 text-slate-700" />
                <p className="text-[10px] tracking-widest text-slate-500">AUCUNE PARTICIPATION</p>
                <button
                  onClick={() => router.push("/client/challenges")}
                  className="mt-4 text-xs text-emerald-500 underline"
                >
                  REJOINDRE UNE MISSION
                </button>
              </div>
            ) : (
              myChallenges.map((ch) => {
                const expired = !ch.is_active || (ch.ends_at && new Date(ch.ends_at).getTime() <= Date.now());
                return (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    key={ch.id}
                    onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
                    className="flex w-full items-center justify-between rounded-[2rem] border border-white/5 bg-slate-900/60 p-6 text-left transition hover:border-emerald-500/30"
                  >
                    <div>
                      <h3 className="text-lg tracking-tight text-white">{ch.title}</h3>
                      <p
                        className={`mt-1 text-[9px] tracking-[0.2em] ${
                          !expired ? "text-emerald-400" : "text-rose-500"
                        }`}
                      >
                        {!expired ? "STATUT: ACTIF" : "STATUT: EXPIRÉ"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 text-slate-300">
                      <ArrowRight size={18} />
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-white sm:p-6 font-black italic uppercase pb-32">
      <div className="mx-auto max-w-md">
        <div className="mb-6 mt-2 flex items-center justify-between">
          <button
            onClick={() => router.push("/client/rank")}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 active:scale-90"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[8px] tracking-[0.3em] text-emerald-400">DATA_STREAM_SYNC</p>
            <h2 className="text-xs text-slate-200">{activeChallenge?.title}</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Star size={18} className="animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-[2rem] bg-emerald-500 p-5 text-slate-950 shadow-lg">
            <p className="text-[8px] opacity-80 mb-1">TEMPS RESTANT</p>
            <p className="text-base font-black flex items-center gap-1.5">
              <Timer size={16} /> {timeLeft || "--H --M"}
            </p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-900 p-5">
            <p className="text-[8px] text-slate-500 mb-1">SCORE CUMULÉ</p>
            <p className="text-base text-emerald-400 flex items-center gap-1.5 font-black">
              <TrendingUp size={16} /> {currentUserRank?.total_score || 0}
            </p>
          </div>
        </div>

        {currentUserRank && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mb-6 p-6 rounded-[2.2rem] flex items-center justify-between border-2 ${
              currentUserRank.rank <= 3
                ? "bg-white text-slate-950 border-emerald-400"
                : "bg-slate-900 border-white/10"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${
                    currentUserRank.rank <= 3 ? "bg-slate-950 text-emerald-400" : "bg-emerald-500 text-slate-950"
                  }`}
                >
                  #{currentUserRank.rank}
                </div>
                {currentUserRank.rank === 1 && (
                  <Crown size={14} className="absolute -top-2 -right-1 text-amber-500 fill-current" />
                )}
              </div>
              <div>
                <p className="text-[8px] opacity-60 tracking-widest">VOTRE POSITION</p>
                <p className="text-lg tracking-tight">{currentUserRank.username}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black">{currentUserRank.total_score}</p>
              <p className="text-[8px] opacity-60">PTS ({currentUserRank.attempts_count} essais)</p>
            </div>
          </motion.div>
        )}

        <div className="space-y-2.5">
          {leaderboard.map((entry) => {
            const isMe = entry.user_id === currentUserRank?.user_id;
            return (
              <div
                key={entry.user_id}
                className={`p-4 rounded-[1.5rem] border flex items-center justify-between ${
                  isMe
                    ? "bg-emerald-500/20 border-emerald-500 shadow-lg"
                    : "bg-slate-900/40 border-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                      entry.rank === 1 ? "bg-amber-500 text-slate-950" : "bg-white/5 text-slate-400"
                    }`}
                  >
                    {entry.rank}
                  </div>
                  <p className={`text-xs tracking-tight ${isMe ? "text-emerald-300" : "text-white"}`}>
                    {entry.username} {isMe && "(VOUS)"}
                  </p>
                </div>
                <p className={`text-sm font-black ${entry.rank <= 3 ? "text-emerald-400" : "text-white"}`}>
                  {entry.total_score}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {activeChallenge && (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent z-50">
          <div className="max-w-md mx-auto">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isExpired) return;
                const routes: Record<ChallengeInfo["game_type"], string> = {
                  quiz: "quiz",
                  biometric: "biometric-hack",
                  vault: "laser-vault",
                };
                router.push(`/client/${routes[activeChallenge.game_type]}?challengeId=${activeChallenge.id}`);
              }}
              disabled={isExpired}
              className="w-full py-4 bg-white text-slate-950 rounded-[1.8rem] font-black text-lg shadow-xl flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Zap size={20} fill="currentColor" />
              <span>{isExpired ? "MISSION EXPIRÉE" : "AMÉLIORER MON SCORE"}</span>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <>
      <Script
        id="monetag-vignette"
        src="https://gizokraijaw.net/vignette.min.js"
        data-zone="10586275"
        strategy="lazyOnload"
      />
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-[#020617]">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        }
      >
        <RankContent />
      </Suspense>
    </>
  );
}
