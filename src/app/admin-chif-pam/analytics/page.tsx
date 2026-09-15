"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ADMIN_GAME_CONFIG, type AdminGameId } from '@/lib/constants/admin-games';
import {
  ArrowLeft,
  BarChart3,
  Coins,
  Loader2,
  RefreshCw,
  Sparkles,
  Trophy,
  Users,
  Wallet,
  AlertCircle,
  Target,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts';

type GameAnalytic = {
  id: AdminGameId;
  title: string;
  volume: number;
  profit: number;
  plays: number;
  isActive: boolean;
};

type DashboardGameRow = {
  bet_amount?: number | null;
  multiplier?: number | null;
  final_multiplier?: number | null;
  is_won?: boolean | null;
  status?: string | null;
};

type GameSetting = {
  game_id: string;
  is_active: boolean;
};

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    pendingDepots: 0,
    pendingRetraits: 0,
    volume7d: 0,
    net7d: 0,
    activeGames: 0,
  });
  const [cashflowData, setCashflowData] = useState<any[]>([]);
  const [gameAnalytics, setGameAnalytics] = useState<GameAnalytic[]>([]);
  const [rewardMetrics, setRewardMetrics] = useState({
    dailyRewards: 0,
    userClaims: 0,
    missions: 0,
    claimedMissions: 0,
  });

  const fetchAnalytics = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const [
        usersRes,
        balanceRes,
        depotsRes,
        retraitsRes,
        settingsRes,
        misesRes,
        rewardsRes,
        claimsRes,
        missionsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.rpc('get_total_balance'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'pending').in('type', ['deposit', 'depot']),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'pending').in('type', ['withdrawal', 'retrait']),
        supabase.from('game_settings').select('game_id, is_active').returns<GameSetting[]>(),
        supabase.from('mises').select('montant, gain, status, created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: true }),
        supabase.from('daily_rewards_config').select('id', { count: 'exact', head: true }),
        supabase.from('user_calendar_claims').select('id', { count: 'exact', head: true }),
        supabase.from('user_daily_missions').select('id', { count: 'exact', head: true }),
      ]);

      const analytics: GameAnalytic[] = [];
      let totalVolume7d = 0;
      let totalNet7d = 0;

      for (const item of ADMIN_GAME_CONFIG) {
        const { data, error } = await supabase
          .from(item.table)
          .select('bet_amount, multiplier, final_multiplier, is_won, status')
          .returns<DashboardGameRow[]>();
        if (error) {
          analytics.push({ id: item.id, title: item.title, volume: 0, profit: 0, plays: 0, isActive: true });
          continue;
        }

        let volume = 0;
        let payout = 0;
        let plays = 0;

        data?.forEach((row) => {
          const bet = Number(row.bet_amount) || 0;
          const multiplier = Number(row.multiplier || row.final_multiplier || 0);
          const isWin = row.is_won === true || row.status === 'won' || row.status === 'completed';
          volume += bet;
          plays += 1;
          if (isWin) {
            payout += bet * multiplier;
          }
        });

        const setting = settingsRes.data?.find((entry) => entry.game_id === item.id);
        const profit = volume - payout;
        analytics.push({ id: item.id, title: item.title, volume, profit, plays, isActive: setting?.is_active ?? true });
      }

      const dailyStats: Record<string, number> = {};
      [...Array(7)].forEach((_, index) => {
        const day = new Date();
        day.setDate(day.getDate() - index);
        dailyStats[day.toLocaleDateString('fr-FR', { weekday: 'short' })] = 0;
      });

      misesRes.data?.forEach((item) => {
        const day = new Date(item.created_at).toLocaleDateString('fr-FR', { weekday: 'short' });
        const amount = Number(item.montant) || 0;
        const gain = Number(item.gain) || 0;
        const impact = item.status === 'perdu' ? amount : ['gagne', 'gagné', 'win'].includes(String(item.status || '')) ? -(gain || amount) : 0;
        if (dailyStats[day] !== undefined) {
          dailyStats[day] += impact;
        }
      });

      const chartData = Object.keys(dailyStats).reverse().map((day) => ({ name: day, revenue: dailyStats[day] }));
      chartData.forEach((entry) => {
        totalVolume7d += Math.abs(Number(entry.revenue) || 0);
        totalNet7d += Number(entry.revenue) || 0;
      });

      setCashflowData(chartData);
      setGameAnalytics(analytics);
      setStats({
        totalUsers: usersRes.count || 0,
        totalBalance: Number(balanceRes.data || 0),
        pendingDepots: depotsRes.count || 0,
        pendingRetraits: retraitsRes.count || 0,
        volume7d: totalVolume7d,
        net7d: totalNet7d,
        activeGames: analytics.filter((game) => game.isActive).length,
      });
      setRewardMetrics({
        dailyRewards: rewardsRes.count || 0,
        userClaims: claimsRes.count || 0,
        missions: missionsRes.count || 0,
        claimedMissions: 0,
      });
    } catch (error) {
      console.error('Analytics sync error:', error);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(true);

    const channel = supabase
      .channel('admin-analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchAnalytics(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mises' }, () => fetchAnalytics(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchAnalytics(false))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const topGames = useMemo(() => {
    return [...gameAnalytics].sort((a, b) => b.volume - a.volume).slice(0, 5);
  }, [gameAnalytics]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 lg:px-10">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_70px_rgba(2,8,20,0.35)] md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-emerald-500/40 hover:text-emerald-400"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Analytics & Économie</p>
              <h1 className="mt-1 text-3xl font-black italic tracking-tight text-white">Pulse <span className="text-emerald-500">Live</span></h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">Supervision en temps réel du cashflow, des jeux, des récompenses et de la santé opérationnelle.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchAnalytics(false)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Mise à jour...' : 'Actualiser'}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <MetricCard title="Joueurs" value={stats.totalUsers.toLocaleString()} icon={<Users className="text-blue-400" />} accent="from-blue-500/20 to-blue-500/5" />
          <MetricCard title="Trésorerie" value={`${stats.totalBalance.toLocaleString()} HTG`} icon={<Wallet className="text-emerald-400" />} accent="from-emerald-500/20 to-emerald-500/5" />
          <MetricCard title="Volume 7J" value={`${stats.volume7d.toLocaleString()} HTG`} icon={<Coins className="text-amber-400" />} accent="from-amber-500/20 to-amber-500/5" />
          <MetricCard title="Net 7J" value={`${stats.net7d.toLocaleString()} HTG`} icon={<TrendingUp className={stats.net7d >= 0 ? 'text-emerald-400' : 'text-rose-400'} />} accent={stats.net7d >= 0 ? 'from-emerald-500/20 to-emerald-500/5' : 'from-rose-500/20 to-rose-500/5'} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.75fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(2,8,20,0.3)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">Flux de trésorerie</p>
                <h2 className="text-xl font-black italic text-white">Cashflow hebdo</h2>
              </div>
              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                live
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflowData}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#34d399" fill="url(#areaGradient)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(2,8,20,0.3)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-400">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Actions prioritaires</p>
                  <h3 className="text-lg font-black italic text-white">Finances & support</h3>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
                  <span>Dépôts en attente</span>
                  <span className="font-black text-amber-400">{stats.pendingDepots}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
                  <span>Retraits en attente</span>
                  <span className="font-black text-rose-400">{stats.pendingRetraits}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
                  <span>Jeux actifs</span>
                  <span className="font-black text-emerald-400">{stats.activeGames}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(2,8,20,0.3)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-400">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Progression</p>
                  <h3 className="text-lg font-black italic text-white">Récompenses</h3>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
                  <span>Récompenses quotidiennes</span>
                  <span className="font-black text-white">{rewardMetrics.dailyRewards}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
                  <span>Réclamations de calendrier</span>
                  <span className="font-black text-white">{rewardMetrics.userClaims}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
                  <span>Missions actives</span>
                  <span className="font-black text-emerald-400">{rewardMetrics.missions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(2,8,20,0.3)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Perf. jeux</p>
                <h2 className="text-xl font-black italic text-white">Top volume</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                synthèse
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topGames.map((game) => ({ name: game.title, volume: game.volume }))}>
                  <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                  <Bar dataKey="volume" radius={[8, 8, 0, 0]} fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(2,8,20,0.3)]">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Jeux</p>
                <h2 className="text-xl font-black italic text-white">Analyse par module</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                détaillé
              </div>
            </div>
            <div className="space-y-3">
              {gameAnalytics.map((game) => (
                <div key={game.id} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{game.title}</p>
                      <p className="text-[11px] text-slate-500">{game.plays} parties • {game.isActive ? 'Actif' : 'Maintenance'}</p>
                    </div>
                    <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${game.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {game.isActive ? 'Live' : 'Off'}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-white/8 bg-slate-900/70 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Volume</p>
                      <p className="mt-1 font-semibold text-white">{game.volume.toLocaleString()} HTG</p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-slate-900/70 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Profit</p>
                      <p className={`mt-1 font-semibold ${game.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{game.profit.toLocaleString()} HTG</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, accent }: { title: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-linear-to-br ${accent} p-5 shadow-[0_16px_45px_rgba(2,8,20,0.25)]`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
          <p className="mt-2 text-xl font-black italic text-white">{value}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">{icon}</div>
      </div>
    </div>
  );
}
