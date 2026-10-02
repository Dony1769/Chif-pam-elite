"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  Flame,
  Gem,
  Gift,
  LockKeyhole,
  Loader2,
  Minus,
  Sparkles,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAppFeedback } from "@/components/ui/AppFeedbackProvider";
import { RewardLevelUpModal } from "@/components/ui/RewardLevelUpModal";
import {
  getDailyReward,
  getXpRequiredForLevel,
} from "@/lib/game-economy";

const MAX_CP_REWARD = 50;

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
  level?: number;
};

type RewardMeta = {
  label: string;
  icon: LucideIcon;
  accent: string;
  softBg: string;
  border: string;
  glow: string;
};

type RewardModalState = {
  level: number;
  levelUp: boolean;
  diamondsRewarded: number;
  rewardAmount: number;
  rewardType: RewardType;
  currentXp: number;
  nextLevelXp: number;
} | null;

type ClaimResult = {
  success?: boolean;
  message?: string;
  new_cp?: number;
  new_diamonds?: number;
  new_xp?: number;
  new_level?: number;
  level_up?: boolean;
  diamonds_rewarded?: number;
  next_level_xp?: number;
};

const rewardTypeMeta: Record<RewardType, RewardMeta> = {
  cp: {
    label: "CP",
    icon: Coins,
    accent: "text-emerald-300",
    softBg: "bg-emerald-400/10",
    border: "border-emerald-300/20",
    glow: "shadow-emerald-500/10",
  },
  diamonds: {
    label: "Diamants",
    icon: Gem,
    accent: "text-sky-300",
    softBg: "bg-sky-400/10",
    border: "border-sky-300/20",
    glow: "shadow-sky-500/10",
  },
  xp: {
    label: "XP",
    icon: Star,
    accent: "text-amber-300",
    softBg: "bg-amber-400/10",
    border: "border-amber-300/20",
    glow: "shadow-amber-500/10",
  },
};

function clampCpReward(type: RewardType, amount: number): number {
  return type === "cp" ? Math.min(amount, MAX_CP_REWARD) : amount;
}

function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR");
}

function ResourceBadge({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div
      className={`group rounded-2xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1 ${tone}`}
    >
      <Icon
        size={17}
        strokeWidth={2}
        className="mb-2 transition-transform duration-200 group-hover:scale-110"
      />

      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-black tabular-nums text-white">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function NextBonusCountdown() {
  const [timeRemaining, setTimeRemaining] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const updateCountdown = () => {
      const now = new Date();

      const tomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );

      const diff = Math.max(0, tomorrow.getTime() - now.getTime());

      setTimeRemaining({
        hours: Math.floor((diff / 3_600_000) % 24),
        minutes: Math.floor((diff / 60_000) % 60),
        seconds: Math.floor((diff / 1_000) % 60),
      });

      /*
       * Aligne le premier tick sur le changement de seconde,
       * puis utilise un timeout récursif plutôt qu'un intervalle permanent.
       */
      const delay = 1000 - (Date.now() % 1000);

      timeoutId = setTimeout(updateCountdown, delay);
    };

    updateCountdown();

    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div className="inline-flex w-fit items-center gap-3 rounded-xl border border-amber-300/20 bg-slate-950/70 px-4 py-3 shadow-[0_0_30px_rgba(251,191,36,0.08)] backdrop-blur-xl">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10">
        <Clock3 size={15} strokeWidth={2.2} className="text-amber-300" />
      </span>

      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        Prochain bonus
      </span>

      <span className="font-mono text-sm font-black tabular-nums tracking-wider text-amber-200">
        {String(timeRemaining.hours).padStart(2, "0")}:
        {String(timeRemaining.minutes).padStart(2, "0")}:
        {String(timeRemaining.seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

function CalendarRewardCard({
  day,
  index,
  todayDayNumber,
  claimed,
  claiming,
  onClaim,
}: {
  day: RewardsConfigItem;
  index: number;
  todayDayNumber: number;
  claimed: boolean;
  claiming: boolean;
  onClaim: () => void;
}) {
  const isToday = day.day_number === todayDayNumber;
  const isLocked = day.day_number > todayDayNumber;
  const isMissed = !claimed && !isLocked && !isToday;

  const meta = rewardTypeMeta[day.reward_type] ?? rewardTypeMeta.cp;
  const RewardIcon = meta.icon;

  return (
    <article
      style={{ "--card-index": index } as React.CSSProperties}
      className={[
        "group relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-2xl border p-3.5",
        "transition-[transform,background-color,border-color,box-shadow,opacity] duration-200",
        "will-change-transform",
        claimed
          ? "border-emerald-300/15 bg-emerald-950/25 opacity-75"
          : isToday
            ? "border-amber-300/65 bg-slate-900 shadow-[0_0_34px_rgba(251,191,36,0.14)] ring-1 ring-amber-300/20"
            : "border-white/10 bg-slate-900/60 hover:-translate-y-1 hover:border-white/15 hover:bg-slate-900/80",
        isLocked ? "opacity-35 grayscale" : "",
      ].join(" ")}
    >
      {isToday && !claimed && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-amber-300/30" />
      )}

      {isToday && !claimed && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-amber-300/10 blur-2xl" />
      )}

      <div className="relative flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          Jour {day.day_number}
        </span>

        {claimed ? (
          <CheckCircle2
            size={16}
            strokeWidth={2}
            className="text-emerald-300"
          />
        ) : isLocked ? (
          <LockKeyhole
            size={15}
            strokeWidth={2}
            className="text-slate-600"
          />
        ) : (
          <Sparkles
            size={14}
            strokeWidth={2}
            className="text-amber-300"
          />
        )}
      </div>

      <div className="relative my-3 text-center">
        <div
          className={[
            "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border shadow-lg",
            "transition-transform duration-200 group-hover:scale-105",
            meta.softBg,
            meta.border,
            meta.glow,
          ].join(" ")}
        >
          <RewardIcon
            size={21}
            strokeWidth={2}
            className={meta.accent}
          />
        </div>

        <p className="mt-3 truncate text-[11px] font-bold text-white">
          {day.title}
        </p>

        <p className={`mt-1 text-sm font-black ${meta.accent}`}>
          +{formatNumber(day.reward_amount)} {meta.label}
        </p>
      </div>

      <div className="relative">
        {isToday && !claimed ? (
          <button
            type="button"
            onClick={onClaim}
            disabled={claiming}
            className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-300 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-[0_8px_20px_rgba(251,191,36,0.18)] transition-[transform,background-color,opacity] duration-150 hover:bg-amber-200 hover:shadow-[0_10px_24px_rgba(251,191,36,0.24)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          >
            {claiming ? (
              <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
            ) : (
              <Gift size={14} strokeWidth={2.2} />
            )}

            {claiming ? "Ouverture..." : "Réclamer le bonus"}
          </button>
        ) : (
          <div
            className={[
              "flex min-h-9 items-center justify-center gap-1 py-2 text-[10px] font-black uppercase tracking-wide",
              claimed ? "text-emerald-300" : "text-slate-600",
            ].join(" ")}
          >
            {claimed ? (
              <>
                <Check size={13} strokeWidth={2.5} />
                Réclamé
              </>
            ) : isLocked ? (
              <>
                <LockKeyhole size={12} strokeWidth={2.2} />
                Verrouillé
              </>
            ) : isMissed ? (
              <>
                <Minus size={12} strokeWidth={2.2} />
                Manqué
              </>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

export default function RewardsPage() {
  const { notify } = useAppFeedback();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfigItem[]>([]);
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [rewardModal, setRewardModal] =
    useState<RewardModalState>(null);

  const currentDate = useMemo(() => new Date(), []);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const todayDayNumber = currentDate.getDate();

  const daysInMonth = useMemo(
    () => new Date(currentYear, currentMonth + 1, 0).getDate(),
    [currentYear, currentMonth],
  );

  const monthLabel = useMemo(
    () =>
      currentDate.toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
    [currentDate],
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

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

      if (profRes.error) {
        throw profRes.error;
      }

      const profileData = profRes.data;

      setProfile(profileData ?? null);

      const configItems: RewardsConfigItem[] = rewRes.data?.length
        ? rewRes.data.map((item) => {
            const rewardType = item.reward_type as RewardType;

            return {
              day_number: Number(item.day_number),
              title: String(item.title ?? `Bonus Jour ${item.day_number}`),
              reward_amount: clampCpReward(
                rewardType,
                Number(item.reward_amount ?? 0),
              ),
              reward_type: rewardType,
            };
          })
        : Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;

            const reward = getDailyReward(day, 1) ?? {
              rewardType: "cp",
              rewardAmount: 10,
            };

            const rewardType =
              (reward.rewardType as RewardType) || "cp";

            return {
              day_number: day,
              title: `Bonus Jour ${day}`,
              reward_amount: clampCpReward(
                rewardType,
                Number(reward.rewardAmount ?? 0),
              ),
              reward_type: rewardType,
            };
          });

      setRewardsConfig(configItems);

      const startOfMonth = new Date(
        currentYear,
        currentMonth,
        1,
      ).toISOString();

      const endOfMonth = new Date(
        currentYear,
        currentMonth + 1,
        0,
        23,
        59,
        59,
      ).toISOString();

      const { data: claims, error: claimsError } = await supabase
        .from("user_calendar_claims")
        .select("day_number")
        .eq("user_id", user.id)
        .gte("claim_date", startOfMonth)
        .lte("claim_date", endOfMonth);

      if (claimsError) {
        throw claimsError;
      }

      setClaimedDays(
        claims?.map((claim: { day_number: number }) =>
          Number(claim.day_number),
        ) ?? [],
      );
    } catch (error) {
      console.error("Erreur de chargement :", error);

      notify(
        "Impossible de charger les récompenses.",
        "danger",
      );
    } finally {
      setLoading(false);
    }
  }, [
    currentMonth,
    currentYear,
    daysInMonth,
    notify,
    router,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const claimedSet = useMemo(
    () => new Set(claimedDays),
    [claimedDays],
  );

  const currentStreak = useMemo(() => {
    if (claimedDays.length === 0) {
      return 0;
    }

    let streak = 0;

    let day = claimedSet.has(todayDayNumber)
      ? todayDayNumber
      : todayDayNumber - 1;

    while (day >= 1 && claimedSet.has(day)) {
      streak += 1;
      day -= 1;
    }

    return streak;
  }, [claimedDays.length, claimedSet, todayDayNumber]);

  const todaysReward = useMemo(
    () =>
      rewardsConfig.find(
        (day) => day.day_number === todayDayNumber,
      ),
    [rewardsConfig, todayDayNumber],
  );

  const treasureCaption = todaysReward
    ? `Aujourd'hui : +${todaysReward.reward_amount} ${
        rewardTypeMeta[todaysReward.reward_type]?.label ?? "CP"
      }`
    : "Artefact du jour";

  const progressPercentage = useMemo(
    () =>
      daysInMonth > 0
        ? Math.min(
            100,
            (claimedDays.length / daysInMonth) * 100,
          )
        : 0,
    [claimedDays.length, daysInMonth],
  );

  const handleClaimDaily = useCallback(async () => {
    if (
      !profile ||
      claiming ||
      claimedSet.has(todayDayNumber)
    ) {
      return;
    }

    setClaiming(true);

    try {
      const rawReward = getDailyReward(todayDayNumber, 1);

      const rewardType =
        (rawReward?.rewardType || "cp") as RewardType;

      const rewardAmount = clampCpReward(
        rewardType,
        Number(rawReward?.rewardAmount || 0),
      );

      const { data, error } = await supabase.rpc(
        "claim_calendar_reward",
        {
          p_user_id: profile.id,
        },
      );

      if (error) {
        throw error;
      }

      const result = data as ClaimResult | null;

      if (!result?.success) {
        notify(
          result?.message ??
            "Impossible de réclamer le bonus.",
          "danger",
        );
        return;
      }

      const currentXp = Number(
        result.new_xp ?? profile.xp ?? 0,
      );

      const newLevel = Number(
        result.new_level ?? profile.level ?? 1,
      );

      setProfile((previous) =>
        previous
          ? {
              ...previous,
              jetons_cp: Number(
                result.new_cp ??
                  previous.jetons_cp ??
                  0,
              ),
              diamonds: Number(
                result.new_diamonds ??
                  previous.diamonds ??
                  0,
              ),
              xp: currentXp,
              level: newLevel,
            }
          : previous,
      );

      setClaimedDays((previous) =>
        previous.includes(todayDayNumber)
          ? previous
          : [...previous, todayDayNumber],
      );

      setRewardModal({
        level: newLevel,
        levelUp: Boolean(result.level_up),
        diamondsRewarded: Number(
          result.diamonds_rewarded ?? 0,
        ),
        rewardAmount,
        rewardType,
        currentXp,
        nextLevelXp: Number(
          result.next_level_xp ??
            getXpRequiredForLevel(newLevel + 1),
        ),
      });
    } catch (error) {
      console.error("Erreur lors de la réclamation :", error);

      notify(
        `Erreur : ${
          error instanceof Error
            ? error.message
            : "Erreur inconnue"
        }`,
        "danger",
      );
    } finally {
      setClaiming(false);
    }
  }, [
    claimedSet,
    claiming,
    notify,
    profile,
    todayDayNumber,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-300">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center gap-5">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/5 shadow-[0_0_50px_rgba(16,185,129,0.12)]">
            <div className="absolute inset-0 rounded-2xl border border-emerald-300/10 animate-pulse" />

            <Loader2
              size={28}
              strokeWidth={2}
              className="animate-spin text-emerald-400"
            />
          </div>

          <p className="text-center text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
            Chargement des récompenses...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 pb-28 text-slate-100">
      <RewardLevelUpModal
        open={Boolean(rewardModal)}
        level={rewardModal?.level ?? 1}
        levelUp={rewardModal?.levelUp ?? false}
        diamondsRewarded={
          rewardModal?.diamondsRewarded ?? 0
        }
        rewardAmount={rewardModal?.rewardAmount ?? 0}
        rewardType={rewardModal?.rewardType ?? "cp"}
        currentXp={rewardModal?.currentXp ?? 0}
        nextLevelXp={rewardModal?.nextLevelXp ?? 1000}
        onClose={() => setRewardModal(null)}
      />

      {/* Atmosphère globale — uniquement CSS, aucun canvas/WebGL */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/[0.08] blur-3xl" />
        <div className="absolute right-[-12rem] top-24 h-96 w-96 rounded-full bg-amber-500/[0.06] blur-3xl" />
        <div className="absolute bottom-[-14rem] left-1/3 h-96 w-96 rounded-full bg-sky-500/[0.035] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300/15 bg-gradient-to-br from-amber-500/[0.09] via-emerald-500/[0.045] to-transparent p-5 shadow-[0_28px_100px_rgba(16,185,129,0.10)] sm:p-8">
          <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-amber-300/[0.08] blur-3xl" />

          <div className="pointer-events-none absolute bottom-0 left-1/3 h-px w-1/3 bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-amber-200">
                <Trophy
                  size={14}
                  strokeWidth={2}
                />
                Récompenses quotidiennes
              </div>

              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300/70">
                  ChifPam • Progression
                </p>

                <h1 className="max-w-2xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.04em] text-white sm:text-6xl">
                  Calendrier
                  <span className="block bg-gradient-to-r from-white via-emerald-100 to-amber-200 bg-clip-text text-transparent">
                    de récompenses
                  </span>
                </h1>
              </div>

              <p className="max-w-lg text-sm leading-6 text-slate-400">
                Chaque jour ouvre une nouvelle chance de
                renforcer votre progression.{" "}
                <span className="capitalize text-slate-300">
                  {monthLabel}
                </span>
              </p>

              <NextBonusCountdown />

              <div className="grid max-w-lg grid-cols-3 gap-2">
                <ResourceBadge
                  label="CP"
                  value={profile?.jetons_cp ?? 0}
                  icon={Coins}
                  tone="text-emerald-300"
                />

                <ResourceBadge
                  label="Diamants"
                  value={profile?.diamonds ?? 0}
                  icon={Gem}
                  tone="text-sky-300"
                />

                <ResourceBadge
                  label="XP"
                  value={profile?.xp ?? 0}
                  icon={Star}
                  tone="text-amber-300"
                />
              </div>
            </div>

            {/* Remplacement de la 3D par un panneau premium léger */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute inset-8 rounded-full bg-emerald-400/[0.08] blur-3xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 p-5 shadow-2xl backdrop-blur-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/[0.08] via-transparent to-amber-300/[0.06]" />

                <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                      Artefact du jour
                    </p>

                    <p className="mt-1 text-sm font-black text-white">
                      Récompense disponible
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10">
                    <Gift
                      size={18}
                      strokeWidth={2}
                      className="text-amber-300"
                    />
                  </div>
                </div>

                <div className="relative flex min-h-48 items-center justify-center py-7">
                  <div className="absolute h-32 w-32 rounded-full border border-emerald-300/10 bg-emerald-300/[0.03] shadow-[0_0_70px_rgba(16,185,129,0.12)]" />

                  <div className="relative flex h-28 w-28 rotate-3 items-center justify-center rounded-[2rem] border border-emerald-300/25 bg-gradient-to-br from-emerald-400/20 via-slate-900 to-amber-300/10 shadow-[0_20px_60px_rgba(16,185,129,0.15)] transition-transform duration-300 hover:rotate-0 hover:scale-105">
                    <div className="absolute inset-2 rounded-[1.5rem] border border-white/10" />

                    <div className="text-center">
                      <Sparkles
                        size={27}
                        strokeWidth={1.8}
                        className="mx-auto text-emerald-300"
                      />

                      <p className="mt-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Bonus
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    {treasureCaption}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CALENDAR HEADER */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-5"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-300">
                  <CalendarDays
                    size={19}
                    strokeWidth={2}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-white">
                    Le calendrier
                  </h2>

                  <p className="text-xs capitalize text-slate-500">
                    {monthLabel}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.07] px-3 py-2 text-xs font-bold text-amber-200">
                  <Flame
                    size={14}
                    strokeWidth={2}
                  />
                  Série en cours : {currentStreak} jour
                  {currentStreak > 1 ? "s" : ""}
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-2 text-xs font-bold text-emerald-200">
                  <Zap
                    size={14}
                    strokeWidth={2}
                  />
                  {claimedDays.length} réclamé
                  {claimedDays.length > 1 ? "s" : ""} ce
                  mois-ci
                </div>
              </div>
            </div>

            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.045]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-300 transition-[width] duration-500"
                style={{
                  width: `${progressPercentage}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
              <span>Progression mensuelle</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
          </div>

          {/* CALENDAR */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {rewardsConfig.map((day, index) => (
              <CalendarRewardCard
                key={day.day_number}
                day={day}
                index={index}
                todayDayNumber={todayDayNumber}
                claimed={claimedSet.has(day.day_number)}
                claiming={
                  claiming &&
                  day.day_number === todayDayNumber
                }
                onClaim={() => {
                  void handleClaimDaily();
                }}
              />
            ))}
          </div>
        </motion.section>

        {/* FOOTER */}
        <div className="flex items-center justify-center gap-2 border-t border-white/[0.05] pt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
          <Award
            size={14}
            strokeWidth={2}
          />
          Revenez demain pour poursuivre votre série
        </div>
      </div>
    </main>
  );
}
