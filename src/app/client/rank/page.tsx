"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
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

// --- TYPES TYPÉS STRICTEMENT ---
type GameType = "quiz" | "biometric" | "vault";

type ChallengeInfo = {
  id: string;
  title: string;
  game_type: GameType;
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

// Dictionnaire sécurisé des routes de jeu
const GAME_ROUTES: Record<GameType, string> = {
  quiz: "quiz",
  biometric: "biometric-hack",
  vault: "laser-vault",
};

function RankContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challengeId");

  // --- ÉTATS ---
  const [loading, setLoading] = useState<boolean>(true);
  const [myChallenges, setMyChallenges] = useState<ChallengeInfo[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeInfo | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // --- FONCTION DE RÉCUPÉRATION DU CLASSEMENT ---
  const fetchRankings = useCallback(async (cId: string, currentUserId: string) => {
    try {
      const [chRes, lbRes] = await Promise.all([
        supabase.from("challenges").select("id, title, game_type, is_active, ends_at").eq("id", cId).single(),
        supabase
          .from("challenge_leaderboards")
          .select("user_id, username, total_score, attempts_count, rank")
          .eq("challenge_id", cId)
          .order("rank", { ascending: true }),
      ]);

      if (chRes.data) {
        setActiveChallenge(chRes.data as ChallengeInfo);
      }

      if (lbRes.data) {
        // Sanitarisation des pseudos pour éviter la fuite de données personnelles
        const sanitizedEntries: LeaderboardEntry[] = lbRes.data.map((entry) => ({
          ...entry,
          username: entry.username?.trim() || "Joueur Anonyme",
        }));

        setLeaderboard(sanitizedEntries);
        setCurrentUserRank(sanitizedEntries.find((e) => e.user_id === currentUserId) || null);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération du classement:", err);
    }
  }, []);

  // --- EFFECT: INITIALISATION ET SUPABASE REALTIME ---
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      // Chargement des tentatives de l'utilisateur
      const { data: attempts } = await supabase
        .from("challenge_attempts")
        .select("challenge_id, challenges(id, title, game_type, is_active, ends_at)")
        .eq("user_id", user.id);

      if (attempts && isMounted) {
        const list = attempts
          .map((a: { challenges: unknown }) => a.challenges as ChallengeInfo)
          .filter(Boolean);
        
        // Supprimer les doublons de challenges si l'utilisateur a plusieurs tentatives
        const uniqueList = Array.from(new Map(list.map((item) => [item.id, item])).values());
        setMyChallenges(uniqueList);
      }

      if (challengeId && isMounted) {
        await fetchRankings(challengeId, user.id);
      }

      if (isMounted) setLoading(false);
    };

    void initData();

    // Écoute Supabase Realtime OPTIMISÉE (filtrée par challenge_id)
    if (!challengeId) return;

    const channel = supabase
      .channel(`rank_sync_${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_attempts",
          filter: `challenge_id=eq.${challengeId}`,
        },
        () => {
          void supabase.auth.getUser().then(({ data }) => {
            if (data.user && isMounted) {
              void fetchRankings(challengeId, data.user.id);
            }
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [challengeId, fetchRankings]);

  // --- EFFECT: COMPTE À REBOURS SÉCURISÉ ---
  useEffect(() => {
    if (!activeChallenge?.ends_at) {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const end = new Date(activeChallenge.ends_at!).getTime();
      const now = Date.now();
      setCurrentTime(now);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("MISSION TERMINÉE");
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}H ${m}M ${s}S`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeChallenge]);

  // --- VÉRIFICATION EXPIRATION ---
  const isExpired = Boolean(
    !activeChallenge?.is_active ||
      (activeChallenge?.ends_at && new Date(activeChallenge.ends_at).getTime() <= currentTime) ||
      timeLeft.includes("TERMINÉE")
  );

  // --- REDIRECTION SÉCURISÉE VERS LE JEU ---
  const handleImproveScore = () => {
    if (isExpired || !activeChallenge) return;

    const routeSegment = GAME_ROUTES[activeChallenge.game_type];
    if (!routeSegment) {
      console.error("Type de jeu invalide:", activeChallenge.game_type);
      return;
    }

    router.push(`/client/${routeSegment}?challengeId=${activeChallenge.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  // --- VUE 1 : LISTE DES DÉFIS PARTICIPÉS ---
  if (!challengeId) {
    return (
      <div className="min-h-screen bg-[#020617] p-4 text-white sm:p-6 font-black italic uppercase">
        <div className="mx-auto max-w-md">
          <div className="mb-8 mt-2 flex items-center justify-between">
            <button
              onClick={() => router.push("/client/home")}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-400 transition active:scale-90 hover:text-white"
              aria-label="Retour au menu principal"
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
                const expired = !ch.is_active || (ch.ends_at && new Date(ch.ends_at).getTime() <= currentTime);
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

  // --- VUE 2 : CLASSEMENT DU DÉFI SELECTIONNÉ ---
  return (
    <div className="min-h-screen bg-[#020617] p-4 text-white sm:p-6 font-black italic uppercase pb-32">
      <div className="mx-auto max-w-md">
        <div className="mb-6 mt-2 flex items-center justify-between">
          <button
            onClick={() => router.push("/client/rank")}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 active:scale-90"
            aria-label="Retour à la liste des classements"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[8px] tracking-[0.3em] text-emerald-400">DATA_STREAM_SYNC</p>
            <h2 className="text-xs text-slate-200">{activeChallenge?.title || "Chargement..."}</h2>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Star size={18} className="animate-pulse" />
          </div>
        </div>

        {/* STATISTIQUES DU DÉFI */}
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

        {/* CARTE POSITION UTILISATEUR */}
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

        {/* LISTE DU CLASSEMENT GENERAL */}
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

      {/* BOUTON D'ACTION FLOTTANT */}
      {activeChallenge && (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent z-50">
          <div className="max-w-md mx-auto">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleImproveScore}
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

// --- CONTENEUR PRINCIPAL AVEC SUSPENSE & ADS ---
export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#020617]">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
        </div>
      }
    >
      <RankContent />
    </Suspense>
  );
}
