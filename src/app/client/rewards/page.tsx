"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import {
  getDailyReward,
  type EconomyRewardType,
} from '@/lib/game-economy';
import { motion } from 'framer-motion';
import ExoClickBanner from '@/components/ads/ExoClickBanner';

// --- CONSTANTES ET REGLES ECONOMIQUES ---
const MAX_CP_REWARD = 50; // Plafond strict pour les gains en CP

// --- TYPES ---
type RewardType = 'cp' | 'diamonds' | 'xp';

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
const rewardTypeMeta: Record<RewardType, { label: string; icon: React.ElementType; color: string; badge: string }> = {
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

/**
 * Securite economique : Plafonne la recompense CP a 50 maximum.
 */
function clampCpReward(type: RewardType, amount: number): number {
  if (type === 'cp') {
    return Math.min(amount, MAX_CP_REWARD);
  }
  return amount;
}

export default function RewardsPage() {
  // --- STATES ---
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardsConfig, setRewardsConfig] = useState<RewardsConfigItem[]>([]);
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const router = useRouter();

  // --- DATES CALCULATIONS ---
  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayDayNumber = currentDate.getDate();

  // --- COMPTE A REBOURS JUSQU'A MINUIT ---
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

  // --- CHARGEMENT DES DONNEES ---
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

      // Adaptation de la config avec le plafond de CP a 50
      const sanitizedConfig: RewardsConfigItem[] = (rewRes.data ?? []).map((item) => ({
        ...item,
        reward_amount: clampCpReward(item.reward_type, item.reward_amount),
      }));
      setRewardsConfig(sanitizedConfig);

      // Recuperation des jours de la serie du mois courant
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString();

      const { data: claims } = await supabase
        .from('user_calendar_claims')
        .select('day_number')
        .eq('user_id', user.id)
        .gte('claim_date', startOfMonth)
        .lte('claim_date', endOfMonth);

      if (claims) setClaimedDays(claims.map((c: { day_number: number }) => c.day_number));
    } catch (error) {
      console.error("Erreur lors du chargement du bonus de connexion :", error);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, daysInMonth, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- EFFET SONORE ---
  const playRewardSound = () => {
    new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3').play().catch(() => {});
  };

  // --- ACTION : RECLAMER LE BONUS DU JOUR ---
  const handleClaimDaily = async () => {
    if (!profile || claiming || claimedDays.includes(todayDayNumber)) return;
    setClaiming(true);

    try {
      // 1. Calcul du montant avec plafonnement local pour la securite
      const rawReward = getDailyReward(todayDayNumber, 1);
      const rewardType = (rawReward?.rewardType || 'cp') as RewardType;
      const rawAmount = rawReward?.rewardAmount || 0;
      const rewardAmount = clampCpReward(rewardType, rawAmount);

      // 2. Appel de la procédure Supabase RPC
      const { data, error } = await supabase.rpc('claim_calendar_reward', { p_user_id: profile.id });
      if (error) throw error;

      if (!data?.success) {
        alert(data?.message ?? 'Impossible de réclamer le bonus de connexion.');
      } else {
        // 3. Mise a jour optimiste du solde utilisateur
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            jetons_cp: rewardType === 'cp' ? (prev.jetons_cp || 0) + rewardAmount : prev.jetons_cp,
            diamonds: rewardType === 'diamonds' ? (prev.diamonds || 0) + rewardAmount : prev.diamonds,
            xp: rewardType === 'xp' ? (prev.xp || 0) + rewardAmount : prev.xp,
          };
        });

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

  // --- AFFICHAGE PENDANT LE CHARGEMENT ---
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 p-6 text-slate-300">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-400" />
          <p className="text-center text-xs uppercase tracking-[0.35em] text-slate-500">
            Chargement du Bonus de Connexion...
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
            {/* Titre & Informations */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Sparkles size={14} className="animate-pulse" /> Recompense Quotidienne
              </div>
              
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Bonus de Connexion
              </h1>
              
              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                Revenez chaque jour pour récupérer vos jetons CP, Diamants et XP. Maintenez votre série active pour débloquer le maximum de récompenses !
              </p>

              {/* Compte a rebours */}
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 backdrop-blur-md">
                <Clock size={16} className="text-amber-400 animate-spin" />
                <span>Prochain bonus dans :</span>
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

        {/* === SECTION CALENDRIER DU MOIS === */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Header de la grille */}
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
              <span>Série actuelle : <strong className="text-amber-300">{claimedDays.length} jour(s)</strong></span>
            </div>
          </div>

          {/* Grille des jours */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {rewardsConfig.map((day) => {
              const isToday = day.day_number === todayDayNumber;
              const isClaimed = claimedDays.includes(day.day_number);
              const isLocked = day.day_number > todayDayNumber;
              
              // Fallback vers CP si le type n'existe pas dans le map
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

                  {/* Bouton d'action */}
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

        {/* === ASTUCE DE CONSERVATION & BANNIERE DE PUB === */}
        <div className="grid gap-6 lg:grid-cols-12 pt-4">
          <div className="lg:col-span-5 rounded-3xl border border-emerald-500/20 bg-slate-900/60 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <CalendarIcon size={16} /> Regle de Récompense
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Connectez-vous tous les jours pour maximiser vos gains en CP (limités à 50 CP par jour), Diamants et XP !
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
