"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
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

type RewardIconComponent = ComponentType<{
  size?: number;
  className?: string;
}>;

type RewardMeta = {
  label: string;
  icon: RewardIconComponent;
  accent: string;
  iconShell: string;
  badge: string;
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

type ClaimRpcResult = {
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
    iconShell:
      "border-emerald-300/25 bg-emerald-400/10 shadow-[0_0_28px_rgba(16,185,129,0.14)]",
    badge: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  },
  diamonds: {
    label: "Diamants",
    icon: Gem,
    accent: "text-sky-300",
    iconShell:
      "border-sky-300/25 bg-sky-400/10 shadow-[0_0_28px_rgba(56,189,248,0.14)]",
    badge: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  },
  xp: {
    label: "XP",
    icon: Star,
    accent: "text-amber-300",
    iconShell:
      "border-amber-300/25 bg-amber-400/10 shadow-[0_0_28px_rgba(245,158,11,0.14)]",
    badge: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  },
};

function clampCpReward(type: RewardType, amount: number) {
  return type === "cp" ? Math.min(amount, MAX_CP_REWARD) : amount;
}

function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}

function ResourceBadge({
  label,
  value,
  icon: Icon,
  tone,
  shell,
}: {
  label: string;
  value: number;
  icon: RewardIconComponent;
  tone: string;
  shell: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.035] p-3.5 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5 ${shell}`}
    >
      <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/[0.025] blur-xl" />

      <div className={`relative mb-2 ${tone}`}>
        <Icon size={17} strokeWidth={2.2} />
      </div>

      <p className="relative text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className="relative mt-1 text-lg font-black tabular-nums text-white">
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
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const updateCountdown = () => {
      const now = new Date();

      const tomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );

      const diff = Math.max(0, tomorrow.getTime() - now.getTime());

      setTimeRemaining({
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    updateCountdown();
    intervalId = setInterval(updateCountdown, 1000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="inline-flex w-fit items-center gap-3 rounded-xl border border-amber-300/15 bg-slate-950/70 px-3.5 py-2.5 shadow-[0_12px_40px_rgba(245,158,11,0.08)] backdrop-blur-xl">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10">
        <Clock3 size={14} className="text-amber-300" />
      </div>

      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
        Prochain bonus
      </span>

      <span className="font-mono text-sm font-black tabular-nums text-amber-200">
        {String(timeRemaining.hours).padStart(2, "0")}:
        {String(timeRemaining.minutes).padStart(2, "0")}:
        {String(timeRemaining.seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

function RewardVisual({
  reward,
  isToday,
  isClaimed,
}: {
  reward: RewardsConfigItem;
  isToday: boolean;
  isClaimed: boolean;
}) {
  const meta = rewardTypeMeta[reward.reward_type] ?? rewardTypeMeta.cp;
  const Icon = meta.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-black/15 p-4">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="absolute -bottom-12 -left-8 h-24 w-24 rounded-full bg-emerald-300/8 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${meta.iconShell}`}
        >
          <Icon size={23} className={meta.accent} />
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${meta.badge}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="relative mt-4">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          {isClaimed ? "Bonus récupéré" : isToday ? "Bonus disponible" : "Récompense"}
        </p>

        <p className="mt-1 truncate text-base font-black text-white">
          {reward.title}
        </p>

        <p className={`mt-2 text-2xl font-black ${meta.accent}`}>
          +{formatNumber(reward.reward_amount)}
        </p>
      </div>
    </div>
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

  const [currentDate, setCurrentDate] = useState(() => new Date());

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

  /*
   * Le calendrier change automatiquement au passage à minuit.
   * Cela évite de devoir recharger manuellement la page.
   */
  useEffect(() => {
    const now = new Date();

    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      1,
    );

    const delay = Math.max(
      1000,
      nextMidnight.getTime() - now.getTime(),
    );

    const timeoutId = setTimeout(() => {
      setCurrentDate(new Date());
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [currentDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
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

      const profileData = profRes.data
        ? {
            ...profRes.data,
            jetons_cp: Number(profRes.data.jetons_cp ?? 0),
            diamonds: Number(profRes.data.diamonds ?? 0),
            xp: Number(profRes.data.xp ?? 0),
          }
        : null;

      setProfile(profileData);

      const configItems = rewRes.data?.length
        ? rewRes.data.map((item) => {
            const rewardType = (item.reward_type || "cp") as RewardType;

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
            const reward = getDailyReward(day, 1) || {
              rewardType: "cp",
              rewardAmount: 10,
            };

            const rewardType = (reward.rewardType || "cp") as RewardType;

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
    currentYear,
    currentMonth,
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

  const claimedCount = claimedDays.length;

  const currentStreak = useMemo(() => {
    if (!claimedDays.length) return 0;

    let streak = 0;

    let day = claimedSet.has(todayDayNumber)
      ? todayDayNumber
      : todayDayNumber - 1;

    while (day >= 1 && claimedSet.has(day)) {
      streak += 1;
      day -= 1;
    }

    return streak;
  }, [claimedSet, claimedDays.length, todayDayNumber]);

  const todaysReward = useMemo(
    () =>
      rewardsConfig.find(
        (day) => day.day_number === todayDayNumber,
      ),
    [rewardsConfig, todayDayNumber],
  );

  const progressPercent = useMemo(
    () =>
      Math.min(
        100,
        Math.max(0, (claimedCount / daysInMonth) * 100),
      ),
    [claimedCount, daysInMonth],
  );

  const handleClaimDaily = async () => {
    if (
      !profile ||
      claiming ||
      claimedSet.has(todayDayNumber)
    ) {
      return;
    }

    setClaiming(true);

    try {
      const rawReward = getDailyReward(
        todayDayNumber,
        1,
      );

      const rewardType = (rawReward?.rewardType || "cp") as RewardType;

      const rewardAmount = clampCpReward(
        rewardType,
        Number(rawReward?.rewardAmount || 0),
      );

      /*
       * RPC inchangé : aucune modification du backend.
       */
      const { data, error } = await supabase.rpc(
        "claim_calendar_reward",
        {
          p_user_id: profile.id,
        },
      );

      if (error) {
        throw error;
      }

      const result = data as ClaimRpcResult;

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
      notify(
        "Erreur : " +
          (error instanceof Error
            ? error.message
            : "Erreur inconnue"),
        "danger",
      );
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] text-slate-300">
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(16,185,129,0.12),transparent_34%)]" />

          <div className="relative flex flex-col items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/5 shadow-[0_0_50px_rgba(16,185,129,0.12)]">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-300" />
            </div>

            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-300/70">
                ChifPam
              </p>

              <p className="mt-2 text-xs font-bold text-slate-500">
                Chargement des récompenses...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020617] pb-28 text-slate-100">
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
        nextLevelXp={
          rewardModal?.nextLevelXp ?? 1000
        }
        onClose={() => setRewardModal(null)}
      />

      {/* Atmosphère globale — pure CSS, aucun rendu continu. */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-80 w-80 rounded-full bg-emerald-500/10 blur-[110px]" />
        <div className="absolute right-[-10%] top-[12%] h-72 w-72 rounded-full bg-amber-400/8 blur-[110px]" />
        <div className="absolute bottom-[-12%] left-[35%] h-72 w-72 rounded-full bg-sky-500/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(6,78,59,0.24),rgba(120,53,15,0.13))] shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.025),transparent)]" />

          <div className="relative grid gap-8 p-5 sm:p-7 lg:grid-cols-[1.15fr_0.85fr] lg:p-9">
            <div className="flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-amber-200">
                  <Trophy size={13} />
                  Récompenses quotidiennes
                </div>

                <div className="rounded-full border border-emerald-300/15 bg-emerald-300/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300/80">
                  {monthLabel}
                </div>
              </div>

              <h1 className="mt-5 max-w-3xl text-[clamp(2.5rem,7vw,5.7rem)] font-black uppercase leading-[0.86] tracking-[-0.055em] text-white">
                Calendrier
                <span className="block bg-linear-to-r from-emerald-300 via-white to-amber-200 bg-clip-text text-transparent">
                  de récompenses
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400 sm:text-[15px]">
                Chaque journée débloque une nouvelle opportunité
                de faire progresser votre compte et votre série.
              </p>

              <div className="mt-5">
                <NextBonusCountdown />
              </div>

              <div className="mt-5 grid max-w-xl grid-cols-3 gap-2.5">
                <ResourceBadge
                  label="CP"
                  value={profile?.jetons_cp ?? 0}
                  icon={Coins}
                  tone="text-emerald-300"
                  shell="hover:border-emerald-300/20"
                />

                <ResourceBadge
                  label="Diamants"
                  value={profile?.diamonds ?? 0}
                  icon={Gem}
                  tone="text-sky-300"
                  shell="hover:border-sky-300/20"
                />

                <ResourceBadge
                  label="XP"
                  value={profile?.xp ?? 0}
                  icon={Star}
                  tone="text-amber-300"
                  shell="hover:border-amber-300/20"
                />
              </div>
            </div>

            {/* Today's reward — remplace complètement la 3D. */}
            <div className="relative flex min-h-65 items-center justify-center lg:min-h-80">
              <div className="absolute h-56 w-56 rounded-full border border-emerald-300/8" />
              <div className="absolute h-44 w-44 rounded-full border border-amber-300/8" />
              <div className="absolute h-32 w-32 rounded-full bg-emerald-300/8 blur-3xl" />

              <div className="relative w-full max-w-sm">
                {todaysReward ? (
                  <div className="relative rounded-[1.75rem] border border-amber-300/20 bg-slate-950/70 p-3 shadow-[0_25px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
                    <div className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-amber-300/70 to-transparent" />

                    <RewardVisual
                      reward={todaysReward}
                      isToday
                      isClaimed={claimedSet.has(
                        todayDayNumber,
                      )}
                    />

                    <div className="mt-3">
                      {claimedSet.has(todayDayNumber) ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/8 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                          <CheckCircle2 size={15} />
                          Bonus déjà réclamé
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void handleClaimDaily()
                          }
                          disabled={claiming}
                          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-300 to-yellow-200 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_12px_30px_rgba(251,191,36,0.2)] transition duration-200 hover:-translate-y-0.5 hover:from-amber-200 hover:to-yellow-100 disabled:cursor-wait disabled:opacity-60"
                        >
                          {claiming ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <Gift
                              size={15}
                              className="transition-transform duration-200 group-hover:rotate-6"
                            />
                          )}

                          {claiming
                            ? "Ouverture..."
                            : "Réclamer le bonus"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.75rem] border border-white/8 bg-slate-950/60 p-8 text-center backdrop-blur-xl">
                    <Sparkles
                      size={28}
                      className="mx-auto text-amber-300"
                    />

                    <p className="mt-4 text-sm font-black text-white">
                      Artefact du jour
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Aucune récompense configurée pour
                      aujourd&apos;hui.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CALENDAR HEADER */}
        <section className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] backdrop-blur-xl">
          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/8 text-emerald-300">
                <CalendarDays size={18} />
              </div>

              <div>
                <h2 className="text-base font-black uppercase tracking-tight text-white sm:text-lg">
                  Le calendrier
                </h2>

                <p className="mt-0.5 text-[10px] capitalize text-slate-500">
                  {monthLabel}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300/15 bg-amber-300/6 px-3 py-2 text-[10px] font-black text-amber-200">
                <Flame size={14} />
                Série : {currentStreak} jour
                {currentStreak > 1 ? "s" : ""}
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/6 px-3 py-2 text-[10px] font-black text-emerald-200">
                <Zap size={14} />
                {claimedCount} / {daysInMonth}
              </div>
            </div>
          </div>

          <div className="border-t border-white/6 px-4 pb-4 pt-0 sm:px-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.045]">
              <div
                className="h-full rounded-full bg-linear-to-r from-emerald-400 via-emerald-300 to-amber-300 transition-[width] duration-500"
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">
              <span>Progression mensuelle</span>
              <span>
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
        </section>

        {/* CALENDAR GRID */}
        <section>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-7">
            {rewardsConfig.map((day) => {
              const isToday =
                day.day_number === todayDayNumber;

              const isClaimed = claimedSet.has(
                day.day_number,
              );

              const isLocked =
                day.day_number > todayDayNumber;

              const isMissed =
                !isClaimed &&
                !isLocked &&
                !isToday;

              const meta =
                rewardTypeMeta[day.reward_type] ??
                rewardTypeMeta.cp;

              const RewardIcon = meta.icon;

              return (
                <article
                  key={day.day_number}
                  className={[
                    "group relative flex min-h-47.5 flex-col justify-between overflow-hidden rounded-2xl border p-3 transition-transform duration-200",
                    isClaimed
                      ? "border-emerald-300/10 bg-emerald-950/20"
                      : isToday
                        ? "border-amber-300/45 bg-[linear-gradient(145deg,rgba(120,53,15,0.24),rgba(15,23,42,0.9))] shadow-[0_0_35px_rgba(251,191,36,0.1)]"
                        : "border-white/8 bg-slate-900/55 hover:-translate-y-0.5 hover:border-white/15",
                    isLocked
                      ? "opacity-35 grayscale"
                      : "",
                  ].join(" ")}
                >
                  {isToday && !isClaimed && (
                    <div className="pointer-events-none absolute inset-0 rounded-2xl border border-amber-300/25">
                      <div className="absolute left-1/2 top-0 h-px w-1/2 -translate-x-1/2 bg-linear-to-r from-transparent via-amber-300/80 to-transparent" />
                    </div>
                  )}

                  <div className="relative flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Jour {day.day_number}
                    </span>

                    {isClaimed ? (
                      <CheckCircle2
                        size={15}
                        className="text-emerald-300"
                      />
                    ) : isLocked ? (
                      <LockKeyhole
                        size={14}
                        className="text-slate-600"
                      />
                    ) : (
                      <Sparkles
                        size={14}
                        className={
                          isToday
                            ? "text-amber-300"
                            : "text-slate-500"
                        }
                      />
                    )}
                  </div>

                  <div className="relative my-3 text-center">
                    <div
                      className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border transition-transform duration-200 group-hover:scale-105 ${meta.iconShell}`}
                    >
                      <RewardIcon
                        size={20}
                        className={meta.accent}
                      />
                    </div>

                    <p className="mt-3 truncate text-[10px] font-bold text-slate-300">
                      {day.title}
                    </p>

                    <p
                      className={`mt-1 text-sm font-black ${meta.accent}`}
                    >
                      +{formatNumber(day.reward_amount)}{" "}
                      {meta.label}
                    </p>
                  </div>

                  <div className="relative">
                    {isToday && !isClaimed ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleClaimDaily()
                        }
                        disabled={claiming}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-300 py-2 text-[9px] font-black uppercase tracking-wide text-slate-950 shadow-[0_8px_20px_rgba(251,191,36,0.16)] transition duration-200 hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
                      >
                        {claiming ? (
                          <Loader2
                            size={13}
                            className="animate-spin"
                          />
                        ) : (
                          <Gift size={13} />
                        )}

                        {claiming
                          ? "Ouverture..."
                          : "Réclamer"}
                      </button>
                    ) : (
                      <div
                        className={`flex items-center justify-center gap-1 py-2 text-[9px] font-black uppercase tracking-wide ${
                          isClaimed
                            ? "text-emerald-300"
                            : "text-slate-600"
                        }`}
                      >
                        {isClaimed ? (
                          <>
                            <Check size={12} />
                            Réclamé
                          </>
                        ) : isLocked ? (
                          <>
                            <LockKeyhole size={11} />
                            Verrouillé
                          </>
                        ) : isMissed ? (
                          <>
                            <Minus size={11} />
                            Manqué
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* FOOTER */}
        <div className="flex flex-col items-center justify-center gap-2 pt-2 text-center">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
            <Award size={13} />
            Revenez demain pour poursuivre votre série
          </div>

          <div className="h-px w-24 bg-linear-to-r from-transparent via-emerald-300/20 to-transparent" />
        </div>
      </div>
    </main>
  );
      }
