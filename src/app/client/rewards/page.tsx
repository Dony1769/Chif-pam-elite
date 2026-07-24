"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Calendar,
  CheckCircle2,
  Star,
  Coins,
  Gem,
  Loader2,
  ArrowDownCircle,
  Sparkles,
} from 'lucide-react';
import { fetchDailyMissions, canClaimMission, formatMissionProgress, type MissionItem, type RewardType } from '@/services/missionService';
import { motion, AnimatePresence } from 'framer-motion';
import ExoClickBanner from '@/components/ads/ExoClickBanner';

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

const rewardTypeMeta = {
  cp: {
    label: 'CP',
    icon: Coins,
    color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  },
  diamonds: {
    label: 'Diamants',
    icon: Gem,
    color: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
  },
  xp: {
    label: 'XP',
    icon: Star,
    color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  },
};

export default function RewardsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'tasks'>('login');
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfigItem[]>([]);
  const [userTasks, setUserTasks] = useState<MissionItem[]>([]);
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimingTask, setClaimingTask] = useState<string | null>(null);
  const [currentDate] = useState(new Date());
  const router = useRouter();

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDayNumber = currentDate.getDate();

  const fetchData = useCallback(async () => {
    const response = await supabase.auth.getUser();
    const user = response.data?.user;
    if (!user) {
      router.push('/connexion');
      return;
    }

    const [profRes, rewRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
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

    setLoading(false);
  }, [currentYear, currentMonth, daysInMonth, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaim = async () => {
    if (!profile || claiming || claimedDays.includes(todayDayNumber)) return;
    setClaiming(true);

    try {
      const { data, error } = await supabase.rpc('claim_calendar_reward', { p_user_id: profile.id });
      if (error) throw error;
      if (!data?.success) {
        alert(data?.message ?? 'Impossible de réclamer la récompense.');
      } else {
        setProfile(prev => prev ? {
          ...prev,
          jetons_cp: data.new_cp,
          diamonds: data.new_diamonds,
          xp: data.new_xp,
        } : prev);
        setClaimedDays(prev => [...prev, todayDayNumber]);
        new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3').play().catch(() => {});
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
    if (!mission) return;
    if (!canClaimMission(mission)) {
      alert('Cette mission n’est pas encore terminée.');
      return;
    }

    setClaimingTask(missionId);

    try {
      const { error } = await supabase
        .from('user_daily_missions')
        .update({ is_claimed: true })
        .eq('id', missionId)
        .eq('user_id', profile.id)
        .eq('is_claimed', false);

      if (error) throw error;

      const updates: Partial<ProfileData> = {};
      if (mission.reward_type === 'cp') updates.jetons_cp = (profile.jetons_cp || 0) + mission.reward_amount;
      else if (mission.reward_type === 'diamonds') updates.diamonds = (profile.diamonds || 0) + mission.reward_amount;
      else if (mission.reward_type === 'xp') updates.xp = (profile.xp || 0) + mission.reward_amount;

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (profileError) throw profileError;

      const refreshedProfile = await supabase
        .from('profiles')
        .select('id, jetons_cp, diamonds, xp')
        .eq('id', profile.id)
        .single();

      if (refreshedProfile.error) throw refreshedProfile.error;
      setProfile(refreshedProfile.data ?? { ...profile, ...updates, id: profile.id });

      const refreshedMissions = await fetchDailyMissions(profile.id);
      setUserTasks(refreshedMissions);
      new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3').play().catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      alert('Erreur: ' + message);
    } finally {
      setClaimingTask(null);
    }
  };

  const completedMissions = userTasks.filter(task => task.is_claimed).length;

  const CalendarDay = ({ day }: { day: RewardsConfigItem }) => {
    const isToday = day.day_number === todayDayNumber;
    const isClaimed = claimedDays.includes(day.day_number);
    const isDisabled = day.day_number > todayDayNumber;
    return (
      <button
        className={`group relative flex min-h-22.5 flex-col justify-between gap-3 rounded-3xl border p-4 text-left transition ${isClaimed ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : isToday ? 'border-amber-400/30 bg-amber-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'} ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
        disabled={isDisabled || claiming || isClaimed}
        onClick={handleClaim}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Jour {day.day_number}</p>
            <p className="mt-1 text-sm font-black text-white">{day.title}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-200">
            +{day.reward_amount} {day.reward_type.toUpperCase()}
          </div>
        </div>
        <div className="text-xs text-slate-400">{isClaimed ? 'Réclamé' : isToday ? 'Disponible aujourd’hui' : isDisabled ? 'Bloqué' : 'À venir'}</div>
      </button>
    );
  };

  const TaskCard = ({ mission }: { mission: MissionItem }) => {
    const reward = rewardTypeMeta[mission.reward_type] || rewardTypeMeta.cp;
    const RewardIcon = reward.icon;
    return (
      <div className="group relative rounded-4xl border border-white/10 bg-slate-950/70 p-5 transition hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-slate-900/90">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Mission</p>
            <p className="mt-2 text-lg font-black tracking-tight text-white">{mission.title}</p>
          </div>
          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-3xl border ${reward.color}`}>
            <RewardIcon size={18} />
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">{mission.description}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.25em] text-slate-200">
              +{mission.reward_amount} {reward.label}
            </div>
            <div className="text-xs text-slate-400">
              {formatMissionProgress(mission)}
            </div>
          </div>
          <button
            onClick={() => handleClaimTask(mission.id)}
            disabled={!canClaimMission(mission) || claimingTask === mission.id}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-slate-950 transition ${canClaimMission(mission) ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-white/10 text-slate-400 cursor-not-allowed'}`}
          >
            {mission.is_claimed ? 'Réclamé' : claimingTask === mission.id ? 'Réclamation...' : 'Réclamer'}
            {mission.is_claimed ? <CheckCircle2 size={16} /> : <ArrowDownCircle size={16} />}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 p-6 text-slate-300">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
          <p className="text-center text-sm uppercase tracking-[0.35em] text-slate-500">Chargement du Centre de Mission...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="relative overflow-hidden rounded-4xl border border-emerald-500/10 bg-linear-to-br from-slate-950/95 via-slate-900 to-slate-950/70 px-8 py-10 shadow-2xl shadow-emerald-500/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.15),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_30%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-emerald-200">
                <Sparkles size={18} /> Premium Mission Center
              </div>
              <h1 className="text-4xl font-black text-white sm:text-5xl">Centre de Mission</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300">Réalisez vos missions exclusives, collectez des récompenses rares et débloquez des bonus VIP en un seul endroit. L’aventure commence ici.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">CP total</p>
                  <p className="mt-3 text-3xl font-black text-white">{(profile?.jetons_cp || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Diamants</p>
                  <p className="mt-3 text-3xl font-black text-white">{(profile?.diamonds || 0).toLocaleString()}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">XP</p>
                  <p className="mt-3 text-3xl font-black text-white">{(profile?.xp || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 rounded-4xl border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Missions complétées</p>
                  <p className="mt-2 text-4xl font-black text-white">{completedMissions}/{userTasks.length}</p>
                </div>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-200">
                  <Trophy size={24} />
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <p className="font-black uppercase tracking-[0.35em] text-slate-400">Progression mensuelle</p>
                <p className="mt-3">Surveillez votre calendrier de récompenses et réclamez votre avantage quotidien.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Jours réclamés</p>
                  <p className="mt-2 text-3xl font-black text-white">{claimedDays.length}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Missions actives</p>
                  <p className="mt-2 text-3xl font-black text-white">{userTasks.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <section className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/90 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Calendrier de récompenses</p>
                <h2 className="mt-2 text-2xl font-black text-white">Réclamez vos bonus quotidiens</h2>
              </div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-slate-300">
                <Calendar size={16} />
                {new Date(currentYear, currentMonth).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
            </div>

            <div className="rounded-4xl border border-white/10 bg-slate-950/80 p-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rewardsConfig.map((day) => (
                  <CalendarDay key={day.day_number} day={day} />
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/90 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Missions du jour</p>
                <h2 className="mt-2 text-2xl font-black text-white">Défis premium</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('login')}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.25em] transition ${activeTab === 'login' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  Calendrier
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.25em] transition ${activeTab === 'tasks' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  Missions
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'login' ? (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <p className="text-sm leading-7 text-slate-400">Réclamez votre bonus jour après jour pour construire un agenda de récompenses stable et exclusif.</p>
                  <div className="rounded-4xl border border-white/10 bg-slate-950/80 p-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-center">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Aujourd’hui</p>
                        <p className="mt-3 text-3xl font-black text-white">{todayDayNumber}</p>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-center">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Réclamé</p>
                        <p className="mt-3 text-3xl font-black text-white">{claimedDays.includes(todayDayNumber) ? 'Oui' : 'Non'}</p>
                      </div>
                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-center">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Prochain bonus</p>
                        <p className="mt-3 text-3xl font-black text-white">{rewardsConfig.find(r => r.day_number === Math.min(todayDayNumber + 1, daysInMonth))?.reward_amount || '–'}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="grid gap-4">
                    {userTasks.map((mission) => (
                      <TaskCard key={mission.id} mission={mission} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-4xl border border-emerald-500/10 bg-slate-950/90 p-6">
            <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-emerald-500/10 p-4">
              <Sparkles size={20} className="text-emerald-300" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-300">Astuce Premium</p>
                <p className="mt-1 text-sm text-slate-200">Enchaînez trois jours consécutifs pour débloquer un multiplicateur de gains sur les missions.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Conseil</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">Terminez vos missions du jour avant minuit pour recevoir une récompense bonus aléatoire.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Bonus VIP</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">Les membres VIP obtiennent un multiplicateur de 15% sur les récompenses CP et XP.</p>
              </div>
            </div>
          </div>

          <div className="rounded-4xl border border-white/10 bg-slate-950/90 p-6">
            <ExoClickBanner />
          </div>
        </div>
      </div>
    </main>
  );
}
