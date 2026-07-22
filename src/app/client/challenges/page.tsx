// client/challenges/page.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, ChevronLeft, Coins } from "lucide-react";
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
      {/* 🔥 INTERSTITIAL (Apparait au dessus de tout) */}
      {showInterstitial && (
        <div className="fixed inset-0 bg-black z-9999 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
             <ExoOutstream />
          </div>

          {canCloseInterstitial && (
            <button
              onClick={() => {
                setShowInterstitial(false);
                setShowAdsterraNativeBanner(true); // Active la pub du bas une fois l'interstitiel fermé
              }}
              className="mt-8 bg-emerald-500 text-black px-8 py-4 rounded-2xl text-lg font-bold animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.5)]"
            >
              ACCÉDER À L’APPLICATION
            </button>
          )}
        </div>
      )}

      {/* 🌟 CONTENU PRINCIPAL */}
      <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase pb-32 overflow-x-hidden">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/client/home")}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-4xl tracking-tighter">
            ARENA <span className="text-emerald-500">MISSIONS</span>
          </h1>
        </div>

        {/* Solde Card */}
        <div className="flex justify-between items-center mb-10 bg-white/5 p-5 rounded-4xl border border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <Coins size={20} />
            </div>
            <div>
              <p className="text-[8px] text-slate-500 tracking-widest">SOLDE CP</p>
              <p className="text-xl text-emerald-500">{profile?.jetons_cp?.toLocaleString()} CP</p>
            </div>
          </div>
        </div>

        {/* Liste des Défis */}
        <div className="space-y-6">
          {challenges.map((ch) => {
            const fee = calculateEntryFeeCP(ch.entry_fee_cp_base);
            const participants = ch.challenge_attempts?.length || 0;
            const myScore =
              ch.challenge_attempts?.find((a: ChallengeAttempt) => a.user_id === profile?.id)?.total_score || 0;

            return (
              <motion.div key={ch.id} className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 shadow-lg">
                <div className="flex justify-between mb-6">
                  <div>
                    <h3 className="text-lg">{ch.title}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {participants} PARTICIPANTS | SCORE: {myScore}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl text-emerald-500">{ch.prize_pool_cp} CP</p>
                  </div>
                </div>
                <button
                  onClick={() => handleEntry(ch, fee)}
                  disabled={(profile?.jetons_cp ?? 0) < fee || entryLoading === ch.id}
                  className="w-full py-5 bg-white text-black rounded-3xl font-black disabled:opacity-30 active:scale-95 transition-all"
                >
                  {entryLoading === ch.id ? <Loader2 className="animate-spin mx-auto" /> : `ENTRER (${fee} CP)`}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* 💵 ZONE PUBLICITÉ RENTABLE (En bas de page) */}
        {showAdsterraNativeBanner && (
          <div className="mt-10 mb-6 w-full flex flex-col items-center animate-in slide-in-from-bottom-10 fade-in duration-700">
            <p className="text-[9px] text-slate-600 mb-2 tracking-[0.3em]">SPONSOR</p>
            {/* Conteneur Responsive qui évite le débordement horizontal */}
            <div className="w-full max-w-87.5 overflow-hidden rounded-2xl bg-black/20 border border-white/5 p-1">
               <AdsterraNativeBanner />
            </div>
          </div>
        )}

      </div>
    </>
  );
}
