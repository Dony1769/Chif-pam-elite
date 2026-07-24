// client/challenges/page.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, ChevronLeft, Coins, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import dynamic from 'next/dynamic';

const AdsterraNativeBanner = dynamic(() => import('@/components/ads/AdsterraNativeBanner'), { ssr: false });
const ExoOutstream = dynamic(() => import('@/components/ads/ExoOutstream'), { ssr: false });

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
  game_type: 'quiz' | 'biometric' | 'vault';
  challenge_attempts: ChallengeAttempt[] | null;
};

type Profile = {
  id: string;
  jetons_cp: number;
  vip_status: 'free' | 'weekly' | 'monthly' | null;
};

export default function ArenaPage() {
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryLoading, setEntryLoading] = useState<string | null>(null);

  // 🔥 PUB SYSTEM
  const [showInterstitial, setShowInterstitial] = useState(true); // ExoOutstream au chargement
  const [canCloseInterstitial, setCanCloseInterstitial] = useState(false);
  const [showAdsterraNativeBanner, setShowAdsterraNativeBanner] = useState(false); // S'active après l'interstitiel

  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/connexion");

    const [pRes, cRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, jetons_cp, vip_status")
        .eq("id", user.id)
        .single(),
      supabase
        .from("challenges")
        .select("id, title, prize_pool_cp, entry_fee_cp_base, game_type, challenge_attempts (user_id, total_score, attempts_count)")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

    setProfile(pRes.data);
    setChallenges(cRes.data || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const bootstrapTimer = setTimeout(() => {
      void fetchData();
    }, 0);

    // ⚡ Supabase realtime
    const channel = supabase
      .channel("arena_main_hub")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_attempts" },
        () => {
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
          }
          refreshTimerRef.current = setTimeout(() => {
            void fetchData();
          }, 800);
        }
      )
      .subscribe();

    // ⏳ Timer pour le bouton fermer de l'interstitiel (5 sec)
    const timer = setTimeout(() => setCanCloseInterstitial(true), 5000);

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      clearTimeout(bootstrapTimer);
      clearTimeout(timer);
    };
  }, [fetchData]);

  const calculateEntryFeeCP = (baseCP: number) => {
    if (profile?.vip_status === "monthly") return Math.floor(baseCP * 0.7);
    if (profile?.vip_status === "weekly") return Math.floor(baseCP * 0.85);
    return baseCP;
  };

  const handleEntry = async (challenge: ChallengeItem, fee: number) => {
    if (!profile) return;
    if (profile.jetons_cp < fee) return alert("Pas assez de CP");
    setEntryLoading(challenge.id);

    try {
      await supabase
        .from("profiles")
        .update({ jetons_cp: profile.jetons_cp - fee })
        .eq("id", profile.id);

      await supabase.from("challenge_attempts").upsert(
        {
          challenge_id: challenge.id,
          user_id: profile.id,
          last_attempt_at: new Date().toISOString(),
        },
        { onConflict: "challenge_id,user_id" }
      );

      const routes: Record<ChallengeItem['game_type'], string> = {
        quiz: "quiz",
        biometric: "biometric-hack",
        vault: "laser-vault",
      };
      router.push(`/client/${routes[challenge.game_type]}?challengeId=${challenge.id}`);
    } catch (err: unknown) {
      alert(`Erreur: ${err instanceof Error ? err.message : 'Inconnue'}`);
      setEntryLoading(null);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );

  return (
    <>
      {showInterstitial && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black p-4">
          <div className="w-full max-w-md">
            <ExoOutstream />
          </div>

          {canCloseInterstitial && (
            <button
              onClick={() => {
                setShowInterstitial(false);
                setShowAdsterraNativeBanner(true);
              }}
              className="mt-8 rounded-2xl bg-emerald-500 px-8 py-4 text-lg font-bold text-black shadow-[0_0_20px_rgba(16,185,129,0.5)] animate-pulse"
            >
              ACCÉDER À L’APPLICATION
            </button>
          )}
        </div>
      )}

      <div className="min-h-screen overflow-x-hidden bg-[#020617] pb-28 text-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-6 flex items-center gap-3">
            <button
              onClick={() => router.push("/client/home")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Arenas premium</p>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Missions <span className="text-emerald-500">& défis</span>
              </h1>
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-slate-900/70 to-slate-950 p-5 shadow-[0_20px_60px_rgba(16,185,129,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Solde CP</p>
                  <p className="mt-2 text-3xl font-black text-emerald-300">{profile?.jetons_cp?.toLocaleString()} CP</p>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                  <Coins size={22} />
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Réduction VIP</p>
                  <p className="mt-2 text-lg font-black text-white">{profile?.vip_status === "monthly" ? "30%" : profile?.vip_status === "weekly" ? "15%" : "0%"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Mode entrée</p>
                  <p className="mt-2 text-lg font-black text-white">Rapide & fluide</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5">
              <div className="flex items-center gap-2 text-emerald-300">
                <Sparkles size={18} />
                <p className="text-[10px] uppercase tracking-[0.35em]">Pourquoi c’est premium</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-300">
                <li>• Rejoignez un défi avec une entrée ajustée selon votre statut VIP.</li>
                <li>• Suivez votre score et votre position en temps réel.</li>
                <li>• Accédez à des jackpots plus attractifs sans changer votre logique métier.</li>
              </ul>
            </div>
          </section>

          <div className="mt-6 space-y-4">
            {challenges.map((ch) => {
              const fee = calculateEntryFeeCP(ch.entry_fee_cp_base);
              const participants = ch.challenge_attempts?.length || 0;
              const myScore =
                ch.challenge_attempts?.find((a: ChallengeAttempt) => a.user_id === profile?.id)?.total_score || 0;

              return (
                <motion.div
                  key={ch.id}
                  className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-emerald-200">
                        <Sparkles size={14} />
                        {ch.game_type}
                      </div>
                      <h3 className="mt-3 text-lg font-black tracking-tight text-white">{ch.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Participez, accumulez des points et tentez le jackpot CP.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Jackpot</p>
                      <p className="mt-1 text-xl font-black text-emerald-400">{ch.prize_pool_cp} CP</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Participants</p>
                      <p className="mt-2 text-lg font-black text-white">{participants}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Votre score</p>
                      <p className="mt-2 text-lg font-black text-white">{myScore}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Entrée</p>
                      <p className="mt-2 text-lg font-black text-white">{fee} CP</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEntry(ch, fee)}
                    disabled={(profile?.jetons_cp ?? 0) < fee || entryLoading === ch.id}
                    className="mt-5 w-full rounded-3xl bg-white px-5 py-4 font-black text-slate-950 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {entryLoading === ch.id ? <Loader2 className="mx-auto animate-spin" /> : `ENTRER (${fee} CP)`}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {showAdsterraNativeBanner && (
            <div className="mt-8 flex w-full flex-col items-center">
              <p className="mb-2 text-[9px] tracking-[0.3em] text-slate-600">SPONSOR</p>
              <div className="w-full max-w-87.5 overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-1">
                <AdsterraNativeBanner />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
