"use client";

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ChevronLeft,
  Coins,
  Sparkles,
  Trophy,
  Play,
  Timer,
  X,
  Filter,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

type ChallengeAttempt = {
  user_id: string;
  total_score: number | null;
  attempts_count: number | null;
};

type ChallengeItem = {
  id: string;
  title: string;
  prize_pool_cp: number;
  entry_fee_cp_base: number;
  game_type: "quiz" | "biometric" | "vault";
  is_active: boolean;
  ends_at?: string;
  challenge_attempts: ChallengeAttempt[] | null;
};

type Profile = {
  id: string;
  jetons_cp: number;
  vip_status: "free" | "weekly" | "monthly" | null;
};

function ChallengeTimer({ endsAt }: { endsAt?: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!endsAt) return;

    const updateTimer = () => {
      const end = new Date(endsAt).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("TERMINÉ");
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!endsAt) return null;

  return (
    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
      <Timer size={12} />
      <span>{timeLeft}</span>
    </div>
  );
}

export default function ArenaPage() {
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [entryLoading, setEntryLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const router = useRouter();

  const isChallengeExpired = (endsAt?: string): boolean => {
    if (!endsAt) return false;
    return new Date(endsAt).getTime() <= Date.now();
  };

  const calculateEntryFeeCP = useCallback((baseCP: number): number => {
    if (!profile) return baseCP;
    if (profile.vip_status === "monthly") return Math.floor(baseCP * 0.7);
    if (profile.vip_status === "weekly") return Math.floor(baseCP * 0.85);
    return baseCP;
  }, [profile]);

  const fetchData = useCallback(async (isMounted: boolean = true) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const [pRes, cRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, jetons_cp, vip_status")
          .eq("id", user.id)
          .single(),
        supabase
          .from("challenges")
          .select(
            `id, title, prize_pool_cp, entry_fee_cp_base, game_type, is_active, ends_at,
             challenge_attempts(user_id, total_score, attempts_count)`
          )
          .eq("is_active", true)
          .eq("challenge_attempts.user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!isMounted) return;

      if (pRes.data) setProfile(pRes.data);
      if (cRes.data) setChallenges(cRes.data as ChallengeItem[]);
    } catch (err) {
      if (isMounted) {
        console.error("Erreur de chargement des données :", err);
        setErrorMessage("Impossible de charger les défis. Veuillez réentreprendre.");
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;
    void fetchData(isMounted);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isMounted) return;

      channel = supabase
        .channel(`arena_user_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "challenge_attempts",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            if (isMounted) void fetchData(isMounted);
          }
        )
        .subscribe();
    });

    return () => {
      isMounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleEntry = async (challenge: ChallengeItem, fee: number) => {
    setErrorMessage(null);
    if (!profile) return;

    if (!challenge.is_active || isChallengeExpired(challenge.ends_at)) {
      setErrorMessage("Ce défi est terminé ou n'est plus accessible.");
      return;
    }

    if (profile.jetons_cp < fee) {
      setErrorMessage("Solde insuffisant en jetons CP pour rejoindre ce défi.");
      return;
    }

    setEntryLoading(challenge.id);

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("enter_challenge", {
        p_challenge_id: challenge.id,
        p_user_id: profile.id,
      });

      if (rpcError && rpcError.code === "PGRST202") {
        const { error: attemptError } = await supabase.from("challenge_attempts").upsert(
          {
            challenge_id: challenge.id,
            user_id: profile.id,
            last_attempt_at: new Date().toISOString(),
          },
          { onConflict: "challenge_id,user_id" }
        );

        if (attemptError) throw attemptError;

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ jetons_cp: profile.jetons_cp - fee })
          .eq("id", profile.id);

        if (profileError) throw profileError;
      } else if (rpcError) {
        throw rpcError;
      } else if (rpcData && !rpcData.success) {
        setErrorMessage(rpcData.message || "Impossible de valider l'entrée.");
        setEntryLoading(null);
        return;
      }

      setProfile((prev) => (prev ? { ...prev, jetons_cp: prev.jetons_cp - fee } : null));

      const routes: Record<ChallengeItem["game_type"], string> = {
        quiz: "quiz",
        biometric: "biometric-hack",
        vault: "laser-vault",
      };

      router.push(`/client/${routes[challenge.game_type]}?challengeId=${challenge.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur réseau ou serveur";
      setErrorMessage(`Impossible de valider l'entrée : ${message}`);
      setEntryLoading(null);
    }
  };

  const filteredChallenges = challenges.filter((ch) => {
    if (selectedFilter === "all") return true;
    return ch.game_type === selectedFilter;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617]">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] pb-28 text-white selection:bg-emerald-500 selection:text-black">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/client/home")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition active:scale-90 hover:bg-white/10"
              aria-label="Retour à l'accueil"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                Arenas Premium
              </p>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Missions <span className="text-emerald-500">& Défis</span>
              </h1>
            </div>
          </div>

          <button
            onClick={() => router.push("/client/rank")}
            className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20 active:scale-95"
          >
            <Trophy size={16} />
            <span className="hidden sm:inline">Classements</span>
          </button>
        </header>

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} aria-label="Fermer le message d'erreur">
              <X size={16} />
            </button>
          </motion.div>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[2rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900/80 to-slate-950 p-5 shadow-[0_20px_50px_rgba(16,185,129,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                  Votre Solde
                </p>
                <p className="mt-1 text-3xl font-black text-emerald-300">
                  {profile?.jetons_cp?.toLocaleString()} <span className="text-sm font-normal">CP</span>
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-500/20 p-3 text-emerald-300">
                <Coins size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
              <span>Statut VIP : <strong className="uppercase text-white">{profile?.vip_status || "Free"}</strong></span>
              <span>Réduction : <strong className="text-emerald-400">{profile?.vip_status === "monthly" ? "30%" : profile?.vip_status === "weekly" ? "15%" : "0%"}</strong></span>
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-[2rem] border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles size={18} />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Règles de l&apos;Arena</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Chaque tentative améliore votre score cumulé. Atteignez le haut du classement avant la fin de la session pour empocher le Jackpot !
            </p>
          </div>
        </section>

        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-1 text-xs text-slate-500 pr-2">
            <Filter size={14} />
            <span>Filtrer :</span>
          </div>
          {[
            { id: "all", label: "Tous les défis" },
            { id: "quiz", label: "Quiz" },
            { id: "biometric", label: "Biometric Hack" },
            { id: "vault", label: "Laser Vault" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition active:scale-95 ${
                selectedFilter === tab.id
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                  : "border border-white/10 bg-slate-900/60 text-slate-400 hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {filteredChallenges.length === 0 ? (
            <div className="rounded-[2rem] border border-white/5 bg-slate-900/40 p-8 text-center text-slate-500 text-xs">
              Aucun défi disponible pour cette catégorie pour le moment.
            </div>
          ) : (
            filteredChallenges.map((ch) => {
              const fee = calculateEntryFeeCP(ch.entry_fee_cp_base);
              const myAttempt = ch.challenge_attempts?.find(
                (a) => a.user_id === profile?.id
              );
              const myScore = myAttempt?.total_score || 0;
              const myCount = myAttempt?.attempts_count || 0;
              const expired = isChallengeExpired(ch.ends_at) || !ch.is_active;

              return (
                <motion.div
                  key={ch.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 backdrop-blur-md shadow-xl sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                          <Sparkles size={12} />
                          {ch.game_type}
                        </span>
                        <ChallengeTimer endsAt={ch.ends_at} />
                      </div>
                      <h3 className="mt-2 text-xl font-black text-white">{ch.title}</h3>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-right">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Jackpot</p>
                      <p className="text-lg font-black text-emerald-400">{ch.prize_pool_cp.toLocaleString()} CP</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:gap-4">
                    <div className="rounded-xl border border-white/5 bg-slate-950/50 p-2.5">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Votre Score</p>
                      <p className="text-sm font-bold text-emerald-400">{myScore} <span className="text-[10px] text-slate-500">({myCount} essais)</span></p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-slate-950/50 p-2.5">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Frais d&apos;entrée</p>
                      <p className="text-sm font-bold text-white">{fee} CP</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={() => handleEntry(ch, fee)}
                      disabled={(profile?.jetons_cp ?? 0) < fee || entryLoading === ch.id || expired}
                      className="flex-1 rounded-2xl bg-white py-3.5 text-center text-sm font-black text-slate-950 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                      {entryLoading === ch.id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : expired ? (
                        <span>DÉFI TERMINÉ</span>
                      ) : (
                        <>
                          <Play size={16} fill="currentColor" />
                          <span>JOUER ({fee} CP)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => router.push(`/client/rank?challengeId=${ch.id}`)}
                      className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-slate-300 transition hover:bg-white/10 active:scale-95"
                      title="Voir le classement de ce défi"
                      aria-label="Voir le classement"
                    >
                      <Trophy size={18} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
