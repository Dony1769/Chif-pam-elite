// /app/client/reports/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, TrendingDown, 
  Target, Sprout, ChevronLeft,
  PieChart, Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientReports() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalWon: 0, 
    totalLost: 0, 
    minesCount: 0,
    crashCount: 0,
    bestMultiplier: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Récupérer les jeux Mines du client
        const { data: mines } = await supabase
          .from('mines_games')
          .select('bet_amount, multiplier, is_won')
          .eq('user_id', user.id);

        // 2. Récupérer les jeux Crash du client
        const { data: crash } = await supabase
          .from('crash_games')
          .select('bet_amount, crash_point, status')
          .eq('user_id', user.id);

        // Calculs des gains et pertes
        let won = 0;
        let lost = 0;
        let maxMult = 0;

        mines?.forEach(g => {
          if (g.is_won) {
            won += (g.bet_amount * g.multiplier);
            if (g.multiplier > maxMult) maxMult = g.multiplier;
          } else {
            lost += g.bet_amount;
          }
        });

        crash?.forEach(g => {
          if (g.status === 'won') {
            won += (g.bet_amount * g.crash_point);
            if (g.crash_point > maxMult) maxMult = g.crash_point;
          } else {
            lost += g.bet_amount;
          }
        });

        setStats({
          totalWon: won,
          totalLost: lost,
          minesCount: mines?.length || 0,
          crashCount: crash?.length || 0,
          bestMultiplier: maxMult
        });
      } catch (error) {
        console.error("Erreur rapport client:", error);
      } finally { setLoading(false); }
    };
    fetchUserActivity();
  }, []);

  const netProfit = stats.totalWon - stats.totalLost;
  const totalGames = stats.minesCount + stats.crashCount;

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-black italic uppercase pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/5">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl tracking-tighter">Mon Rapport Premium</h1>
      </div>

      <div className="space-y-6">
        {/* Scoreboard */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden shadow-2xl">
          <p className="text-[10px] text-slate-500 tracking-widest mb-1">Profit Net (HTG)</p>
          <h2 className={`text-4xl ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {netProfit.toLocaleString()}
          </h2>
          <PieChart className="absolute -right-4 -bottom-4 opacity-5" size={120} />
          <div className="absolute top-8 right-8 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
            Top x{stats.bestMultiplier.toFixed(2)}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <TrendingUp className="text-emerald-500 mb-2" size={20} />
            <p className="text-[8px] text-slate-500">Total Récolté</p>
            <p className="text-sm font-bold text-emerald-500">{stats.totalWon.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
            <TrendingDown className="text-rose-500 mb-2" size={20} />
            <p className="text-[8px] text-slate-500">Total Investi</p>
            <p className="text-sm font-bold text-rose-500">{stats.totalLost.toLocaleString()}</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <h3 className="text-[10px] text-slate-500 px-2 tracking-widest">Répartition des sessions</h3>
          <GameStatRow 
            icon={<Target size={16} className="text-rose-500" />} 
            name="Mines Elite" 
            count={stats.minesCount} 
            color="bg-rose-500" 
            percent={totalGames > 0 ? (stats.minesCount / totalGames) * 100 : 0} 
          />
          <GameStatRow 
            icon={<Sprout size={16} className="text-emerald-500" />} 
            name="Crash Croissance" 
            count={stats.crashCount} 
            color="bg-emerald-500" 
            percent={totalGames > 0 ? (stats.crashCount / totalGames) * 100 : 0} 
          />
        </div>
      </div>
    </div>
  );
}

// Composant de ligne réutilisable
function GameStatRow({ icon, name, count, color, percent }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-[10px]">{name}</p>
          <p className="text-[8px] text-slate-500">{count} Parties jouées</p>
        </div>
      </div>
      <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
