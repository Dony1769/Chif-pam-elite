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
  ExternalLink,
  Award,
} from "lucide-react";
import { getDailyReward } from "@/lib/game-economy";
import { motion } from "framer-motion";

// --- CONSTANTES ET REGLES ECONOMIQUES ---
const MAX_CP_REWARD = 50; // Plafond strict pour les gains en CP
const DIRECT_LINK_URL = "https://omg10.com/4/11431323";
const SPONSOR_XP_REWARD = 15; // Quantité d'XP attribuée par visite sponsorisée
const SPONSOR_WAIT_TIME = 8; // Temps d'attente requis en secondes

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

/**
 * Sécurité économique : Plafonne la récompense CP à 50 maximum.
 */
function clampCpReward(type: RewardType, amount: number): number {
  if (type === "cp") {
    return Math.min(amount, MAX_CP_REWARD);
  }
  return amount;
}

export default function RewardsPage() {
  // --- ETATS DE LA PAGE ---
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfigItem[]>([]);
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // --- ETATS DU SPONSOR (DIRECT LINK & XP TIMER) ---
  const [isSponsorActive, setIsSponsorActive] = useState(false);
  const [sponsorTimer, setSponsorTimer] = useState(SPONSOR_WAIT_TIME);
  const [canClaimSponsorXp, setCanClaimSponsorXp] = useState(false);
  const [claimingXp, setClaimingXp] = useState(false);

  const router = useRouter();

  // --- CALCUL DES DATES ---
  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDayNumber = currentDate.getDate();

  // --- COMPTE A REBOURS JUSQU'A MINUIT ---
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      const diff = tomorrow.getTime() - now.getTime();

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeRemaining({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- GESTION DU TIMER SPONSOR (8 SECONDES) ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isSponsorActive && sponsorTimer > 0) {
      interval = setInterval(() => {
        setSponsorTimer((prev) => prev - 1);
      }, 1000);
    } else if (isSponsorActive && sponsorTimer === 0) {
      setCanClaimSponsorXp(true);
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSponsorActive, sponsorTimer]);

  // --- CHARGEMENT DES DONNEES ---
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

      const sanitizedConfig: RewardsConfigItem[] = (rewRes.data ?? []).map(
        (item) => ({
          ...item,
          reward_amount: clampCpReward(item.reward_type, item.reward_amount),
        })
      );
      setRewardsConfig(sanitizedConfig);

      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(
        currentYear,
        currentMonth + 1,
        0
      ).toISOString();

      const { data: claims } = await supabase
        .from("user_calendar_claims")
        .select("day_number")
        .eq("user_id", user.id)
        .gte("claim_date", startOfMonth)
        .lte("claim_date", endOfMonth);

      if (claims)
        setClaimedDays(claims.map((c: { day_number: number }) => c.day_number));
    } catch (error) {
      console.error("Erreur lors du chargement :", error);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, daysInMonth, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- EFFET SONORE ---
  const playRewardSound = () => {
    new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"
    )
      .play()
      .catch(() => {});
  };

  // --- ACTION : CLIC SUR LE LIEN SPONSOR ---
  const handleOpenSponsorLink = () => {
    // 1. Ouvrir le lien sponsorisé dans un nouvel onglet
    window.open(DIRECT_LINK_URL, "_blank", "noopener,noreferrer");

    // 2. Démarrer le décompte de 8 secondes sur la page
    setIsSponsorActive(true);
    setSponsorTimer(SPONSOR_WAIT_TIME);
    setCanClaimSponsorXp(false);
  };

  // --- ACTION : VALIDER L'XP DU SPONSOR ---
  const handleClaimSponsorXp = async () => {
    if (!profile || !canClaimSponsorXp || claimingXp) return;
    setClaimingXp(true);

    try {
      const newXpAmount = (profile.xp || 0) + SPONSOR_XP_REWARD;

      // Mise à jour de l'XP dans la base de données Supabase
      const { error } = await supabase
        .from("profiles")
        .update({ xp: newXpAmount })
        .eq("id", profile.id);

      if (error) throw error;

      // Mise à jour locale
      setProfile((prev) => (prev ? { ...prev, xp: newXpAmount } : prev));
      playRewardSound();

      // Réinitialisation de l'état du sponsor
      setIsSponsorActive(false);
      setCanClaimSponsorXp(false);
      setSponsorTimer(SPONSOR_WAIT_TIME);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      alert("Erreur lors de la validation de l'XP : " + message);
    } finally {
      setClaimingXp(false);
    }
  };

  // --- ACTION : RECLAMER LE BONUS QUOTIDIEN ---
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
            jetons_cp:
              rewardType === "cp"
                ? (prev.jetons_cp || 0) + rewardAmount
                : prev.jetons_cp,
            diamonds:
              rewardType === "diamonds"
                ? (prev.diamonds || 0) + rewardAmount
                : prev.diamonds,
            xp:
              rewardType === "xp"
                ? (prev.xp || 0) + rewardAmount
                : prev.xp,
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
        
        {/* === BANNIERE PRINCIPALE & RESSOURCES === */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Sparkles size={14} className="animate-pulse" /> Récompense Quotidienne
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Bonus de Connexion
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                Revenez chaque jour pour récupérer vos jetons CP, Diamants et XP. Maintenez votre série active pour débloquer le maximum de récompenses !
              </p>

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

            {/* Solde des ressources */}
            <div className="lg:col-span-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center backdrop-blur-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 mb-2">
                  <Coins size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  CP
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {profile?.jetons_cp?.toLocaleString() ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-center backdrop-blur-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 mb-2">
                  <Gem size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Diamants
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {profile?.diamonds?.toLocaleString() ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center backdrop-blur-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 mb-2">
                  <Star size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  XP
                </p>
                <p className="mt-1 text-xl font-black text-white">
                  {profile?.xp?.toLocaleString() ?? 0}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* === SECTION SPONSORING & XP BONUS (DIRECT LINK) === */}
        <section className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-950 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Award size={18} /> Bonus d&apos;Expérience Extra
              </div>
              <h2 className="text-xl font-black text-white">
                Visitez notre partenaire et gagnez +{SPONSOR_XP_REWARD} XP !
              </h2>
              <p className="text-xs text-slate-400 max-w-lg">
                Ouvrez le lien sponsorisé, restez au moins 8 secondes sur la page, puis revenez valider vos points XP.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 w-full md:w-auto">
              {!isSponsorActive ? (
                <button
                  onClick={handleOpenSponsorLink}
                  className="w-full md:w-auto flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-amber-300 active:scale-95"
                >
                  <span>Visiter le sponsor (+{SPONSOR_XP_REWARD} XP)</span>
                  <ExternalLink size={16} />
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2 w-full">
                  {!canClaimSponsorXp ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-xs font-bold text-amber-300">
                      <Clock size={16} className="animate-spin" />
                      <span>Patientez {sponsorTimer} sec...</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleClaimSponsorXp}
                      disabled={claimingXp}
                      className="w-full md:w-auto flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg transition hover:bg-emerald-300 active:scale-95 disabled:opacity-50"
                    >
                      {claimingXp ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Réclamer mes +{SPONSOR_XP_REWARD} XP</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* === SECTION CALENDRIER DU MOIS === */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Gift className="text-emerald-400" size={20} /> Calendrier des Récompenses
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Validez votre présence chaque jour du mois.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 w-fit">
              <Flame size={16} className="text-amber-400" />
              <span>
                Série actuelle :{" "}
                <strong className="text-amber-300">
                  {claimedDays.length} jour(s)
                </strong>
              </span>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {rewardsConfig.map((day) => {
              const isToday = day.day_number === todayDayNumber;
              const isClaimed = claimedDays.includes(day.day_number);
              const isLocked = day.day_number > todayDayNumber;

              const rewardMeta =
                rewardTypeMeta[day.reward_type] || rewardTypeMeta.cp;
              const RewardIcon = rewardMeta.icon;

              return (
                <div
                  key={day.day_number}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                    isClaimed
                      ? "border-emerald-500/20 bg-emerald-950/20 opacity-75"
                      : isToday
                      ? "border-amber-400/60 bg-gradient-to-b from-amber-500/10 to-slate-900 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/30"
                      : "border-white/10 bg-slate-900/60 hover:border-white/20"
                  } ${isLocked ? "opacity-40 bg-slate-950" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Jour {day.day_number}
                    </span>
                    {isClaimed ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : isLocked ? (
                      <Lock size={14} className="text-slate-500" />
                    ) : isToday ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 animate-pulse">
                        Aujourd'hui
                      </span>
                    ) : null}
                  </div>

                  <div className="my-4 text-center space-y-1">
                    <div
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border ${rewardMeta.color}`}
                    >
                      <RewardIcon size={20} />
                    </div>
                    <p className="text-xs font-bold text-white line-clamp-1">
                      {day.title}
                    </p>
                    <p className="text-sm font-black text-amber-300">
                      +{day.reward_amount} {rewardMeta.label}
                    </p>
                  </div>

                  {isToday && !isClaimed ? (
                    <button
                      onClick={handleClaimDaily}
                      disabled={claiming}
                      className="w-full rounded-xl bg-amber-400 py-2 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md transition hover:bg-amber-300 active:scale-95 disabled:opacity-50"
                    >
                      {claiming ? (
                        <Loader2 size={14} className="mx-auto animate-spin" />
                      ) : (
                        "Réclamer"
                      )}
                    </button>
                  ) : (
                    <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 py-1">
                      {isClaimed ? "Réclamé" : isLocked ? "Verrouillé" : "Manqué"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* === CONSEILS UTILISATEUR === */}
        <div className="rounded-3xl border border-emerald-500/20 bg-slate-900/60 p-6 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <CalendarIcon size={16} /> Règle de Récompense
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Connectez-vous tous les jours pour maximiser vos gains en CP (limités à 50 CP par jour), Diamants et XP !
          </p>
        </div>

      </div>
    </main>
  );
}
