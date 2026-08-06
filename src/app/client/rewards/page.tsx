"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Star,
  Coins,
  Gem,
  Loader2,
  Sparkles,
  Clock,
  Flame,
  Gift,
  Lock,
  Award,
} from "lucide-react";
import { getDailyReward } from "@/lib/game-economy";
import { motion } from "framer-motion";

// --- CONSTANTES ET REGLES ECONMIQUES ---
const MAX_CP_REWARD = 50;

// --- TYPES ---
type RewardType = "cp" | "diamonds" | "xp";

type RewardsConfigItem = {
  day_number: number;
  title: string;
  reward_amount: number;
  reward_type: RewardType;
};

type ProfileData = {
  id: string;
  username?: string | null;
  jetons_cp?: number;
  diamonds?: number;
  xp?: number;
};

// --- METADATA CONFIG ---
const rewardTypeMeta: Record<
  RewardType,
  { label: string; icon: React.ElementType; color: string; badge: string }
> = {
  cp: {
    label: "CP",
    icon: Coins,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  diamonds: {
    label: "Diamants",
    icon: Gem,
    color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    badge: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  },
  xp: {
    label: "XP",
    icon: Star,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
};

function clampCpReward(type: RewardType, amount: number): number {
  if (type === "cp") {
    return Math.min(amount, MAX_CP_REWARD);
  }
  return amount;
}

export default function RewardsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfigItem[]>([]);
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const router = useRouter();

  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDayNumber = currentDate.getDate();

  // Compte à rebours minuit
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = Math.max(0, tomorrow.getTime() - now.getTime());

      setTimeRemaining({
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Chargement des données + Génération de secours si BDD vide
  const fetchData = useCallback(async () => {
    try {
      const response = await supabase.auth.getUser();
      const user = response.data?.user;
      if (!user) {
        router.push("/connexion");
        return;
      }

      const [profRes, rewRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, jetons_cp, diamonds, xp")
          .eq("id", user.id)
          .single(),
        supabase
          .from("daily_rewards_config")
          .select("*")
          .lte("day_number", daysInMonth)
          .order("day_number", { ascending: true }),
      ]);

      setProfile(profRes.data ?? null);

      let configItems: RewardsConfigItem[] = [];

      if (rewRes.data && rewRes.data.length > 0) {
        configItems = rewRes.data.map((item) => ({
          ...item,
          reward_amount: clampCpReward(item.reward_type, item.reward_amount),
        }));
      } else {
        // FALLBACK : Si la BDD est vide, on génère automatiquement le calendrier localement
        configItems = Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const reward = getDailyReward(day, 1) || { rewardType: "cp", rewardAmount: 10 };
          return {
            day_number: day,
            title: `Bonus Jour ${day}`,
            reward_amount: clampCpReward(reward.rewardType as RewardType, reward.rewardAmount),
            reward_type: (reward.rewardType as RewardType) || "cp",
          };
        });
      }

      setRewardsConfig(configItems);

      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

      const { data: claims } = await supabase
        .from("user_calendar_claims")
        .select("day_number")
        .eq("user_id", user.id)
        .gte("claim_date", startOfMonth)
        .lte("claim_date", endOfMonth);

      if (claims) {
        setClaimedDays(claims.map((c: { day_number: number }) => c.day_number));
      }
    } catch (error) {
      console.error("Erreur de chargement :", error);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, daysInMonth, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const playRewardSound = () => {
    try {
      new Audio("https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3").play().catch(() => {});
    } catch {}
  };

  const handleClaimDaily = async () => {
    if (!profile || claiming || claimedDays.includes(todayDayNumber)) return;
    setClaiming(true);

    try {
      const rawReward = getDailyReward(todayDayNumber, 1);
      const rewardType = (rawReward?.rewardType || "cp") as RewardType;
      const rawAmount = rawReward?.rewardAmount || 0;
      const rewardAmount = clampCpReward(rewardType, rawAmount);

      const { data, error } = await supabase.rpc("claim_calendar_reward", {
        p_user_id: profile.id,
      });

      if (error) throw error;

      if (!data?.success) {
        alert(data?.message ?? "Impossible de réclamer le bonus.");
      } else {
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            jetons_cp: rewardType === "cp" ? (prev.jetons_cp || 0) + rewardAmount : prev.jetons_cp,
            diamonds: rewardType === "diamonds" ? (prev.diamonds || 0) + rewardAmount : prev.diamonds,
            xp: rewardType === "xp" ? (prev.xp || 0) + rewardAmount : prev.xp,
          };
        });

        setClaimedDays((prev) => [...prev, todayDayNumber]);
        playRewardSound();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      alert("Erreur: " + message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 p-6 text-slate-300">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
          <p className="text-center text-xs uppercase tracking-[0.35em] text-slate-500">
            Chargement des Récompenses...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-slate-100 font-sans">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        
        {/* BANNIERE */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 shadow-2xl">
          <div className="relative grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Sparkles size={14} className="animate-pulse" /> Récompense Quotidienne
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Bonus de Connexion
              </h1>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 backdrop-blur-md">
                <Clock size={16} className="text-amber-400 animate-spin" />
                <span>Prochain bonus dans :</span>
                <span className="font-mono font-bold text-amber-300">
                  {String(timeRemaining.hours).padStart(2, "0")}h{" "}
                  {String(timeRemaining.minutes).padStart(2, "0")}m{" "}
                  {String(timeRemaining.seconds).padStart(2, "0")}s
                </span>
              </div>
            </div>

            {/* Ressources */}
            <div className="lg:col-span-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <Coins size={20} className="mx-auto text-emerald-300 mb-2" />
                <p className="text-[10px] font-bold text-slate-400">CP</p>
                <p className="text-xl font-black text-white">{profile?.jetons_cp ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-center">
                <Gem size={20} className="mx-auto text-sky-300 mb-2" />
                <p className="text-[10px] font-bold text-slate-400">Diamants</p>
                <p className="text-xl font-black text-white">{profile?.diamonds ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                <Star size={20} className="mx-auto text-amber-300 mb-2" />
                <p className="text-[10px] font-bold text-slate-400">XP</p>
                <p className="text-xl font-black text-white">{profile?.xp ?? 0}</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION CALENDRIER */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Gift className="text-emerald-400" size={20} /> Calendrier des Récompenses
            </h2>
            <div className="text-xs text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              Série : <strong className="text-amber-300">{claimedDays.length} jour(s)</strong>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {rewardsConfig.map((day) => {
              const isToday = day.day_number === todayDayNumber;
              const isClaimed = claimedDays.includes(day.day_number);
              const isLocked = day.day_number > todayDayNumber;
              const rewardMeta = rewardTypeMeta[day.reward_type] || rewardTypeMeta.cp;
              const RewardIcon = rewardMeta.icon;

              return (
                <div
                  key={day.day_number}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 ${
                    isClaimed
                      ? "border-emerald-500/20 bg-emerald-950/20"
                      : isToday
                      ? "border-amber-400/60 bg-slate-900 ring-2 ring-amber-400/30"
                      : "border-white/10 bg-slate-900/60"
                  } ${isLocked ? "opacity-40 bg-slate-950" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      Jour {day.day_number}
                    </span>
                    {isClaimed ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : isLocked ? (
                      <Lock size={14} className="text-slate-500" />
                    ) : null}
                  </div>

                  <div className="my-4 text-center space-y-1">
                    <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border ${rewardMeta.color}`}>
                      <RewardIcon size={20} />
                    </div>
                    <p className="text-xs font-bold text-white">{day.title}</p>
                    <p className="text-sm font-black text-amber-300">
                      +{day.reward_amount} {rewardMeta.label}
                    </p>
                  </div>

                  {isToday && !isClaimed ? (
                    <button
                      onClick={handleClaimDaily}
                      disabled={claiming}
                      className="w-full rounded-xl bg-amber-400 py-2 text-xs font-black uppercase text-slate-950"
                    >
                      {claiming ? <Loader2 size={14} className="mx-auto animate-spin" /> : "Réclamer"}
                    </button>
                  ) : (
                    <div className="text-center text-[10px] font-bold uppercase text-slate-500 py-1">
                      {isClaimed ? "Réclamé" : isLocked ? "Verrouillé" : "Manqué"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>

      </div>
    </main>
  );
}
