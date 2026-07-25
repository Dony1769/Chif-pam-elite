"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Calendar as CalendarIcon,
  CheckCircle2,
  Star,
  Coins,
  Gem,
  Loader2,
  Sparkles,
  Crown,
  Clock,
  Flame,
  Gift,
  CheckCheck,
  ChevronRight,
  Lock,
} from 'lucide-react';
import {
  fetchDailyMissions,
  canClaimMission,
  formatMissionProgress,
  type MissionItem,
  type RewardType,
} from '@/services/missionService';
import {
  getDailyReward,
  resolveMissionReward,
  type EconomyRewardType,
} from '@/lib/game-economy';
import { motion, AnimatePresence } from 'framer-motion';
import ExoClickBanner from '@/components/ads/ExoClickBanner';

// --- TYPES ---
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

type MissionFilter = 'all' | 'claimable' | 'completed';

// --- METADATA CONFIG ---
const rewardTypeMeta = {
  cp: {
    label: 'CP',
    icon: Coins,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  diamonds: {
    label: 'Diamants',
    icon: Gem,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  xp: {
    label: 'XP',
    icon: Star,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
};

export default function RewardsPage() {
  // --- STATES ---
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'missions'>('calendar');
  const [missionFilter, setMissionFilter] = useState<MissionFilter>('all');
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfigItem[]>([]);
  const [userTasks, setUserTasks] = useState<MissionItem[]>([]);
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimingTask, setClaimingTask] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const router = useRouter();

  // --- DATES CALCULATIONS ---
  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDayNumber = currentDate.getDate();

  // --- COUNTDOWN TIMER UNTIL MIDNIGHT ---
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
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

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    try {
      const response = await supabase.auth.getUser();
      const user = response.data?.user;
      if (!user) {
        router.push('/connexion');
        return;
      }

      const [profRes, rewRes] = await Promise.all([
        supabase.from('profiles').select('id, username, jetons_cp, diamonds, xp').eq('id', user.id).single(),
        supabase.from('daily_rewards_config').select('*').lte('day_number', daysInMonth).order('day_number', { ascending: true })
      ]);

      setProfile(profRes.data ?? null);
      setRewardsConfig(rewRes.data ?? []);

      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString();

      const { data: claims } = await supabase
        .from('user_calendar_claims')
        .select('day_number')
        .eq('user_id', user.id)
        .gte('claim_date', startOfMonth)
        .lte('claim_date', endOfMonth);

      if (claims) setClaimedDays(claims.map((c: { day_number: number }) => c.day_number));

      const missions = await fetchDailyMissions(user.id);
      setUserTasks(missions);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, daysInMonth, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- SOUND EFFECT HELPER ---
  const playRewardSound = () => {
    new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3').play().catch(() => {});
  };

  // --- HANDLERS ---
  const handleClaimDaily = async () => {
    if (!profile || claiming || claimedDays.includes(todayDayNumber)) return;
    setClaiming(true);

    try {
      const reward = getDailyReward(todayDayNumber, 1);
      const { data, error } = await supabase.rpc('claim_calendar_reward', { p_user_id: profile.id });
      if (error) throw error;

      if (!data?.success) {
        alert(data?.message ?? 'Impossible de réclamer la récompense.');
      } else {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                jetons_cp: reward?.rewardType === 'cp' ? (prev.jetons_cp || 0) + (reward.rewardAmount || 0) : prev.jetons_cp,
                diamonds: reward?.rewardType === 'diamonds' ? (prev.diamonds || 0) + (reward.rewardAmount || 0) : prev.diamonds,
                xp: reward?.rewardType === 'xp' ? (prev.xp || 0) + (reward.rewardAmount || 0) : prev.xp,
              }
            : prev
        );
        setClaimedDays((prev) => [...prev, todayDayNumber]);
        playRewardSound();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      alert('Erreur: ' + message);
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimTask = async (missionId: string) => {
    if (!profile || claimingTask) return;

    const mission = userTasks.find((task) => task.id === missionId);
    if (!mission || !canClaimMission(mission)) return;

    setClaimingTask(missionId);

    try {
      const { error } = await supabase
        .from('user_daily_missions')
        .update({ is_claimed: true })
        .eq('id', missionId)
        .eq('user_id', profile.id)
        .eq('is_claimed', false);

      if (error) throw error;

      const resolvedReward = resolveMissionReward({
        id: mission.id,
        title: mission.title,
        reward_amount: mission.reward_amount,
        reward_type: mission.reward_type,
      });

      const updates: Partial<ProfileData> = {};
      if (resolvedReward.type === 'cp') updates.jetons_cp = (profile.jetons_cp || 0) + resolvedReward.amount;
      else if (resolvedReward.type === 'diamonds') updates.diamonds = (profile.diamonds || 0) + resolvedReward.amount;
      else if (resolvedReward.type === 'xp') updates.xp = (profile.xp || 0) + resolvedReward.amount;

      await supabase.from('profiles').update(updates).eq('id', profile.id);

      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
      setUserTasks((prev) => prev.map((t) => (t.id === missionId ? { ...t, is_claimed: true } : t)));
      playRewardSound();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      alert('Erreur: ' + message);
    } finally {
      setClaimingTask(null);
    }
  };

  const handleClaimAllTasks = async () => {
    const claimableTasks = userTasks.filter((t) => canClaimMission(t));
    if (claimableTasks.length === 0 || claimingAll) return;

    setClaimingAll(true);
    for (const task of claimableTasks) {
      await handleClaimTask(task.id);
    }
    setClaimingAll(false);
  };

  // --- COMPUTED VALUES ---
  const completedMissionsCount = useMemo(() => userTasks.filter((t) => t.is_claimed).length, [userTasks]);
  const claimableMissionsCount = useMemo(() => userTasks.filter((t) => canClaimMission(t)).length, [userTasks]);
  const progressPercentage = useMemo(() => {
    if (userTasks.length === 0) return 0;
    return Math.round((completedMissionsCount / userTasks.length) * 100);
  }, [completedMissionsCount, userTasks.length]);

  const filteredMissions = useMemo(() => {
    return userTasks.filter((task) => {
      if (missionFilter === 'claimable') return canClaimMission(task);
      if (missionFilter === 'completed') return task.is_claimed;
      return true;
    });
  }, [userTasks, missionFilter]);

  // --- LOADING RENDER ---
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 p-6 text-slate-300">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
          <p className="text-center text-xs uppercase tracking-[0.35em] text-slate-500">
            Initialisation du Pass Récompenses...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-slate-100 font-sans">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
        
        {/* === HERO BANNER / STATS HEADER === */}
        <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-12 lg:items-center">
            {/* Title & Info */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Sparkles size={14} className="animate-pulse" /> Pass Récompenses Quotidiennes
              </div>
              
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Centre de Récompenses
              </h1>
              
              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                Complétez vos missions, cumulez votre série de connexion quotidienne et débloquez des ressources exclusives pour accélérer votre progression.
              </p>

              {/* Countdown timer */}
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 backdrop-blur-md">
                <Clock size={16} className="text-amber-400 animate-spin" />
                <span>Réinitialisation dans :</span>
                <span className="font-mono font-bold text-amber-300">
                  {String(timeRemaining.hours).padStart(2, '0')}h {String(timeRemaining.minutes).padStart(2, '0')}m {String(timeRemaining.seconds).padStart(2, '0')}s
                </span>
              </div>
            </div>

            {/* Solde des ressources */}
            <div className="lg:col-span-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center backdrop-blur-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 mb-2">
                  <Coins size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CP</p>
                <p className="mt-1 text-xl font-black text-white">{profile?.jetons_cp?.toLocaleString() ?? 0}</p>
              </div>

              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-center backdrop-blur-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 mb-2">
                  <Gem size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diamants</p>
                <p className="mt-1 text-xl font-black text-white">{profile?.diamonds?.toLocaleString() ?? 0}</p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center backdrop-blur-md">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 mb-2">
                  <Star size={20} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">XP</p>
                <p className="mt-1 text-xl font-black text-white">{profile?.xp?.toLocaleString() ?? 0}</p>
              </div>
            </div>
          </div>
        </section>

        {/* === NAVIGATION ONGLETS & PROGRESS BAR === */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-white/10 w-fit">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'calendar'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <CalendarIcon size={16} /> Calendrier Mensuel
            </button>
            <button
              onClick={() => setActiveTab('missions')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all relative ${
                activeTab === 'missions'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy size={16} /> Missions Du Jour
              {claimableMissionsCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950 animate-bounce">
                  {claimableMissionsCount}
                </span>
              )}
            </button>
          </div>

          {/* Barre de progression des missions */}
          <div className="flex items-center gap-4 bg-slate-900/60 border border-white/10 rounded-2xl px-4 py-2.5 sm:max-w-xs w-full">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className="text-slate-400">Missions accomplies</span>
                <span className="text-emerald-400">{progressPercentage}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            <span className="text-xs font-black text-white">{completedMissionsCount}/{userTasks.length}</span>
          </div>
        </div>

        {/* === MAIN CONTENT VUES === */}
        <AnimatePresence mode="wait">
          {/* TAB 1 : CALENDRIER DE CONNEXION */}
          {activeTab === 'calendar' && (
            <motion.section
              key="calendar-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Gift className="text-emerald-400" size={20} /> Recompenses de Présence
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connectez-vous chaque jour pour débloquer le coffre suivant.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 w-fit">
                  <Flame size={16} className="text-amber-400" />
                  <span>Série actuelle : <strong className="text-amber-300">{claimedDays.length} jours</strong></span>
                </div>
              </div>

              {/* Grid du calendrier */}
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
                      className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                        isClaimed
                          ? 'border-emerald-500/20 bg-emerald-950/20 opacity-75'
                          : isToday
                          ? 'border-amber-400/60 bg-gradient-to-b from-amber-500/10 to-slate-900 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/30'
                          : 'border-white/10 bg-slate-900/60 hover:border-white/20'
                      } ${isLocked ? 'opacity-40 bg-slate-950' : ''}`}
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
                        <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border ${rewardMeta.color}`}>
                          <RewardIcon size={20} />
                        </div>
                        <p className="text-xs font-bold text-white line-clamp-1">{day.title}</p>
                        <p className="text-sm font-black text-amber-300">
                          +{day.reward_amount} {rewardMeta.label}
                        </p>
                      </div>

                      {/* Action Button */}
                      {isToday && !isClaimed ? (
                        <button
                          onClick={handleClaimDaily}
                          disabled={claiming}
                          className="w-full rounded-xl bg-amber-400 py-2 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md transition hover:bg-amber-300 active:scale-95 disabled:opacity-50"
                        >
                          {claiming ? <Loader2 size={14} className="mx-auto animate-spin" /> : 'Réclamer'}
                        </button>
                      ) : (
                        <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 py-1">
                          {isClaimed ? 'Réclamé' : isLocked ? 'Verrouillé' : 'Manqué'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* TAB 2 : MISSIONS QUOTIDIENNES */}
          {activeTab === 'missions' && (
            <motion.section
              key="missions-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Filtres & Tout réclamer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2">
                  {(['all', 'claimable', 'completed'] as MissionFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setMissionFilter(filter)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                        missionFilter === filter
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter === 'all' && 'Toutes'}
                      {filter === 'claimable' && `À réclamer (${claimableMissionsCount})`}
                      {filter === 'completed' && 'Terminées'}
                    </button>
                  ))}
                </div>

                {claimableMissionsCount > 0 && (
                  <button
                    onClick={handleClaimAllTasks}
                    disabled={claimingAll}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-emerald-400 active:scale-95 disabled:opacity-50"
                  >
                    {claimingAll ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} />}
                    Tout Réclamer ({claimableMissionsCount})
                  </button>
                )}
              </div>

              {/* Liste des cartes de missions */}
              <div className="grid gap-4 md:grid-cols-2">
                {filteredMissions.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-white/5 bg-slate-900/30 p-12 text-center text-slate-500">
                    <Trophy size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">Aucune mission ne correspond à ce filtre.</p>
                  </div>
                ) : (
                  filteredMissions.map((mission) => {
                    const isClaimable = canClaimMission(mission);
                    const isClaimed = mission.is_claimed;
                    const rewardMeta = rewardTypeMeta[mission.reward_type] || rewardTypeMeta.cp;
                    const RewardIcon = rewardMeta.icon;

                    return (
                      <div
                        key={mission.id}
                        className={`group relative flex flex-col justify-between rounded-3xl border p-5 transition-all ${
                          isClaimed
                            ? 'border-white/5 bg-slate-950/50 opacity-60'
                            : isClaimable
                            ? 'border-emerald-500/40 bg-slate-900/90 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                            : 'border-white/10 bg-slate-900/60'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Mission Quotidienne
                              </span>
                              <h3 className="text-base font-black text-white">{mission.title}</h3>
                            </div>
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${rewardMeta.color}`}>
                              <RewardIcon size={18} />
                            </div>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed">{mission.description}</p>
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                          <div>
                            <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${rewardMeta.badge}`}>
                              +{mission.reward_amount} {rewardMeta.label}
                            </span>
                            <p className="mt-1 text-[10px] text-slate-500 font-mono">
                              {formatMissionProgress(mission)}
                            </p>
                          </div>

                          <button
                            onClick={() => handleClaimTask(mission.id)}
                            disabled={!isClaimable || claimingTask === mission.id}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition active:scale-95 ${
                              isClaimed
                                ? 'bg-white/5 text-slate-500 cursor-default'
                                : isClaimable
                                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                                : 'bg-white/5 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            {isClaimed ? (
                              <>Réclamé <CheckCircle2 size={14} /></>
                            ) : claimingTask === mission.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>Réclamer <ChevronRight size={14} /></>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* === SECTION CONSEILS & PUB === */}
        <div className="grid gap-6 lg:grid-cols-12 pt-4">
          <div className="lg:col-span-5 rounded-3xl border border-emerald-500/20 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Crown size={16} /> Astuce de Progression VIP
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Maintenez une série ininterrompue de 7 jours de connexion pour obtenir un coffre bonus mystère contenant jusqu'à 500 CP et des Diamants supplémentaires.
            </p>
          </div>

          <div className="lg:col-span-7 rounded-3xl border border-white/10 bg-slate-900/60 p-4 flex items-center justify-center overflow-hidden">
            <ExoClickBanner />
          </div>
        </div>

      </div>
    </main>
  );
}
